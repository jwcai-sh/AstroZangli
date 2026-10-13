#!/usr/bin/env python3
"""Independent E1987 planetary calculation with reference display conventions.

No cache, network, or date-specific overrides are used by this module. V3 is
retained as the appendix-D model; this version explicitly differs in general
day verification, Venus node 13, and descending-segment last-unit division.
"""
from __future__ import annotations

import argparse
from fractions import Fraction as F
import json

from shilun_calendar_months12_compare_final_v2 import calculate_month_state
from shilun_five_planets_v3 import (
    PLANETS, FIELDS, PERIODS, UNITS, MULTIPLIERS, E1987_PD, E1987_JD,
    SOLAR_RATE, SOLAR_PERIOD, SOLAR_E1987, SLOW_TABLES, FAST_TABLES,
    BIRTH, symmetric_table, fast_table, vector, floor,
)

ENGINE = "v4-reference-compatible-E1987"
# Reference numbering offset, independently checked across the cached dates.
# This is a display convention, not a replacement astronomical epoch.
REFERENCE_COMMON_DAY_OFFSET = 725449
INNER_PREMULTIPLY_CONSTANTS = {
    3: E1987_PD[3] * pow(MULTIPLIERS[3], -1, PERIODS[3]) % PERIODS[3],
    4: E1987_PD[4] * pow(MULTIPLIERS[4], -1, PERIODS[4]) % PERIODS[4],
}
REFERENCE_FAST_TABLES = (*FAST_TABLES[:4], (*FAST_TABLES[4][:-1], 73))


def common_day(n: int, day: int) -> dict:
    """6.01 integer carry formula; do not apply the 6.02 weekday correction."""
    nominal = 30 * n + day
    carry707, tail707 = divmod(nominal + 551, 707)
    carry64, tail64 = divmod(nominal + 51 + carry707, 64)
    relative = nominal - carry64
    return {"values": [relative + REFERENCE_COMMON_DAY_OFFSET, tail64, tail707],
            "relative_day": relative, "nominal_day": nominal,
            "weekday_verified": False}


def fast_vector(value: F, unit: int, descending: bool) -> list[int]:
    """Reference last-unit division: lower bound rising, upper bound falling.

    The falling-table convention is established by cache and live regression,
    not asserted to be the exact rational appendix-D rounding rule. Round the
    whole scaled value so a last-unit carry propagates through every radix.
    """
    scale = 27 * 60 * 60 * 6 * unit * 149209
    scaled = (value % 1) * scale
    integer = -floor(-scaled) if descending else floor(scaled)
    return vector(F(integer, scale), (27, 60, 60, 6, unit, 149209))


def compute_planets(general_day: int) -> dict:
    """general_day is relative to E1987, not the reference display integer."""
    solar = F(general_day * SOLAR_RATE + SOLAR_E1987, SOLAR_PERIOD) % 1
    planets = {}
    for p, name in enumerate(PLANETS):
        raw = general_day * MULTIPLIERS[p] + E1987_PD[p]
        particular = raw % PERIODS[p]
        inner = p >= 3
        prefix = ((general_day + INNER_PREMULTIPLY_CONSTANTS[p]) % PERIODS[p]) if inner else None
        helio = F(particular, PERIODS[p])
        mean_slow, step = (solar, helio) if inner else (helio, solar)
        slow_equ = symmetric_table(SLOW_TABLES[p], 12 * (mean_slow - BIRTH[p]))
        slow = (mean_slow - slow_equ / (27 * 60)) % 1
        correction, slope = fast_table(REFERENCE_FAST_TABLES[p], 27 * ((step - slow) % 1))
        planets[name] = {
            "五曜殊日": [prefix, particular] if inner else [particular],
            "太阳日中行定数": vector(helio, (27, 60, 60, 6, UNITS[p])),
            "迟行定数": vector(slow, (27, 60, 60, 6, 149209 if inner else UNITS[p])),
            "疾行定数": fast_vector(slow + correction / (27 * 60), UNITS[p], slope < 0),
            "方向": None,
        }
    return {"planets": planets, "太阳中日": vector(solar, (27, 60, 60, 6, 149209))}


def calculate_day(year: int, month: int, day: int, double_cal: int = 0) -> dict:
    values = (year, month, day, double_cal)
    if any(type(v) is not int for v in values) or not (
        1 <= year <= 2500 and 1 <= month <= 12 and 1 <= day <= 30 and double_cal in (0, 1)
    ):
        raise ValueError("integer year 1..2500, month 1..12, day 1..30, double_cal 0/1 required")
    state = calculate_month_state(year, month, double_cal)
    common = common_day(int(state["jiyue"]), day)
    return {"year": year, "month": month, "day": day, "doubleCal": double_cal,
            "engine": ENGINE, "state": state, "五曜公积日": common["values"],
            "timing": common,
            "epoch": {"year": 1987, "month": 3, "jd": E1987_JD,
                      "particular_day_constants": dict(zip(PLANETS, E1987_PD)),
                      "solar_constant": SOLAR_E1987},
            **compute_planets(common["relative_day"]),
            "conventions": {
                "common_day": "6.01 integer carries; no weekday verification; reference offset725449",
                "inner_shuri": "pre-multiplication remainder, then remainder after multiplying100/10",
                "venus_node13": "73: Principles6.14 rates99/73; differs from V1 appendixD83",
                "fast_rounding": "reference convention: floor rising/flat, ceil descending, final unit",
                "month_year": "V2 March-based indexed year; months1/2 follow month12",
                "direction": "not calculated or compared",
                "reference_branch": "only double_cal=0 has reference validation",
            }}


def calculate_month(year: int, month: int, double_cal: int = 0) -> list[dict]:
    return [calculate_day(year, month, day, double_cal) for day in range(1, 31)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--month", type=int, required=True)
    parser.add_argument("--day", type=int)
    parser.add_argument("--double-cal", type=int, default=0)
    args = parser.parse_args()
    try:
        result = (calculate_day(args.year, args.month, args.day, args.double_cal) if args.day is not None
                  else calculate_month(args.year, args.month, args.double_cal))
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
