"""
天文计算模块
包含日出日落、月相、行星位置等计算功能
"""
import swisseph as swe
from datetime import datetime, timedelta, timezone
import numpy as np
from zhdate import ZhDate
import math
import ephem
from kalachakra_runtime import build_day_record, build_month_summary
BEIJING_UTC_OFFSET = timedelta(hours=8)
BEIJING_TIMEZONE = timezone(BEIJING_UTC_OFFSET)
TIBETAN_CALENDAR_START = datetime(1951, 1, 8)
TIBETAN_CALENDAR_END = datetime(2051, 2, 11)

# Backward-compatible aliases used by the table-driven Tibetan calendar code.
startDate = TIBETAN_CALENDAR_START
endDate = TIBETAN_CALENDAR_END


def beijing_day_start_utc(year: int, month: int, day: int) -> datetime:
    """Return Beijing midnight for a date as a naive UTC datetime."""
    return datetime(year, month, day) - BEIJING_UTC_OFFSET


def ephem_date_to_beijing(value) -> datetime:
    """Convert a PyEphem date, which is UTC, to an aware Beijing datetime."""
    utc_dt = ephem.Date(value).datetime().replace(tzinfo=timezone.utc)
    return utc_dt.astimezone(BEIJING_TIMEZONE)

def jd_to_utc(jd):
    """将儒略日转换为UTC时间"""
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    # 将小时的小数部分转换为分钟和秒
    minutes = (hour % 1) * 60
    seconds = (minutes % 1) * 60
    return datetime(year, month, day, int(hour), int(minutes), int(seconds))

def get_planet_rise_set_transit(year, month, day, hour, minute, longitude, latitude, planet, altitude=0):
    """获取行星的升起、落下和中天时刻"""
    # Rise/set/transit are daily events. Start at midnight of the requested
    # Beijing date so the supplied clock time cannot accidentally select the
    # following day's event.
    utc_start = beijing_day_start_utc(year, month, day)
    jd = swe.julday(
        utc_start.year,
        utc_start.month,
        utc_start.day,
        utc_start.hour + utc_start.minute / 60.0,
    )
    flags = swe.FLG_SWIEPH
    geopos = [longitude, latitude, altitude]

    # 获取行星的升起、落下和中天时刻
    rise_info = swe.rise_trans(jd, planet, swe.CALC_RISE, geopos, flags=flags)
    set_info = swe.rise_trans(jd, planet, swe.CALC_SET, geopos, flags=flags)
    transit_info = swe.rise_trans(jd, planet, 4, geopos, flags=flags)

    rise = rise_info[1][0]
    set = set_info[1][0]
    transit = transit_info[1][0]

    rise_utc = jd_to_utc(rise)
    set_utc = jd_to_utc(set)
    transit_utc = jd_to_utc(transit)

    # 计算赤纬角
    planet_position = swe.calc_ut(jd, planet, swe.FLG_EQUATORIAL)
    declination = planet_position[0][1]  # 赤纬角（单位：度）

    # 转换为北京时间（UTC+8）
    rise_local = rise_utc + BEIJING_UTC_OFFSET
    set_local = set_utc + BEIJING_UTC_OFFSET
    transit_local = transit_utc + BEIJING_UTC_OFFSET

    return {
        'rise': rise_local,
        'set': set_local,
        'transit': transit_local,
        'declination': declination,
    }

def calculate_sun_moon(year, month, day, hour, minute, longitude, latitude):
    sun_result = get_planet_rise_set_transit(year, month, day, hour, minute, longitude, latitude, swe.SUN)
    moon_result = get_planet_rise_set_transit(year, month, day, hour, minute, longitude, latitude, swe.MOON)

    daylight_duration = sun_result['set'] - sun_result['rise']
    total_seconds = daylight_duration.total_seconds()
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)

    return {
        'sunrise': sun_result['rise'].strftime('%H:%M:%S'),
        'sunset': sun_result['set'].strftime('%H:%M:%S'),
        'sun_declination': f"{sun_result['declination']:.6f}",
        'daylight_duration': f"{hours}h{minutes}min",
        'moonrise': moon_result['rise'].strftime('%H:%M:%S'),
        'moonset': moon_result['set'].strftime('%H:%M:%S'),
        'moon_declination': f"{moon_result['declination']:.6f}",
    }


def get_planets_data(year, month, day, hour, minute, longitude, latitude):
    """示例：计算行星升落信息，可扩展多个行星"""
    planets = {
        'Mercury': swe.MERCURY,
        'Venus': swe.VENUS,
        'Mars': swe.MARS,
        'Jupiter': swe.JUPITER,
        'Saturn': swe.SATURN,
    }

    result = {}
    for name, planet_id in planets.items():
        data = get_planet_rise_set_transit(year, month, day, hour, minute, longitude, latitude, planet_id)
        result[name] = {
            'rise': data['rise'].strftime('%H:%M:%S'),
            'set': data['set'].strftime('%H:%M:%S'),
            'transit': data['transit'].strftime('%H:%M:%S'),
            'declination': f"{data['declination']:.6f}"
        }

    return result


def get_moonrise_moonset(year, month, day, longitude, latitude, altitude=0):
    # 从所选北京时间日期的零点开始寻找当天事件。
    utc_start = beijing_day_start_utc(year, month, day)
    jd = swe.julday(
        utc_start.year,
        utc_start.month,
        utc_start.day,
        utc_start.hour + utc_start.minute / 60.0,
    )

    flags = swe.FLG_SWIEPH
    geopos = [longitude, latitude, altitude]

    # 获取行星的升起、落下和中天时刻
    # rise_trans 会找到指定日期之后的下一个升起/落下/中天时刻
    rise_info = swe.rise_trans(jd, swe.MOON, swe.CALC_RISE, geopos, flags=flags)
    set_info = swe.rise_trans(jd, swe.MOON, swe.CALC_SET, geopos, flags=flags)
    transit_info = swe.rise_trans(jd, swe.MOON, 4, geopos, flags=flags)

    rise = rise_info[1][0]
    set = set_info[1][0]
    transit = transit_info[1][0]

    rise_utc = jd_to_utc(rise)
    set_utc = jd_to_utc(set)
    transit_utc = jd_to_utc(transit)


    # 转换为北京时间（UTC+8）
    moonrise_local = rise_utc + BEIJING_UTC_OFFSET
    moonset_local = set_utc + BEIJING_UTC_OFFSET
    moon_transit_local = transit_utc + BEIJING_UTC_OFFSET

    return {
        'moonrise': moonrise_local,
        'moonset': moonset_local,
        'moon_transit': moon_transit_local,
    }


# 化简单位
def reduction(v, periods):
    v = np.array(v)
    periods = np.array(periods)
    n = len(v)
    v_rem = np.zeros(n, dtype=int)
    v_quo = np.zeros(n, dtype=int)

    if v[-1] < 0:
        v[-1] += periods[-1]
        v[-2] -= 1

    v_quo[-1] = v[-1] // periods[-1]
    v_rem[-1] = v[-1] % periods[-1]

    for j in range(n-2, 0, -1):
        if v[j] < 0:
            v[j] += periods[j]
            v[j-1] -= 1
        v_quo[j] = (v[j] + v_quo[j+1]) // periods[j]
        v_rem[j] = (v[j] + v_quo[j+1]) % periods[j]

    if v[0] < 0:
        v[0] += periods[0]
    v_rem[0] = (v[0] + v_quo[1]) % periods[0]

    return v_rem.tolist()

# 计算日脚刻
def s_jiaoke(v, periods):
    v = np.array(v)
    periods = np.array(periods)
    n = len(v)
    v_rem = np.zeros(n, dtype=int)
    v_quo = np.zeros(n, dtype=int)

    v_rem[0] = v[0] % 135
    v_quo[0] = v[0] // 135

    for j in range(1, n):
        v_quo[j] = (v[j] + v_rem[j-1] * periods[j]) // 135
        v_rem[j] = (v[j] + v_rem[j-1] * periods[j]) % 135

    value = v_rem[-1]
    return v_quo.tolist(), value

specialDays=[[[16,-21]],#铁虎年满意月
[[-27],[8,-21],[-25],[1,-18],[0,7,-10,-22,27],[-14],[-17,24],[-9],[-13,19],[-6,24,-30],[],[-4,16,-29],[20,-22]],#1951
[[-28],[11,-21],[-25],[5,-18],[-21],[2,-14],[-17,28],[-10],[-13,23],[-7,28,-29],[-13,15],[-6,19,-30]],#1952
[[],[-5,11,-28],[15,-22],[-25],[10,-18],[-21],[7,-13],[-17],[3,-10],[-14,26],[-8],[-13,18]],#1953
[[-7,21],[0,-1],[-5,14,-29],[],[-3,9,-25],[-28],[6,-21],[-24],[2,-17],[-22,26],[-15,30],[-9],[-14,21]],#1954
[[-8,25],[-2],[-6,18,-29],[],[-3,14,-25],[-28],[11,-21],[-24],[6,-18],[-22,29],[-16],[2,-10]],#1955
[[-15,24],[-9,29],[-2,-14,16],[-6,22,-29],[],[-3,19,-25],[-7,8,-28],[15,-20],[-25],[0,10,-18],[-23],[2,-17],[5,-11]],#1956
[[-16,27],[-10],[-14,22],[-7],[-10,18],[-2],[-5,14,-28],[],[-2,9,-25],[13,-19],[-24],[5,-18]],#1957
[[9,-11,-24,26],[-17],[1,-10],[-14,26],[-7],[-10,23],[-2],[-5,19,-29],[],[-2,13,-26],[],[-2,4,-25]],#1958
[[8,-19],[-24],[1,-17],[5,-10],[-14],[1,-6,-18,21],[0,-10,28],[-1,-13,18],[-6,23,-29],[],[-3,16,-27],[],[-2,8,-24]],#1959
[[11,-20],[-24],[4,-18],[-21,30],[-14],[-17,26],[-10],[-13,22],[-6],[-11,16],[-4,19,-28],[]],#1960
[[-3,11,-27],[14,-21],[-25],[8,-18],[-21],[4,-14],[-17],[1,-10],[-13,26],[-7],[-11,19],[-5,22,-29]],#1961
[[],[-4,14,-28],[0],[-3,7,-25],[13,-18,-29],[3,-21],[10,-13,-24,30],[-17],[6,-9,-21,25],[-14,30],[-7],[-12,22],[-6,25,-30]],#1962
[[],[-5,17,-29],[],[-2,12,-26],[-28],[8,-21],[-24],[5,-17],[-21,29],[-14],[3,-8],[-13,25]],#1963
[[-8],[-13,16],[-6,21,-29],[],[-3,16,-26],[-28],[13,-21],[-24],[9,-17],[-21],[2,-15],[0,-22,23],[-14,27]],#1964
[[-9],[-13,20],[-6,26,-29],[-10,15],[-3,23,-24],[-6,12,-28],[],[-1,8,-25],[13,-17],[-22],[6,-17],[-22,27]],#1965
[[-16],[1,-10],[-13,24],[-7],[-10,20],[-3],[-5,17,-28],[],[-2,12,-25],[-30],[5,-23],[8,-18]],#1966
[[-23,30],[-17],[4,-10],[-14,29],[-7],[-10,25],[-2],[0,-5,22,-28],[],[-2,16,-26],[-30],[8,-25],[11,-19]],#1967
[[-24],[4,-17],[-21,28],[-14],[-17,24],[-10],[-13,21],[-6],[-10,15],[-3,19,-27],[],[-1,11,-26]],#1968
[[14,-20],[-24],[7,-18],[-21],[2,-14],[-17,29],[-10],[-13,25],[-6],[-10,19],[-4,22,-27],[]],#1969
[[-3,14,-27],[],[-2,6,-25],[11,-18],[0,-21],[7,-14],[-17],[4,-9,-21,23],[-13,29],[-6],[-11,22],[-5],[-11,13]],#1970
[[-4,17,-28],[],[-2,10,-25],[-29],[6,-21],[-24],[3,-17],[-20,28],[-14],[3,-6,-19,21],[-12,25],[-6]],#1971
[[-11,17],[-5,20,-29],[],[-2,14,-26],[-28],[11,-21],[-24],[7,-17],[-20],[2,-14],[-19,25],[-13,28],[0,-7]],#1972
[[-12,20],[-6,24,-29],[-11,13],[-3,19,-25],[-28],[16,-20],[-2,6,-24],[12,-17],[-21],[6,-15],[-20,28],[-14]],#1973
[[1,-8],[-13,23],[-6],[-10,18],[-3],[-6,15,-28],[],[-1,11,-24],[-28],[5,-22],[9,-16],[-21]],#1974
[[1,-15],[4,-9],[-13,27],[-7],[-10,23],[-3],[-5,20,-28],[],[-1,15,-25],[0,-29],[8,-23],[12,-17],[-22]],#1975
[[3,-16],[-21,26],[-14],[1,-6,-18,21],[-10,28],[-2,-13,18],[-5,25,-27],[-9,14],[-2,19,-25],[-30],[12,-24],[]],#1976
[[-1,2,-23],[7,-17],[-21],[1,-14],[-17,27],[-10],[-13,23],[-6],[-9,18],[-3,24,-25],[-8,11],[-1,14,-25]],#1977
[[],[-1,6,-24],[10,-18],[-21],[5,-14],[0,-17],[1,-10],[-13,28],[-6],[-10,22],[-3],[-8,14],[-2,17,-27]],#1978
[[],[-1,10,-25],[15,-17,-29],[4,-21],[10,-13,-25,30],[-17],[-20,27],[-13],[3,-5,-18,21],[-10,25],[-4],[-9,17]],#1979
[[-3,20,-27],[],[-2,13,-25],[-29],[9,-22],[-24],[5,-17],[-20],[1,-13],[-17,25],[-11,28],[-5]],#1980
[[-10,20],[-5,24,-28],[0],[-2,17,-26],[-29],[13,-21],[-24],[10,-17],[-20],[5,-14],[-18,28],[-12],[1,-6]],#1981
[[-11,23],[-6],[-10,17],[-3],[-6,12,-29],[],[-1,9,-24],[-28],[4,-21],[9,-14],[-19],[1,-14]],#1982
[[-20,22],[-12,26],[-6],[-10,21],[-3],[-6,17,-29],[],[-1,14,-24],[-28],[8,-22],[0,-27,30],[-20],[4,-15]],#1983
[[-20,26],[-13,30],[-6],[-10,25],[-3],[-6,22,-28],[-10,11],[-1,18,-25],[-29],[12,-23],[-28],[4,-22]],#1984
[[7,-16],[-20,30],[-14],[-17,24],[-10],[-13,21],[-6],[-9,17],[-2],[-6,11,-30],[15,-24],[-29]],#1985
[[6,-23],[10,-17],[-21],[3,-14],[-17,29],[-10],[-13,26],[0,-6],[-9,21],[-2],[-7,15],[-1,18,-25],[-30]],#1986
[[9,-24],[14,-16,-29],[2,-21],[8,-14],[-17],[4,-9,-21,24],[-13],[1,-5,-17,20],[-9,25],[-3],[-7,18],[-2,21,-26]],#1987
[[],[-1,13,-25],[-28],[7,-22],[-25],[3,-17],[-20,30],[-13],[-17,24],[-10,29],[-3],[-9,20]],#1988
[[-3],[-9,12],[-2,16,-25],[0,-29],[11,-22],[-24],[8,-17],[-20],[4,-13],[-17,28],[-11],[-17,20],[-10,23]],#1989
[[-4],[-9,16],[-2,20,-25],[-7,9,-29],[16,-21],[-2,6,-24],[14,-16,-28],[3,-20],[8,-13],[-18],[1,-12],[-17,23]],#1990
[[-11,26],[-5],[-9,20],[-3],[-6,15,-29],[],[-1,12,-24],[-27],[7,-21],[-25],[1,-19],[4,-13],[0,-18,26]],#1991
[[-12,29],[-6],[-10,24],[-3],[-6,20,-29],[],[-1,16,-24],[-28],[11,-21],[-26],[4,-20],[7,-14]],#1992
[[-19,29],[-13],[-17,23],[-10,28],[-2,-14,18],[-6],[-9,15],[-2],[-6,10,-28],[15,-22],[-27],[7,-21]],#1993
[[10,-15],[-20],[3,-14],[-17,27],[-10],[-13,24],[-6],[-9,20],[0,-2],[-6,14,-29],[18,-23],[-28],[10,-22]],#1994
[[-28],[2,-21],[6,-14],[-17],[2,-10],[-13,29],[-5],[-9,24],[-2],[-6,18,-30],[],[-6,9,-29]],#1995
[[13,-23],[-28],[6,-21],[12,-13,-25],[1,-17],[-20,27],[-13],[-16,23],[-9,28],[-2,-15,16],[-7,21],[-1]],#1996
[[-7,12,-30],[16,-24],[-28],[10,-22],[-25],[0,5,-17],[-20],[2,-13],[-16,27],[-10],[-14,20],[-8,24],[-3]],#1997
[[-7,15],[-1,19,-24],[-29],[14,-22],[-25],[10,-17],[-20],[7,-13],[-17],[1,-11],[-15,23],[-9,26]],#1998
[[-4],[-8,19],[-2],[-6,13,-29],[],[-2,9,-24],[-27],[6,-20],[-24,30],[-18],[4,-11],[-16,26]],#1999
[[-11,30],[0,-4],[-9,22],[-3],[-6,18,-29],[],[-2,14,-24],[-27],[10,-21],[-25],[4,-18],[8,-12],[-18,29]],#2000
[[-12],[-17,22],[-10,26],[-3],[-6,22,-28],[-10,12],[-2,19,-24],[-5,9,-28],[-14,21],[-25],[7,-20],[-26,28]],#2001
[[-19],[2,-13],[-17,26],[-10],[-13,21],[-6],[-9,18],[-2],[-5,13,-28],[19,-20],[0,-3,6,-26],[10,-21],[-26]],#2002
[[2,-20],[6,-13],[-17,30],[-10],[-13,26],[-6],[-9,23],[-2],[-5,17,-29],[],[-4,10,-28],[13,-22]],#2003
[[-27],[5,-20],[10,-13,-25,28],[-17],[4,-10,-22,24],[-13],[2,-5,-16,22],[-9,27],[-1,-14,16],[-6,21,-30],[],[-5,13,-29]],#2004
[[16,-23],[-27],[9,-21],[-25],[3,-18],[-20,30],[0,-13],[-16,26],[-9],[-13,20],[-7,24],[-1],[-6,16,-30]],#2005
[[19,-23],[-28],[13,-22],[-25],[8,-18],[-20],[5,-13],[-16,30],[-10],[-14,24],[-8,27],[-1]],#2006
[[-7,19],[-1],[-5,12,-29],[17,-21],[-3,7,-25],[14,-16,-28],[4,-20],[-24,29],[-17],[4,-10],[-15,27],[-9]],#2007
[[-15,18],[-8,22],[-2],[0,-6,16,-29],[],[-2,12,-25],[-27],[9,-20],[-24],[3,-17],[-23,26],[-16,30],[-10]],#2008
[[-15,21],[-9,25],[-3],[-6,20,-29],[],[-2,17,-24],[-27],[13,-20],[-24],[7,-18],[-23,29],[-17]],#2009
[[2,-11],[-16,25],[-10],[-14,19],[-6,26,-27],[-9,16],[-2],[-5,12,-28],[],[-2,6,-25],[10,-19],[0,-24],[2,-18]],#2010
[[5,-12],[-17,29],[-10],[-13,24],[-6],[-9,21],[-2],[-5,16,-28],[],[-2,10,-26],[13,-20],[-25]],#2011
[[5,-19],[9,-12,-25,27],[-17],[3,-10],[-13,29],[-6],[-9,25],[-1],[-5,20,-29],[],[-3,13,-27],[17,-21]],#2012
[[-26],[8,-20],[-24],[2,-18],[-21,28],[-13],[-16,24],[-9],[0,-12,20],[-6,24,-29],[],[-4,16,-28],[]],#2013
[[-4,7,-27],[12,-21],[-25],[6,-18],[-20],[3,-13],[-16,29],[-9],[-13,23],[-6],[-12,16],[-5,19,-30]],#2014
[[],[-4,11,-28],[15,-21],[-25],[11,-17],[-20],[8,-12,-24,27],[-16],[3,-9],[-13,27],[-7],[-12,19]],#2015
[[-6,22,-30],[],[-5,15,-29],[],[0,-2,10,-25],[-28],[6,-20],[-23],[2,-17],[-21,26],[-14,30],[-8],[-13,22]],#2016
[[-8,25],[-1],[-6,19,-29],[],[-2,14,-25],[-27],[11,-20],[-24],[6,-17],[-21,30],[-15],[3,-9]],#2017
[[-15,25],[-9],[-13,18],[-6,23,-29],[],[-2,20,-24],[-5,10,-28],[16,-19],[-2,5,-24],[10,-18],[-22],[3,-17]],#2018
[[6,-10],[0,-16,28],[-9],[-13,22],[-6],[-9,18],[-2],[-5,15,-28],[],[-1,10,-25],[14,-18],[-23],[5,-18]],#2019
[[-23,27],[-16],[2,-10],[-13,27],[-6],[-9,23],[-2],[-5,19,-28],[],[-2,13,-26],[],[-1,5,-25]],#2020
[[8,-19],[-23],[1,-17],[6,-9,-21,25],[-14],[2,-5,-17,22],[-9],[-12,18],[-6,24,-28],[0],[-3,16,-27],[],[-2,8,-26]],#2021
[[11,-20],[-24],[5,-17],[-21,30],[-14],[-16,27],[-9],[-12,23],[-6],[-10,16],[-4,19,-28],[]],#2022
[[-3,11,-27],[15,-20],[-24],[9,-18],[-21],[5,-13],[-16],[2,-9],[-13,26],[-6],[-11,19],[-5,22,-29]],#2023
[[],[-4,14,-28],[],[-2,8,-25],[14,-17,-28],[4,-21],[0,-23],[1,-16],[-20,26],[-13,30],[-7],[-12,22],[-6,25,-30]],#2024
[[],[-5,18,-28],[],[-2,12,-25],[-28],[9,-21],[-23],[5,-17],[-20,30],[-14],[4,-7],[-13,25]],#2025
[[-7],[-12,17],[-5,22,-29],[],[-2,17,-25],[-28],[14,-20],[-24],[9,-17],[-21],[3,-15],[-21,24]],#2026
[[-14,28],[-8],[0,-12,21],[-6],[-10,16],[-2],[-5,13,-28],[],[-1,9,-24],[14,-16,-29],[2,-22],[6,-16],[-21,28]],#2027
[[-15],[1,-9],[-13,25],[-6],[-9,21],[-2],[-5,18,-28],[],[-1,13,-25],[-29],[6,-23],[9,-17]],#2028
[[-22],[1,-16],[5,-9,-22,23],[-13,29],[-6],[-9,26],[-2,-13,16],[-5,22,-27],[],[-2,16,-25],[-30],[0,9,-24],[12,-18]],#2029
[[-23],[4,-17],[-21,28],[-14],[-17,25],[-9],[-12,21],[-5],[-9,16],[-2,20,-26],[],[-1,11,-25]],#2030
[[15,-19],[-24],[8,-17],[-21],[3,-14],[-16,30],[-9],[-12,25],[-5],[-9,19],[-3,23,-27],[]],#2031
[[-2,14,-27],[],[-1,7,-24],[12,-17],[-21],[8,-13,-25,28],[-16],[0,5,-8,-20,24],[-13,29],[-6],[-10,22],[-4],[-10,14]],#2032
[[-3,17,-28],[],[-1,11,-25],[-28],[6,-21],[-23],[3,-16],[-20,29],[-13],[-18,22],[-11,25],[-6]],#2033
[[-11,17],[-4,21,-28],[],[-2,15,-25],[-28],[11,-21],[-23],[8,-16],[-20],[2,-14],[-18,25],[-12,28]],#2034
[[-7],[-11,20],[-5,25,-27],[-10,14],[0,-2,20,-24],[-6,10,-28],[18,-19],[-1,7,-24],[13,-16,-28],[1,-21],[6,-15],[-19,28],[-14]],#2035
[[1,-8],[-12,24],[-6],[-9,19],[-2],[-5,15,-28],[],[-1,11,-24],[-28],[6,-22],[9,-15],[-21]],#2036
[[1,-15],[5,-8,-21,22],[-13,28],[-6],[-9,23],[-2],[-5,20,-28],[],[-1,15,-24],[-28],[9,-23],[13,-16],[0,-22]],#2037
[[4,-16],[-20,27],[-13],[3,-5,-17,22],[-9],[-12,19],[-5],[-8,15],[-1,19,-25],[-29],[12,-24],[-30]],#2038
[[3,-23],[7,-17],[-20],[1,-14],[-17,27],[-9],[-12,24],[-5],[-8,19],[-2],[-7,11],[-1,15,-25]],#2039
[[-30],[7,-24],[11,-17],[-21],[6,-14],[-17],[2,-9],[-12,28],[-5],[0,-9,22],[-3],[-8,15],[-2,17,-26]],#2040
[[],[-1,10,-24],[-28],[5,-21],[-24],[1,-16],[-19,27],[-12],[-17,22],[-10,26],[-4],[-9,17]],#2041
[[-3,21,-27],[],[-1,14,-25],[-28],[9,-21],[-24],[6,-16],[-19],[2,-13],[-17,25],[-11,29],[-5]],#2042
[[-10,20],[-4,25,-27],[-9,13],[-2,18,-25],[-28],[0,14,-21],[-24],[11,-16,-28,30],[-20],[5,-13],[-18,28],[-12],[2,-5]],#2043
[[-11,23],[-5],[-9,17],[-2],[-5,13,-28],[],[-1,10,-24],[-27],[5,-21],[10,-13],[-19],[1,-13]],#2044
[[-19,23],[-12,27],[-6],[-9,30],[-2],[-5,18,-28],[],[-1,14,-24],[-28],[9,-21],[-26],[1,-20]],#2045
[[4,-14],[-19,26],[0,-13],[1,-6,-18,19],[-10,26],[-2,-14,16],[-5,23,-27],[-9,13],[-1,19,-24],[-28],[12,-22],[-27],[4,-21]],#2046
[[7,-15],[-20,30],[-13],[-17,25],[-10],[-12,23],[-5],[-8,18],[-1],[-6,12,-29],[15,-23],[-28]],#2047
[[7,-22],[10,-16],[-20],[4,-14],[-17,30],[-10],[-12,27],[-5],[-8,22],[-2],[0,-6,15,-30],[18,-24],[-29]],#2048
[[10,-23],[-28],[3,-21],[8,-13,-25,28],[-17],[5,-8,-20,25],[-12],[2,-4,-16,21],[-9,25],[-2],[-7,18],[-1,21,-25]],#2049
[[-30],[13,-24],[-28],[7,-21],[-24],[4,-17],[-19,30],[-12],[-16,25],[-10,29],[-3],[-8,12]]]#2050

def get_zangli(p):
    d = p

    if d < TIBETAN_CALENDAR_START or d > TIBETAN_CALENDAR_END:
        return {"value": "error"}

    days = round((d - startDate).total_seconds() / 86400)
    counting_days = 0
    counting_month = 0
    for years in range(len(specialDays)):
        leap_months = 0  # 这一年前面闰了几个月
        for months in range(len(specialDays[years])):
            t_days = 30
            for i in range(len(specialDays[years][months])):
                if specialDays[years][months][i] < 0:
                    t_days -= 1
                elif specialDays[years][months][i] > 0:
                    t_days += 1
                elif specialDays[years][months][i] == 0:
                    leap_months += 1
            if counting_days + t_days <= days:  # 还没到当前月，直接累加日子
                counting_days += t_days
            else:
                t_days = days - counting_days
                day_leap = False
                day_miss = False
                month_leap = False
                for i in range(len(specialDays[years][months])):
                    if specialDays[years][months][i] == 0:  # 闰月
                        month_leap = True
                    else:
                        sd = specialDays[years][months][i]
                        if sd + 1 == -t_days:  # 当天缺日
                            day_miss = True
                            t_days += 1
                        elif sd == t_days:  # 当天闰日
                            day_leap = True
                            t_days -= 1
                        elif sd > 0 and sd < t_days:  # 前面出现一个闰日
                            t_days -= 1
                        elif sd < 0 and -sd - 1 < t_days:  # 前面出现一个缺日
                            t_days += 1
                if years == 0:
                    months = 12 - len(specialDays[0])



                return [years + 1950, months - leap_months + 1, t_days + 1]
    return {"value": "error"}

def get_tibetan_lunar_info(d: datetime):
    """调用 get_zangli()，获取藏历日期的详细信息"""
    zangli_data = get_zangli(d)

    # 若 get_zangli 返回错误
    if isinstance(zangli_data, dict) and zangli_data.get("value") == "error":
        return {"value": "error"}

    zang_year, zang_month, zang_day = zangli_data

    # 五行和生肖推算
    year_name = "铁水木火土"[(zang_year - 1950) // 2 % 5] + \
                "虎兔龙蛇马羊猴鸡狗猪鼠牛"[(zang_year - 1950) % 12]

    # 藏历月名（含“神变月”等）
    month_names_cn = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"]
    t_month_names = ["神变", "苦行", "具香", "萨嘎", "作净", "明净",
                     "具醉", "具贤", "天降", "持众", "庄严", "满意"]

    # 藏历日期中文（与农历日期样式一致）
    day_names_cn = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
                    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
                    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]

    # 处理溢出或异常
    month_idx = (zang_month - 1) % 12
    day_idx = (zang_day - 1) % 30

    month_label = f"{month_names_cn[month_idx]}月"
    day_label = day_names_cn[day_idx]
    zangli_full = f"{year_name}年 {month_label}{day_label}"

    result = {
        "zangli_date": zangli_full,
        "t_month_name": t_month_names[month_idx],
        "tibetan_year": zang_year,
        "tibetan_month": zang_month,
        "tibetan_day": zang_day,
        "year_name": year_name,
        "month_label": month_label,
        "day_label": day_label,
    }
    return result


def get_lunar_text(dt: datetime) -> str:
    """将公历 datetime 转为中文农历串，例如"二零二五年 六月廿九"。

    依赖 zhdate 库，若缺失则返回空串以便前端优雅降级。
    """
    if dt is None:
        return ''
    try:
        z = ZhDate.from_datetime(dt)
        # zhdate 的 chinese() 形如 "二零二五年九月十二 乙巳年 (蛇年)"
        # 我们只需要第一部分，即纯农历日期，不需要干支年和生肖
        text = z.chinese()
        # 按空格分割，取第一部分（仅日期）
        text = text.split(' ')[0] if ' ' in text else text
        # 在年后面加个空格，方便阅读
        text = text.replace('年', '年 ')
        return text
    except Exception as e:
        # 添加日志方便调试
        import logging
        logging.warning(f"get_lunar_text failed for {dt}: {e}")
        return ''


def get_lunar_day(dt: datetime) -> int:
    """获取农历日期（1-30），用于月相图片匹配。
    
    返回农历当月的第几天，1表示初一，30表示三十。
    """
    if ZhDate is None or dt is None:
        # 返回0表示农历不可用，前端应回退为仅按照明度匹配
        return 0
    try:
        z = ZhDate.from_datetime(dt)
        return z.lunar_day
    except Exception:
        # 异常时同样返回0，避免误判为上半月
        return 0



def calculate_five_elements(year0, month0, day0):
    tibetan_info = get_tibetan_lunar_info(datetime(year0, month0, day0))

    if isinstance(tibetan_info, dict) and tibetan_info.get("value") == "error":
        return {
            '定曜': [0, 0, 0, 0, 0, 0],
            '太阳日月宿': [0, 0, 0, 0, 0, 0],
            '月伴星宿': [0, 0, 0, 0, 0, 0],
            '太阴日月宿': [0, 0, 0, 0, 0, 0],
            '定日': [0, 0, 0, 0, 0],
            '会合': [0, 0, 0, 0, 0, 0],
            '作用': ['', ''],
            '积月': 0,
            '闰余': 0,
            '曜基数': [0, 0, 0, 0, 0],
            '整零数': [0, 0],
            '太阳基数': [0, 0, 0, 0, 0],
            '是否闰月': 0,
        }

    tibetan_year = tibetan_info['tibetan_year']
    tibetan_month = tibetan_info['tibetan_month']
    tibetan_day = tibetan_info['tibetan_day']

    month_summary = build_month_summary(tibetan_year, tibetan_month)
    day_record = build_day_record(tibetan_year, tibetan_month, tibetan_day)
    lunar_partner = day_record['月伴星宿']

    return {
        '定曜': day_record['定曜'],
        '太阳日月宿': lunar_partner,
        '月伴星宿': lunar_partner,
        '定日': day_record['定日'],
        '会合': day_record['会合'],
        '太阴日月宿': day_record['定日'] + [0],
        '作用': day_record['作用'],
        '积月': month_summary['积月闰余'][0],
        '闰余': month_summary['积月闰余'][1],
        '曜基数': month_summary['曜基数'],
        '整零数': month_summary['整零数'],
        '太阳基数': month_summary['太阳基数'],
        '是否闰月': int(month_summary['isLeapMonth']),
    }


def get_moon_illumination(year: int, month: int, day: int, hour: int, minute: int) -> float:
    """返回指定公历日期的月面照明度(0~1)。

    传入的时间默认视为北京时间(UTC+8)，先换算为世界时(UTC)，
    再使用 Swiss Ephemeris 的 pheno_ut 计算位相参数，其中索引1为
    被照亮部分比例 (illumination fraction)。
    """
    # 本地(中国)时间 -> 世界时
    local_dt = datetime(year, month, day, hour, minute)
    utc_dt = local_dt - timedelta(hours=8)

    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, utc_dt.hour + utc_dt.minute/60)
    pheno = swe.pheno_ut(jd, swe.MOON)
    return float(pheno[1])

def get_moon_phase_name_and_angle(year: int, month: int, day: int):
    """
    根据日期计算月相角与月相名称。
    返回：(phase_name, phase_angle)
    例如：("下弦月", 270.5)
    """

    # 使用 PyEphem 计算太阳与月亮的黄道坐标
    obs = ephem.Observer()
    # Use local noon in Beijing as the representative instant.
    obs.date = datetime(year, month, day, 12) - BEIJING_UTC_OFFSET

    sun = ephem.Sun(obs)
    moon = ephem.Moon(obs)

    # 转换为黄道坐标系
    sun_ecl = ephem.Ecliptic(sun)
    moon_ecl = ephem.Ecliptic(moon)

    # 月相角 = 月亮黄经 - 太阳黄经
    phase_angle = math.degrees((moon_ecl.lon - sun_ecl.lon) % (2 * math.pi))

    # 根据相位角判断月相名称
    # 新月（农历初一日，即朔日）：0度
    # 上娥眉月（农历初二夜～初七日）：0度～90度
    # 上弦月（农历初八左右）：90度
    # 盈凸月（农历初九～十四）：90度～180度
    # 满月（望月，农历十五或十六）：180度
    # 亏凸月（农历十六～二十三）：180度～270度
    # 下弦月（农历二十三左右）：270度
    # 下娥眉月（农历二十四～月末）：270度～360度
    
    if 0 <= phase_angle < 5 or phase_angle >= 355:
        phase_name = "新月"  # 朔日
    elif 5 <= phase_angle < 85:
        phase_name = "上娥眉月"
    elif 85 <= phase_angle < 95:
        phase_name = "上弦月"
    elif 95 <= phase_angle < 175:
        phase_name = "盈凸月"
    elif 175 <= phase_angle < 185:
        phase_name = "满月"  # 望月
    elif 185 <= phase_angle < 265:
        phase_name = "亏凸月"
    elif 265 <= phase_angle < 275:
        phase_name = "下弦月"
    else:  # 275 <= phase_angle < 355
        phase_name = "下娥眉月"

    return phase_name, round(phase_angle, 1)


def get_moon_phase_info(date_str: str, latitude: float, longitude: float):
    """
    根据日期与经纬度返回月相相关信息。
    
    """
    # 若未传入日期则使用当前北京时间
    if not date_str:
        now = datetime.utcnow() + timedelta(hours=8)
        date_str = now.strftime('%Y-%m-%d')
        # 使用当前时间作为观测时间
        observation_hour = now.hour
        observation_minute = now.minute
    else:
        # 如果传入了日期，使用该日期的中午12点作为代表性观测时间
        observation_hour = 12
        observation_minute = 0
    
    # 解析日期
    year, month, day = map(int, date_str.split('-'))

    # 观测时间（查询日期当天的代表性时间）
    observation_time = f"{observation_hour:02d}:{observation_minute:02d}"

    # 计算月出月落等天文参数
    astro = get_moonrise_moonset(year, month, day, longitude, latitude)
    # 使用观测时间计算照明度，更准确
    illumination = get_moon_illumination(year, month, day, observation_hour, observation_minute)
    
    # 构造 datetime 对象（用于农历计算）
    local_dt = datetime(year, month, day, observation_hour, observation_minute)

    # 获取农历信息
    lunar_text = get_lunar_text(local_dt)
    lunar_day = get_lunar_day(local_dt)

    # 计算月相名与相位角（假设你已有这两个函数）
    phase_name, phase_angle = get_moon_phase_name_and_angle(year, month, day)

    # 组装返回数据
    moon_phase = {
        "lunarDate": lunar_text,
        "lunar_day": lunar_day,
        "observationTime": observation_time,
        "illumination": round(illumination, 3),
        "culminationTime": astro["moon_transit"].strftime('%H:%M'),
        "moonriseTime": astro["moonrise"].strftime('%H:%M'),
        "moonsetTime": astro["moonset"].strftime('%H:%M'),
        "phaseName": phase_name,
        "phaseAngle": round(phase_angle, 1)
    }

    return moon_phase

def get_solar_planetary_chart(date_str: str, latitude=31.1944, longitude=121.4600):
    """
    输入日期与经纬度，返回太阳当天的星座、宫位、升起/落下/中天时间、黄道坐标等信息。
    """

    # 解析输入日期
    year, month, day = map(int, date_str.split('-'))
    obs = ephem.Observer()
    obs.lat, obs.lon = str(latitude), str(longitude)
    obs.date = beijing_day_start_utc(year, month, day)

    # 太阳天体
    sun = ephem.Sun(obs)

    # 日出、日落、中天时间（显式转换为北京时间，避免依赖服务器时区）
    rise_time = ephem_date_to_beijing(obs.next_rising(sun)).strftime('%H:%M')
    set_time = ephem_date_to_beijing(obs.next_setting(sun)).strftime('%H:%M')
    transit_time = ephem_date_to_beijing(obs.next_transit(sun)).strftime('%H:%M')

    # 黄道位置取所选日期的北京时间正午。
    obs.date = datetime(year, month, day, 12) - BEIJING_UTC_OFFSET
    sun.compute(obs)

    # 黄经（度）
    ecl = ephem.Ecliptic(sun)
    lon_deg = math.degrees(ecl.lon) % 360

    # 黄道十二宫 & 星座名称
    zodiac_list = [
        ("白羊座", "白羊宫", 0),
        ("金牛座", "金牛宫", 30),
        ("双子座", "双子宫", 60),
        ("巨蟹座", "巨蟹宫", 90),
        ("狮子座", "狮子宫", 120),
        ("处女座", "室女宫", 150),
        ("天秤座", "天秤宫", 180),
        ("天蝎座", "天蝎宫", 210),
        ("射手座", "人马宫", 240),
        ("摩羯座", "摩羯宫", 270),
        ("水瓶座", "宝瓶宫", 300),
        ("双鱼座", "双鱼宫", 330),
    ]

    for constellation, zodiac, start_deg in zodiac_list:
        if start_deg <= lon_deg < start_deg + 30:
            zodiac_sign = zodiac
            constellation_name = constellation
            zodiac_degree = lon_deg - start_deg
            break

    degree = int(zodiac_degree)
    minute = round((zodiac_degree - degree) * 60, 1)

    weekday_map = ['周一','周二','周三','周四','周五','周六','周日']
    weekday = weekday_map[datetime(year, month, day).weekday()]

    solar_date = f"{year}年{month}月{day}日 {weekday}"

    return {
        "solarDate": solar_date,
        "constellation": constellation_name,  # 星座名保持原有称呼
        "riseTime": rise_time,
        "setTime": set_time,
        "transitTime": transit_time,
        "zodiacPosition": {
            "sign": zodiac_sign,
            "degree": round(degree + minute / 60, 1),
            "minute": minute
        }
    }
