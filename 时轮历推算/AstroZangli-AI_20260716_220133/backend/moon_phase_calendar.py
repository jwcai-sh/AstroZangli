"""Daily geocentric lunar phases for a civil month.

Each day is sampled at 12:00 in the requested IANA time zone.  The eight
phase labels describe angle sectors, not the exact instants of syzygy or
quadrature.
"""

import calendar
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import swisseph as swe
import ephem


PHASE_NAMES = (
    "新月", "娥眉月", "上弦月", "盈凸月",
    "满月", "亏凸月", "下弦月", "残月",
)

MAJOR_PHASES = (
    ("new_moon", ephem.next_new_moon),
    ("first_quarter", ephem.next_first_quarter_moon),
    ("full_moon", ephem.next_full_moon),
    ("last_quarter", ephem.next_last_quarter_moon),
)


def get_major_phase_events(year: int, month: int, zone: ZoneInfo) -> dict:
    """Map exact principal-phase instants to dates in the requested zone."""
    start_local = datetime(year, month, 1, tzinfo=zone)
    end_local = datetime(year + 1, 1, 1, tzinfo=zone) if month == 12 else datetime(year, month + 1, 1, tzinfo=zone)
    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)
    events = {}
    for kind, next_phase in MAJOR_PHASES:
        cursor = (start_utc - timedelta(days=2)).replace(tzinfo=None)
        while True:
            event = next_phase(cursor)
            instant_utc = ephem.Date(event).datetime().replace(tzinfo=timezone.utc)
            if instant_utc >= end_utc:
                break
            if instant_utc >= start_utc:
                local = instant_utc.astimezone(zone)
                events[local.date().isoformat()] = {"kind": kind, "localTime": local.strftime("%H:%M")}
            cursor = (instant_utc + timedelta(minutes=1)).replace(tzinfo=None)
    return events


def get_month_moon_phases(year: int, month: int, time_zone: str) -> dict:
    if not 1800 <= year <= 2100:
        raise ValueError("年份须介于 1800 与 2100 之间")
    if not 1 <= month <= 12:
        raise ValueError("月份须介于 1 与 12 之间")
    try:
        zone = ZoneInfo(time_zone)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise ValueError("无效的 IANA 时区") from error

    major_events = get_major_phase_events(year, month, zone)
    days = []
    for day in range(1, calendar.monthrange(year, month)[1] + 1):
        local_noon = datetime(year, month, day, 12, tzinfo=zone)
        utc_noon = local_noon.astimezone(timezone.utc)
        hour = utc_noon.hour + utc_noon.minute / 60 + utc_noon.second / 3600
        jd = swe.julday(utc_noon.year, utc_noon.month, utc_noon.day, hour)
        sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
        moon_lon = swe.calc_ut(jd, swe.MOON)[0][0]
        elongation = (moon_lon - sun_lon) % 360
        illumination = float(swe.pheno_ut(jd, swe.MOON)[1])
        if elongation < 10 or elongation >= 350:
            phase_index = 0
        elif elongation < 80:
            phase_index = 1
        elif elongation < 100:
            phase_index = 2
        elif elongation < 170:
            phase_index = 3
        elif elongation < 190:
            phase_index = 4
        elif elongation < 260:
            phase_index = 5
        elif elongation < 280:
            phase_index = 6
        else:
            phase_index = 7
        days.append({
            "date": local_noon.date().isoformat(),
            "phaseName": PHASE_NAMES[phase_index],
            "phaseIndex": phase_index,
            "elongation": round(elongation, 2),
            "illumination": round(illumination, 4),
            "majorPhase": major_events.get(local_noon.date().isoformat()),
        })

    return {
        "year": year,
        "month": month,
        "timeZone": time_zone,
        "sampleTime": "12:00",
        "days": days,
    }
