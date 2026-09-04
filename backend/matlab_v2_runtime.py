"""Adapter for the user-supplied shilun_calendar_months12_compare_v2 program."""

from __future__ import annotations

import importlib.util
from functools import lru_cache
from pathlib import Path
from types import ModuleType


V2_SOURCE_PATH = (
    Path(__file__).resolve().parents[2]
    / "程序-时轮历"
    / "shilun_calendar_months12_compare_v2.py"
)


@lru_cache(maxsize=1)
def _load_v2_module() -> ModuleType:
    if not V2_SOURCE_PATH.exists():
        raise FileNotFoundError(f"v2 calculation program not found: {V2_SOURCE_PATH}")

    spec = importlib.util.spec_from_file_location("shilun_calendar_months12_compare_v2", V2_SOURCE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load v2 calculation program: {V2_SOURCE_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_month_records(year: int, month: int) -> dict:
    """Map the v2 workbook calculation output to the compare-page schema."""
    module = _load_v2_module()
    result = module.calculate_month(year, month, 0)

    return {
        "engine": "shilun_calendar_months12_compare_v2",
        "engineLabel": "Python v2（shilun_calendar_months12_compare_v2.py）",
        "summary": {
            "积月闰余": [int(result["jiyue"]), int(result["runyu"])],
            "曜基数": list(result["yao_base"]),
            "整零数": [int(result["rewo"]), int(result["qiaxi"])],
            "太阳基数": list(result["sun_base"]),
        },
        "days": [
            {
                "day": row["date"],
                "定曜": list(row["ding_yao"]),
                "月伴星宿": list(row["taiyang"]),
                "定日": list(row["ding_sun"]),
                "会合": list(row["huihe"]),
                "作用": [str(row["zuoyong"])],
            }
            for row in result["rows"]
        ],
    }
