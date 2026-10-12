"""Yearly eclipse catalogue with circumstances for one observing location.

Times are UTC. Global events remain in the catalogue even when the eclipse
cannot be seen from the requested location.
"""
from datetime import datetime, timezone
import swisseph as swe


def _utc_iso(jd):
    if not jd:
        return None
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    # Construct from a midnight Julian day to avoid rounding 59.999 seconds.
    midnight = datetime(year, month, day, tzinfo=timezone.utc)
    from datetime import timedelta
    return (midnight + timedelta(hours=hour)).isoformat().replace("+00:00", "Z")


def _kind(flags, solar):
    if solar:
        if flags & swe.ECL_ANNULAR_TOTAL:
            return "solar_hybrid"
        if flags & swe.ECL_TOTAL:
            return "solar_total"
        if flags & swe.ECL_ANNULAR:
            return "solar_annular"
        return "solar_partial"
    if flags & swe.ECL_TOTAL:
        return "lunar_total"
    if flags & swe.ECL_PARTIAL:
        return "lunar_partial"
    return "lunar_penumbral"


def _circumstances(global_max, geopos, solar):
    search = swe.sol_eclipse_when_loc if solar else swe.lun_eclipse_when_loc
    flags, times, attrs = search(global_max - 2, geopos)
    if abs(times[0] - global_max) > 1.5:
        return {"visible": False, "localType": None, "maximumUtc": None,
                "startUtc": None, "endUtc": None, "magnitude": None}
    if solar:
        start, end = times[1], times[4]
        magnitude = attrs[0]
    else:
        start, end = times[6], times[7]
        magnitude = attrs[0]
    return {
        "visible": True,
        "localType": _kind(flags, solar),
        "maximumUtc": _utc_iso(times[0]),
        "startUtc": _utc_iso(start),
        "endUtc": _utc_iso(end),
        "magnitude": round(magnitude, 3),
    }


def get_year_eclipses(year, longitude, latitude, altitude=0):
    if not 1800 <= year <= 2100:
        raise ValueError("year must be between 1800 and 2100")
    if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
        raise ValueError("invalid coordinates")
    if not -500 <= altitude <= 10000:
        raise ValueError("invalid altitude")
    start = swe.julday(year, 1, 1, 0, swe.GREG_CAL)
    end = swe.julday(year + 1, 1, 1, 0, swe.GREG_CAL)
    geopos = (longitude, latitude, altitude)
    events = []
    for solar, search in ((True, swe.sol_eclipse_when_glob), (False, swe.lun_eclipse_when)):
        cursor = start - 2
        while True:
            flags, times = search(cursor)
            maximum = times[0]
            if maximum >= end:
                break
            if maximum >= start:
                events.append({
                    "id": f"{'solar' if solar else 'lunar'}-{round(maximum * 10000)}",
                    "kind": _kind(flags, solar),
                    "globalMaximumUtc": _utc_iso(maximum),
                    "local": _circumstances(maximum, geopos, solar),
                })
            cursor = maximum + 1
    return sorted(events, key=lambda event: event["globalMaximumUtc"])
