import sqlite3
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

import requests

from website_aux_crawler import (
    initialize_aux_queue,
    parse_five_planets_day_html,
    parse_rahu_year_html,
    run_worker,
)


FIVE_PLANETS_HTML = """
<div class="tw_div">
  <h3><script>document.write(change_num1('2024', 'y')); document.write(change_num1('1', 'm'));</script></h3>
  <dl class="dl_month"><table>
    <tr><td>积月闰余</td><td>曜基数</td><td>整零数</td><td>太阳基数</td></tr>
    <tr><td><script>change_num('25034','d');</script><script>change_num('65','d');</script></td>
      <td><script>change_num('5','d');</script><script>change_num('30','d');</script></td>
      <td><script>change_num('9','d');</script><script>change_num('54','d');</script></td>
      <td><script>change_num('22','d');</script><script>change_num('34','d');</script></td></tr>
  </table></dl>
  <div class="dl_div">
    <dl class="dl_day"><h4><script>change_num('1','h');</script></h4><dd><table><tr>
      <td>五曜公积日<br/><script>change_num('739270','d');</script><script>change_num('32','d');</script><script>change_num('452','d');</script></td>
    </tr></table></dd></dl>
    <dl class="dl_day_group"><h4>五曜殊日</h4><dd><table><tr>
      <td class="group-column-0"><div class="data-column-title">火曜</div><script>change_num('196','d');</script></td>
      <td class="group-column-1"><div class="data-column-title">木曜</div><script>change_num('739','d');</script></td>
    </tr></table></dd></dl>
  </div>
</div>
"""


RAHU_HTML = """
<div class="tw_div">
  <div>
    <h3><script>change_num1('2026','y'); change_num1('3','m');</script></h3>
    <dl class="dl_month"><table><tr><td>积月闰余</td><td>曜基数</td></tr>
      <tr><td><script>change_num('25048','d');</script></td><td><script>change_num('5','d');</script></td></tr>
    </table></dl>
    <dl class="dl_lh_title"><div class="dl_div">
      <dl class="dl_day_group"><h4><script>change_num('1','h');</script></h4><dd><table><tr>
        <td class="group-column-0"><script>change_num('3','d');</script><script>change_num('45','d');</script></td>
        <td class="group-column-1"><script>change_num('23','d');</script><script>change_num('14','d');</script></td>
      </tr></table></dd></dl>
    </div></dl>
  </div>
</div>
"""


class WebsiteAuxParserTests(unittest.TestCase):
    def test_parses_one_five_planets_day_with_named_sections(self):
        payload = parse_five_planets_day_html(2024, 1, 1, FIVE_PLANETS_HTML)

        self.assertEqual(payload["year"], 2024)
        self.assertEqual(payload["month"], 1)
        self.assertEqual(payload["day"], 1)
        self.assertEqual(payload["summary"]["积月闰余"], [25034, 65])
        self.assertEqual(payload["sections"][0]["name"], "五曜公积日")
        self.assertEqual(payload["sections"][0]["columns"][0]["values"], [739270, 32, 452])
        self.assertEqual(payload["sections"][1]["columns"][0]["label"], "火曜")

    def test_parses_rahu_month_and_leap_marker(self):
        payload = parse_rahu_year_html(2026, RAHU_HTML)

        self.assertEqual(payload["year"], 2026)
        self.assertEqual(len(payload["months"]), 1)
        self.assertEqual(payload["months"][0]["month"], 3)
        self.assertFalse(payload["months"][0]["isLeap"])
        self.assertEqual(payload["months"][0]["days"][0]["day"], 1)
        self.assertEqual(payload["months"][0]["days"][0]["columns"][0], [3, 45])


class WebsiteAuxQueueTests(unittest.TestCase):
    def run_mock_worker(self, side_effect, **kwargs):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "queue.sqlite3"
            db = sqlite3.connect(path)
            initialize_aux_queue(db, 2024, 2024)
            db.execute("UPDATE website_aux_crawl_queue SET status='retry',attempts=1 WHERE dataset='five_planets' AND month=1 AND day=2")
            db.commit()
            db.close()
            with patch("website_aux_crawler._request", side_effect=side_effect) as request, patch("website_aux_crawler.pause"), patch("website_aux_crawler.initialize_aux_queue") as seed:
                result = run_worker(path, 2024, 2024, dataset="five_planets", resume_existing=True, **kwargs)
                seed.assert_not_called()
            db = sqlite3.connect(path)
            rows = db.execute("SELECT status,count(*) FROM website_aux_crawl_queue WHERE dataset='five_planets' GROUP BY status").fetchall()
            db.close()
            return result, request.call_args_list, dict(rows)

    def test_stops_after_ten_consecutive_failures(self):
        result, calls, rows = self.run_mock_worker(requests.ConnectionError("DNS unavailable"))
        self.assertEqual(result, 2)
        self.assertEqual(len(calls), 10)
        self.assertEqual(rows.get("done", 0), 0)
        self.assertEqual(calls[0].args[2:], (2024, 1, 2))
        self.assertEqual(calls[1].args[2:], (2024, 1, 1))

    def test_success_resets_failure_streak(self):
        success = ({"available": True}, "http://example.test", b"fixture")
        result, calls, rows = self.run_mock_worker(
            [requests.ConnectionError("offline")] * 9 + [success] + [requests.ConnectionError("offline")] * 9,
            max_requests=19,
        )
        self.assertEqual(result, 0)
        self.assertEqual(len(calls), 19)
        self.assertEqual(rows["done"], 1)

    def test_honors_http_retry_after(self):
        response = requests.Response()
        response.status_code = 429
        response.headers["Retry-After"] = "600"
        with patch("website_aux_crawler.retry_delay", return_value=600) as delay:
            self.run_mock_worker(requests.HTTPError("rate limited", response=response), max_requests=1)
        delay.assert_called_once_with(2, "600")

    def test_queue_is_idempotent_and_seeds_both_datasets(self):
        db = sqlite3.connect(":memory:")

        initialize_aux_queue(db, 2024, 2024)
        initialize_aux_queue(db, 2024, 2024)

        self.assertEqual(
            db.execute("SELECT count(*) FROM website_aux_crawl_queue WHERE dataset='five_planets'").fetchone()[0],
            360,
        )
        self.assertEqual(
            db.execute("SELECT count(*) FROM website_aux_crawl_queue WHERE dataset='rahu'").fetchone()[0],
            1,
        )


if __name__ == "__main__":
    unittest.main()
