#!/usr/bin/env python3
"""Precompute versioned Python monthly results for the comparison database."""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import matlab_final_runtime
from five_elements_compare_store import DEFAULT_DB_PATH, FiveElementsCompareStore


def fingerprint():
    paths = [matlab_final_runtime.FINAL_SOURCE_PATH, Path(matlab_final_runtime.__file__)]
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}


def validate(payload):
    assert [d['day'] for d in payload['days']] == list(range(1, 31))
    for day in payload['days']:
        for field, size in [('定曜', 6), ('月伴星宿', 6), ('定日', 5), ('会合', 6), ('作用', 1)]:
            assert len(day[field]) == size, (day['day'], field)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start-year', type=int, default=1)
    parser.add_argument('--end-year', type=int, default=2500)
    parser.add_argument('--db', type=Path, default=DEFAULT_DB_PATH)
    args = parser.parse_args()
    if not 1 <= args.start_year <= args.end_year:
        parser.error('require 1 <= start-year <= end-year')
    store = FiveElementsCompareStore(args.db)
    hashes = fingerprint()
    saved = skipped = 0
    for year in range(args.start_year, args.end_year + 1):
        for month in range(1, 13):
            old = store.load_month_source(year, month, 'python_final')
            if old and old.get('sourceHashes') == hashes:
                validate(old)
                skipped += 1
                continue
            payload = matlab_final_runtime.build_month_records(year, month)
            validate(payload)
            if fingerprint() != hashes:
                raise RuntimeError('Calculation source changed during precomputation; rerun.')
            payload.update(year=year, month=month, doubleCal=0, sourceHashes=hashes,
                           calculatedAt=datetime.now(timezone.utc).isoformat())
            store.save_month_source(year, month, 'python_final', payload)
            saved += 1
        if year % 100 == 0 or year == args.end_year:
            print(json.dumps({'year': year, 'saved': saved, 'skipped': skipped}), flush=True)
    print(f'database: {args.db}; source: python_final', flush=True)


if __name__ == '__main__':
    main()
