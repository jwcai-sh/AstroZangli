from unittest import TestCase
from unittest.mock import patch

import requests

from app import create_app


class ApiContractTests(TestCase):
    def setUp(self):
        self.client = create_app("testing").test_client()

    def test_health_describes_supported_boundary(self):
        response = self.client.get("/api/health")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertIn("南京市", payload["supportedCities"])
        self.assertEqual(payload["tibetanCalendarRange"]["start"], "1951-01-08")

    def test_unknown_city_is_not_silently_replaced(self):
        response = self.client.post(
            "/api/calendar/date-comprehensive-data",
            json={"date": "2026-07-16", "cityName": "不存在市"},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "UNSUPPORTED_CITY")

    def test_out_of_range_tibetan_date_is_explicit(self):
        response = self.client.post(
            "/api/calendar/date-comprehensive-data",
            json={"date": "1900-01-01", "cityName": "上海市"},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "TIBETAN_DATE_OUT_OF_RANGE")

    def test_invalid_date_is_rejected(self):
        response = self.client.post(
            "/api/calendar/date-comprehensive-data",
            json={"date": "2026-02-30", "cityName": "上海市"},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "INVALID_DATE_FORMAT")

    def test_monthly_five_elements_overview_uses_tibetan_month_days(self):
        response = self.client.post(
            "/api/five-elements/monthly-overview",
            json={"year": 2026, "month": 8},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["year"], 2026)
        self.assertEqual(payload["data"]["month"], 8)
        self.assertIn("monthSummary", payload["data"])
        self.assertIn("days", payload["data"])
        self.assertEqual(payload["data"]["monthSummary"]["tibetanDateLabel"], "火马年 八月")
        self.assertEqual(payload["data"]["days"][0]["day"], 1)
        self.assertEqual(payload["data"]["days"][0]["gregorianDate"], "2026-09-12")
        self.assertIn("八月初一", payload["data"]["days"][0]["tibetanDate"])
        self.assertEqual(
            payload["data"]["days"][0]["rows"],
            [
                {
                    "fixedWeekday": 0,
                    "lunarPartner": 10,
                    "fixedDay": 9,
                    "conjunction": 20,
                    "effect": "不净",
                },
                {
                    "fixedWeekday": 1,
                    "lunarPartner": 51,
                    "fixedDay": 58,
                    "conjunction": 49,
                    "effect": "枝稍",
                },
                {
                    "fixedWeekday": 42,
                    "lunarPartner": 8,
                    "fixedDay": 50,
                    "conjunction": 59,
                    "effect": "",
                },
                {
                    "fixedWeekday": 3,
                    "lunarPartner": 1,
                    "fixedDay": 5,
                    "conjunction": 1,
                    "effect": "",
                },
                {
                    "fixedWeekday": 48,
                    "lunarPartner": 43,
                    "fixedDay": 25,
                    "conjunction": 1,
                    "effect": "",
                },
                {
                    "fixedWeekday": 239,
                    "lunarPartner": 468,
                    "fixedDay": "",
                    "conjunction": 468,
                    "effect": "",
                },
            ],
        )
        third_day = next(day for day in payload["data"]["days"] if day["day"] == 3)
        self.assertEqual(third_day["gregorianDate"], "2026-09-14")
        self.assertIn("八月初三", third_day["tibetanDate"])
        self.assertIn("accumulativeMonth", payload["data"]["monthSummary"])
        self.assertIn("weekdayBase", payload["data"]["monthSummary"])
        self.assertIn("dailyInteractive", payload["data"])
        self.assertTrue(payload["data"]["dailyInteractive"]["available"])
        self.assertIn("已支持", payload["data"]["dailyInteractive"]["message"])

    def test_monthly_five_elements_overview_rejects_invalid_month(self):
        response = self.client.post(
            "/api/five-elements/monthly-overview",
            json={"year": 2026, "month": 13},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "INVALID_MONTH")

    @patch("routes.build_five_elements_month_compare")
    def test_monthly_five_elements_compare_returns_structured_diff_data(self, mocked_build):
        mocked_build.return_value = {
            "year": 2026,
            "month": 7,
            "summary": [
                {
                    "label": "曜基数",
                    "local": [5, 3, 22, 2, 302],
                    "website": [5, 3, 22, 2, 302],
                    "matches": True,
                }
            ],
            "days": [
                {
                    "day": 1,
                    "local": {
                        "fixedWeekday": [5, 38, 34, 1, 38, 399],
                        "lunarPartner": [8, 8, 8, 1, 43, 308],
                        "fixedDay": [7, 52, 42, 3, 15],
                        "conjunction": [16, 0, 50, 4, 58, 308],
                        "effect": ["孺蜜", "贵种"],
                    },
                    "website": {
                        "fixedWeekday": [5, 38, 34, 1, 38, 399],
                        "lunarPartner": [8, 8, 8, 1, 43, 308],
                        "fixedDay": [7, 52, 42, 3, 15],
                        "conjunction": [16, 0, 50, 4, 58, 308],
                    },
                    "diffFields": [],
                    "matches": True,
                }
            ],
            "stats": {
                "differentSummaryCount": 0,
                "differentDayCount": 0,
            },
        }

        response = self.client.post(
            "/api/five-elements/monthly-compare",
            json={"year": 2026, "month": 7},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["year"], 2026)
        self.assertEqual(payload["data"]["month"], 7)
        self.assertEqual(payload["data"]["summary"][0]["label"], "曜基数")
        self.assertEqual(payload["data"]["days"][0]["day"], 1)
        self.assertEqual(payload["data"]["days"][0]["local"]["effect"][0], "孺蜜")
        self.assertEqual(payload["data"]["stats"]["differentDayCount"], 0)
        mocked_build.assert_called_once_with(2026, 7)

    def test_monthly_five_elements_compare_rejects_invalid_month(self):
        response = self.client.post(
            "/api/five-elements/monthly-compare",
            json={"year": 2026, "month": 0},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "INVALID_MONTH")

    @patch(
        "routes.build_five_elements_month_compare",
    )
    def test_monthly_compare_returns_partial_data_when_reference_site_is_unavailable(self, mocked_build):
        mocked_build.return_value = {
            "year": 2027,
            "month": 3,
            "summary": [
                {
                    "label": "曜基数",
                    "local": [4, 49, 53, 2, 380],
                    "matlabOracle": [4, 49, 53, 2, 380],
                    "website": [],
                    "matches": False,
                    "pairwiseMatches": {
                        "pythonMatlab": True,
                        "pythonWebsite": False,
                        "matlabWebsite": False,
                    },
                }
            ],
            "days": [],
            "stats": {
                "differentSummaryCount": 0,
                "differentDayCount": 0,
                "differentPythonMatlabSummaryCount": 0,
                "differentPythonWebsiteSummaryCount": 0,
                "differentMatlabWebsiteSummaryCount": 0,
                "differentPythonMatlabDayCount": 0,
                "differentPythonWebsiteDayCount": 0,
                "differentMatlabWebsiteDayCount": 0,
            },
            "sources": {
                "websiteUrl": "https://astro.xzzzqzyy.com/dba/twlsdata/per/wysz/search?year=2027&month=3",
                "websiteLabel": "公元2027年藏历3月",
                "websiteAvailable": False,
                "websiteError": "参考网站连接超时或暂时不可达，请稍后重试",
                "pythonAlgorithm": "Python",
                "pythonAlgorithmId": "python",
                "localAlgorithm": "Python",
                "localAlgorithmId": "python",
                "matlabOracleFile": "oracle.xlsx",
                "matlabOracleMode": "excel",
                "matlabOracleAvailable": True,
                "websiteHtmlLength": 0,
            },
        }

        response = self.client.post(
            "/api/five-elements/monthly-compare",
            json={"year": 2027, "month": 3},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["success"])
        self.assertFalse(payload["data"]["sources"]["websiteAvailable"])
        self.assertIn("参考网站", payload["data"]["sources"]["websiteError"])
        self.assertEqual(payload["data"]["summary"][0]["matlabOracle"], [4, 49, 53, 2, 380])
        mocked_build.assert_called_once_with(2027, 3)

    @patch(
        "routes.build_five_elements_month_compare",
        side_effect=requests.exceptions.ReadTimeout("reference website timeout"),
    )
    def test_monthly_compare_still_reports_unhandled_reference_timeout_as_503(self, mocked_build):
        response = self.client.post(
            "/api/five-elements/monthly-compare",
            json={"year": 2027, "month": 1},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 503)
        self.assertEqual(payload["error"]["code"], "REFERENCE_WEBSITE_UNAVAILABLE")
        self.assertIn("参考网站", payload["error"]["message"])
        mocked_build.assert_called_once_with(2027, 1)

    def test_daily_five_elements_detail_returns_runtime_rows_for_tibetan_date(self):
        response = self.client.post(
            "/api/five-elements/daily-detail",
            json={"year": 2026, "month": 8, "day": 3},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["year"], 2026)
        self.assertEqual(payload["data"]["month"], 8)
        self.assertEqual(payload["data"]["day"], 3)
        self.assertEqual(payload["data"]["tibetanDateLabel"], "火马年 八月初三")
        self.assertEqual(payload["data"]["gregorianDates"], ["2026-09-14"])
        self.assertEqual(
            payload["data"]["rows"],
            [
                {
                    "fixedWeekday": 2,
                    "lunarPartner": 12,
                    "fixedDay": 10,
                    "conjunction": 22,
                    "effect": "捣麻",
                },
                {
                    "fixedWeekday": 1,
                    "lunarPartner": 48,
                    "fixedDay": 7,
                    "conjunction": 55,
                    "effect": "家生",
                },
                {
                    "fixedWeekday": 18,
                    "lunarPartner": 0,
                    "fixedDay": 19,
                    "conjunction": 19,
                    "effect": "",
                },
                {
                    "fixedWeekday": 4,
                    "lunarPartner": 3,
                    "fixedDay": 1,
                    "conjunction": 4,
                    "effect": "",
                },
                {
                    "fixedWeekday": 23,
                    "lunarPartner": 11,
                    "fixedDay": 35,
                    "conjunction": 46,
                    "effect": "",
                },
                {
                    "fixedWeekday": 161,
                    "lunarPartner": 546,
                    "fixedDay": "",
                    "conjunction": 546,
                    "effect": "",
                },
            ],
        )
        self.assertEqual(payload["data"]["monthSummary"]["accumulativeMonth"], 487)
        self.assertEqual(payload["data"]["monthSummary"]["weekdayBase"], [6, 35, 12, 3, 75])

    def test_daily_five_elements_detail_rejects_invalid_day(self):
        response = self.client.post(
            "/api/five-elements/daily-detail",
            json={"year": 2026, "month": 8, "day": 31},
        )
        payload = response.get_json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload["error"]["code"], "INVALID_DAY")
