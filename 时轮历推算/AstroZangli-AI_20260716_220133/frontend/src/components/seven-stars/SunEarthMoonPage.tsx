"use client";

import { useEffect, useId, useRef, useState } from "react";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

type Vector3 = [number, number, number];
type MotionDay = {
  date: string;
  earth: Vector3;
  moonGeo: Vector3;
  illumination: number;
  phaseAngle: number;
  phaseName: string;
};
type MotionYear = {
  year: number;
  sampleTime: string;
  coordinateSystem: string;
  ephemeris: string;
  moonDisplayScale: number;
  earthOrbit: Vector3[];
  moonOrbit: Vector3[];
  days: MotionDay[];
};

const AU_KM = 149597870.7;
const controlClass = "rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 disabled:opacity-40";

function moonDisplay(day: MotionDay, scale: number): Vector3 {
  return [0, 1, 2].map(axis => day.earth[axis] + day.moonGeo[axis] * scale) as Vector3;
}

function OrbitScene({ data, selected, zoom, yaw, tilt, onYaw, onTilt, t }: {
  data: MotionYear;
  selected: MotionDay;
  zoom: number;
  yaw: number;
  tilt: number;
  onYaw: (value: number) => void;
  onTilt: (value: number) => void;
  t: (value: string) => string;
}) {
  const drag = useRef<{ x: number; y: number } | null>(null);
  const tiltRad = tilt * Math.PI / 180;
  const r = yaw * Math.PI / 180;
  const project = (point: Vector3) => {
    const x = point[0] * Math.cos(r) - point[1] * Math.sin(r);
    const y = point[0] * Math.sin(r) + point[1] * Math.cos(r);
    return { x: 360 + x * 235 * zoom, y: 290 - (y * Math.sin(tiltRad) + point[2] * Math.cos(tiltRad)) * 235 * zoom };
  };
  const orbitPath = (points: Vector3[]) => points.map((point, index) => {
    const p = project(point);
    return `${index ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";
  const earthPath = orbitPath(data.earthOrbit);
  const moonPath = orbitPath(data.moonOrbit);
  const earth = project(selected.earth);
  const moon = project(moonDisplay(selected, data.moonDisplayScale));
  const sun = project([0, 0, 0]);

  return <svg viewBox="0 0 720 580" role="img" aria-label={t("可拖动的日地月轨道：太阳在中心，蓝色为地球，白色为月球")} className="w-full cursor-grab touch-none select-none active:cursor-grabbing"
    onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}
    onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (!drag.current) return; onYaw(yaw + (event.clientX - drag.current.x) * .55); onTilt(Math.max(12, Math.min(88, tilt - (event.clientY - drag.current.y) * .3))); drag.current = { x: event.clientX, y: event.clientY }; }}
    onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <defs>
      <radialGradient id="sem-sun"><stop stopColor="#fff8d7" /><stop offset=".42" stopColor="#ffd26a" /><stop offset="1" stopColor="#db7730" /></radialGradient>
      <radialGradient id="sem-earth" cx="35%" cy="28%"><stop stopColor="#9ee9ff" /><stop offset=".55" stopColor="#259bd4" /><stop offset="1" stopColor="#0c366c" /></radialGradient>
      <radialGradient id="sem-moon" cx="30%" cy="26%"><stop stopColor="#fff" /><stop offset=".6" stopColor="#b9c9d7" /><stop offset="1" stopColor="#66788d" /></radialGradient>
      <filter id="sem-glow"><feGaussianBlur stdDeviation="10" /></filter>
    </defs>
    <rect width="720" height="580" fill="#060c19" />
    <g fill="#b8d4f8">{Array.from({ length: 45 }, (_, index) => <circle key={index} cx={(index * 137 + 59) % 720} cy={(index * 211 + 37) % 580} r={index % 7 === 0 ? 1.2 : .6} opacity={index % 3 === 0 ? .6 : .3} />)}</g>
    <path d={earthPath} fill="none" stroke="#5085c5" strokeWidth="1.5" strokeOpacity=".65" />
    <path d={moonPath} fill="none" stroke="#c7daed" strokeWidth="1.5" strokeOpacity=".48" />
    <line x1={earth.x} y1={earth.y} x2={moon.x} y2={moon.y} stroke="#b2c8d7" strokeOpacity=".6" strokeDasharray="4 5" />
    <circle cx={sun.x} cy={sun.y} r="35" fill="#ffad3d" opacity=".28" filter="url(#sem-glow)" />
    <circle cx={sun.x} cy={sun.y} r="17" fill="url(#sem-sun)" />
    <circle cx={earth.x} cy={earth.y} r="17" fill="#46b8f1" opacity=".22" />
    <circle cx={earth.x} cy={earth.y} r="9" fill="url(#sem-earth)" stroke="#b1e9ff" strokeWidth="1" />
    <circle cx={moon.x} cy={moon.y} r="12" fill="#e6eef8" opacity=".2" />
    <circle cx={moon.x} cy={moon.y} r="6" fill="url(#sem-moon)" stroke="#f7fbff" strokeWidth="1" />
    <g fill="#dbeafe" fontSize="13" fontWeight="600" paintOrder="stroke" stroke="#060c19" strokeWidth="3">
      <text x={sun.x + 23} y={sun.y + 4}>{t("太阳")}</text>
      <text x={earth.x + 15} y={earth.y - 13}>{t("地球")}</text>
      <text x={moon.x + 12} y={moon.y + 17}>{t("月球")}</text>
    </g>
    <text x="24" y="546" fill="#93a8c5" fontSize="12">{t("地球轨道 · 蓝　月球轨道 · 白　拖动旋转视角")}</text>
  </svg>;
}

function PhaseDisk({ day }: { day: MotionDay }) {
  const clipId = useId();
  const fraction = day.illumination;
  const radius = Math.max(.01, Math.abs(1 - 2 * fraction) * 38);
  const waxing = day.phaseAngle < 180;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = (fraction < .5) === waxing ? 0 : 1;
  const terminator = Math.abs(fraction - .5) < .002 ? "L 50 12" : `A ${radius} 38 0 0 ${innerSweep} 50 12`;
  const litPath = `M 50 12 A 38 38 0 0 ${outerSweep} 50 88 ${terminator} Z`;
  return <svg viewBox="0 0 100 100" role="img" aria-label={day.phaseName} className="mx-auto h-44 w-44 drop-shadow-[0_0_22px_rgba(166,187,225,.15)] sm:h-52 sm:w-52">
    <defs><clipPath id={clipId}><path d={litPath} /></clipPath></defs>
    <image href="/moon_pic/moon_image_00001.png" x="12" y="12" width="76" height="76" />
    {fraction >= .995 ? <image href="/moon_pic/moon_image_00016.png" x="12" y="12" width="76" height="76" /> : fraction > .005 && <image href="/moon_pic/moon_image_00016.png" x="12" y="12" width="76" height="76" clipPath={`url(#${clipId})`} />}
  </svg>;
}

export default function SunEarthMoonPage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(today.getUTCFullYear());
  const [yearInput, setYearInput] = useState(String(today.getUTCFullYear()));
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<MotionYear | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [yaw, setYaw] = useState(-30);
  const [tilt, setTilt] = useState(56);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/astronomy/sun-earth-moon?year=${year}`, { signal: controller.signal })
      .then(async response => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error?.message || "读取失败"); return payload.data as MotionYear; })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(""); setIndex(year === today.getUTCFullYear() ? Math.max(0, result.days.findIndex(day => day.date === today.toISOString().slice(0, 10))) : 0); } })
      .catch(cause => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "读取失败"); } });
    return () => controller.abort();
  }, [year, today]);

  const current = data?.year === year ? data : null;
  useEffect(() => {
    if (!playing || !current) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % current.days.length), 90);
    return () => window.clearInterval(timer);
  }, [playing, current]);

  const selected = current?.days[Math.min(index, current.days.length - 1)];
  const changeYear = () => { const value = Number(yearInput); if (!Number.isInteger(value) || value < 1900 || value > 2050) return; setYear(value); setData(null); setIndex(0); setPlaying(false); };
  const step = (delta: number) => setIndex(value => Math.max(0, Math.min((current?.days.length ?? 1) - 1, value + delta)));
  const distanceKm = selected ? Math.hypot(...selected.moonGeo) * AU_KM : 0;

  return <main className="mx-auto max-h-[calc(100vh-170px)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 p-4 pb-20 text-slate-100 shadow-2xl sm:p-6" onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[.24em] text-cyan-300">SUN · EARTH · MOON</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("日地月运动与月相（日心视角）")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("按日期联动查看日心轨道、地月位置与地球视角的月相。")}</p></div>
      <form onSubmit={event => { event.preventDefault(); changeYear(); }} className="flex items-end gap-2"><label className="text-xs text-slate-300">{t("公历年")}<input type="number" min="1900" max="2050" value={yearInput} onChange={event => setYearInput(event.target.value)} className="mt-1 block w-28 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white" /></label><button type="submit" className={controlClass} disabled={!Number.isInteger(Number(yearInput)) || Number(yearInput) < 1900 || Number(yearInput) > 2050}>{t("查询")}</button></form>
    </header>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200">{error}</p>}
    <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5" aria-label={t("日期控制")}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tracking-[.18em] text-cyan-300">{t("日期控制")}</p><p className="mt-1 text-lg font-semibold tabular-nums">{selected?.date ?? "—"}</p></div><div className="flex items-center gap-2"><button type="button" className={controlClass} disabled={!current || index === 0} onClick={() => step(-1)}>{t("前日")}</button><button type="button" className={controlClass} disabled={!current} onClick={() => setPlaying(value => !value)}>{t(playing ? "暂停" : "播放")}</button><button type="button" className={controlClass} disabled={!current || index >= (current?.days.length ?? 1) - 1} onClick={() => step(1)}>{t("后日")}</button></div></div>
      <input type="range" min="0" max={Math.max(0, (current?.days.length ?? 1) - 1)} value={index} disabled={!current} aria-label={t("全年日期滑块")} onChange={event => { setIndex(Number(event.target.value)); setPlaying(false); }} className="mt-4 w-full accent-cyan-300" />
      <div className="mt-1 flex justify-between text-xs text-slate-400"><span>01-01</span><span>{t("第")} {index + 1} / {current?.days.length ?? "—"} {t("日")}</span><span>12-31</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.8fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#060c19]" aria-label={t("日地月轨道图")}>
        {current && selected ? <OrbitScene data={current} selected={selected} zoom={zoom} yaw={yaw} tilt={tilt} onYaw={setYaw} onTilt={setTilt} t={t} /> : <div role="status" className="flex min-h-96 items-center justify-center text-sm text-slate-400">{error || t("查询中…")}</div>}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3 text-xs text-slate-300 sm:p-4">
          <span>{t("拖动轨道旋转视角")}</span>
          <button type="button" className={controlClass} onClick={() => setZoom(value => Math.min(1.3, value + .1))} aria-label={t("放大轨道")}>＋</button>
          <button type="button" className={controlClass} onClick={() => setZoom(value => Math.max(.7, value - .1))} aria-label={t("缩小轨道")}>−</button>
          <button type="button" className={controlClass} onClick={() => { setYaw(-30); setTilt(56); setZoom(1); }}>{t("复位")}</button>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5" aria-label={t("地球视角月相")}>
        <p className="text-xs tracking-[.2em] text-cyan-300">{t("地球视角月相")}</p>
        <h2 className="mt-2 text-xl font-semibold tabular-nums">{selected?.date ?? "—"}</h2>
        {selected ? <><div className="my-3 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(179,200,241,.12),transparent_65%)] py-3"><PhaseDisk day={selected} /></div>
          <div className="flex items-baseline justify-between gap-3"><h3 className="text-xl font-semibold text-amber-100">{t(selected.phaseName)}</h3><span className="text-2xl font-semibold tabular-nums">{(selected.illumination * 100).toFixed(1)}%</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">{t("照明度")}</span><p className="mt-1 font-medium">{(selected.illumination * 100).toFixed(1)}%</p></div><div className="rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">{t("地月距离")}</span><p className="mt-1 font-medium">{Math.round(distanceKm).toLocaleString()} km</p></div></div>
          <p className="mt-5 text-xs leading-5 text-slate-400">{t("月相盘为地球视角的亮面示意；实际月面倾角会随观测地点和时间变化。")}</p>
        </> : <p className="py-20 text-center text-sm text-slate-400">{error || t("查询中…")}</p>}
      </section>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-400">{t("计算来源：本地 DE421 星历与 Skyfield；每日 00:00 UTC 采样。月球到地球的距离在轨道图中放大 27 倍，轨道单位为 AU，图中天体大小亦为示意。")}</p>
  </main>;
}
