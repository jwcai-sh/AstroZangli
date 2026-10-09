"""Python transcription of shilun_calendar_months12_compare_final.m.

This module intentionally follows the MATLAB script's candidate-leap-transition
path. It is separate from the older runtime because the compare page needs to
expose the script-derived result as an independently auditable calculation.
"""

from __future__ import annotations

from math import floor


EFFECT_NAMES = {
    1: "枝稍",
    2: "孺蜜",
    3: "贵种",
    4: "捣麻",
    5: "家生",
    6: "商贾",
    7: "毗支",
}

MOON_PERIODS = [7, 60, 60, 6, 707]
SUN_PERIODS = [27, 60, 60, 6, 67]
SUN_PERIODS_6 = [27, 60, 60, 6, 67, 707]
TIME_PERIODS_6 = [7, 60, 60, 6, 67, 707]

MOON_DAY_TIME = [0, 59, 3, 4, 16]
SUN_ROTATION_ARC = [0, 4, 21, 5, 43]
WEEKDAY_MONTH_MULTIPLIER = [1, 31, 50, 0, 480]
WEEKDAY_MONTH_ADDEND = [3, 11, 27, 2, 332]
MOON_MONTH_ARC = [2, 10, 58, 1, 17]

MOON_STEP_MULTIPLIER = [5, 5, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 5, 5]
MOON_STEP_ADDEND = [0, 5, 10, 15, 19, 22, 24, 25, 24, 22, 19, 15, 10, 5]
SUN_STEP_MULTIPLIER = [6, 4, 1, 1, 4, 6]
SUN_STEP_ADDEND = [0, 6, 10, 11, 10, 6]


def _as_ints(values: list[float | int]) -> list[int]:
    return [int(value) for value in values]


def reduction(values: list[float | int], periods: list[float | int]) -> list[int]:
    """Mirror the carry direction and negative handling in reduction.m."""

    current = [float(value) for value in values]
    carries = [float(period) for period in periods]
    if len(current) != len(carries):
        raise ValueError("values and periods must have the same length")

    quotients = [0.0] * len(current)
    remainders = [0.0] * len(current)
    last = len(current) - 1

    if current[last] < 0:
        current[last] += carries[last]
        current[last - 1] -= 1
    quotients[last] = floor(current[last] / carries[last])
    remainders[last] = current[last] % carries[last]

    for index in range(last - 1, 0, -1):
        if current[index] < 0:
            current[index] += carries[index]
            current[index - 1] -= 1
        propagated = current[index] + quotients[index + 1]
        quotients[index] = floor(propagated / carries[index])
        remainders[index] = propagated % carries[index]

    if current[0] < 0:
        current[0] += carries[0]
    remainders[0] = (current[0] + quotients[1]) % carries[0]
    return _as_ints(remainders)


def _month_state(year: int, month: int, mode: str = "current_local") -> dict[str, int | bool]:
    if month < 1 or month > 12:
        raise ValueError("month must be between 1 and 12")

    start_year = 1027
    initial_month = 3
    if mode == "candidate_leap_transition":
        cycle_month = ((year - start_year) % 60) * 12
        base_month_num = cycle_month + ((month + 12) - initial_month if month < initial_month else month - initial_month)
        raw_runyu = (base_month_num * 2) % 65
        is_leap_month = raw_runyu in (48, 49)
        month_shift_applied = int(raw_runyu > 49)
        return {
            "jiyue0": base_month_num,
            "jiyue": base_month_num + floor(base_month_num * 2 / 65) + month_shift_applied,
            "raw_runyu": raw_runyu,
            "display_runyu": raw_runyu + 2 * month_shift_applied,
            "is_leap_month": is_leap_month,
            "month_shift_applied": month_shift_applied,
            "mode": mode,
        }

    if mode != "current_local":
        raise ValueError(f"unsupported MATLAB rewrite mode: {mode}")

    mark_runyue_in = 0
    state: dict[str, int | bool] | None = None
    for current_month in range(1, month + 1):
        cycle_month = ((year - start_year) % 60) * 12
        base_month_num = cycle_month + ((current_month - initial_month) % 12)
        jiyue0 = base_month_num + mark_runyue_in
        raw_runyu = (jiyue0 * 2) % 65
        is_leap_month = raw_runyu in (48, 49)
        mark_runyue_out = mark_runyue_in
        if is_leap_month:
            mark_runyue_out = 1
        state = {
            "jiyue0": jiyue0,
            "jiyue": jiyue0 + floor(jiyue0 * 2 / 65),
            "raw_runyu": raw_runyu,
            "display_runyu": raw_runyu,
            "is_leap_month": is_leap_month,
            "month_shift_applied": mark_runyue_in,
            "mode": mode,
        }
        mark_runyue_in = mark_runyue_out

    assert state is not None
    return state


def _month_top_bases(state: dict[str, int | bool]) -> dict[str, list[int]]:
    jiyue = int(state["jiyue"])
    yao_base = reduction(
        [jiyue * 1 + 3, jiyue * 31 + 11, jiyue * 50 + 27, 2, jiyue * 480 + 332],
        [7, 60, 60, 6, 707],
    )
    sun_base = reduction(
        [jiyue * 2, jiyue * 10, jiyue * 58, jiyue, jiyue * 17],
        SUN_PERIODS,
    )
    rewo_qiaxi = reduction([jiyue * 2 + 21, jiyue + 90], [28, 126])
    return {"yao_base": yao_base, "sun_base": sun_base, "rewo_qiaxi": rewo_qiaxi}


def _moon_quotient(qiaxi: int, multiplier: int) -> list[int]:
    result: list[int] = []
    remainder = qiaxi
    for carry in [multiplier, 60, 6, 707]:
        quotient, remainder = divmod(remainder * carry, 126)
        result.append(quotient)
    return result


def _sun_quotient(values: list[int]) -> list[int]:
    result: list[int] = []
    remainder = 0
    for index, carry in enumerate([1, 60, 6, 67]):
        quotient, remainder = divmod(values[index] + remainder * carry, 135)
        result.append(quotient)
    return result


def _sun_jiaoke_quotient(values: list[int]) -> list[int]:
    quotients: list[int] = []
    remainder = values[0] % 135
    quotients.append(values[0] // 135)
    for index, period in enumerate([60, 6, 67], start=1):
        quotient, remainder = divmod(values[index] + remainder * period, 135)
        quotients.append(quotient)
    return quotients


def _daily_record(day: int, month_state: dict[str, int | bool], top: dict[str, list[int]]) -> dict:
    if day < 1 or day > 30:
        raise ValueError("day must be between 1 and 30")

    rewo, qiaxi = top["rewo_qiaxi"]
    moon_remainders = [
        reduction([MOON_DAY_TIME[index] + (day_index * MOON_DAY_TIME[index]) for index in range(5)], MOON_PERIODS)
        for day_index in range(30)
    ]
    sun_remainders = [
        reduction([SUN_ROTATION_ARC[index] + (day_index * SUN_ROTATION_ARC[index]) for index in range(5)], SUN_PERIODS)
        for day_index in range(30)
    ]

    mid_yao = reduction(
        [top["yao_base"][index] + moon_remainders[day - 1][index] for index in range(5)],
        MOON_PERIODS,
    )
    mid_sun = reduction(
        [top["sun_base"][index] + sun_remainders[day - 1][index] for index in range(5)],
        SUN_PERIODS,
    )

    quotient_rewo, remainder_rewo = divmod(rewo + day, 14)
    front_moon = 0 <= remainder_rewo < 7
    moon_multiplier = MOON_STEP_MULTIPLIER[remainder_rewo]
    moon_addend = MOON_STEP_ADDEND[remainder_rewo]
    moon_jinxinke = [moon_addend, *_moon_quotient(qiaxi, moon_multiplier)]

    if front_moon:
        moon_jiaoke0 = [moon_jinxinke[0] + moon_jinxinke[1], *moon_jinxinke[2:]]
    else:
        moon_jiaoke0 = [
            moon_jinxinke[0] - moon_jinxinke[1] - 1,
            *reduction(
                [59 - moon_jinxinke[2], 5 - moon_jinxinke[3], 706 - moon_jinxinke[4]],
                [60, 6, 707],
            ),
        ]
    moon_jiaoke = reduction(moon_jiaoke0, [60, 60, 6, 707])

    bandingyao = reduction(
        [
            mid_yao[index] + (1 if quotient_rewo % 2 == 0 else -1) * ([0, *moon_jiaoke][index])
            for index in range(5)
        ],
        MOON_PERIODS,
    )
    bandingyao_6 = [*bandingyao[:4], floor(bandingyao[4] * 67 / 707), (bandingyao[4] * 67) % 707]

    temp_rem0 = reduction(
        [mid_sun[0] - 6, mid_sun[1] - 45, mid_sun[2], mid_sun[3], mid_sun[4]],
        SUN_PERIODS,
    )
    over_halfway = temp_rem0[0] > 13.5 or (temp_rem0[0] == 13 and temp_rem0[1] >= 30)
    temp_rem1 = reduction(
        [temp_rem0[0] - 13, temp_rem0[1] - 30, temp_rem0[2], temp_rem0[3], temp_rem0[4]],
        SUN_PERIODS,
    ) if over_halfway else temp_rem0

    quotient_s, remainder_s = divmod(temp_rem1[1] + temp_rem1[0] * 60, 135)
    quotient_s %= 6
    front_sun = 0 <= quotient_s < 3
    sun_multiplier = SUN_STEP_MULTIPLIER[quotient_s]
    sun_addend = SUN_STEP_ADDEND[quotient_s]
    sun_v = [remainder_s, *temp_rem1[2:]]
    sun_jinxinke = [sun_addend, *_sun_jiaoke_quotient([value * sun_multiplier for value in sun_v])]

    if front_sun:
        sun_jiaoke0 = [sun_jinxinke[0] + sun_jinxinke[1], *sun_jinxinke[2:]]
    else:
        sun_jiaoke0 = [
            sun_jinxinke[0] - sun_jinxinke[1] - 1,
            59 - sun_jinxinke[2],
            5 - sun_jinxinke[3],
            66 - sun_jinxinke[4],
        ]
    sun_jiaoke = reduction(sun_jiaoke0, [60, 60, 6, 67])

    sign = 1 if over_halfway else -1
    ding_yao = reduction(
        [bandingyao_6[index] + sign * ([0, *sun_jiaoke, 0][index]) for index in range(6)],
        TIME_PERIODS_6,
    )
    ding_sun = reduction(
        [mid_sun[index] + sign * ([0, *sun_jiaoke][index]) for index in range(5)],
        SUN_PERIODS,
    )

    if day == 1:
        t3 = [0, 54]
    else:
        t3 = [floor(54 * day / 60), (54 * day) % 60]
    taiyin = reduction([ding_sun[0] + t3[0], ding_sun[1] + t3[1], *ding_sun[2:]], SUN_PERIODS)
    taiyin_6 = [*taiyin, 0]
    taiyang = reduction(
        [taiyin_6[index] - ([0, *ding_yao[1:]][index]) for index in range(6)],
        SUN_PERIODS_6,
    )
    huihe = reduction(
        [taiyang[index] + ([*ding_sun, 0][index]) for index in range(6)],
        SUN_PERIODS_6,
    )

    effect_number = (2 * day - 1) % 7
    return {
        "day": day,
        "定曜": ding_yao,
        "月伴星宿": taiyang,
        "定日": ding_sun,
        "会合": huihe,
        "作用": [EFFECT_NAMES.get(effect_number, "")],
        "作用编号": effect_number,
    }


def build_month_summary(year: int, month: int, mode: str = "current_local") -> dict:
    state = _month_state(year, month, mode)
    top = _month_top_bases(state)
    return {
        "积月闰余": [int(state["jiyue"]), int(state["display_runyu"])],
        "曜基数": top["yao_base"],
        "整零数": top["rewo_qiaxi"],
        "太阳基数": top["sun_base"],
        "isLeapMonth": bool(state["is_leap_month"]),
    }


def build_day_record(year: int, month: int, day: int, mode: str = "current_local") -> dict:
    state = _month_state(year, month, mode)
    return _daily_record(day, state, _month_top_bases(state))


def build_month_records(year: int, month: int, mode: str = "current_local") -> dict:
    state = _month_state(year, month, mode)
    top = _month_top_bases(state)
    return {
        "summary": {
            "积月闰余": [int(state["jiyue"]), int(state["display_runyu"])],
            "曜基数": top["yao_base"],
            "整零数": top["rewo_qiaxi"],
            "太阳基数": top["sun_base"],
            "isLeapMonth": bool(state["is_leap_month"]),
        },
        "days": [_daily_record(day, state, top) for day in range(1, 31)],
        "engine": f"matlab-script-python-transcription:{mode}",
        "engineLabel": f"Python 重写（MATLAB 脚本 {mode} 分支）",
    }
