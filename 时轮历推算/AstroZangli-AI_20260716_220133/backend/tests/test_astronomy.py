from datetime import datetime
from unittest import TestCase
from unittest.mock import patch

from astronomy import (
    TIBETAN_CALENDAR_END,
    TIBETAN_CALENDAR_START,
    calculate_five_elements,
    get_monthly_astronomy_events,
    get_planets_data,
    get_zangli,
)


class TibetanCalendarBoundaryTests(TestCase):
    def test_known_table_start(self):
        self.assertEqual(get_zangli(TIBETAN_CALENDAR_START), [1950, 12, 1])

    def test_rejects_dates_outside_table(self):
        self.assertEqual(get_zangli(datetime(1951, 1, 7)), {"value": "error"})
        self.assertEqual(get_zangli(datetime(2051, 2, 12)), {"value": "error"})

    def test_declared_end_is_not_before_start(self):
        self.assertGreater(TIBETAN_CALENDAR_END, TIBETAN_CALENDAR_START)


class PlanetContractTests(TestCase):
    @patch("astronomy.get_planet_rise_set_transit")
    def test_planet_rows_include_transit(self, mocked_calculation):
        mocked_calculation.return_value = {
            "rise": datetime(2026, 7, 16, 5, 1, 2),
            "set": datetime(2026, 7, 16, 19, 3, 4),
            "transit": datetime(2026, 7, 16, 12, 2, 3),
            "declination": 12.3456789,
        }

        result = get_planets_data(2026, 7, 16, 12, 0, 121.4737, 31.2304)

        self.assertEqual(result["Mercury"]["transit"], "12:02:03")
        self.assertEqual(result["Mercury"]["declination"], "12.345679")


class FiveElementsContractTests(TestCase):
    def test_calculate_five_elements_uses_runtime_compatible_lunar_partner_values(self):
        result = calculate_five_elements(2026, 9, 12)

        self.assertEqual(result["积月"], 487)
        self.assertEqual(result["闰余"], 36)
        self.assertEqual(result["定曜"], [0, 1, 42, 3, 48, 239])
        self.assertEqual(result["月伴星宿"], [10, 51, 8, 1, 43, 468])
        self.assertEqual(result["太阳日月宿"], [10, 51, 8, 1, 43, 468])
        self.assertEqual(result["作用"], ["不净", "枝稍"])


class MonthlyAstronomyEventsTests(TestCase):
    def test_events_use_requested_beijing_month_and_include_lunations(self):
        events = get_monthly_astronomy_events(2026, 9)

        self.assertTrue(all(event["date"].startswith("2026-09-") for event in events))
        self.assertEqual(
            {event["type"] for event in events},
            {"new_moon", "full_moon"},
        )

    def test_eclipse_is_returned_alongside_its_lunation(self):
        events = get_monthly_astronomy_events(2026, 8)
        august_thirteenth = [event["type"] for event in events if event["date"] == "2026-08-13"]
        august_twenty_eighth = [event["type"] for event in events if event["date"] == "2026-08-28"]

        self.assertCountEqual(august_thirteenth, ["new_moon", "solar_total"])
        self.assertCountEqual(august_twenty_eighth, ["lunar_partial", "full_moon"])
