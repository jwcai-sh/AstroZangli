from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from matlab_final_runtime import build_month_records


class MatlabFinalRuntimeTests(unittest.TestCase):
    def test_2020_january_matches_matlab_oracle(self):
        month = build_month_records(2020, 1)

        self.assertEqual(month["engine"], "shilun_calendar_months12_compare_final_v3")
        self.assertEqual(month["days"][0]["定曜"], [6, 37, 1, 5, 23, 270])
        self.assertEqual(month["days"][0]["月伴星宿"], [21, 50, 11, 0, 37, 437])

    def test_2027_march_matches_matlab_oracle(self):
        month = build_month_records(2027, 3)

        self.assertEqual(month["summary"]["积月闰余"], [25061, 52])
        self.assertEqual(month["days"][0]["定曜"], [6, 22, 24, 3, 31, 70])

    def test_month_bases_continue_across_sixty_year_boundaries(self):
        cases = [
            (1, [-24566, 46], [6, 47, 27, 3, 705]),
            (1986, [-13, 41], [4, 17, 35, 5, 455]),
            (1987, [0, 0], [3, 11, 27, 2, 332]),
            (2046, [730, 53], [0, 31, 10, 0, 60]),
            (2047, [742, 10], [4, 53, 11, 2, 164]),
            (2500, [6345, 27], [5, 45, 55, 2, 176]),
        ]
        for year, month_state, weekday_base in cases:
            with self.subTest(year=year):
                month = build_month_records(year, 3)
                self.assertEqual(month["summary"]["积月闰余"], [month_state[0] + 24566, month_state[1]])
                self.assertEqual(month["summary"]["曜基数"], weekday_base)


if __name__ == "__main__":
    unittest.main()
