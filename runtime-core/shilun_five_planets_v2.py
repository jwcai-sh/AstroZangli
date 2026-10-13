#!/usr/bin/env python3
"""Faithful fiveplanets_v3.m arithmetic with the continuous-year V2 month state.

This is a reproduction, not a website-calibrated replacement. The original
planet constants, correction tables and common-day formula are preserved.
"""
from __future__ import annotations

import argparse
import json

from shilun_calendar_months12_compare_final_v2 import calculate_month_state

PLANETS = ("火曜", "水曜", "木曜", "金曜", "土曜")
DISPLAY_ORDER = (0, 2, 4, 1, 3)
FIELDS = ("五曜殊日", "太阳日中行定数", "迟行定数", "疾行定数")


def reduce_vector(values, periods, common=False):
    """Port the local MATLAB helper, including its special leading borrow."""
    v = list(values)
    r, q = [0] * len(v), [0] * len(v)
    if v[-1] < 0:
        v[-1] += periods[-1]
        v[-2] -= 1
    r[-1], q[-1] = v[-1] % periods[-1], v[-1] // periods[-1]
    for i in range(len(v) - 2, 0, -1):
        if v[i] < 0:
            v[i] += periods[i]
            v[i - 1] -= 1
        total = v[i] + q[i + 1]
        q[i], r[i] = divmod(total, periods[i])
    if common:
        r[0] = v[0] - q[1]
    else:
        if v[0] < 0:
            v[0] += periods[0]
        q[0], r[0] = divmod(v[0] + q[1], periods[0])
    return r, q


def divide_vector(v, periods, factor):
    q, rem = divmod(v[0], factor)
    out = [q]
    for value, radix in zip(v[1:], periods):
        q, rem = divmod(value + rem * radix, factor)
        out.append(q)
    return out


def compute_planet(gongri: int, p: int):
    multipliers = (1, 100, 1, 10, 1)
    additions = (115, 8386, 0, 1762, 0)
    periods = (687, 8797, 4332, 2247, 10766)
    units = (229, 149209, 361, 749, 5383)
    unit, unit2 = units[p], 149209
    raw = gongri * multipliers[p] + additions[p]
    quotient, shuri = divmod(raw, periods[p])
    display = [quotient, shuri] if p in (1, 3) else [shuri]
    remainder = shuri
    mean = []
    for factor in (27, 60, 60, 6, unit):
        value, remainder = divmod(remainder * factor, periods[p])
        mean.append(value)
    periods5 = [27, 60, 60, 6, unit]
    birth = [(9, 16, 12, 6, 18)[p], (30, 30, 0, 0, 0)[p], 0, 0, 0]
    temp, _ = reduce_vector([a - b for a, b in zip(mean, birth)], periods5)
    mark = temp[0] > 13 or (temp[0] == 13 and temp[1] >= 30)
    if mark:
        temp, _ = reduce_vector([a - b for a, b in zip(temp, [13, 30, 0, 0, 0])], periods5)
    index, rem = divmod(temp[1] + temp[0] * 60, 135)
    if index == 6:
        index = 0
    mul = (25, 18, 7, 7, 18, 25)[index]
    add = (25, 43, 50, 43, 25, 0)[index - 1 if index else 5]
    front = index <= 2
    r, q = reduce_vector([x * mul for x in [rem, *temp[2:]]], [1, 60, 6, unit])
    v = divide_vector([q[0], *r[1:]], [60, 6, unit], 135)
    correction = [add + v[0], *v[1:]] if front else [add - v[0] - 1, *[a - b for a, b in zip([59, 5, unit], v[1:])]]
    correction, _ = reduce_vector(correction, [60, 60, 6, unit])
    slow, _ = reduce_vector([a + (1 if mark else -1) * b for a, b in zip(mean, [0, *correction])], periods5)

    q0, r0 = divmod(mean[-1] * unit, unit2)
    periods6 = [*periods5, unit2]
    temp2, _ = reduce_vector([a - b for a, b in zip([*mean[:4], q0, r0], [*slow, 0])], periods6)
    odd = temp2[0] > 13 or (temp2[0] == 13 and temp2[1] >= 30)
    if odd:
        temp2, _ = reduce_vector([a - b for a, b in zip(temp2, [13, 30, 0, 0, 0, 0])], periods6)
    totals = (24, 47, 70, 93, 114, 135, 153, 168, 179, 182, 171, 133, 53, 0)
    rates = (24, 23, 23, 23, 21, 21, 18, 15, 11, 3, 11, 38, 80, 53)
    preceding = (0, *totals[:-1])
    index = temp2[0]
    if not odd:
        front2 = index <= 9
        mul2 = rates[index]
        add2 = totals[index - 1 if index else 13]
    else:
        front2 = 4 <= index <= 13
        mul2 = rates[13 - index]
        add2 = preceding[14 - (index if index else 14)]
        if (index == 0 and temp2[1] >= 30) or 1 <= index <= 13:
            temp2[1] += 30
    r, q = reduce_vector([x * mul2 for x in temp2[1:]], [60, 60, 6, unit, unit2])
    v = divide_vector([q[0], *r], [60, 60, 6, unit, unit2], 60)[1:]
    correction2 = [add2 + v[0], *v[1:]] if front2 else [add2 - v[0] - 1, *[a - b for a, b in zip([59, 5, unit - 1, unit2], v[1:])]]
    carry, rem = divmod(correction2[0], 60)
    fast, _ = reduce_vector([a + (-1 if odd else 1) * b for a, b in zip([*slow, 0], [carry, rem, *correction2[1:]])], periods6)
    direction = ("曲步西行" if front2 else "跃步北行") if odd else ("快步东行" if front2 else "慢步南行")
    return dict(zip(FIELDS, (display, mean, slow, fast)), 方向=direction)


def calculate_day(year: int, month: int, day: int, double_cal: int = 0):
    if not 1 <= year <= 2500 or not 1 <= month <= 12 or not 1 <= day <= 30 or double_cal not in (0, 1):
        raise ValueError("require year 1..2500, month 1..12, day 1..30, double_cal 0/1")
    state = calculate_month_state(year, month, double_cal)
    nominal = int(state["jiyue"]) * 30 + day
    common, _ = reduce_vector([nominal, nominal + 51, nominal + 551], [1, 64, 707], common=True)
    return {
        "year": year, "month": month, "day": day, "doubleCal": double_cal,
        "engine": "matlab-fiveplanets-v3-port-v2-month-state", "state": state,
        "五曜公积日": common,
        "planets": {PLANETS[p]: compute_planet(common[0], p) for p in DISPLAY_ORDER},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--month", required=True, type=int)
    parser.add_argument("--day", required=True, type=int)
    args = parser.parse_args()
    try:
        result = calculate_day(args.year, args.month, args.day)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
