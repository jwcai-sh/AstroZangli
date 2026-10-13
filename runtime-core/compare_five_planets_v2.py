#!/usr/bin/env python3
"""Read-only reference-cache comparison; missing records never count as matches."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sqlite3

from shilun_five_planets_v2 import FIELDS, PLANETS, calculate_day, compute_planet

DEFAULT_DB = Path(__file__).resolve().parents[1] / "AstroZangli-AI_20260716_220133/backend/data/five_elements_compare.sqlite3"


def normalize_website(payload):
    result = {"planets": {}}
    for section in payload.get("sections", []):
        name = section["name"]
        for column in section["columns"]:
            if name == "五曜公积日":
                result[name] = column["values"]
            elif column["label"] in PLANETS and name in FIELDS:
                result["planets"].setdefault(column["label"], {})[name] = column["values"]
    return result


def compare_day(year, month, day, payload, source_url=""):
    python = calculate_day(year, month, day)
    website = normalize_website(payload) if payload else None
    rows = []
    pairs = [("共同", "五曜公积日", python["五曜公积日"], website.get("五曜公积日") if website else None)]
    for planet, values in python["planets"].items():
        for field in FIELDS:
            reference = website.get("planets", {}).get(planet, {}).get(field) if website else None
            pairs.append((planet, field, values[field], reference))
    for planet, field, value, reference in pairs:
        rows.append({"planet": planet, "field": field, "python": value, "website": reference,
                     "status": "missing" if reference is None else "match" if value == reference else "different"})
    counts = Counter(row["status"] for row in rows)
    return {"year": year, "month": month, "day": day, "python": python,
            "websiteAvailable": bool(payload and payload.get("available") and not payload.get("error")),
            "sourceUrl": source_url, "rows": rows,
            "counts": {key: counts[key] for key in ("match", "different", "missing")},
            "limitations": ["方向及日曜未参与对照；未抓取的日期不是一致。", "忠实复现 MATLAB v3，尚未校准为网站算法。"]}


def audit_database(path=DEFAULT_DB):
    counts = Counter()
    differences = Counter()
    input_diagnostic = Counter()
    inferred_constants = {planet: Counter() for planet in PLANETS}
    examples = []
    with sqlite3.connect(Path(path).resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        for year, month, day, raw, url in db.execute(
            "SELECT year,month,day,payload_json,source_url FROM website_five_planets WHERE year BETWEEN 1 AND 2500 ORDER BY year,month,day"
        ):
            payload = json.loads(raw)
            if not payload.get("available") or payload.get("error"):
                counts["invalid_reference_days"] += 1
                continue
            comparison = compare_day(year, month, day, payload, url)
            counts["compared_days"] += 1
            counts["different_days"] += comparison["counts"]["different"] > 0
            counts["missing_field_days"] += comparison["counts"]["missing"] > 0
            for row in comparison["rows"]:
                counts[row["status"] + "_fields"] += 1
                if row["status"] != "match":
                    differences[f"{row['planet']}/{row['field']}/{row['status']}"] += 1
            # Controlled diagnosis only: feed the site's common-day integer into
            # the untouched planet formulas. This is not the calculated output.
            website = normalize_website(payload)
            if "五曜公积日" in website:
                for p, planet in enumerate(PLANETS):
                    controlled = compute_planet(website["五曜公积日"][0], p)
                    shuri = website["planets"].get(planet, {}).get("五曜殊日")
                    if shuri:
                        constant = (shuri[-1] - website["五曜公积日"][0] * (1, 100, 1, 10, 1)[p]) % (687, 8797, 4332, 2247, 10766)[p]
                        inferred_constants[planet][constant] += 1
                    for field in FIELDS:
                        ref = website["planets"].get(planet, {}).get(field)
                        if ref is not None and controlled[field] != ref:
                            input_diagnostic[f"{planet}/{field}"] += 1
            if len(examples) < 3 and comparison["counts"]["different"]:
                examples.append(comparison)
    counts["expected_days"] = 2500 * 12 * 30
    counts["not_validated_days"] = counts["expected_days"] - counts["compared_days"]
    return {"counts": dict(counts), "differences": dict(differences),
            "website_common_day_controlled_mismatches": dict(input_diagnostic),
            "website_inferred_modulo_constants": {name: dict(values) for name, values in inferred_constants.items()},
            "examples": examples}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    print(json.dumps(audit_database(args.db), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
