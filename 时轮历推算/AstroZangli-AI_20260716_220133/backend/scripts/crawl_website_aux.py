#!/usr/bin/env python3
"""Crawl five-planets daily data and annual Rahu data with a resumable queue."""

import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from website_aux_crawler import run_worker
from five_elements_compare_store import DEFAULT_DB_PATH


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-year", type=int, default=1)
    parser.add_argument("--end-year", type=int, default=2500)
    parser.add_argument("--dataset", choices=("all", "five_planets", "rahu"), default="all")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--max-requests", type=int, default=0)
    parser.add_argument("--max-consecutive-failures", type=int, default=10)
    parser.add_argument("--resume-existing", action="store_true", help="resume without seeding or resetting the existing queue")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--log-file", type=Path)
    args = parser.parse_args()
    if not 1 <= args.start_year <= args.end_year <= 2500 or args.interval < 1 or args.max_consecutive_failures < 1 or args.max_requests < 0:
        parser.error("require years 1..2500 and interval >= 1 second")
    return run_worker(
        args.db,
        args.start_year,
        args.end_year,
        interval=args.interval,
        dataset=args.dataset,
        log_file=args.log_file,
        max_requests=args.max_requests,
        max_consecutive_failures=args.max_consecutive_failures,
        resume_existing=args.resume_existing,
    )


if __name__ == "__main__":
    raise SystemExit(main())
