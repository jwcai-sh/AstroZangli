from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from matlab_oracle import load_oracle_month


class MatlabOracleTests(unittest.TestCase):
    def test_optimized_source_and_corrected_borrow(self):
        month = load_oracle_month(2020, 9)
        self.assertEqual(month["sourceProgram"], "shilun_calendar_months12_compare_final_v1.m")
        self.assertEqual(month["days"][7]["定曜"], [0, 7, 49, 3, 36, 435])
        self.assertEqual(len(month["sourceSha256"]), 64)
        self.assertEqual(len(load_oracle_month(2035, 12)["days"]), 30)

    def test_final_matlab_oracle_contains_2027_march(self):
        month = load_oracle_month(2027, 3)

        self.assertEqual(month["sourceFile"], "2027年时轮历-check.xlsx")
        self.assertEqual(month["sourceMode"], "candidate_leap_transition")
        self.assertEqual(month["summary"]["积月闰余"], [495, 52])
        self.assertEqual(month["days"][0]["定曜"], [6, 22, 24, 3, 31, 70])
        self.assertEqual(month["days"][0]["定日"], [0, 45, 20, 0, 0])

    def test_oracle_is_missing_for_unexported_year(self):
        with self.assertRaises(FileNotFoundError):
            load_oracle_month(1999, 1)

    def test_oracle_contains_years_from_results_folder(self):
        for year in (2022, 2028):
            month = load_oracle_month(year, 1)

            self.assertEqual(month["sourceFile"], f"{year}年时轮历-check.xlsx")
            self.assertEqual(len(month["days"]), 30)


if __name__ == "__main__":
    unittest.main()
