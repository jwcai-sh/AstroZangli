from unittest import TestCase

from sky_view import get_sky_view


class SkyViewTests(TestCase):
    def test_local_day_and_seven_luminaries(self):
        data = get_sky_view("lhasa", "daily", "2026-10-12")
        self.assertEqual(len(data["frames"]), 144)
        self.assertEqual(data["frames"][0]["localTime"], "2026-10-12T00:00")
        self.assertEqual(data["frames"][-1]["localTime"], "2026-10-12T23:50")
        self.assertEqual(len(data["frames"][0]["bodies"]), 7)
        self.assertEqual(len(data["frames"][0]["matrix"]), 9)

    def test_annual_sampling_keeps_civil_hour_and_leap_day(self):
        frames = get_sky_view("riwoche", "annual", "2024-01-01", 21)["frames"]
        self.assertEqual(len(frames), 366)
        self.assertEqual(frames[59]["localTime"], "2024-02-29T21:00")
        self.assertEqual(frames[-1]["localTime"], "2024-12-31T21:00")

    def test_longitude_changes_the_same_clock_sky(self):
        # At 20:00 Beijing time Shanghai is farther into the night than Lhasa.
        lhasa = get_sky_view("lhasa", "daily", "2026-10-12")["frames"][120]
        shanghai = get_sky_view("shanghai", "daily", "2026-10-12")["frames"][120]
        self.assertGreater(lhasa["bodies"]["sun"]["altitude"], shanghai["bodies"]["sun"]["altitude"] + 10)
        self.assertAlmostEqual(lhasa["gast"], shanghai["gast"])

    def test_all_cities_and_date_limits_are_finite(self):
        import math
        for city, date in [("lhasa", "1900-01-01"), ("riwoche", "2050-12-31"), ("shanghai", "2026-03-20"), ("beijing", "2026-06-21")]:
            for frame in get_sky_view(city, "daily", date)["frames"]:
                for body in frame["bodies"].values():
                    self.assertTrue(math.isfinite(body["altitude"]))
                    self.assertTrue(-90 <= body["altitude"] <= 90)
                    self.assertTrue(0 <= body["azimuth"] < 360)

    def test_invalid_input_is_rejected(self):
        for args in [("bad", "daily", "2026-01-01"), ("lhasa", "bad", "2026-01-01"), ("lhasa", "daily", "2026-02-29"), ("lhasa", "daily", "1800-01-01"), ("lhasa", "annual", "2026-01-01", 24)]:
            with self.assertRaises(ValueError):
                get_sky_view(*args)
