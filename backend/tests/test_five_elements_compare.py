from unittest import TestCase
from unittest.mock import Mock, patch

import requests

import five_elements_compare
from five_elements_compare_store import FiveElementsCompareStore


def website_html() -> str:
    month_cells = "".join(
        f"<td><span>change_num('{index}', 'd')</span></td>" for index in range(4)
    )
    day_block = "".join(
        f"<td class='group-column-{column}'><span>change_num('{column + 1}', 'd')</span></td>"
        for column in range(4)
    )
    return (
        f"<dl class='dl_month'><table><tr><td></td><td></td><td></td><td></td>{month_cells}</tr></table></dl>"
        + "".join(f"<dl class='dl_day_group'><table><tr>{day_block}</tr></table></dl>" for _ in range(30))
    )


class WebsiteFetchTests(TestCase):
    def setUp(self):
        five_elements_compare._WEBSITE_CACHE.clear()

    def tearDown(self):
        five_elements_compare._WEBSITE_CACHE.clear()

    @patch("five_elements_compare.requests.get")
    def test_successful_month_is_cached_across_repeated_switch_requests(self, mocked_get):
        response = Mock(text=website_html())
        mocked_get.return_value = response

        first = five_elements_compare.fetch_website_month(2027, 2)
        second = five_elements_compare.fetch_website_month(2027, 2)

        self.assertEqual(first, second)
        mocked_get.assert_called_once()
        self.assertEqual(mocked_get.call_args.kwargs["timeout"], (5, 12))

    @patch(
        "five_elements_compare.fetch_website_month",
        side_effect=requests.exceptions.ReadTimeout("reference timeout"),
    )
    def test_compare_builds_partial_result_when_reference_site_times_out(self, mocked_fetch):
        result = five_elements_compare.build_five_elements_month_compare(2027, 3)

        self.assertEqual(result["year"], 2027)
        self.assertEqual(result["month"], 3)
        self.assertFalse(result["sources"]["websiteAvailable"])
        self.assertIn("参考网站", result["sources"]["websiteError"])
        self.assertEqual(result["sources"]["websiteHtmlLength"], 0)
        self.assertGreater(len(result["summary"][1]["matlabOracle"]), 0)
        self.assertGreater(len(result["summary"][1]["python"]), 0)
        self.assertEqual(result["summary"][1]["website"], [])
        self.assertEqual(len(result["days"]), 30)
        self.assertEqual(result["days"][0]["website"]["fixedWeekday"], [])
        mocked_fetch.assert_called_once_with(2027, 3)


class FiveElementsCompareStoreTests(TestCase):
    def test_store_round_trips_month_source_payloads(self):
        store = FiveElementsCompareStore(":memory:")
        payload = {
            "label": "公元2027年藏历3月",
            "summary": {"曜基数": [4, 49, 53, 2, 380]},
            "days": [{"day": 1, "定曜": [4, 52, 2, 1, 29, 230]}],
            "sourceUrl": "https://example.test/month",
            "available": True,
            "error": "",
        }

        store.save_month_source(2027, 3, "website", payload)

        self.assertEqual(store.load_month_source(2027, 3, "website"), payload)
        self.assertIsNone(store.load_month_source(2027, 4, "website"))

    def test_compare_uses_cached_website_month_without_network_fetch(self):
        store = FiveElementsCompareStore(":memory:")
        _, website_month = five_elements_compare.parse_website_month_html(2027, 3, website_html())
        store.save_month_source(2027, 3, "website", website_month)

        with patch("five_elements_compare.fetch_website_month") as mocked_fetch:
            result = five_elements_compare.build_five_elements_month_compare(2027, 3, store=store)

        self.assertTrue(result["sources"]["websiteAvailable"])
        self.assertEqual(result["sources"]["websiteCacheStatus"], "hit")
        self.assertEqual(result["summary"][0]["website"], [0])
        mocked_fetch.assert_not_called()

    def test_compare_uses_cached_matlab_oracle_without_excel_lookup(self):
        store = FiveElementsCompareStore(":memory:")
        _, website_month = five_elements_compare.parse_website_month_html(2027, 3, website_html())
        oracle_month = {
            "summary": {
                "积月闰余": [494, 50],
                "曜基数": [3, 18, 3, 1, 607],
                "整零数": [5, 80],
                "太阳基数": [25, 19, 15, 1, 23],
            },
            "days": [
                {
                    "day": day,
                    "定曜": [day, 1, 2, 3, 4, 5],
                    "月伴星宿": [day, 6, 7, 8, 9, 10],
                    "定日": [day, 11, 12, 13, 14],
                    "会合": [day, 15, 16, 17, 18, 19],
                }
                for day in range(1, 31)
            ],
            "sourceFile": "cached-oracle.xlsx",
            "sourceMode": "current_local",
        }
        store.save_month_source(2027, 3, "website", website_month)
        store.save_month_source(2027, 3, "matlab_oracle", oracle_month)

        with patch("five_elements_compare.load_oracle_month") as mocked_load:
            result = five_elements_compare.build_five_elements_month_compare(2027, 3, store=store)

        self.assertEqual(result["sources"]["matlabOracleFile"], "cached-oracle.xlsx")
        self.assertEqual(result["sources"]["matlabOracleCacheStatus"], "hit")
        mocked_load.assert_not_called()


if __name__ == "__main__":
    import unittest

    unittest.main()
