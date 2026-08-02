from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import plotly.graph_objects as go
import plotly.io as pio
from skyfield.api import Topos, load

EPHEMERIS_PATH = Path(__file__).resolve().parent.parent / "de421.bsp"
ephemeris = load(str(EPHEMERIS_PATH))
ts = load.timescale()


def _tofloat(value):
    arr = np.atleast_1d(value)
    return float(arr[0])


def _spherical_to_cartesian(azimuth_deg, altitude_deg, radius: float = 1.0):
    az = np.deg2rad(np.atleast_1d(azimuth_deg))
    alt = np.deg2rad(np.atleast_1d(altitude_deg))
    x = radius * np.cos(alt) * np.sin(az)
    y = radius * np.cos(alt) * np.cos(az)
    z = radius * np.sin(alt)
    return x, y, z


def draw_scene(fig, latitude: float):
    n_sphere = 12
    u = np.linspace(0, 2 * np.pi, n_sphere)
    v = np.linspace(0, np.pi, n_sphere)

    for i in range(n_sphere):
        x = np.cos(u[i]) * np.sin(v)
        y = np.sin(u[i]) * np.sin(v)
        z = np.cos(v)
        fig.add_trace(go.Scatter3d(x=x, y=y, z=z, mode="lines", line=dict(color="rgba(200,200,200,0.2)", width=0.5), hoverinfo="none", showlegend=False))

    for i in range(n_sphere):
        x = np.cos(u) * np.sin(v[i])
        y = np.sin(u) * np.sin(v[i])
        z = np.full_like(u, np.cos(v[i]))
        fig.add_trace(go.Scatter3d(x=x, y=y, z=z, mode="lines", line=dict(color="rgba(200,200,200,0.2)", width=0.5), hoverinfo="none", showlegend=False))

    theta = np.linspace(0, 2 * np.pi, 200)
    x_c = np.cos(theta)
    y_c = np.sin(theta)
    z_c = np.zeros_like(theta)
    fig.add_trace(go.Scatter3d(x=x_c, y=y_c, z=z_c, mode="lines", line=dict(color="rgba(150,150,150,0.85)", width=9), hoverinfo="none", showlegend=False))

    theta_fill = np.linspace(0, 2 * np.pi, 80)
    r_fill = np.linspace(0, 1.0, 2)
    Xf = np.outer(r_fill, np.cos(theta_fill))
    Yf = np.outer(r_fill, np.sin(theta_fill))
    Zf = np.zeros_like(Xf)
    fig.add_trace(go.Surface(x=Xf, y=Yf, z=Zf, opacity=0.8, showscale=False, colorscale=[[0, "rgba(220,220,220,0.35)"], [1, "rgba(220,220,220,0.35)"]], hoverinfo="none"))

    dirs = [(0, "北"), (45, "东北"), (90, "东"), (135, "东南"), (180, "南"), (225, "西南"), (270, "西"), (315, "西北")]
    dx, dy, dz, labels = [], [], [], []
    for az, name in dirs:
        x, y, z = _spherical_to_cartesian(az, 0, radius=1.08)
        dx.append(_tofloat(x))
        dy.append(_tofloat(y))
        dz.append(_tofloat(z))
        labels.append(name)
    fig.add_trace(go.Scatter3d(x=dx, y=dy, z=dz, mode="text", text=labels, textfont=dict(color="white", size=12), textposition="middle center", showlegend=False))

    east = _spherical_to_cartesian(90, 0, 1.0)
    west = _spherical_to_cartesian(270, 0, 1.0)
    fig.add_trace(go.Scatter3d(x=[_tofloat(east[0]), _tofloat(west[0])], y=[_tofloat(east[1]), _tofloat(west[1])], z=[_tofloat(east[2]), _tofloat(west[2])], mode="lines", line=dict(color="rgba(150,150,150,0.85)", width=9), hoverinfo="none", showlegend=False))

    np_x, np_y, np_z = _spherical_to_cartesian(0, latitude)
    sp_x, sp_y, sp_z = _spherical_to_cartesian(180, -latitude)
    ext = 1.2
    fig.add_trace(go.Scatter3d(x=[_tofloat(np_x) * ext], y=[_tofloat(np_y) * ext], z=[_tofloat(np_z) * ext], mode="markers+text", marker=dict(size=2, color="red"), text=["北天极"], textfont=dict(color="white", size=12), textposition="top center", hoverinfo="none", showlegend=False))
    fig.add_trace(go.Scatter3d(x=[_tofloat(sp_x) * ext], y=[_tofloat(sp_y) * ext], z=[_tofloat(sp_z) * ext], mode="markers+text", marker=dict(size=2, color="red"), text=["南天极"], textfont=dict(color="white", size=12), textposition="bottom center", hoverinfo="none", showlegend=False))
    fig.add_trace(go.Scatter3d(x=[_tofloat(np_x) * ext, _tofloat(sp_x) * ext], y=[_tofloat(np_y) * ext, _tofloat(sp_y) * ext], z=[_tofloat(np_z) * ext, _tofloat(sp_z) * ext], mode="lines", line=dict(color="red", width=2), hoverinfo="none", showlegend=False))

    zenith = (0.0, 0.0, 1.2)
    nadir = (0.0, 0.0, -1.2)
    fig.add_trace(go.Scatter3d(x=[zenith[0]], y=[zenith[1]], z=[zenith[2]], mode="markers+text", marker=dict(size=2, color="red"), text=["天顶"], textfont=dict(color="red", size=12), textposition="top center", hoverinfo="none", showlegend=False))
    fig.add_trace(go.Scatter3d(x=[nadir[0]], y=[nadir[1]], z=[nadir[2]], mode="markers+text", marker=dict(size=2, color="red"), text=["天底"], textfont=dict(color="red", size=12), textposition="bottom center", hoverinfo="none", showlegend=False))
    fig.add_trace(go.Scatter3d(x=[zenith[0], nadir[0]], y=[zenith[1], nadir[1]], z=[zenith[2], nadir[2]], mode="lines", line=dict(color="red", width=2, dash="dash"), hoverinfo="none", showlegend=False))


def get_ephem_body(name: str):
    for key in [name, name.lower(), f"{name} barycenter", f"{name.lower()} barycenter"]:
        try:
            return ephemeris[key]
        except KeyError:
            continue
    raise KeyError(f"在星历中找不到天体: {name}")


def plot_body_annual_track(fig, body, body_name, color, observer, year: int, tz_name: str, sample_hour: int = 12):
    local_tz = ZoneInfo(tz_name)
    xs, ys, zs, labels = [], [], [], []

    for month in range(1, 13):
        for day in range(1, 32):
            try:
                local_time = datetime(year, month, day, sample_hour, 0, tzinfo=local_tz)
            except ValueError:
                continue

            utc_time = local_time.astimezone(ZoneInfo("UTC"))
            t = ts.utc(utc_time.year, utc_time.month, utc_time.day, utc_time.hour)
            alt, az, _ = observer.at(t).observe(body).apparent().altaz()
            x, y, z = _spherical_to_cartesian(az.degrees, alt.degrees)
            xs.append(_tofloat(x))
            ys.append(_tofloat(y))
            zs.append(_tofloat(z))
            labels.append(local_time.strftime("%m-%d"))

    fig.add_trace(go.Scatter3d(x=xs, y=ys, z=zs, mode="lines+markers", line=dict(color=color, width=3), marker=dict(size=2, color=color), text=labels, name=f"{body_name}周年轨迹", hovertemplate="%{text}<extra></extra>"))


def render_annual_motion_html(latitude: float, longitude: float, *, date_time: datetime | None = None, tz_name: str = "Asia/Shanghai", city_label: str = "", year: int | None = None, sample_hour: int = 12):
    fig = go.Figure()
    draw_scene(fig, latitude)

    if date_time is None:
        date_time = datetime.now(ZoneInfo(tz_name))
    elif date_time.tzinfo is None:
        date_time = date_time.replace(tzinfo=ZoneInfo(tz_name))

    location = Topos(latitude_degrees=latitude, longitude_degrees=longitude)
    observer = ephemeris["earth"] + location
    track_year = year or date_time.year
    plot_body_annual_track(fig, get_ephem_body("sun"), "太阳", "orange", observer, track_year, tz_name, sample_hour)

    fig.update_layout(
        title="",
        scene=dict(
            xaxis=dict(showbackground=False, showticklabels=False, zeroline=False, showgrid=False, title=""),
            yaxis=dict(showbackground=False, showticklabels=False, zeroline=False, showgrid=False, title=""),
            zaxis=dict(showbackground=False, showticklabels=False, zeroline=False, showgrid=False, title=""),
            aspectmode="cube",
            bgcolor="rgb(0,0,0)",
            camera=dict(eye=dict(x=2.05 * np.cos(np.deg2rad(20)) * np.cos(np.deg2rad(30)), y=2.05 * np.cos(np.deg2rad(20)) * np.sin(np.deg2rad(30)), z=1.05 * np.sin(np.deg2rad(20)))),
        ),
        paper_bgcolor="rgb(0,0,0)",
        font=dict(color="white", family="SimHei, Arial, sans-serif"),
        showlegend=True,
        margin=dict(l=0, r=0, t=0, b=0),
    )

    return pio.to_html(fig, full_html=True, include_plotlyjs="cdn", config={"responsive": True})
