"use client";

import { useEffect, useMemo, useState } from "react";
import CelestialSphere, { type SphereMarker, type SpherePoint } from "@/components/celestial-sphere/CelestialSphere";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

type Vector3 = [number, number, number];
type MotionDay = { date: string; earth: Vector3; moonGeo: Vector3; illumination: number; phaseAngle: number; phaseName: string };
type MotionYear = { year: number; sampleTime: string; coordinateSystem: string; ephemeris: string; moonDisplayScale: number; earthOrbit: Vector3[]; moonOrbit: Vector3[]; days: MotionDay[] };
const AU_KM = 149597870.7;
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const toPoint = (value: Vector3): SpherePoint => { const radius = Math.hypot(...value) || 1; return { longitude: (Math.atan2(value[1], value[0]) * 180 / Math.PI + 360) % 360, latitude: Math.asin(value[2] / radius) * 180 / Math.PI }; };
const moonPosition = (day: MotionDay, scale: number): Vector3 => [day.earth[0] + day.moonGeo[0] * scale, day.earth[1] + day.moonGeo[1] * scale, day.earth[2] + day.moonGeo[2] * scale];
const control = "rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 disabled:opacity-40";

export default function SunEarthMoonSpherePage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [yearInput, setYearInput] = useState(String(today.getUTCFullYear()));
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<MotionYear | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch(`/api/astronomy/sun-earth-moon?year=${year}`, { signal: controller.signal }).then(async response => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error?.message || "读取失败"); return payload.data as MotionYear; }).then(result => { if (!controller.signal.aborted) { setData(result); setError(""); setIndex(year === today.getUTCFullYear() ? Math.max(0, result.days.findIndex(day => day.date === today.toISOString().slice(0, 10))) : 0); } }).catch(reason => { if (!controller.signal.aborted) { setData(null); setError(reason instanceof Error ? reason.message : "读取失败"); } }); return () => controller.abort(); }, [year, today]);
  useEffect(() => { if (!playing || !data) return; const timer = window.setInterval(() => setIndex(value => (value + 1) % data.days.length), 180); return () => window.clearInterval(timer); }, [playing, data]);
  const selected = data?.days[Math.min(index, Math.max(0, (data?.days.length ?? 1) - 1))];
  const changeYear = () => { const next = Number(yearInput); if (Number.isInteger(next) && next >= 1900 && next <= 2050) { setYear(next); setData(null); setIndex(0); setPlaying(false); } };
  const markers = useMemo<SphereMarker[]>(() => selected && data ? [{ id: "earth", name: "地球", ...toPoint(selected.earth), color: "#55c4ff" }, { id: "moon", name: "月球", ...toPoint(moonPosition(selected, data.moonDisplayScale)), color: "#e0ecff", kind: "moon" }] : [], [selected, data]);
  const trails = useMemo(() => data ? [{ id: "earth-orbit", color: "#5ba8e8", points: data.earthOrbit.map(toPoint) }, { id: "moon-orbit", color: "#d7e7f5", points: data.days.map(day => toPoint(moonPosition(day, data.moonDisplayScale))), faint: true }] : [], [data]);
  const distanceKm = selected ? Math.hypot(...selected.moonGeo) * AU_KM : 0;
  return <main className="mx-auto max-h-[calc(100vh-170px)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 p-4 pb-20 text-slate-100 shadow-2xl sm:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.24em] text-cyan-300">SUN · EARTH · MOON</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("日地月运动与月相（日心视角）")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("在统一球面总览中按日期查看日心轨道、地月位置与月相数据。")}</p></div><form onSubmit={event => { event.preventDefault(); changeYear(); }} className="flex items-end gap-2"><label className="text-xs text-slate-300">{t("公历年")}<input type="number" min="1900" max="2050" value={yearInput} onChange={event => setYearInput(event.target.value)} className="mt-1 block w-28 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white" /></label><button type="submit" className={control}>{t("查询")}</button></form></header>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200">{error}</p>}
    <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tracking-[.18em] text-cyan-300">{t("日期控制")}</p><p className="mt-1 text-lg font-semibold tabular-nums">{selected?.date ?? "—"}</p></div><div className="flex items-center gap-2"><button type="button" className={control} disabled={!data || index === 0} onClick={() => setIndex(value => Math.max(0, value - 1))}>{t("前日")}</button><button type="button" className={control} disabled={!data} onClick={() => setPlaying(value => !value)}>{t(playing ? "暂停" : "播放")}</button><button type="button" className={control} disabled={!data || index >= (data.days.length - 1)} onClick={() => setIndex(value => Math.min((data?.days.length ?? 1) - 1, value + 1))}>{t("后日")}</button></div></div><input type="range" min="0" max={Math.max(0, (data?.days.length ?? 1) - 1)} value={index} disabled={!data} aria-label={t("全年日期滑块")} onChange={event => { setIndex(Number(event.target.value)); setPlaying(false); }} className="mt-4 w-full accent-cyan-300" /></section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.7fr)]"><CelestialSphere title="日地月运动" subtitle="球面总览" note="中心为太阳；地球轨道与放大的月球轨道叠加在同一球面总览中。" markers={markers} selected={markers[0]?.id ?? "earth"} onSelect={() => undefined} trails={trails} centerLabel="太阳" centerColor="#e4a23c" starFrame={{ matrix: identity, date: selected?.date ?? `${year}-01-01` }} t={t} /><aside className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs tracking-[.2em] text-cyan-300">{t("地球视角月相")}</p><h2 className="mt-2 text-xl font-semibold">{selected?.date ?? "—"}</h2>{selected ? <><p className="mt-5 text-3xl font-semibold text-amber-100">{t(selected.phaseName)}</p><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-400">{t("照明度")}</dt><dd>{(selected.illumination * 100).toFixed(1)}%</dd></div><div className="flex justify-between"><dt className="text-slate-400">{t("地月距离")}</dt><dd>{Math.round(distanceKm).toLocaleString()} km</dd></div></dl></> : <p className="py-20 text-center text-sm text-slate-400">{error || t("查询中…")}</p>}</aside></div>
  </main>;
}
