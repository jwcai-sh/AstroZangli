from __future__ import annotations

import re

import requests
import urllib3

from matlab_oracle import load_oracle_month
from matlab_final_runtime import build_month_records as build_python_month_records
from five_elements_compare_store import FiveElementsCompareStore


WEBSITE_BASE_URL = "http://astro.xzzzqzyy.com/dba/twlsdata/per/wysz/search"
TOP_GROUP_NAMES = ["积月闰余", "曜基数", "整零数", "太阳基数"]
DAY_GROUP_NAMES = ["定曜", "月伴星宿", "定日", "会合"]

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

_WEBSITE_CACHE: dict[tuple[int, int], tuple[str, dict]] = {}


def parse_numbers(fragment: str) -> list[int]:
    return [int(value) for value in re.findall(r"change_num\([\"']?(\d+)[\"']?, 'd'\)", fragment)]


def fetch_website_month(year: int, month: int) -> tuple[str, dict]:
    cache_key = (year, month)
    cached = _WEBSITE_CACHE.get(cache_key)
    if cached is not None:
        return cached

    response = requests.get(
        WEBSITE_BASE_URL,
        params={"year": year, "month": month},
        timeout=(5, 12),
        verify=False,
    )
    response.raise_for_status()

    result = parse_website_month_html(year, month, response.text)
    _WEBSITE_CACHE[cache_key] = result
    return result


def parse_website_month_html(year: int, month: int, html: str) -> tuple[str, dict]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")

    month_table = soup.select_one("dl.dl_month table")
    if month_table is None:
        raise ValueError("参考网站页面缺少月头汇总表")

    top_cells = month_table.find_all("td")[4:8]
    summary = {name: parse_numbers(str(cell)) for name, cell in zip(TOP_GROUP_NAMES, top_cells)}

    day_blocks = []
    for block in soup.select("dl.dl_day_group"):
        probe = block.select_one("td.group-column-0")
        numbers = parse_numbers(str(probe)) if probe is not None else []
        if numbers:
            day_blocks.append(block)

    if len(day_blocks) < 30:
        raise ValueError(f"参考网站页面有效日块不足 30 个，实际为 {len(day_blocks)}")

    days = []
    for index, block in enumerate(day_blocks[:30], start=1):
        day_data = {}
        for column, name in enumerate(DAY_GROUP_NAMES):
            cell = block.select_one(f"td.group-column-{column}")
            day_data[name] = parse_numbers(str(cell)) if cell is not None else []
        days.append({"day": index, **day_data})

    title_match = re.search(r"公元\s*(\d{1,4})\s*年藏历.*?(\d{1,2})月", soup.get_text(" ", strip=True))
    label = title_match.group(0) if title_match else f"公元{year}年藏历{month}月"

    result = html, {
        "label": label,
        "summary": summary,
        "days": days,
        "sourceUrl": f"{WEBSITE_BASE_URL}?year={year}&month={month}",
        "available": True,
        "error": "",
    }
    return result


def read_local_month(year: int, month: int) -> dict:
    # Keep this independently computed from the Excel oracle. The adapter
    # invokes the user-selected shilun_calendar_months12_compare_final.py.
    return build_python_month_records(year, month)


def _empty_website_month(year: int, month: int, error: str) -> tuple[str, dict]:
    return "", {
        "label": f"公元{year}年藏历{month}月",
        "summary": {name: [] for name in TOP_GROUP_NAMES},
        "days": [
            {"day": day, **{name: [] for name in DAY_GROUP_NAMES}}
            for day in range(1, 31)
        ],
        "sourceUrl": f"{WEBSITE_BASE_URL}?year={year}&month={month}",
        "available": False,
        "error": error,
    }


def _structured_day(day: dict, include_effect: bool = False) -> dict:
    structured = {
        "fixedWeekday": list(day["定曜"]),
        "lunarPartner": list(day["月伴星宿"]),
        "fixedDay": list(day["定日"]),
        "conjunction": list(day["会合"]),
    }
    if include_effect:
        structured["effect"] = list(day.get("作用", []))
    return structured


def _different_fields(left: dict, right: dict) -> list[str]:
    return [field for field in ["fixedWeekday", "lunarPartner", "fixedDay", "conjunction"] if left[field] != right[field]]


def build_five_elements_month_compare(
    year: int,
    month: int,
    store: FiveElementsCompareStore | None = None,
) -> dict:
    store = store or FiveElementsCompareStore()
    website_available = True
    website_error = ""
    website_cache_status = "miss"
    try:
        cached_website_month = store.load_month_source(year, month, "website")
        if cached_website_month is not None:
            website_html = ""
            website_month = cached_website_month
            website_cache_status = "hit"
        else:
            website_html, website_month = fetch_website_month(year, month)
            store.save_month_source(year, month, "website", website_month)
    except requests.exceptions.RequestException:
        website_available = False
        website_error = "参考网站连接超时或暂时不可达，请稍后重试"
        website_html, website_month = _empty_website_month(year, month, website_error)

    python_month = read_local_month(year, month)
    matlab_oracle_cache_status = "miss"
    try:
        cached_matlab_oracle = store.load_month_source(year, month, "matlab_final")
        if cached_matlab_oracle is not None:
            matlab_oracle = cached_matlab_oracle
            matlab_oracle_cache_status = "hit"
        else:
            matlab_oracle = load_oracle_month(year, month)
            store.save_month_source(year, month, "matlab_final", matlab_oracle)
    except FileNotFoundError:
        matlab_oracle = None

    oracle_available = matlab_oracle is not None

    summary = []
    different_python_matlab_summary_count = 0
    different_python_website_summary_count = 0
    different_matlab_website_summary_count = 0
    for name in TOP_GROUP_NAMES:
        python_values = list(python_month["summary"][name])
        matlab_values = list(matlab_oracle["summary"][name]) if matlab_oracle else []
        website_values = list(website_month["summary"][name])
        python_matlab_matches = oracle_available and python_values == matlab_values
        python_website_matches = website_available and python_values == website_values
        matlab_website_matches = website_available and oracle_available and matlab_values == website_values
        if not python_matlab_matches:
            different_python_matlab_summary_count += 1
        if not python_website_matches:
            different_python_website_summary_count += 1
        if not matlab_website_matches:
            different_matlab_website_summary_count += 1
        summary.append(
            {
                "label": name,
                "python": python_values,
                "matlabOracle": matlab_values,
                "website": website_values,
                "local": python_values,
                "matches": python_matlab_matches and python_website_matches,
                "pairwiseMatches": {
                    "pythonMatlab": python_matlab_matches,
                    "pythonWebsite": python_website_matches,
                    "matlabWebsite": matlab_website_matches,
                },
            }
        )

    days = []
    different_python_matlab_day_count = 0
    different_python_website_day_count = 0
    different_matlab_website_day_count = 0
    for python_day, matlab_day, website_day in zip(
        python_month["days"],
        matlab_oracle["days"] if matlab_oracle else [{} for _ in python_month["days"]],
        website_month["days"],
    ):
        python_structured = _structured_day(python_day, include_effect=True)
        matlab_structured = _structured_day(matlab_day) if matlab_oracle else {
            "fixedWeekday": [],
            "lunarPartner": [],
            "fixedDay": [],
            "conjunction": [],
        }
        website_structured = _structured_day(website_day)

        python_matlab_diff_fields = _different_fields(python_structured, matlab_structured) if matlab_oracle else []
        python_website_diff_fields = _different_fields(python_structured, website_structured) if website_available else []
        matlab_website_diff_fields = _different_fields(matlab_structured, website_structured) if website_available and matlab_oracle else []
        matches = not (
            python_matlab_diff_fields
            or python_website_diff_fields
            or matlab_website_diff_fields
        ) and oracle_available
        if python_matlab_diff_fields:
            different_python_matlab_day_count += 1
        if python_website_diff_fields:
            different_python_website_day_count += 1
        if matlab_website_diff_fields:
            different_matlab_website_day_count += 1

        days.append(
            {
                "day": python_day["day"],
                "python": python_structured,
                "matlabOracle": matlab_structured,
                "website": website_structured,
                "local": python_structured,
                "diffFields": python_website_diff_fields,
                "pairwiseDiffFields": {
                    "pythonMatlab": python_matlab_diff_fields,
                    "pythonWebsite": python_website_diff_fields,
                    "matlabWebsite": matlab_website_diff_fields,
                },
                "matches": matches,
            }
        )

    return {
        "year": year,
        "month": month,
        "summary": summary,
        "days": days,
        "stats": {
            "differentSummaryCount": different_python_website_summary_count,
            "differentDayCount": different_python_website_day_count,
            "differentPythonMatlabSummaryCount": different_python_matlab_summary_count,
            "differentPythonWebsiteSummaryCount": different_python_website_summary_count,
            "differentMatlabWebsiteSummaryCount": different_matlab_website_summary_count,
            "differentPythonMatlabDayCount": different_python_matlab_day_count,
            "differentPythonWebsiteDayCount": different_python_website_day_count,
            "differentMatlabWebsiteDayCount": different_matlab_website_day_count,
        },
        "sources": {
            "websiteUrl": website_month["sourceUrl"],
            "websiteLabel": website_month["label"],
            "websiteAvailable": website_month.get("available", True),
            "websiteError": website_month.get("error", ""),
            "websiteCacheStatus": website_cache_status,
            "pythonAlgorithm": python_month["engineLabel"],
            "pythonAlgorithmId": python_month["engine"],
            "localAlgorithm": python_month["engineLabel"],
            "localAlgorithmId": python_month["engine"],
            "matlabOracleFile": matlab_oracle["sourceFile"] if matlab_oracle else "未提供正确 Excel Oracle",
            "matlabOracleMode": " / ".join(filter(None, [matlab_oracle["sourceMode"], matlab_oracle.get("sourceProgram")])) if matlab_oracle else "missing",
            "matlabOracleAvailable": oracle_available,
            "matlabOracleCacheStatus": matlab_oracle_cache_status,
            "websiteHtmlLength": len(website_html),
        },
    }


def build_five_elements_year_compare(
    year: int,
    store: FiveElementsCompareStore | None = None,
) -> dict:
    """Summarize MATLAB-oracle versus reference-site differences for one year."""
    store = store or FiveElementsCompareStore()
    months = []

    for month in range(1, 13):
        try:
            monthly = build_five_elements_month_compare(year, month, store=store)
            sources = monthly.get("sources", {})
            website_available = sources.get("websiteAvailable", True)
            matlab_available = sources.get("matlabOracleAvailable", True)
            available = website_available and matlab_available
            website_error = sources.get("websiteError", "")
            if not available:
                item = {
                    "month": month,
                    "status": "unavailable",
                    "hasDifferences": False,
                    "differentSummaryCount": 0,
                    "differentDayCount": 0,
                    "differenceReasons": [],
                    "websiteAvailable": website_available,
                    "matlabOracleAvailable": matlab_available,
                    "websiteError": website_error,
                }
            else:
                stats = monthly["stats"]
                # The yearly map intentionally ignores month-head differences.
                # max() keeps the existing compact response contract without
                # falsely summing the same calendar day across source pairs.
                different_summary_count = max(
                    stats["differentPythonMatlabSummaryCount"],
                    stats["differentPythonWebsiteSummaryCount"],
                    stats["differentMatlabWebsiteSummaryCount"],
                )
                different_day_count = max(
                    stats["differentPythonMatlabDayCount"],
                    stats["differentPythonWebsiteDayCount"],
                    stats["differentMatlabWebsiteDayCount"],
                )
                difference_reasons = []
                if stats["differentPythonMatlabDayCount"]:
                    difference_reasons.append("Python / MATLAB")
                if stats["differentPythonWebsiteDayCount"]:
                    difference_reasons.append("Python / 网站")
                if stats["differentMatlabWebsiteDayCount"]:
                    difference_reasons.append("MATLAB / 网站")
                item = {
                    "month": month,
                    "status": "difference" if difference_reasons else "match",
                    "hasDifferences": bool(difference_reasons),
                    "differentSummaryCount": different_summary_count,
                    "differentDayCount": different_day_count,
                    "differenceReasons": difference_reasons,
                    "websiteAvailable": website_available,
                    "matlabOracleAvailable": matlab_available,
                    "websiteError": website_error,
                }
        except (FileNotFoundError, ValueError, requests.exceptions.RequestException) as error:
            item = {
                "month": month,
                "status": "unavailable",
                "hasDifferences": False,
                "differentSummaryCount": 0,
                "differentDayCount": 0,
                "differenceReasons": [],
                "websiteAvailable": False,
                "matlabOracleAvailable": False,
                "websiteError": str(error),
            }

        months.append(item)

    different_months = [item for item in months if item["status"] == "difference"]
    return {
        "year": year,
        "months": months,
        "differentMonths": different_months,
        "stats": {
            "differentMonthCount": len(different_months),
            "availableMonthCount": sum(item["status"] != "unavailable" for item in months),
            "unavailableMonthCount": sum(item["status"] == "unavailable" for item in months),
        },
    }
