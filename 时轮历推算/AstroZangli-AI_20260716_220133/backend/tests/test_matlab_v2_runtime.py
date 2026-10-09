from pathlib import Path
import sys
import unittest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from matlab_v2_runtime import build_month_records
except ModuleNotFoundError:
    build_month_records = None


class MatlabV2RuntimeTests(unittest.TestCase):
    def test_v2_month_records_expose_compare_page_field_mapping(self):
        self.assertIsNotNone(build_month_records)
        assert build_month_records is not None

        month = build_month_records(2027, 3)

        self.assertEqual(month["engine"], "shilun_calendar_months12_compare_v2")
        self.assertEqual(month["summary"]["积月闰余"], [495, 52])
        self.assertEqual(month["days"][0]["定曜"], [6, 22, 24, 3, 31, 3])
        self.assertEqual(month["days"][0]["月伴星宿"], [1, 16, 55, 2, 35, 704])
        self.assertEqual(month["days"][0]["定日"], [0, 45, 20, 0, 0])
        self.assertEqual(month["days"][0]["会合"], [2, 2, 15, 2, 35, 704])


if __name__ == "__main__":
    unittest.main()
