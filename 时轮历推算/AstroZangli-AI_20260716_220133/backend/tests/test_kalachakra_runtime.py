from unittest import TestCase

from kalachakra_runtime import build_day_record, build_month_summary


class KalachakraRuntimeTests(TestCase):
    def test_month_summary_matches_verified_2026_07_case(self):
        summary = build_month_summary(2026, 7)

        self.assertEqual(summary["积月闰余"], [486, 34])
        self.assertEqual(summary["曜基数"], [5, 3, 22, 2, 302])
        self.assertEqual(summary["整零数"], [17, 72])
        self.assertEqual(summary["太阳基数"], [7, 51, 29, 3, 21])
        self.assertFalse(summary["isLeapMonth"])

    def test_day_record_matches_verified_sample_and_effect_edges(self):
        first_day = build_day_record(2026, 7, 1)
        third_day = build_day_record(2026, 7, 3)
        last_day = build_day_record(2026, 7, 30)

        self.assertEqual(first_day["定曜"], [5, 38, 34, 1, 38, 399])
        self.assertEqual(first_day["月伴星宿"], [8, 8, 8, 1, 43, 308])
        self.assertEqual(first_day["定日"], [7, 52, 42, 3, 15])
        self.assertEqual(first_day["会合"], [16, 0, 50, 4, 58, 308])
        self.assertEqual(first_day["作用"], ["不净", "枝稍"])

        self.assertEqual(third_day["定曜"], [0, 32, 26, 5, 23, 220])
        self.assertEqual(third_day["作用"], ["捣麻", "家生"])

        self.assertEqual(last_day["作用"], ["四足", "蛟龙"])

    def test_matlab_mode_preserves_local_month_state_for_compare_page(self):
        summary = build_month_summary(2027, 3, mode="matlab")
        first_day = build_day_record(2027, 3, 1, mode="matlab")

        self.assertEqual(summary["积月闰余"], [494, 50])
        self.assertEqual(summary["曜基数"], [3, 18, 3, 1, 607])
        self.assertEqual(summary["整零数"], [5, 80])
        self.assertEqual(summary["太阳基数"], [25, 19, 15, 1, 23])

        self.assertEqual(first_day["定曜"], [4, 52, 2, 1, 29, 230])
        self.assertEqual(first_day["月伴星宿"], [25, 35, 52, 0, 35, 477])
        self.assertEqual(first_day["定日"], [25, 33, 54, 1, 65])
        self.assertEqual(first_day["会合"], [24, 9, 46, 2, 33, 477])
