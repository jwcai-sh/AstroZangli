from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from matlab_oracle import load_oracle_month


class MatlabOracleTests(unittest.TestCase):
    def test_latest_matlab_oracle_contains_2027_march(self):
        month = load_oracle_month(2027, 3)

        self.assertEqual(month["sourceFile"], "2027年时轮历-check.xlsx")
        self.assertEqual(month["summary"]["积月闰余"], [494, 50])
        self.assertEqual(month["days"][0]["定曜"], [4, 52, 2, 1, 29, 230])
        self.assertEqual(month["days"][0]["定日"], [25, 33, 54, 1, 65])

    def test_oracle_is_missing_for_unexported_year(self):
        with self.assertRaises(FileNotFoundError):
            load_oracle_month(1999, 1)

    def test_oracle_contains_years_from_results_folder(self):
        for year in (2022, 2029):
            month = load_oracle_month(year, 1)

            self.assertEqual(month["sourceFile"], f"{year}年时轮历-check.xlsx")
            self.assertEqual(len(month["days"]), 30)


if __name__ == "__main__":
    unittest.main()
