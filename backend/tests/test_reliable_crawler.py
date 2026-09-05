import sqlite3
import unittest
from scripts.crawl_website_reliable import initialize, retry_delay


class CrawlerTests(unittest.TestCase):
    def test_queue_restart(self):
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE five_elements_month_sources(year,month,source,payload_json)')
        initialize(db, 2000, 2001)
        self.assertEqual(db.execute('SELECT count(*) FROM website_crawl_queue').fetchone()[0], 24)
        db.execute("UPDATE website_crawl_queue SET status='retry',attempts=3,next_attempt=123 WHERE month=1")
        initialize(db, 2000, 2001)
        self.assertEqual(db.execute('SELECT attempts,next_attempt FROM website_crawl_queue WHERE year=2000 AND month=1').fetchone(), (3, 123))
        db.close()

    def test_backoff(self):
        self.assertGreaterEqual(retry_delay(1), 60)
        self.assertGreaterEqual(retry_delay(2), 120)
        self.assertGreaterEqual(retry_delay(1, '900'), 900)
        self.assertLess(retry_delay(100), 21611)
        self.assertGreaterEqual(retry_delay(1, 'invalid'), 60)
