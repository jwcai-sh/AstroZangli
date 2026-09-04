#!/usr/bin/env python3
"""Seed the local five-elements comparison SQLite database."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from five_elements_compare import fetch_website_month
from five_elements_compare_store import DEFAULT_DB_PATH, FiveElementsCompareStore
from matlab_oracle import load_oracle_month


def seed_oracle(store: FiveElementsCompareStore, start_year: int, end_year: int) -> int:
    saved = 0
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            try:
                store.save_month_source(year, month, "matlab_oracle", load_oracle_month(year, month))
                saved += 1
            except FileNotFoundError:
                continue
    return saved


def seed_website(store: FiveElementsCompareStore, start_year: int, end_year: int) -> tuple[int, int]:
    saved = 0
    failed = 0
    for year in range(start_year, end_year + 1):
        for month in range(1, 13):
            try:
                _, website_month = fetch_website_month(year, month)
                store.save_month_source(year, month, "website", website_month)
                saved += 1
            except requests.exceptions.RequestException:
                failed += 1
            except ValueError:
                failed += 1
    return saved, failed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-year", type=int, default=2020)
    parser.add_argument("--end-year", type=int, default=2028)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--include-website", action="store_true")
    args = parser.parse_args()

    store = FiveElementsCompareStore(args.db)
    oracle_saved = seed_oracle(store, args.start_year, args.end_year)
    print(f"matlab_oracle saved: {oracle_saved}")

    if args.include_website:
        website_saved, website_failed = seed_website(store, args.start_year, args.end_year)
        print(f"website saved: {website_saved}; failed: {website_failed}")

    print(f"database: {args.db}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
