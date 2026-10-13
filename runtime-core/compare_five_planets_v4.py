#!/usr/bin/env python3
"""Strict 21-field V4 reference audit. Missing data never counts as a match."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3

from compare_five_planets_v2 import DEFAULT_DB, normalize_website
from shilun_five_planets_v4 import ENGINE, FIELDS, calculate_day

EXPECTED_DAYS = 2500 * 12 * 30


def compare_day(year, month, day, payload, source_url=""):
    python = calculate_day(year, month, day)
    available = bool(payload and payload.get("available") and not payload.get("error"))
    website = normalize_website(payload) if available else None
    pairs = [("共同", "五曜公积日", python["五曜公积日"], website.get("五曜公积日") if website else None)]
    for name, values in python["planets"].items():
        for field in FIELDS:
            ref = website.get("planets", {}).get(name, {}).get(field) if website else None
            pairs.append((name, field, values[field], ref))
    rows = [{"planet": name, "field": field, "python": value, "website": ref,
             "status": "missing" if ref is None else "match" if value == ref else "different"}
            for name, field, value, ref in pairs]
    counts = Counter(row["status"] for row in rows)
    return {"year": year, "month": month, "day": day, "python": python,
            "websiteAvailable": available, "sourceUrl": source_url, "rows": rows,
            "counts": {key: counts[key] for key in ("match", "different", "missing")},
            "limitations": ["方向及网站额外日曜未对照；仅编号月份double_cal=0。",
                            "缓存覆盖不是公元1–2500年全量验证；网站兼容口径不等于文献V3。"]}


def audit_database(path=DEFAULT_DB):
    counts, differences, by_year = Counter(), Counter(), {}
    exceptions = []
    cache_digest = hashlib.sha256()
    with sqlite3.connect(Path(path).resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        db.execute("BEGIN")
        for y, m, d, raw, url in db.execute(
            "SELECT year,month,day,payload_json,source_url FROM website_five_planets "
            "WHERE year BETWEEN 1 AND 2500 ORDER BY year,month,day"
        ):
            cache_digest.update(json.dumps([y, m, d, raw], ensure_ascii=False).encode())
            counts["cached_days"] += 1
            payload = json.loads(raw)
            if not payload.get("available") or payload.get("error"):
                counts["invalid_reference_days"] += 1
                continue
            result = compare_day(y, m, d, payload, url)
            counts["compared_days"] += 1
            year_counts = by_year.setdefault(str(y), Counter())
            year_counts["compared_days"] += 1
            bad = result["counts"]["different"] > 0
            missing = result["counts"]["missing"] > 0
            counts["different_days"] += bad
            counts["missing_field_days"] += missing
            year_counts["different_days"] += bad
            year_counts["missing_field_days"] += missing
            for row in result["rows"]:
                counts[row["status"] + "_fields"] += 1
                if row["status"] != "match":
                    key = f"{row['planet']}/{row['field']}/{row['status']}"
                    differences[key] += 1
                    exceptions.append({"year": y, "month": m, "day": d, **row})
    for key in ("cached_days", "compared_days", "invalid_reference_days", "different_days",
                "missing_field_days", "match_fields", "different_fields", "missing_fields"):
        counts.setdefault(key, 0)
    counts["expected_days"] = EXPECTED_DAYS
    counts["not_validated_days"] = EXPECTED_DAYS - counts["compared_days"]
    return {"engine": ENGINE, "generated_at": datetime.now(timezone.utc).isoformat(),
            "calculator_sha256": hashlib.sha256(Path(__file__).with_name("shilun_five_planets_v4.py").read_bytes()).hexdigest(),
            "cache_payload_sha256": cache_digest.hexdigest(),
            "counts": dict(counts), "differences": dict(differences),
            "years": by_year, "exceptions": exceptions,
            "acceptance_passed": bool(counts["compared_days"] and not counts["different_fields"] and not counts["missing_fields"]),
            "scope": "Full arrays of all21groups in available cache; no direction/day-sun; default double_cal=0"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--output", type=Path, help="Optional generated audit JSON, not a calculation cache")
    args = parser.parse_args()
    result = audit_database(args.db)
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
