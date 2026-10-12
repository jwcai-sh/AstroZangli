"""Daily Sun–Earth–Moon positions for the interactive orbit and phase view.

The model follows the project's earlier Skyfield/DE421 Plotly prototype. Earth
is heliocentric, Moon is geocentric, and both vectors are in ICRF axes and AU.
The client alone exaggerates the Earth–Moon separation for display.
"""

from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np
from skyfield import almanac
from skyfield.api import load, load_file


EPHEMERIS_PATH = Path(__file__).resolve().parent.parent / "de421.bsp"
PHASE_NAMES = (
    "新月", "娥眉月", "上弦月", "盈凸月",
    "满月", "亏凸月", "下弦月", "残月",
)


def phase_name(angle: float) -> str:
    if angle < 10 or angle >= 350:
        return PHASE_NAMES[0]
    if angle < 80:
        return PHASE_NAMES[1]
    if angle < 100:
        return PHASE_NAMES[2]
    if angle < 170:
        return PHASE_NAMES[3]
    if angle < 190:
        return PHASE_NAMES[4]
    if angle < 260:
        return PHASE_NAMES[5]
    if angle < 280:
        return PHASE_NAMES[6]
    return PHASE_NAMES[7]


@lru_cache(maxsize=8)
def get_sun_earth_moon_year(year: int) -> dict:
    """Return one sample at 00:00 UTC for every day of a Gregorian year."""
    if not 1900 <= year <= 2050:
        raise ValueError("年份须介于 1900 与 2050 之间（DE421 星历范围）")
    if not EPHEMERIS_PATH.is_file():
        raise FileNotFoundError("本地 DE421 星历文件不可用")

    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    count = (datetime(year + 1, 1, 1, tzinfo=timezone.utc) - start).days
    dates = [start + timedelta(days=index) for index in range(count)]
    timescale = load.timescale(builtin=True)
    times = timescale.from_datetimes(dates)
    ephemeris = load_file(str(EPHEMERIS_PATH))
    sun, earth, moon = ephemeris["sun"], ephemeris["earth"], ephemeris["moon"]

    earth_xyz = sun.at(times).observe(earth).position.au
    moon_geo_xyz = earth.at(times).observe(moon).position.au
    moon_helio_xyz = earth_xyz + moon_geo_xyz
    moon_to_sun = -moon_helio_xyz
    moon_to_earth = -moon_geo_xyz
    cosine = np.sum(moon_to_sun * moon_to_earth, axis=0) / (
        np.linalg.norm(moon_to_sun, axis=0) * np.linalg.norm(moon_to_earth, axis=0)
    )
    illuminated = (1 + np.clip(cosine, -1, 1)) / 2
    phase_angles = almanac.moon_phase(ephemeris, times).degrees % 360

    # Plot the orbit at six-hour intervals, while keeping the slider daily.
    # The exaggerated lunar path turns sharply and looks jagged at one point/day.
    orbit_dates = [start + timedelta(hours=6 * index) for index in range(count * 4 + 1)]
    orbit_times = timescale.from_datetimes(orbit_dates)
    earth_orbit_xyz = sun.at(orbit_times).observe(earth).position.au
    moon_orbit_geo_xyz = earth.at(orbit_times).observe(moon).position.au
    moon_orbit_xyz = earth_orbit_xyz + moon_orbit_geo_xyz * 27

    days = []
    for index, day in enumerate(dates):
        angle = float(phase_angles[index])
        days.append({
            "date": day.date().isoformat(),
            "earth": [round(float(value), 7) for value in earth_xyz[:, index]],
            "moonGeo": [round(float(value), 7) for value in moon_geo_xyz[:, index]],
            "illumination": round(float(illuminated[index]), 4),
            "phaseAngle": round(angle, 2),
            "phaseName": phase_name(angle),
        })

    return {
        "year": year,
        "sampleTime": "00:00 UTC",
        "coordinateSystem": "ICRF / AU",
        "ephemeris": "Skyfield / local DE421",
        "moonDisplayScale": 27,
        "earthOrbit": [[round(float(value), 6) for value in earth_orbit_xyz[:, index]] for index in range(len(orbit_dates))],
        "moonOrbit": [[round(float(value), 6) for value in moon_orbit_xyz[:, index]] for index in range(len(orbit_dates))],
        "days": days,
    }
