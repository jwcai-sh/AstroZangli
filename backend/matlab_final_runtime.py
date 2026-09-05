"""Adapter for the Python reproduction of the final MATLAB program."""

from __future__ import annotations

import importlib.util
from functools import lru_cache
from pathlib import Path
from types import ModuleType


FINAL_SOURCE_PATH = (
    Path(__file__).resolve().parents[2]
    / "程序-时轮历"
    / "shilun_calendar_months12_compare_final.py"
)


@lru_cache(maxsize=1)
def _load_final_module() -> ModuleType:
    if not FINAL_SOURCE_PATH.exists():
        raise FileNotFoundError(f"final calculation program not found: {FINAL_SOURCE_PATH}")

    spec = importlib.util.spec_from_file_location("shilun_calendar_months12_compare_final", FINAL_SOURCE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load final calculation program: {FINAL_SOURCE_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_month_records(year: int, month: int) -> dict:
    module = _load_final_module()
    result = module.calculate_month(year, month, 0)
    return {
        "engine": "shilun_calendar_months12_compare_final",
        "engineLabel": "Python final（shilun_calendar_months12_compare_final.py）",
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
