"""Daily apparent geocentric ecliptic positions for the seven classical luminaries.

This is a modern DE421 ephemeris view, not a reconstruction of Tibetan-calendar
mean or true planetary algorithms. Jupiter and Saturn use system barycentres,
which are the bodies available in the bundled DE421 file.
"""

from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np
from skyfield.api import load, load_file
from skyfield.framelib import ecliptic_frame


EPHEMERIS_PATH = Path(__file__).resolve().parent.parent / "de421.bsp"
BODIES = (
    ("sun", "sun"),
    ("moon", "moon"),
    ("mercury", "mercury"),
    ("venus", "venus"),
    ("mars", "mars"),
    ("jupiter", "jupiter barycenter"),
    ("saturn", "saturn barycenter"),
)


@lru_cache(maxsize=8)
def get_geocentric_motion_year(year: int) -> dict:
    """Sample apparent positions at 00:00 UTC on every Gregorian date."""
    if not 1900 <= year <= 2050:
        raise ValueError("年份须介于 1900 与 2050 之间（DE421 星历范围）")
    if not EPHEMERIS_PATH.is_file():
        raise FileNotFoundError("本地 DE421 星历文件不可用")

    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    count = (datetime(year + 1, 1, 1, tzinfo=timezone.utc) - start).days
    dates = [start + timedelta(days=index) for index in range(count)]
    times = load.timescale(builtin=True).from_datetimes(dates)
    ephemeris = load_file(str(EPHEMERIS_PATH))
    earth = ephemeris["earth"]
    observer = earth.at(times)
    # Rotate catalogue ICRS vectors into the same ecliptic-of-date frame as the bodies.
    star_frames = np.moveaxis(ecliptic_frame.rotation_at(times), -1, 0)

    positions = {}
    for key, target in BODIES:
        apparent = observer.observe(ephemeris[target]).apparent()
        latitude, longitude, distance = apparent.frame_latlon(ecliptic_frame)
        longitudes = np.asarray(longitude.degrees) % 360
        daily_motion = np.zeros(count)
        daily_motion[1:] = (np.diff(longitudes) + 180) % 360 - 180
        positions[key] = [
            {
                "longitude": round(float(longitudes[index]), 4),
                "latitude": round(float(latitude.degrees[index]), 4),
                "distanceAu": round(float(distance.au[index]), 6),
                "dailyMotion": round(float(daily_motion[index]), 4),
            }
            for index in range(count)
        ]

    return {
        "year": year,
        "sampleTime": "00:00 UTC",
        "coordinateSystem": "apparent geocentric ecliptic of date",
        "ephemeris": "Skyfield / local DE421",
        "bodyNote": "Jupiter and Saturn are represented by their system barycentres.",
        "days": [
            {
                "date": date.date().isoformat(),
                "starMatrix": star_frames[index].reshape(9).tolist(),
                "bodies": {key: positions[key][index] for key, _ in BODIES},
            }
            for index, date in enumerate(dates)
        ],
    }
