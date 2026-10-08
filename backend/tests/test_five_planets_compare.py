import unittest
from unittest.mock import patch
import sqlite3

from flask import Flask
from five_planets_compare import bp, build_compare, build_month_compare, build_range_compare, build_year_compare


class FivePlanetsRouteTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(bp, url_prefix="/api")
        self.client = app.test_client()

    @patch("five_planets_compare.build_compare")
    def test_valid(self, build):
        build.return_value = {"counts": {"match": 0, "different": 0, "missing": 21}}
        response = self.client.post("/api/five-planets/daily-compare", json={"year": 2024, "month": 1, "day": 1})
        self.assertEqual(response.status_code, 200)
        build.assert_called_once_with(2024, 1, 1)

    def test_invalid(self):
        for payload in ({}, [1, 2], {"year": True, "month": 1, "day": 1}, {"year": 2024.5, "month": 1, "day": 1}):
            self.assertEqual(self.client.post("/api/five-planets/daily-compare", json=payload).status_code, 400)

    def test_v4_actual_cache_and_coverage(self):
        result = build_compare(2024, 3, 1)
        self.assertEqual(result["python"]["engine"], "v4-reference-compatible-E1987")
        self.assertEqual(result["counts"], {"match": 21, "different": 0, "missing": 0})
        self.assertEqual(result["coverage"]["expectedDays"], 900000)
        self.assertGreater(result["coverage"]["cachedDays"], 0)
        self.assertEqual(sum((result["coverage"]["cachedDays"], result["coverage"]["uncachedDays"])), 900000)
        self.assertTrue(result["verification"]["passed"])
        self.assertIsNone(result["python"]["planets"]["火曜"]["方向"])

    def test_uncached_date_stays_missing(self):
        result = build_compare(2500, 12, 30)
        self.assertFalse(result["websiteAvailable"])
        self.assertEqual(result["counts"], {"match": 0, "different": 0, "missing": 21})

    @patch("five_planets_compare.build_compare", side_effect=sqlite3.OperationalError("unavailable"))
    def test_database_failure(self, build):
        response = self.client.post("/api/five-planets/daily-compare", json={"year": 2024, "month": 3, "day": 1})
        self.assertEqual(response.status_code, 503)
        self.assertIn("未启动抓取", response.json["error"])

    def test_range_validation(self):
        for date in ((0, 1, 1), (2501, 1, 1), (2024, 13, 1), (2024, 1, 31), (True, 1, 1)):
            with self.assertRaises(ValueError):
                build_compare(*date)

    def test_month_actual_has_thirty_daily_rows(self):
        result = build_month_compare(2024, 3)
        self.assertEqual(result["stats"]["expectedDays"], 30)
        self.assertEqual(len(result["days"]), 30)
        self.assertEqual(result["days"][0]["day"], 1)
        self.assertEqual(len(result["days"][0]["rows"]), 21)

    def test_month_route(self):
        with patch("five_planets_compare.build_month_compare") as build:
            build.return_value = {"year": 2024, "month": 3, "days": [], "stats": {}}
            response = self.client.post("/api/five-planets/monthly-compare", json={"year": 2024, "month": 3})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])
        build.assert_called_once_with(2024, 3)

    def test_year_and_range_validation(self):
        with self.assertRaises(ValueError):
            build_year_compare(0)
        with self.assertRaises(ValueError):
            build_range_compare(2024, 2501)

    def test_long_range_missing_months_do_not_compute_dates(self):
        with patch("five_planets_compare._read_cached_records", return_value={}), patch("five_planets_compare.compare_day") as calculate:
            result = build_range_compare(1, 2500)
        calculate.assert_not_called()
        self.assertEqual(len(result["years"]), 2500)
        self.assertEqual(result["stats"]["missingDays"], 900000)
        self.assertEqual(result["stats"]["matchingDays"], 0)

    def test_year_route(self):
        with patch("five_planets_compare.build_year_compare") as build:
            build.return_value = {"year": 2024, "months": [], "stats": {}}
            response = self.client.post("/api/five-planets/yearly-compare", json={"year": 2024})
        self.assertEqual(response.status_code, 200)
        build.assert_called_once_with(2024)

    def test_range_route(self):
        with patch("five_planets_compare.build_range_compare") as build:
            build.return_value = {"startYear": 2024, "endYear": 2025, "years": [], "stats": {}}
            response = self.client.post(
                "/api/five-planets/range-compare",
                json={"startYear": 2024, "endYear": 2025},
            )
        self.assertEqual(response.status_code, 200)
        build.assert_called_once_with(2024, 2025)


if __name__ == "__main__":
    unittest.main()
