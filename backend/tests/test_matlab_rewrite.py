from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from matlab_rewrite import build_day_record, build_month_records, build_month_summary


class MatlabRewriteTests(unittest.TestCase):
    def test_current_local_branch_matches_matlab_month_state(self):
        summary = build_month_summary(2026, 10)

        self.assertEqual(summary["积月闰余"], [490, 42])
        self.assertEqual(summary["曜基数"], [4, 10, 42, 5, 101])
        self.assertEqual(summary["整零数"], [25, 76])
        self.assertEqual(summary["太阳基数"], [16, 35, 22, 2, 22])

    def test_candidate_leap_transition_matches_the_other_matlab_branch(self):
        summary = build_month_summary(2026, 10, mode="candidate_leap_transition")

        self.assertEqual(summary["积月闰余"], [489, 40])
        self.assertEqual(summary["曜基数"], [2, 38, 52, 4, 328])
        self.assertEqual(summary["整零数"], [23, 75])
        self.assertEqual(summary["太阳基数"], [14, 24, 24, 1, 5])

    def test_day_record_follows_matlab_script_chain(self):
        record = build_day_record(2026, 10, 1)

        self.assertEqual(record["定曜"], [4, 54, 24, 4, 52, 28])
        self.assertEqual(record["月伴星宿"], [16, 30, 56, 5, 5, 679])
        self.assertEqual(record["定日"], [16, 31, 21, 3, 58])
        self.assertEqual(record["会合"], [6, 2, 18, 2, 63, 679])

    def test_month_records_returns_exactly_thirty_tibetan_days(self):
        records = build_month_records(2026, 10)

        self.assertEqual(len(records["days"]), 30)
        self.assertEqual(records["days"][0]["day"], 1)
        self.assertEqual(records["days"][-1]["day"], 30)


if __name__ == "__main__":
    unittest.main()
