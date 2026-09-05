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

        self.assertEqual(month["engine"], "shilun_calendar_months12_compare_final")
        self.assertEqual(month["days"][0]["定曜"], [6, 37, 1, 5, 23, 270])
        self.assertEqual(month["days"][0]["月伴星宿"], [21, 50, 11, 0, 37, 437])

    def test_2027_march_matches_matlab_oracle(self):
        month = build_month_records(2027, 3)

        self.assertEqual(month["summary"]["积月闰余"], [495, 52])
        self.assertEqual(month["days"][0]["定曜"], [6, 22, 24, 3, 31, 70])


if __name__ == "__main__":
    unittest.main()
