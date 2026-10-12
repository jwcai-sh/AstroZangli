"use client";

import { useEffect, useState } from "react";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";
import GeocentricGlobe from "@/components/seven-stars/GeocentricGlobe";

type BodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
type Position = { longitude: number; latitude: number; distanceAu: number; dailyMotion: number };
type MotionDay = { date: string; starMatrix?: number[]; bodies: Record<BodyId, Position> };
type MotionYear = { year: number; days: MotionDay[]; sampleTime: string; coordinateSystem: string; ephemeris: string; bodyNote: string };

const BODIES: { id: BodyId; label: string; glyph: string; color: string; radius: number }[] = [
  { id: "moon", label: "月亮", glyph: "☾", color: "#dde7f9", radius: 124 },
  { id: "sun", label: "太阳", glyph: "☉", color: "#ffc66b", radius: 148 },
  { id: "mercury", label: "水星", glyph: "☿", color: "#9fd4ea", radius: 172 },
  { id: "venus", label: "金星", glyph: "♀", color: "#f9dcaa", radius: 196 },
  { id: "mars", label: "火星", glyph: "♂", color: "#f2947b", radius: 220 },
  { id: "jupiter", label: "木星", glyph: "♃", color: "#d6abec", radius: 244 },
  { id: "saturn", label: "土星", glyph: "♄", color: "#b4c8a0", radius: 268 },
];
const buttonClass = "rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 disabled:opacity-40";

export default function GeocentricMotionPage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(today.getUTCFullYear());
  const [yearInput, setYearInput] = useState(String(today.getUTCFullYear()));
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<MotionYear | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [selectedBody, setSelectedBody] = useState<BodyId>("moon");
  const [focusToken, setFocusToken] = useState(0);
  const selectBody = (id: BodyId) => { setSelectedBody(id); setFocusToken(value => value + 1); };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/astronomy/geocentric-motion?year=${year}`, { signal: controller.signal })
      .then(async response => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error?.message || "读取失败"); return payload.data as MotionYear; })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(""); setIndex(year === today.getUTCFullYear() ? Math.max(0, result.days.findIndex(day => day.date === today.toISOString().slice(0, 10))) : 0); } })
      .catch(cause => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "读取失败"); } });
    return () => controller.abort();
  }, [year, today]);

  const current = data?.year === year ? data : null;
  useEffect(() => {
    if (!playing || !current) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % current.days.length), 110);
    return () => window.clearInterval(timer);
  }, [playing, current]);

  const selected = current?.days[Math.min(index, current.days.length - 1)];
  const body = BODIES.find(item => item.id === selectedBody)!;
  const position = selected?.bodies[selectedBody];
  const changeYear = () => { const value = Number(yearInput); if (!Number.isInteger(value) || value < 1900 || value > 2050) return; setYear(value); setData(null); setIndex(0); setPlaying(false); };
  const step = (delta: number) => { setPlaying(false); setIndex(value => Math.max(0, Math.min((current?.days.length ?? 1) - 1, value + delta))); };

  return <main className="mx-auto w-full max-w-7xl rounded-3xl border border-white/10 bg-slate-950/90 p-4 pb-20 text-slate-100 shadow-2xl sm:p-6" onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[.24em] text-cyan-300">GEOCENTRIC · SEVEN LUMINARIES</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("七曜每日运动（地心视角）")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{t("以地球为中心，按日期查看太阳、月亮与金木水火土五星的视黄经运动。")}</p></div>
      <form onSubmit={event => { event.preventDefault(); changeYear(); }} className="flex items-end gap-2"><label className="text-xs text-slate-300">{t("公历年")}<input type="number" min="1900" max="2050" value={yearInput} onChange={event => setYearInput(event.target.value)} className="mt-1 block w-28 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white" /></label><button type="submit" className={buttonClass} disabled={!Number.isInteger(Number(yearInput)) || Number(yearInput) < 1900 || Number(yearInput) > 2050}>{t("查询")}</button></form>
    </header>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200">{error}</p>}
    <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5" aria-label={t("日期控制")}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tracking-[.18em] text-cyan-300">{t("日期控制")}</p><p className="mt-1 text-lg font-semibold tabular-nums">{selected?.date ?? "—"}</p></div><div className="flex items-center gap-2"><button type="button" className={buttonClass} disabled={!current || index === 0} onClick={() => step(-1)}>{t("前日")}</button><button type="button" className={buttonClass} disabled={!current} onClick={() => setPlaying(value => !value)}>{t(playing ? "暂停" : "播放")}</button><button type="button" className={buttonClass} disabled={!current || index >= (current?.days.length ?? 1) - 1} onClick={() => step(1)}>{t("后日")}</button></div></div>
      <input type="range" min="0" max={Math.max(0, (current?.days.length ?? 1) - 1)} value={index} disabled={!current} aria-label={t("全年日期滑块")} onChange={event => { setIndex(Number(event.target.value)); setPlaying(false); }} className="mt-4 w-full accent-cyan-300" />
      <div className="mt-1 flex justify-between text-xs text-slate-400"><span>01-01</span><span>{t("第")} {index + 1} / {current?.days.length ?? "—"} {t("日")}</span><span>12-31</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#050a14]" aria-label={t("地心七曜黄经图")}>
        {current && selected ? <GeocentricGlobe days={current.days} index={index} selectedBody={selectedBody} onSelect={selectBody} t={t} focusToken={focusToken} /> : <div role="status" className="flex min-h-96 items-center justify-center text-sm text-slate-400">{error || t("查询中…")}</div>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5" aria-label={t("七曜当日位置")}>
        <p className="text-xs tracking-[.2em] text-cyan-300">{t("七曜当日位置")}</p>
        <h2 className="mt-2 text-xl font-semibold tabular-nums">{selected?.date ?? "—"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">{BODIES.map(item => <button key={item.id} type="button" onClick={() => selectBody(item.id)} aria-pressed={selectedBody === item.id} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${selectedBody === item.id ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-slate-900/60 hover:border-white/30"}`}><span className="w-6 text-center text-xl" style={{ color: item.color }}>{item.glyph}</span><span><span className="block text-sm font-medium">{t(item.label)}</span><span className="block text-xs tabular-nums text-slate-400">{selected ? `${selected.bodies[item.id].longitude.toFixed(1)}°` : "—"}</span></span></button>)}</div>
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/70 p-4"><p className="text-lg font-semibold" style={{ color: body.color }}>{body.glyph} {t(body.label)}</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">{t("视黄经")}</span><p className="mt-1 font-medium tabular-nums">{position ? `${position.longitude.toFixed(2)}°` : "—"}</p></div><div><span className="text-slate-400">{t("黄纬")}</span><p className="mt-1 font-medium tabular-nums">{position ? `${position.latitude.toFixed(2)}°` : "—"}</p></div><div><span className="text-slate-400">{t("地心距离")}</span><p className="mt-1 font-medium tabular-nums">{position ? `${position.distanceAu.toFixed(4)} AU` : "—"}</p></div><div><span className="text-slate-400">{t("较前日黄经变化")}</span><p className="mt-1 font-medium tabular-nums">{position ? `${position.dailyMotion >= 0 ? "+" : ""}${position.dailyMotion.toFixed(3)}°` : "—"}</p></div></div>{position && index > 0 && <p className="mt-3 text-sm" style={{ color: body.color }}>{t(position.dailyMotion < -0.001 ? "逆行" : position.dailyMotion > 0.001 ? "顺行" : "留")}</p>}</div>
        <p className="mt-4 text-xs leading-5 text-slate-400">{t("天体按视黄经、黄纬投影到同一天球，大小为示意。可切换沉浸视角与球面总览，点击天体或卡片聚焦；短弧显示所选天体最近 20 日运动。")}</p>
      </section>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-400">{t("计算来源：本地 DE421 星历与 Skyfield；每日 00:00 UTC 采样。木星、土星采用星历中的行星系统质心。这是现代天文地心位置示意，不等同于藏历传统算法。")}</p>
    <p className="mt-2 text-xs leading-5 text-slate-400">{t("恒星背景：HYG 4.1 星表与 Stellarium 星座连线，按当日黄道坐标系显示；恒星位置为星图近似。")}{" "}<a href="/sky-data/README.md" target="_blank" rel="noreferrer" className="text-cyan-200 underline">{t("数据来源与许可")}</a></p>
  </main>;
}
