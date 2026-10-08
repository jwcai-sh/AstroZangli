"""Read-only comparison against the already downloaded five-planets records."""
import json
import hashlib
from pathlib import Path
import sqlite3
from collections import Counter
import sys

from flask import Blueprint, jsonify, request

CORE = Path(__file__).resolve().parents[2] / "程序-时轮历"
MONTH_CORE = CORE / "五要素-网站对照版python算法"
if str(MONTH_CORE) not in sys.path:
    sys.path.insert(0, str(MONTH_CORE))
if str(CORE) not in sys.path:
    sys.path.insert(0, str(CORE))
from compare_five_planets_v4 import DEFAULT_DB, EXPECTED_DAYS, compare_day


def saved_verification():
    """Show the dated audit only if it belongs to the current calculator."""
    try:
        report = json.loads((CORE / "five_planets_v4_audit.json").read_text(encoding="utf-8"))
        actual = hashlib.sha256((CORE / "shilun_five_planets_v4.py").read_bytes()).hexdigest()
        if actual != report["calculator_sha256"]:
            return None
        return {"generatedAt": report["generated_at"], "counts": report["counts"],
                "passed": report["acceptance_passed"]}
    except (OSError, ValueError, KeyError):
        return None

bp = Blueprint("five_planets_compare", __name__)


def _validate_date(year, month, day=None):
    values = (year, month) if day is None else (year, month, day)
    if any(type(value) is not int for value in values):
        raise ValueError("年份、月份和日期必须为整数")
    if not 1 <= year <= 2500 or not 1 <= month <= 12:
        raise ValueError("年份 1–2500，月份 1–12")
    if day is not None and not 1 <= day <= 30:
        raise ValueError("日期必须为 1–30")


def _validate_range(start, end):
    if any(type(value) is not int for value in (start, end)):
        raise ValueError("起始年份和结束年份必须为整数")
    if not 1 <= start <= end <= 2500:
        raise ValueError("年份必须在 1–2500 内，起始年不晚于结束年")


def _read_cached_records(start, end, db_path=DEFAULT_DB):
    """Read a bounded website snapshot once; comparison never writes the DB."""
    with sqlite3.connect(Path(db_path).resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        rows = db.execute(
            "SELECT year, month, day, payload_json, source_url "
            "FROM website_five_planets WHERE year BETWEEN ? AND ?",
            (start, end),
        ).fetchall()
    records = {}
    for year, month, day, payload_json, source_url in rows:
        records[(year, month, day)] = (json.loads(payload_json), source_url)
    return records


def _daily_status(result):
    counts = result["counts"]
    if counts["missing"]:
        return "missing"
    return "different" if counts["different"] else "match"


def _monthly_stats(days):
    field_counts = Counter()
    for item in days:
        for row in item["rows"]:
            if row["status"] == "different":
                field_counts[f"{row['planet']}/{row['field']}"] += 1
    compared = sum(item["websiteAvailable"] for item in days)
    matching = sum(item["status"] == "match" for item in days)
    different = sum(item["status"] == "different" for item in days)
    missing = len(days) - compared
    return {
        "expectedDays": len(days),
        "comparedDays": compared,
        "matchingDays": matching,
        "differentDays": different,
        "missingDays": missing,
        "fieldDifferenceCounts": dict(field_counts),
        "matchFieldCount": sum(item["counts"]["match"] for item in days),
        "differentFieldCount": sum(item["counts"]["different"] for item in days),
        "missingFieldCount": sum(item["counts"]["missing"] for item in days),
    }


def _build_month_compare_from_records(year, month, records):
    _validate_date(year, month)
    days = []
    for day in range(1, 31):
        payload, source_url = records.get((year, month, day), (None, ""))
        available = bool(payload and payload.get("available") and not payload.get("error"))
        result = compare_day(year, month, day, payload if available else None, source_url)
        status = _daily_status(result)
        days.append({
            "day": day,
            "websiteAvailable": available,
            "sourceUrl": source_url,
            "status": status,
            "counts": result["counts"],
            "rows": result["rows"],
            "python": result["python"],
        })

    stats = _monthly_stats(days)
    if stats["missingDays"]:
        status = "unavailable"
    elif stats["differentDays"]:
        status = "difference"
    else:
        status = "match"
    return {
        "year": year,
        "month": month,
        "status": status,
        "hasDifferences": bool(stats["differentDays"]),
        "days": days,
        "stats": stats,
        "sourceUrl": next((item["sourceUrl"] for item in days if item["sourceUrl"]), ""),
        "verification": saved_verification(),
    }


def _month_summary(monthly):
    stats = monthly["stats"]
    return {
        "month": monthly["month"],
        "status": monthly["status"],
        "hasDifferences": monthly["hasDifferences"],
        "comparedDays": stats["comparedDays"],
        "expectedDays": stats["expectedDays"],
        "matchingDays": stats["matchingDays"],
        "differentDays": stats["differentDays"],
        "missingDays": stats["missingDays"],
        "differentFieldCount": stats["differentFieldCount"],
    }


def _aggregate_months(months):
    return {
        "monthCount": len(months),
        "completeMonthCount": sum(item["status"] != "unavailable" for item in months),
        "matchingMonthCount": sum(item["status"] == "match" for item in months),
        "differentMonthCount": sum(item["hasDifferences"] for item in months),
        "unavailableMonthCount": sum(item["status"] == "unavailable" for item in months),
        "comparedDays": sum(item["comparedDays"] for item in months),
        "matchingDays": sum(item["matchingDays"] for item in months),
        "differentDays": sum(item["differentDays"] for item in months),
        "missingDays": sum(item["missingDays"] for item in months),
        "differentFieldCount": sum(item["differentFieldCount"] for item in months),
    }


def build_compare(year, month, day, db_path=DEFAULT_DB):
    _validate_date(year, month, day)
    with sqlite3.connect(Path(db_path).resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        record = db.execute("SELECT payload_json,source_url FROM website_five_planets WHERE year=? AND month=? AND day=?", (year, month, day)).fetchone()
        cached_days = db.execute(
            "SELECT COUNT(*) FROM website_five_planets WHERE year BETWEEN 1 AND 2500 "
            "AND month BETWEEN 1 AND 12 AND day BETWEEN 1 AND 30 "
            "AND json_extract(payload_json,'$.available')=1 "
            "AND COALESCE(json_extract(payload_json,'$.error'),'')=''"
        ).fetchone()[0]
    payload = json.loads(record[0]) if record else None
    if payload and (not payload.get("available") or payload.get("error")):
        payload = None
    result = compare_day(year, month, day, payload, record[1] if record else "")
    result["coverage"] = {"cachedDays": cached_days, "expectedDays": EXPECTED_DAYS,
                          "uncachedDays": EXPECTED_DAYS - cached_days}
    result["verification"] = saved_verification()
    return result


def build_daily_query(year, month, day, db_path=DEFAULT_DB):
    """Return the cached reference-site daily page data without comparison fields."""
    _validate_date(year, month, day)
    with sqlite3.connect(Path(db_path).resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        record = db.execute(
            "SELECT payload_json, source_url FROM website_five_planets "
            "WHERE year=? AND month=? AND day=?",
            (year, month, day),
        ).fetchone()

    payload = json.loads(record[0]) if record else None
    available = bool(payload and payload.get("available") and not payload.get("error"))
    return {
        "year": year,
        "month": month,
        "day": day,
        "label": payload.get("label", f"公元{year}年藏历{month}月{day}日") if payload else "",
        "summary": payload.get("summary", {}) if available else {},
        "sections": payload.get("sections", []) if available else [],
        "sourceUrl": record[1] if record else "",
        "available": available,
        "error": payload.get("error", "") if payload else "",
    }


def build_month_compare(year, month, db_path=DEFAULT_DB):
    _validate_date(year, month)
    return _build_month_compare_from_records(year, month, _read_cached_records(year, year, db_path))


def build_year_compare(year, db_path=DEFAULT_DB):
    if type(year) is not int or not 1 <= year <= 2500:
        raise ValueError("年份必须在 1–2500 内")
    records = _read_cached_records(year, year, db_path)
    month_details = [_build_month_compare_from_records(year, month, records) for month in range(1, 13)]
    months = [_month_summary(item) for item in month_details]
    return {
        "year": year,
        "months": months,
        "stats": _aggregate_months(months),
        "verification": saved_verification(),
    }


def build_range_compare(start, end, db_path=DEFAULT_DB):
    _validate_range(start, end)
    records = _read_cached_records(start, end, db_path)
    cached_months = {(year, month) for year, month, _ in records}
    years = []
    for year in range(start, end + 1):
        months = [
            _month_summary(_build_month_compare_from_records(year, month, records))
            if (year, month) in cached_months else {
                "month": month, "status": "unavailable", "hasDifferences": False,
                "comparedDays": 0, "expectedDays": 30, "matchingDays": 0,
                "differentDays": 0, "missingDays": 30, "differentFieldCount": 0,
            }
            for month in range(1, 13)
        ]
        years.append({"year": year, "months": months, "stats": _aggregate_months(months)})
    all_months = [month for year in years for month in year["months"]]
    return {
        "startYear": start,
        "endYear": end,
        "years": years,
        "stats": _aggregate_months(all_months),
        "verification": saved_verification(),
    }


@bp.post("/five-planets/daily-compare")
def daily_compare():
    data = request.get_json(silent=True) or {}
    try:
        if not isinstance(data, dict):
            raise ValueError("参数必须为JSON对象")
        values = [data.get(key) for key in ("year", "month", "day")]
        if any(type(value) is not int for value in values):
            raise ValueError("日期参数必须为整数")
        result = build_compare(*values)
    except ValueError as error:
        return jsonify(success=False, error=str(error)), 400
    except (sqlite3.Error, OSError):
        return jsonify(success=False, error="网站缓存不可用；未启动抓取。"), 503
    return jsonify(success=True, data=result)


@bp.post("/five-planets/daily-query")
def daily_query():
    data = request.get_json(silent=True) or {}
    try:
        if not isinstance(data, dict):
            raise ValueError("参数必须为JSON对象")
        values = [data.get(key) for key in ("year", "month", "day")]
        if any(type(value) is not int for value in values):
            raise ValueError("日期参数必须为整数")
        result = build_daily_query(*values)
    except ValueError as error:
        return jsonify(success=False, error=str(error)), 400
    except (sqlite3.Error, OSError):
        return jsonify(success=False, error="网站缓存不可用；未启动抓取。"), 503
    return jsonify(success=True, data=result)


def _json_object():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("参数必须为JSON对象")
    return data


@bp.post("/five-planets/monthly-compare")
def monthly_compare():
    try:
        data = _json_object()
        result = build_month_compare(data.get("year"), data.get("month"))
    except ValueError as error:
        return jsonify(success=False, error=str(error)), 400
    except (sqlite3.Error, OSError):
        return jsonify(success=False, error="网站缓存不可用；未启动抓取。"), 503
    return jsonify(success=True, data=result)


@bp.post("/five-planets/yearly-compare")
def yearly_compare():
    try:
        data = _json_object()
        result = build_year_compare(data.get("year"))
    except ValueError as error:
        return jsonify(success=False, error=str(error)), 400
    except (sqlite3.Error, OSError):
        return jsonify(success=False, error="网站缓存不可用；未启动抓取。"), 503
    return jsonify(success=True, data=result)


@bp.post("/five-planets/range-compare")
def range_compare():
    try:
        data = _json_object()
        result = build_range_compare(data.get("startYear"), data.get("endYear"))
    except ValueError as error:
        return jsonify(success=False, error=str(error)), 400
    except (sqlite3.Error, OSError):
        return jsonify(success=False, error="网站缓存不可用；未启动抓取。"), 503
    return jsonify(success=True, data=result)
