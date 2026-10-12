"""Local sky samples for the four-city educational planetarium.

DE421 apparent topocentric positions, no atmospheric refraction. Annual mode
keeps the local civil clock fixed (Asia/Shanghai), matching annual_motion.py.
The frame matrix maps the J2000/ICRS bright-star catalogue to the equator of
date; stellar aberration and parallax are omitted by the lightweight viewer.
"""

from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from skyfield import almanac
from skyfield.api import load, load_file, wgs84

CITIES = {
    "lhasa": ("拉萨", 29.647, 91.1175, 3658),
    "riwoche": ("类乌齐", 31.21, 96.60, 3840),
    "shanghai": ("上海", 31.2304, 121.4737, 4),
    "beijing": ("北京", 39.9042, 116.4074, 44),
}
BODIES = (
    ("sun", "sun"), ("moon", "moon"), ("mercury", "mercury"),
    ("venus", "venus"), ("mars", "mars"),
    ("jupiter", "jupiter barycenter"), ("saturn", "saturn barycenter"),
)


@lru_cache(maxsize=1)
def _resources():
    path = Path(__file__).resolve().parent.parent / "de421.bsp"
    return load_file(str(path)), load.timescale(builtin=True)


@lru_cache(maxsize=16)
def get_sky_view(city: str, mode: str, date: str, hour: int = 12) -> dict:
    if city not in CITIES:
        raise ValueError("请选择拉萨、类乌齐、上海或北京")
    if mode not in ("daily", "annual"):
        raise ValueError("模式须为 daily 或 annual")
    if not isinstance(hour, int) or not 0 <= hour <= 23:
        raise ValueError("采样小时须介于 0 与 23")
    local_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Shanghai"))
    if not 1900 <= local_date.year <= 2050:
        raise ValueError("年份须介于 1900 与 2050 之间")
    if mode == "annual":
        start = local_date.replace(month=1, day=1, hour=hour)
        count = (start.replace(year=start.year + 1) - start).days
        dates = [start + timedelta(days=index) for index in range(count)]
    else:
        dates = [local_date + timedelta(minutes=index * 10) for index in range(144)]

    eph, ts = _resources()
    times = ts.from_datetimes(dates)
    name, latitude, longitude, elevation = CITIES[city]
    observer = (eph["earth"] + wgs84.latlon(latitude, longitude, elevation_m=elevation)).at(times)
    body_arrays = {}
    for key, target in BODIES:
        altitude, azimuth, distance = observer.observe(eph[target]).apparent().altaz()
        body_arrays[key] = (altitude.degrees, azimuth.degrees, distance.au)
    illumination = almanac.fraction_illuminated(eph, "moon", times)
    matrices = np.moveaxis(times.M, -1, 0)
    frames = []
    for index, time in enumerate(dates):
        frames.append({
            "localTime": time.strftime("%Y-%m-%dT%H:%M"),
            "gast": round(float(times.gast[index] * 15), 8),
            "matrix": [round(float(n), 10) for n in matrices[index].ravel()],
            "moonIllumination": round(float(illumination[index]), 4),
            "bodies": {
                key: {"altitude": round(float(values[0][index]), 5),
                      "azimuth": round(float(values[1][index]), 5),
                      "distanceAu": round(float(values[2][index]), 8)}
                for key, values in body_arrays.items()
            },
        })
    return {
        "city": {"id": city, "name": name, "latitude": latitude, "longitude": longitude, "elevation": elevation},
        "mode": mode, "timezone": "Asia/Shanghai", "frames": frames,
        "source": "Skyfield / DE421 · apparent topocentric, no refraction",
        "sampleMinutes": 10 if mode == "daily" else 1440,
    }
