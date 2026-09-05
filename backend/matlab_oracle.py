"""Load MATLAB precomputed results exported as JSON."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


DEFAULT_ORACLE_PATH = Path(__file__).resolve().parent / "data" / "matlab_oracle.json"


@lru_cache(maxsize=1)
def _load_dataset(path: str) -> dict:
    oracle_path = Path(path)
    if not oracle_path.exists():
        raise FileNotFoundError(f"MATLAB oracle file not found: {oracle_path}")
    with oracle_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_oracle_month(year: int, month: int, path: Path = DEFAULT_ORACLE_PATH) -> dict:
    if month < 1 or month > 12:
        raise ValueError("month must be between 1 and 12")

    dataset = _load_dataset(str(path))
    year_data = dataset.get("years", {}).get(str(year))
    if not year_data:
        raise FileNotFoundError(f"MATLAB oracle year not found: {year}")
    month_data = year_data.get("months", {}).get(str(month))
    if not month_data:
        raise FileNotFoundError(f"MATLAB oracle month not found: {year}-{month:02d}")

    return {
        "year": year,
        "month": month,
        "sourceFile": year_data["sourceFile"],
        "sourceMode": year_data.get("sourceMode", "current_local"),
        "sourceProgram": year_data.get("sourceProgram", ""),
        "sourcePath": year_data.get("sourcePath", ""),
        "sourceSha256": year_data.get("sourceSha256", ""),
        "summary": month_data["summary"],
        "days": month_data["days"],
    }
