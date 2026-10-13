"""Local sky samples for the China-city educational planetarium.

DE421 apparent topocentric positions, no atmospheric refraction. Annual mode
keeps the selected city's local civil clock fixed at the chosen hour.
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
    # Coordinates are representative city-center observing points; Chinese
    # locations use China Standard Time (including Urumqi for consistent UI).
    "lhasa": ("拉萨", 29.647, 91.1175, 3658, "Asia/Shanghai"),
    "riwoche": ("类乌齐", 31.21, 96.60, 3840, "Asia/Shanghai"),
    "beijing": ("北京", 39.9042, 116.4074, 44, "Asia/Shanghai"),
    "shanghai": ("上海", 31.2304, 121.4737, 4, "Asia/Shanghai"),
    "tianjin": ("天津", 39.1394, 117.1767, 11, "Asia/Shanghai"),
    "shijiazhuang": ("石家庄", 38.0428, 114.5149, 81, "Asia/Shanghai"),
    "taiyuan": ("太原", 37.8706, 112.5489, 800, "Asia/Shanghai"),
    "hohhot": ("呼和浩特", 40.8426, 111.7492, 1065, "Asia/Shanghai"),
    "shenyang": ("沈阳", 41.8057, 123.4315, 45, "Asia/Shanghai"),
    "changchun": ("长春", 43.8171, 125.3235, 236, "Asia/Shanghai"),
    "harbin": ("哈尔滨", 45.8038, 126.5350, 150, "Asia/Shanghai"),
    "nanjing": ("南京", 32.0603, 118.7969, 12, "Asia/Shanghai"),
    "hangzhou": ("杭州", 30.2741, 120.1551, 19, "Asia/Shanghai"),
    "hefei": ("合肥", 31.8206, 117.2272, 29, "Asia/Shanghai"),
    "fuzhou": ("福州", 26.0745, 119.2965, 84, "Asia/Shanghai"),
    "xiamen": ("厦门", 24.4798, 118.0894, 24, "Asia/Shanghai"),
    "nanchang": ("南昌", 28.6820, 115.8579, 25, "Asia/Shanghai"),
    "jinan": ("济南", 36.6512, 117.1201, 57, "Asia/Shanghai"),
    "qingdao": ("青岛", 36.0671, 120.3826, 25, "Asia/Shanghai"),
    "zhengzhou": ("郑州", 34.7466, 113.6254, 110, "Asia/Shanghai"),
    "wuhan": ("武汉", 30.5928, 114.3055, 23, "Asia/Shanghai"),
    "changsha": ("长沙", 28.2282, 112.9388, 63, "Asia/Shanghai"),
    "guangzhou": ("广州", 23.1291, 113.2644, 21, "Asia/Shanghai"),
    "shenzhen": ("深圳", 22.5431, 114.0579, 31, "Asia/Shanghai"),
    "nanning": ("南宁", 22.8170, 108.3665, 80, "Asia/Shanghai"),
    "haikou": ("海口", 20.0442, 110.1999, 14, "Asia/Shanghai"),
    "chongqing": ("重庆", 29.5630, 106.5516, 260, "Asia/Shanghai"),
    "chengdu": ("成都", 30.5728, 104.0668, 500, "Asia/Shanghai"),
    "guiyang": ("贵阳", 26.6470, 106.6302, 1070, "Asia/Shanghai"),
    "kunming": ("昆明", 24.8801, 102.8329, 1890, "Asia/Shanghai"),
    "lanzhou": ("兰州", 36.0611, 103.8343, 1520, "Asia/Shanghai"),
    "xining": ("西宁", 36.6171, 101.7782, 2260, "Asia/Shanghai"),
    "urumqi": ("乌鲁木齐", 43.8256, 87.6168, 800, "Asia/Shanghai"),
    "xian": ("西安", 34.3416, 108.9398, 405, "Asia/Shanghai"),
    "yinchuan": ("银川", 38.4872, 106.2309, 1110, "Asia/Shanghai"),
    "hong-kong": ("香港", 22.3193, 114.1694, 20, "Asia/Hong_Kong"),
    "macau": ("澳门", 22.1987, 113.5439, 20, "Asia/Macau"),
    "taipei": ("台北", 25.0330, 121.5654, 10, "Asia/Taipei"),
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


@lru_cache(maxsize=64)
def get_sky_view(city: str, mode: str, date: str, hour: int = 12) -> dict:
    if city not in CITIES:
        raise ValueError("请选择列表中的观测城市")
    if mode not in ("daily", "annual"):
        raise ValueError("模式须为 daily 或 annual")
    if not isinstance(hour, int) or not 0 <= hour <= 23:
        raise ValueError("采样小时须介于 0 与 23")
    name, latitude, longitude, elevation, timezone = CITIES[city]
    local_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=ZoneInfo(timezone))
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
        "mode": mode, "timezone": timezone, "frames": frames,
        "source": "Skyfield / DE421 · apparent topocentric, no refraction",
        "sampleMinutes": 10 if mode == "daily" else 1440,
    }
