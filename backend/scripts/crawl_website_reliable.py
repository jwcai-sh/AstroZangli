#!/usr/bin/env python3
"""Rate-limited, resumable website crawler with a durable retry queue."""

import argparse
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import random
import signal
import sqlite3
import sys
import time
from pathlib import Path
from email.utils import parsedate_to_datetime

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from five_elements_compare import parse_website_month_html
from five_elements_compare_store import DEFAULT_DB_PATH, FiveElementsCompareStore
from five_elements_range import valid_days

URL = 'http://astro.xzzzqzyy.com/dba/twlsdata/per/wysz/search'
STOP = False


def retry_delay(attempt, retry_after=None):
    delay = min(21600, 30 * 2 ** min(attempt, 10)) + random.uniform(0, 10)
    if retry_after:
        try:
            server_delay = float(retry_after)
        except ValueError:
            try:
                server_delay = parsedate_to_datetime(retry_after).timestamp() - time.time()
            except (ValueError, TypeError, OverflowError):
                server_delay = 0
        delay = max(delay, server_delay)
    return delay


def initialize(db, start, end):
    db.execute('''CREATE TABLE IF NOT EXISTS website_crawl_queue (
        year INTEGER, month INTEGER, attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending',
        error TEXT NOT NULL DEFAULT '', PRIMARY KEY(year,month))''')
    with db:
        db.executemany('INSERT OR IGNORE INTO website_crawl_queue(year,month) VALUES (?,?)',
                       ((y, m) for y in range(start, end + 1) for m in range(1, 13)))
        for y, m, raw in db.execute("SELECT year,month,payload_json FROM five_elements_month_sources WHERE source='website' AND year BETWEEN ? AND ?", (start, end)).fetchall():
            try:
                valid = valid_days(json.loads(raw))
            except (ValueError, TypeError, KeyError):
                valid = False
            if valid:
                db.execute("UPDATE website_crawl_queue SET status='done',error='' WHERE year=? AND month=?", (y, m))
            else:
                db.execute("UPDATE website_crawl_queue SET status='pending' WHERE year=? AND month=?", (y, m))
        db.execute("UPDATE website_crawl_queue SET status='pending' WHERE status='done' AND NOT EXISTS (SELECT 1 FROM five_elements_month_sources s WHERE s.year=website_crawl_queue.year AND s.month=website_crawl_queue.month AND s.source='website')")


def pause(seconds):
    until = time.monotonic() + seconds
    while not STOP and time.monotonic() < until:
        time.sleep(min(1, max(0, until - time.monotonic())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start-year', type=int, default=1)
    parser.add_argument('--end-year', type=int, default=2500)
    parser.add_argument('--interval', type=float, default=2)
    parser.add_argument('--max-requests', type=int, default=0)
    parser.add_argument('--db', type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument('--log-file', type=Path)
    args = parser.parse_args()
    if not 1 <= args.start_year <= args.end_year <= 2500 or args.interval < 1:
        parser.error('require years 1..2500 and interval >= 1 second')
    handlers = [logging.StreamHandler()]
    if args.log_file:
        args.log_file.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(RotatingFileHandler(args.log_file, maxBytes=5000000, backupCount=3))
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s', handlers=handlers)
    store = FiveElementsCompareStore(args.db)
    lock = open(str(args.db) + '.crawler.lock', 'a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        parser.exit(1, 'Another reliable crawler is already running.\n')
    def stop(signum, frame):
        global STOP
        STOP = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    db = sqlite3.connect(args.db, timeout=30)
    initialize(db, args.start_year, args.end_year)
    session = requests.Session()
    session.headers['User-Agent'] = 'KalachakraResearchCache/1.0 (single-worker calendar comparison)'
    failures = requests_count = 0
    logging.info('START years=%s..%s interval=%s', args.start_year, args.end_year, args.interval)
    try:
        while not STOP:
            row = db.execute('''SELECT year,month,attempts FROM website_crawl_queue
                WHERE status!='done' AND year BETWEEN ? AND ? AND next_attempt<=?
                ORDER BY CASE WHEN year BETWEEN 1900 AND 2035 THEN 0 ELSE 1 END,
                attempts,year,month LIMIT 1''', (args.start_year, args.end_year, time.time())).fetchone()
            if not row:
                remaining = db.execute("SELECT count(*) FROM website_crawl_queue WHERE status!='done' AND year BETWEEN ? AND ?", (args.start_year, args.end_year)).fetchone()[0]
                if not remaining:
                    logging.info('COMPLETE'); break
                pause(30); continue
            year, month, attempts = row
            response = None
            try:
                response = session.get(URL, params={'year': year, 'month': month}, timeout=(8, 25))
                response.raise_for_status()
                _, payload = parse_website_month_html(year, month, response.text)
                if not valid_days(payload):
                    raise ValueError('Incomplete daily fields')
                # Confirm the response is the requested month, not a default page.
                import re
                title = re.search(r'公元\s*(\d+)\s*年藏历.*?(\d+)月', payload['label'])
                if not title or (int(title[1]), int(title[2])) != (year, month):
                    raise ValueError('Response year/month mismatch')
                payload['sourceUrl'] = response.url
                payload['fetchedAt'] = time.time()
                store.save_month_source(year, month, 'website', payload)
                with db:
                    db.execute("UPDATE website_crawl_queue SET status='done',attempts=?,error='' WHERE year=? AND month=?", (attempts+1, year, month))
                failures = 0
                logging.info('SAVED %s-%02d', year, month)
            except (requests.RequestException, ValueError) as error:
                failures += 1
                delay = retry_delay(attempts+1, response.headers.get('Retry-After') if response is not None else None)
                if response is not None and response.status_code in (403, 429):
                    delay = max(900, delay)
                with db:
                    db.execute("UPDATE website_crawl_queue SET status='retry',attempts=?,next_attempt=?,error=? WHERE year=? AND month=?", (attempts+1, time.time()+delay, str(error)[:500], year, month))
                logging.warning('RETRY %s-%02d in %.0fs: %s', year, month, delay, type(error).__name__)
                if failures >= 5 or (response is not None and response.status_code in (403, 429)):
                    cooldown = max(120, delay)
                    logging.warning('COOLDOWN %.0fs', cooldown)
                    pause(cooldown)
                    failures = 0
            requests_count += 1
            if args.max_requests and requests_count >= args.max_requests:
                break
            pause(args.interval + random.uniform(0, 1))
    finally:
        logging.info('STOP queue=%s', db.execute('SELECT status,count(*) FROM website_crawl_queue GROUP BY status').fetchall())
        session.close(); db.close(); lock.close()


if __name__ == '__main__':
    main()
