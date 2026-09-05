import copy
import unittest
from five_elements_range import compare_range, fingerprint
from five_elements_compare_store import FiveElementsCompareStore


class RangeTests(unittest.TestCase):
    def setUp(self):
        self.store = FiveElementsCompareStore(':memory:')
        self.payload = {'sourceHashes': fingerprint(), 'days': [
            {'day': d, '定曜': [0]*6, '月伴星宿': [0]*6, '定日': [0]*5, '会合': [0]*6}
            for d in range(1, 31)]}

    def test_missing_is_not_match(self):
        self.assertTrue(all(m['status'] == 'unavailable' for m in compare_range(1, 1, store=self.store)['years'][0]['months']))

    def test_matching_and_detail(self):
        for source in ['python_final', 'website']:
            self.store.save_month_source(2500, 12, source, self.payload)
        result = compare_range(2500, 2500, 12, self.store)['years'][0]['months'][0]
        self.assertEqual(result['status'], 'match')
        self.assertEqual(len(result['days']), 30)
        changed = copy.deepcopy(self.payload)
        changed['days'][7]['定曜'][1] = 1
        self.store.save_month_source(2500, 12, 'website', changed)
        result = compare_range(2500, 2500, 12, self.store)['years'][0]['months'][0]
        self.assertEqual(result['differentDays'], [8])
        self.assertEqual(result['days'][7]['fields'], ['定曜'])

    def test_stale_and_incomplete(self):
        self.payload['sourceHashes'] = {}
        self.store.save_month_source(1, 1, 'python_final', self.payload)
        result = compare_range(1, 1, 1, self.store)['years'][0]['months'][0]
        self.assertIn('过期', result['reason'])
        self.payload['sourceHashes'] = fingerprint()
        self.store.save_month_source(1, 1, 'python_final', self.payload)
        self.payload['days'].pop()
        self.store.save_month_source(1, 1, 'website', self.payload)
        self.assertEqual(compare_range(1, 1, 1, self.store)['years'][0]['months'][0]['status'], 'unavailable')

    def test_bounds(self):
        for a, b in [(0, 1), (1, 2501), (2, 1), (1, 26)]:
            with self.assertRaises(ValueError):
                compare_range(a, b, store=self.store)
        with self.assertRaises(ValueError):
            compare_range(1, 2, 1, self.store)
