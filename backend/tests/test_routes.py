from unittest import TestCase

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
