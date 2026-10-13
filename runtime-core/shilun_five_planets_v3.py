#!/usr/bin/env python3
"""Phugpa planets from Tibetan Calendar V1.0 appendix D, rebased to E1987.

The old MATLAB reproduction is intentionally not imported or modified. Tables
11--13 and D.5--D.15 are evaluated with exact fractions; displayed mixed-radix
values are truncated only at their final unit. Appendix table 13's Venus node
83 is used explicitly, rather than silently mixing in another text's 73.
"""
from __future__ import annotations

import argparse
from fractions import Fraction as F
from functools import lru_cache
import json

from shilun_calendar_months12_compare_final_v2 import calculate_month_state

PLANETS = ("火曜", "木曜", "土曜", "水曜", "金曜")
PERIODS = (687, 4332, 10766, 8797, 2247)
UNITS = (229, 361, 5383, 8797, 749)
MULTIPLIERS = (1, 1, 1, 100, 10)
E1927_PD = (157, 3964, 6286, 4639, 301)
E1927_JD = 2424972
E1987_JD = 2446914
EPOCH_DELTA_DAYS = E1987_JD - E1927_JD
E1987_PD = tuple((old + EPOCH_DELTA_DAYS * mul) % period
                 for old, mul, period in zip(E1927_PD, MULTIPLIERS, PERIODS))
SOLAR_PERIOD = 6714405
SOLAR_RATE = 18382
SOLAR_E1987 = (-458672 + EPOCH_DELTA_DAYS * SOLAR_RATE) % SOLAR_PERIOD
SLOW_TABLES = (
    (0, 25, 43, 50), (0, 11, 20, 23), (0, 22, 37, 43),
    (0, 10, 17, 20), (0, 5, 9, 10),
)
FAST_TABLES = (
    (0, 24, 47, 70, 93, 114, 135, 153, 168, 179, 182, 171, 133, 53),
    (0, 10, 20, 29, 37, 43, 49, 51, 52, 49, 43, 34, 23, 7),
    (0, 6, 11, 16, 20, 24, 26, 28, 28, 26, 22, 17, 11, 3),
    (0, 16, 32, 47, 61, 74, 85, 92, 97, 97, 93, 82, 62, 34),
    (0, 25, 50, 75, 99, 123, 145, 167, 185, 200, 208, 202, 172, 83),
)
BIRTH = (F(19, 54), F(4, 9), F(2, 3), F(11, 18), F(2, 9))
FIELDS = ("五曜殊日", "太阳日中行定数", "迟行定数", "疾行定数")


def floor(value: F) -> int:
    return value.numerator // value.denominator


def vector(value: F, radices: tuple[int, ...]) -> list[int]:
    """Convert a circle fraction or day fraction to final-unit-truncated digits."""
    value %= 1
    result = []
    for radix in radices:
        value *= radix
        digit = floor(value)
        result.append(digit)
        value -= digit
    return result


def interpolate(nodes: tuple[int, ...], x: F) -> F:
    index = floor(x)
    if index == len(nodes) - 1:
        return F(nodes[index])
    return nodes[index] + (nodes[index + 1] - nodes[index]) * (x - index)


def symmetric_table(nodes: tuple[int, ...], x: F) -> F:
    """Extend a quarter-circle table by reflection and signed half-periods."""
    peak = len(nodes) - 1
    half = 2 * peak
    x %= 4 * peak
    sign = 1
    if x > half:
        x = 4 * peak - x
        sign = -1
    if x > peak:
        x = half - x
    return sign * interpolate(nodes, x)


def fast_table(nodes: tuple[int, ...], x: F) -> tuple[F, F]:
    """D.14 signed table, including the half-mansion endpoint at 13.5.

    The slope of the final half interval is doubled automatically. Reflecting
    around 13.5 also implements the traditional reverse-half index shift.
    """
    x %= 27
    sign = 1
    if x > F(27, 2):
        x = 27 - x
        sign = -1
    if x >= 13:
        slope = F(-2 * nodes[13])
        value = nodes[13] + slope * (x - 13)
    else:
        index = floor(x)
        slope = F(nodes[index + 1] - nodes[index])
        value = nodes[index] + slope * (x - index)
    return sign * value, slope


@lru_cache(maxsize=4096)
def lunar_timing(n: int, day: int) -> tuple[F, F]:
    """V1.0 7.1--7.22, standard a2=1/28, E1987 constants."""
    mean = F(E1987_JD) + F(135, 707) + n * F(167025, 5656) + day * F(11135, 11312)
    anomaly = F(38, 49) + n * F(253, 3528) + day * F(1, 28)
    moon_equ = symmetric_table((0, 5, 10, 15, 19, 22, 24, 25), 28 * anomaly)
    mean_sun = n * F(65, 804) + day * F(13, 4824)
    sun_equ = symmetric_table((0, 6, 10, 11), 12 * (mean_sun - F(1, 4)))
    return mean, mean + (moon_equ - sun_equ) / 60


def common_day(n: int, day: int) -> dict:
    mean, true = lunar_timing(n, day)
    approx = floor(mean) - E1987_JD
    verified = floor(true) - E1987_JD
    adjustment = verified - approx
    if abs(adjustment) > 1:
        raise ArithmeticError("D.4 weekday correction exceeds one day")
    # Traditional gd0 complement: 51/64 + 551/(64*707) = 1-135/707.
    ld = 30 * n + day
    middle, tail = divmod(ld + 551, 707)
    _, remainder64 = divmod(ld + 51 + middle, 64)
    return {"values": [verified, remainder64, tail], "approximate": approx,
            "adjustment": adjustment, "jd": floor(true),
            "weekday": (floor(true) + 2) % 7}


def compute_planets(general_day: int) -> dict:
    solar = F(general_day * SOLAR_RATE + SOLAR_E1987, SOLAR_PERIOD) % 1
    results = {}
    for p, name in enumerate(PLANETS):
        raw = general_day * MULTIPLIERS[p] + E1987_PD[p]
        quotient, particular = divmod(raw, PERIODS[p])
        helio = F(particular, PERIODS[p])
        inner = p >= 3
        mean_slow, step_index = (solar, helio) if inner else (helio, solar)
        slow_equ = symmetric_table(SLOW_TABLES[p], 12 * (mean_slow - BIRTH[p]))
        true_slow = (mean_slow - slow_equ / (27 * 60)) % 1
        difference = (step_index - true_slow) % 1
        correction, _ = fast_table(FAST_TABLES[p], 27 * difference)
        fast = (true_slow + correction / (27 * 60)) % 1
        # Website heading contains the individual mean-helio/step values, not
        # the common solar mean used as mean_slow for the two inner planets.
        heading_mean = vector(helio, (27, 60, 60, 6, UNITS[p]))
        slow_unit = 149209 if inner else UNITS[p]
        results[name] = {
            "五曜殊日": [quotient, particular] if inner else [particular],
            "太阳日中行定数": heading_mean,
            "迟行定数": vector(true_slow, (27, 60, 60, 6, slow_unit)),
            "疾行定数": vector(fast, (27, 60, 60, 6, UNITS[p], 149209)),
            "方向": None,
            "中迟": vector(mean_slow, (27, 60, 60, 6, slow_unit)),
            "检步": vector(step_index, (27, 60, 60, 6, UNITS[p], 149209)) if not inner else heading_mean,
        }
    return {"planets": results, "太阳中日": vector(solar, (27, 60, 60, 6, 149209))}


def calculate_day(year: int, month: int, day: int, double_cal: int = 0) -> dict:
    values = (year, month, day, double_cal)
    if any(type(v) is not int for v in values) or not (1 <= year <= 2500 and 1 <= month <= 12 and 1 <= day <= 30 and double_cal in (0, 1)):
        raise ValueError("integer year 1..2500, month 1..12, day 1..30, double_cal 0/1 required")
    state = calculate_month_state(year, month, double_cal)
    common = common_day(int(state["jiyue"]), day)
    return {"year": year, "month": month, "day": day, "doubleCal": double_cal,
            "engine": "v3-phugpa-v1-appendix-d-E1987",
            "state": state, "五曜公积日": common["values"], "timing": common,
            "epoch": {"year": 1987, "month": 3, "jd": E1987_JD,
                      "particular_day_constants": dict(zip(PLANETS, E1987_PD)),
                      "solar_constant": SOLAR_E1987},
            **compute_planets(common["values"][0]),
            "conventions": {"moon_anomaly_day": "standard 1/28 (7.13)",
                            "table_version": "appendix D tables 11--13; Venus node13=83",
                            "rounding": "exact rational intermediates; floor final radix digit",
                            "month_year": "V2 indexed March-based year; months1/2 follow month12",
                            "direction": "not implemented: appendix D gives numerical longitudes, not direction labels"}}


def calculate_month(year: int, month: int, double_cal: int = 0) -> dict:
    days = [calculate_day(year, month, day, double_cal) for day in range(1, 31)]
    return {"year": year, "month": month, "engine": days[0]["engine"], "days": days}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--month", type=int, required=True)
    parser.add_argument("--day", type=int, help="Omit to calculate all 30 numbered lunar days")
    parser.add_argument("--double-cal", type=int, choices=(0, 1), default=0)
    args = parser.parse_args()
    try:
        result = (calculate_month(args.year, args.month, args.double_cal) if args.day is None
                  else calculate_day(args.year, args.month, args.day, args.double_cal))
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
