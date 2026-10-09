from __future__ import annotations

import numpy as np


EFFECT_NAMES = {
    1: "枝稍",
    2: "孺蜜",
    3: "贵种",
    4: "捣麻",
    5: "家生",
    6: "商贾",
    7: "毗支",
    8: "吉祥",
    9: "四足",
    10: "蛟龙",
    11: "不净",
}

MOON_STEP_MULTIPLIER = {0: 5, 1: 5, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 5, 13: 5}
MOON_STEP_ADDEND = {0: 0, 1: 5, 2: 10, 3: 15, 4: 19, 5: 22, 6: 24, 7: 25, 8: 24, 9: 22, 10: 19, 11: 15, 12: 10, 13: 5}
SUN_STEP_MULTIPLIER = {0: 6, 1: 4, 2: 1, 3: 1, 4: 4, 5: 6}
SUN_STEP_ADDEND = {0: 0, 1: 6, 2: 10, 3: 11, 4: 10, 5: 6}

TIME_CARRY_5 = np.array([7, 60, 60, 6, 707], dtype=float)
TIME_CARRY_6 = np.array([7, 60, 60, 6, 67, 707], dtype=float)
ARC_CARRY_5 = np.array([27, 60, 60, 6, 67], dtype=float)
ARC_CARRY_6 = np.array([27, 60, 60, 6, 67, 707], dtype=float)

MOON_DAY_TIME_5 = np.array([0, 59, 3, 4, 16], dtype=float)
SUN_ROTATION_ARC = np.array([0, 4, 21, 5, 43], dtype=float)
WEEKDAY_MONTH_MULTIPLIER = np.array([1, 31, 50, 0, 480], dtype=float)
WEEKDAY_MONTH_ADDEND = np.array([3, 11, 27, 2, 332], dtype=float)
MOON_MONTH_ARC = np.array([2, 10, 58, 1, 17], dtype=float)
SUN_INITIAL_ARC = np.array([6, 45, 0, 0, 0], dtype=float)
REWO_PARA = np.array([2, 21, 28, 14], dtype=float)
QIAXI_PARA = np.array([1, 90, 126], dtype=float)

INITIAL_YEAR = 1027
INITIAL_MONTH = 3
MONTH_NUM = 12
CYCLE_SIXTY = 60
EPACT_BASE = 32.5
DOUBLE_CHECK = 49
MOON_DIVIDEND = 126
SUN_DIVIDEND = 135


def _to_int_list(values: np.ndarray) -> list[int]:
    return [int(value) for value in np.asarray(values).tolist()]


def _normalize_mode(mode: str) -> str:
    if mode not in {"website", "matlab"}:
        raise ValueError(f"Unsupported six-elements mode: {mode}")
    return mode


def _build_website_month_state(year: int, month: int, double_cal: bool = False) -> dict:
    cycle_offset = (year - INITIAL_YEAR) % CYCLE_SIXTY
    sun_month_num = cycle_offset * MONTH_NUM + (month + MONTH_NUM if month < INITIAL_MONTH else month) - INITIAL_MONTH
    epact = sun_month_num * 2 % int(EPACT_BASE * 2)
    moon_month_num = int(sun_month_num + sun_month_num // EPACT_BASE)
    double_flag = epact in {DOUBLE_CHECK, DOUBLE_CHECK - 1}

    if epact > DOUBLE_CHECK or (double_cal and double_flag):
        epact += 2
        moon_month_num += 1

    return {
        "moon_month_num": moon_month_num,
        "epact": epact,
        "double_flag": int(double_flag),
    }


def _build_matlab_month_state(year: int, month: int) -> dict:
    mark_runyue_out = 0
    state = None

    for current_month in range(1, month + 1):
        base_month_num = ((year - INITIAL_YEAR) % CYCLE_SIXTY) * MONTH_NUM + ((current_month - INITIAL_MONTH) % MONTH_NUM)
        jiyue0 = base_month_num + mark_runyue_out
        raw_runyu = (jiyue0 * 2) % int(EPACT_BASE * 2)
        is_leap_month = raw_runyu in {48, 49}

        if is_leap_month:
            mark_runyue_out = 1

        state = {
            "moon_month_num": int(jiyue0 + (jiyue0 * 2) // int(EPACT_BASE * 2)),
            "epact": raw_runyu,
            "double_flag": int(is_leap_month),
        }

    if state is None:
        raise ValueError("month must be >= 1")

    return state


def _build_month_state(year: int, month: int, mode: str, double_cal: bool = False) -> dict:
    normalized = _normalize_mode(mode)
    if normalized == "website":
        return _build_website_month_state(year, month, double_cal)
    return _build_matlab_month_state(year, month)


class RemainderCalculator:
    def __init__(self, carry_array, multiplicand, multiplier, addend):
        self.carry_array = np.array(carry_array, dtype=float)
        self.multiplicand = np.array(multiplicand, dtype=float)
        self.multiplier = np.array(multiplier, dtype=float)
        self.addend = np.array(addend, dtype=float)

    def calculate(self) -> tuple[np.ndarray, np.ndarray]:
        system_size = len(self.carry_array)
        result = self.multiplicand * self.multiplier
        result = np.array(result, dtype=float) + self.addend

        remainder = np.zeros(system_size)
        quotient = np.zeros(system_size)

        for index in reversed(range(system_size)):
            quotient[index], remainder[index] = divmod(result[index], self.carry_array[index])
            if index > 0:
                result[index - 1] = result[index - 1] + quotient[index]

        return remainder, quotient


class MoonQuotientCalculator:
    def __init__(self, dividend: float, multiplicand: float, multiplier: float):
        self.dividend = float(dividend)
        self.multiplicand = float(multiplicand)
        self.multiplier = float(multiplier)

    def calculate(self) -> np.ndarray:
        carry_array = np.array([self.multiplier, 60, 6, 707], dtype=float)
        quotient = np.zeros(4)

        remainder = self.multiplicand
        for index in range(4):
            value = remainder * carry_array[index]
            quotient[index], remainder = divmod(value, self.dividend)

        return quotient


class SunQuotientCalculator:
    def __init__(self, dividend: float, multiplicand, multiplier: float):
        self.dividend = float(dividend)
        self.multiplicand = np.array(multiplicand, dtype=float)
        self.multiplier = float(multiplier)

    def calculate(self) -> np.ndarray:
        scaled = self.multiplicand * self.multiplier
        carry_array = np.array([1, 60, 6, 67], dtype=float)
        quotient = np.zeros(4)

        remainder = 0.0
        for index in range(4):
            value = scaled[index] + remainder * carry_array[index]
            quotient[index], remainder = divmod(value, self.dividend)

        return quotient


class SixElementsCalculator:
    def __init__(self, year: int, month: int, day: int, double_cal: bool = False, mode: str = "website"):
        self.year = float(year)
        self.month = float(month)
        self.day = float(day)
        self.mode = _normalize_mode(mode)

        month_state = _build_month_state(year, month, self.mode, double_cal)
        self.epact = float(month_state["epact"])
        self.moon_month_num = float(month_state["moon_month_num"])
        self.double_flag = int(month_state["double_flag"])

        self.rewo = None
        self.qiaxi = None
        self.weekday_base = None
        self.sun_base = None
        self.weekday_rough = None
        self.sun_rough = None
        self.moon_jxk = None
        self.weekday_jk = None
        self.semi_weekday_num_5 = None
        self.semi_weekday_num_6 = None
        self.sun_jxk = None
        self.sun_jk = None
        self.weekday = None
        self.sun_constellation = None
        self.semi_moon_constellation = None
        self.moon_constellation = None
        self.meet = None
        self.effect = None
        self.effect_num = None

    def cal_rewo_qiaxi(self):
        quotient, self.qiaxi = divmod(self.moon_month_num * QIAXI_PARA[0] + QIAXI_PARA[1], QIAXI_PARA[2])
        self.rewo = (self.moon_month_num * REWO_PARA[0] + REWO_PARA[1] + quotient) % REWO_PARA[2]

    def cal_weekday_base(self):
        multiplicand = np.ones(5) * self.moon_month_num
        calculator = RemainderCalculator(TIME_CARRY_5, multiplicand, WEEKDAY_MONTH_MULTIPLIER, WEEKDAY_MONTH_ADDEND)
        self.weekday_base = calculator.calculate()[0]

    def cal_weekday_rough(self):
        self.cal_weekday_base()
        calculator = RemainderCalculator(TIME_CARRY_5, MOON_DAY_TIME_5, np.ones(5) * self.day, self.weekday_base)
        self.weekday_rough = calculator.calculate()[0]

    def cal_sun_base(self):
        calculator = RemainderCalculator(ARC_CARRY_5, np.ones(5) * self.moon_month_num, MOON_MONTH_ARC, np.zeros(5))
        self.sun_base = calculator.calculate()[0]

    def cal_sun_rough(self):
        self.cal_sun_base()
        calculator = RemainderCalculator(ARC_CARRY_5, SUN_ROTATION_ARC, np.ones(5) * self.day, self.sun_base)
        self.sun_rough = calculator.calculate()[0]

    def cal_weekday_jk(self):
        self.cal_rewo_qiaxi()
        quotient, remainder = divmod(self.rewo + self.day, REWO_PARA[3])

        front_feet_flag = 1 if 0 <= remainder < 7 else -1
        even_flag = 1 if quotient % 2 == 0 else -1

        multiplier = MOON_STEP_MULTIPLIER[int(remainder)]
        addend = np.array([0, MOON_STEP_ADDEND[int(remainder)], 0, 0, 0], dtype=float)

        moon_quotient = MoonQuotientCalculator(MOON_DIVIDEND, self.qiaxi, multiplier)
        self.moon_jxk = np.append(0, moon_quotient.calculate())

        calculator = RemainderCalculator(TIME_CARRY_5, front_feet_flag * self.moon_jxk, np.ones(5), addend)
        self.weekday_jk = calculator.calculate()[0]

        return even_flag

    def cal_semi_weekday_num(self):
        self.cal_weekday_rough()
        even_flag = self.cal_weekday_jk()

        calculator = RemainderCalculator(TIME_CARRY_5, self.weekday_rough, np.ones(5), even_flag * self.weekday_jk)
        self.semi_weekday_num_5 = calculator.calculate()[0]

        quotient, remainder = divmod(self.semi_weekday_num_5[4] * TIME_CARRY_6[4], TIME_CARRY_6[5])
        self.semi_weekday_num_6 = np.append(self.semi_weekday_num_5, remainder)
        self.semi_weekday_num_6[4] = quotient

    def cal_sun_jk(self):
        self.cal_sun_rough()
        constellation = self.sun_rough[0] - SUN_INITIAL_ARC[0]
        constellation = constellation + 27 if constellation < 0 else constellation
        arc_num = self.sun_rough[1] - SUN_INITIAL_ARC[1]

        arc_pass = constellation * 60.0 + arc_num
        arc_diff = arc_pass - (13 * 60.0 + 30)
        over_halfway = 1 if arc_diff > 0 else 0

        zodiac = self.sun_rough.copy()
        quotient, remainder = divmod(arc_pass if over_halfway < 1 else arc_diff, 135.0)
        zodiac[0] = 0
        zodiac[1] = remainder

        sun_front_feet = 1 if 0 <= quotient < 3 else -1
        multiplier = SUN_STEP_MULTIPLIER[int(quotient)]
        addend = np.array([0, SUN_STEP_ADDEND[int(quotient)], 0, 0, 0], dtype=float)

        calculator = RemainderCalculator(np.append([12, 135], ARC_CARRY_5[2:]), multiplier * zodiac, np.ones(5), np.zeros(5))
        zodiac, quotients = calculator.calculate()

        sun_quotient = SunQuotientCalculator(SUN_DIVIDEND, zodiac[1:], 1)
        self.sun_jxk = np.append(0.0, sun_quotient.calculate())
        self.sun_jxk[1] = quotients[1]

        calculator = RemainderCalculator(ARC_CARRY_5, sun_front_feet * self.sun_jxk, np.ones(5), addend)
        self.sun_jk = calculator.calculate()[0]
        self.sun_jk[0] = 0

        return over_halfway

    def cal_weekday(self):
        self.cal_semi_weekday_num()
        over_halfway = self.cal_sun_jk()

        sun_jk_num_6 = np.append(self.sun_jk, 0.0)
        calculator = RemainderCalculator(
            TIME_CARRY_6,
            self.semi_weekday_num_6,
            np.ones(6),
            (1 if over_halfway > 0 else -1) * sun_jk_num_6,
        )
        self.weekday = calculator.calculate()[0]

    def cal_sun_constellation(self):
        self.cal_sun_rough()
        over_halfway = self.cal_sun_jk()
        calculator = RemainderCalculator(
            ARC_CARRY_5,
            self.sun_rough,
            np.ones(5),
            (1 if over_halfway > 0 else -1) * self.sun_jk,
        )
        self.sun_constellation = calculator.calculate()[0]

    def cal_semi_moon_constellation(self):
        self.cal_sun_constellation()

        quotient, remainder = divmod(float(self.sun_constellation[1]) + self.day * 54, 60)
        self.semi_moon_constellation = self.sun_constellation.copy()
        self.semi_moon_constellation[1] = remainder
        self.semi_moon_constellation[0] = (self.semi_moon_constellation[0] + quotient) % 27

    def cal_moon_constellation(self):
        self.cal_semi_moon_constellation()
        self.cal_weekday()

        calculator = RemainderCalculator(
            ARC_CARRY_6,
            np.append(self.semi_moon_constellation, 0),
            np.ones(6),
            -1 * np.append(0, self.weekday[1:]),
        )
        self.moon_constellation = calculator.calculate()[0]

    def cal_meet(self):
        self.cal_sun_constellation()
        self.cal_moon_constellation()

        sun_constellation_num_6 = np.append(self.sun_constellation, 0)
        calculator = RemainderCalculator(ARC_CARRY_6, self.moon_constellation, np.ones(6), sun_constellation_num_6)
        self.meet = calculator.calculate()[0]

    def cal_effect(self):
        if self.day == 1.0:
            effect_am = 11
            effect_pm = 1
        elif 1.0 < self.day < 29.0:
            effect_am = (self.day * 2 - 2) % 7
            if effect_am == 0:
                effect_am = 7
            effect_pm = (self.day * 2 - 1) % 7
            if effect_pm == 0:
                effect_pm = 7
        elif self.day == 29.0:
            effect_am = 7
            effect_pm = 8
        elif self.day == 30.0:
            effect_am = 9
            effect_pm = 10
        else:
            raise ValueError("day is out of range")

        self.effect_num = {"am": int(effect_am), "pm": int(effect_pm)}
        self.effect = {"am": EFFECT_NAMES[int(effect_am)], "pm": EFFECT_NAMES[int(effect_pm)]}


def build_month_summary(year: int, month: int, double_cal: bool = False, mode: str = "website") -> dict:
    calculator = SixElementsCalculator(year, month, 1, double_cal, mode=mode)
    calculator.cal_rewo_qiaxi()
    calculator.cal_weekday_base()
    calculator.cal_sun_base()

    return {
        "积月闰余": [int(calculator.moon_month_num), int(calculator.epact)],
        "曜基数": _to_int_list(calculator.weekday_base),
        "整零数": [int(calculator.rewo), int(calculator.qiaxi)],
        "太阳基数": _to_int_list(calculator.sun_base),
        "isLeapMonth": bool(calculator.double_flag),
    }


def build_day_record(year: int, month: int, day: int, double_cal: bool = False, mode: str = "website") -> dict:
    calculator = SixElementsCalculator(year, month, day, double_cal, mode=mode)
    calculator.cal_weekday()
    calculator.cal_sun_constellation()
    calculator.cal_moon_constellation()
    calculator.cal_meet()
    calculator.cal_effect()

    return {
        "day": day,
        "定曜": _to_int_list(calculator.weekday),
        "月伴星宿": _to_int_list(calculator.moon_constellation),
        "定日": _to_int_list(calculator.sun_constellation),
        "会合": _to_int_list(calculator.meet),
        "作用": [calculator.effect["am"], calculator.effect["pm"]],
    }


def build_month_records(year: int, month: int, double_cal: bool = False, mode: str = "website") -> dict:
    return {
        "summary": build_month_summary(year, month, double_cal, mode=mode),
        "days": [build_day_record(year, month, day, double_cal, mode=mode) for day in range(1, 31)],
        "engine": f"kalachakra_runtime.SixElementsCalculator[{_normalize_mode(mode)}]",
    }
