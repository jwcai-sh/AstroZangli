"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

type EclipseKind = "solar_total" | "solar_annular" | "solar_hybrid" | "solar_partial" | "lunar_total" | "lunar_partial" | "lunar_penumbral";
type Circumstances = { visible: boolean; localType: EclipseKind | null; maximumUtc: string | null; startUtc: string | null; endUtc: string | null; magnitude: number | null };
type EclipseEvent = { id: string; kind: EclipseKind; globalMaximumUtc: string; local: Circumstances };
type Place = { name: string; latitude: number; longitude: number; altitude: number; timezone: string };

const PLACES: Place[] = [
  { name: "拉萨", latitude: 29.647, longitude: 91.1175, altitude: 3658, timezone: "Asia/Shanghai" },
  { name: "北京", latitude: 39.9042, longitude: 116.4074, altitude: 43, timezone: "Asia/Shanghai" },
  { name: "上海", latitude: 31.2304, longitude: 121.4737, altitude: 4, timezone: "Asia/Shanghai" },
  { name: "伦敦", latitude: 51.5074, longitude: -0.1278, altitude: 11, timezone: "Europe/London" },
  { name: "纽约", latitude: 40.7128, longitude: -74.006, altitude: 10, timezone: "America/New_York" },
  { name: "东京", latitude: 35.6762, longitude: 139.6503, altitude: 40, timezone: "Asia/Tokyo" },
  { name: "悉尼", latitude: -33.8688, longitude: 151.2093, altitude: 58, timezone: "Australia/Sydney" },
];
const KINDS: EclipseKind[] = ["solar_total", "solar_annular", "solar_hybrid", "solar_partial", "lunar_total", "lunar_partial", "lunar_penumbral"];
const LABELS: Record<EclipseKind, string> = {
  solar_total: "日全食", solar_annular: "日环食", solar_hybrid: "日全环食", solar_partial: "日偏食",
  lunar_total: "月全食", lunar_partial: "月偏食", lunar_penumbral: "半影月食",
};

function displayTime(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function EclipseDiagram({ kind, progress }: { kind: EclipseKind; progress: number }) {
  const locale = useLocale();
  const solar = kind.startsWith("solar");
  const shift = (progress - 50) * 3.4;
  const solarY = kind === "solar_partial" ? -30 : 0;
  const moonRadius = kind === "solar_annular" ? 55 : kind === "solar_hybrid" ? 72 : 76;
  const lunarY = kind === "lunar_partial" ? -57 : kind === "lunar_penumbral" ? -108 : 0;
  return (
    <svg viewBox="0 0 420 240" role="img" aria-label={`${appText(locale, LABELS[kind])} ${appText(locale, "交食过程示意图")}`} className="h-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950">
      <defs>
        <radialGradient id="eclipse-sun"><stop offset="65%" stopColor="#ffe08b"/><stop offset="100%" stopColor="#f59e0b"/></radialGradient>
        <radialGradient id="eclipse-moon"><stop offset="45%" stopColor="#d7dce3"/><stop offset="100%" stopColor="#8b96a6"/></radialGradient>
        <radialGradient id="eclipse-blood"><stop offset="35%" stopColor="#ac463d"/><stop offset="100%" stopColor="#622c38"/></radialGradient>
        <filter id="eclipse-glow"><feGaussianBlur stdDeviation="12"/></filter>
        <clipPath id="eclipse-lunar-disk"><circle cx={210 + shift} cy={120 + lunarY} r="48"/></clipPath>
      </defs>
      {solar ? <>
        <circle cx="210" cy="120" r="83" fill="#fbbf24" opacity=".27" filter="url(#eclipse-glow)"/>
        <circle cx="210" cy="120" r="72" fill="url(#eclipse-sun)"/>
        <circle cx={210 + shift} cy={120 + solarY} r={moonRadius} fill="#111827" stroke="#334155" strokeWidth="2"/>
        {kind === "solar_hybrid" && <text x="210" y="224" textAnchor="middle" fill="#e2e8f0" fontSize="12">{appText(locale, "全食与环食随观测位置变化")}</text>}
      </> : <>
        <circle cx="210" cy="120" r="102" fill="#6b3340" opacity={kind === "lunar_penumbral" ? ".25" : ".45"} filter="url(#eclipse-glow)"/>
        <circle cx="210" cy="120" r="70" fill="#281c2c" opacity=".55"/>
        <circle cx={210 + shift} cy={120 + lunarY} r="48" fill="url(#eclipse-moon)"/>
        <g clipPath="url(#eclipse-lunar-disk)">
          <circle cx="210" cy="120" r="118" fill="#6b3340" opacity=".3"/>
          {kind !== "lunar_penumbral" && <circle cx="210" cy="120" r="70" fill={kind === "lunar_total" ? "url(#eclipse-blood)" : "#34242c"} opacity=".92"/>}
        </g>
      </>}
      <text x="18" y="25" fill="#94a3b8" fontSize="12">{appText(locale, solar ? "太阳 / 月球视盘" : "地球影区 / 月球视盘")}</text>
    </svg>
  );
}

export default function EclipsePage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const [yearInput, setYearInput] = useState(new Date().getFullYear());
  const [placeIndex, setPlaceIndex] = useState(0);
  const [customPlace, setCustomPlace] = useState<Place>({ name: "自定义", latitude: 29.647, longitude: 91.1175, altitude: 0, timezone: "Asia/Shanghai" });
  const [query, setQuery] = useState({ year: new Date().getFullYear(), place: PLACES[0] });
  const [events, setEvents] = useState<EclipseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demoKind, setDemoKind] = useState<EclipseKind>("solar_total");
  const [progress, setProgress] = useState(50);
  const place = query.place;
  const validCustom = customPlace.latitude >= -90 && customPlace.latitude <= 90 && customPlace.longitude >= -180 && customPlace.longitude <= 180 && customPlace.altitude >= -500 && customPlace.altitude <= 10000 && (() => { try { new Intl.DateTimeFormat("zh-CN", { timeZone: customPlace.timezone }); return true; } catch { return false; } })();

  useEffect(() => {
    const controller = new AbortController();
    const selectedPlace = query.place;
    const params = new URLSearchParams({ year: String(query.year), longitude: String(selectedPlace.longitude), latitude: String(selectedPlace.latitude), altitude: String(selectedPlace.altitude) });
    setLoading(true); setError("");
    fetch(`/api/calendar/year-eclipses?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || "查询失败");
        return result.data.events as EclipseEvent[];
      })
      .then(found => { setEvents(found); setSelectedId(found[0]?.id ?? null); })
      .catch(cause => { if (!controller.signal.aborted) { setEvents([]); setError(cause instanceof Error ? cause.message : "查询失败"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const selected = useMemo(() => events.find(event => event.id === selectedId) ?? null, [events, selectedId]);
  const shownKind = selected?.local.localType ?? selected?.kind ?? demoKind;
  const selectKind = (kind: EclipseKind) => { setSelectedId(null); setDemoKind(kind); setProgress(50); };

  return <main className="mx-auto max-h-[calc(100vh-165px)] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/85 p-4 pb-20 text-slate-100 shadow-2xl sm:p-7">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[.25em] text-cyan-300">ECLIPSE ATLAS</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("日月食")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("按公历年列出全球日月食，并计算选定地点可见的食甚与接触时刻。")}</p></div>
      <form onSubmit={event => { event.preventDefault(); if (yearInput >= 1800 && yearInput <= 2100 && (placeIndex < PLACES.length || validCustom)) setQuery({ year: yearInput, place: placeIndex < PLACES.length ? PLACES[placeIndex] : { ...customPlace } }); }} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-300">{t("公历年")}<input type="number" min="1800" max="2100" value={yearInput} onChange={event => setYearInput(Number(event.target.value))} className="mt-1 block w-28 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white"/></label>
        <label className="text-xs text-slate-300">{t("观测地点")}<select value={placeIndex} onChange={event => setPlaceIndex(Number(event.target.value))} className="mt-1 block w-32 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white">{PLACES.map((item, index) => <option key={item.name} value={index}>{t(item.name)}</option>)}<option value={PLACES.length}>{t("自定义坐标")}</option></select></label>
        {placeIndex === PLACES.length && <div className="flex flex-wrap gap-2">
          {(["latitude", "longitude", "altitude"] as const).map(key => <label key={key} className="text-xs text-slate-300">{t({ latitude: "纬度", longitude: "经度", altitude: "海拔" }[key])}<input type="number" step="any" value={customPlace[key]} onChange={event => setCustomPlace(previous => ({ ...previous, [key]: Number(event.target.value) }))} className="mt-1 block w-24 rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-base text-white"/></label>)}
          <label className="text-xs text-slate-300">{t("时区")}<input value={customPlace.timezone} onChange={event => setCustomPlace(previous => ({ ...previous, timezone: event.target.value }))} placeholder="Asia/Shanghai" className="mt-1 block w-40 rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-base text-white"/></label>
        </div>}
        <button type="submit" disabled={loading || yearInput < 1800 || yearInput > 2100 || (placeIndex === PLACES.length && !validCustom)} className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{loading ? t("查询中…") : t("查询")}</button>
      </form>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200">{t("查询失败：")}{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(275px,0.85fr)_minmax(0,1.15fr)]">
      <section aria-label={t("全年日月食")} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{query.year} {t("年全年日月食")}</h2><span className="text-xs text-slate-400">{events.length} {t("次")}</span></div>
        <p className="mb-3 text-xs text-slate-400">{t("日期按观测地点时区显示；不可见事件仍列在全年目录中。")}</p>
        <div className="space-y-2">{events.map(event => <button key={event.id} type="button" onClick={() => { setSelectedId(event.id); setProgress(50); }} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === event.id ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-slate-900/70 hover:border-white/30"}`}>
          <div className="flex items-center justify-between gap-2"><strong>{t(LABELS[event.kind])}</strong><span className={`rounded-full px-2 py-0.5 text-xs ${event.local.visible ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-300"}`}>{t(event.local.visible ? "当地可见" : "当地不可见")}</span></div>
          <p className="mt-1 text-sm text-slate-300">{displayTime(event.globalMaximumUtc, place.timezone)}</p>
        </button>)}{!loading && !error && events.length === 0 && <p className="text-sm text-slate-400">{t("本年没有查询结果")}</p>}</div>
      </section>
      <section aria-label={t("交食详情与可视化")} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">{KINDS.map(kind => <button type="button" key={kind} onClick={() => selectKind(kind)} className={`rounded-full border px-3 py-1.5 text-xs ${shownKind === kind ? "border-amber-300 bg-amber-400/15 text-amber-100" : "border-white/15 text-slate-300 hover:bg-white/10"}`}>{t(LABELS[kind])}</button>)}</div>
        <EclipseDiagram kind={shownKind} progress={progress}/>
        <label className="mt-4 block text-sm text-slate-300">{t("拖动查看交食过程")}<input type="range" min="0" max="100" value={progress} onChange={event => setProgress(Number(event.target.value))} className="mt-2 w-full accent-amber-400"/></label>
        <p className="mt-2 text-xs text-slate-500">{t("图形为类型示意，未按本次事件的实际视直径、食分或接触时刻绘制。")}</p>
        {selected ? <div className="mt-5 grid gap-2 rounded-xl bg-slate-900/80 p-4 text-sm sm:grid-cols-2">
          <div><span className="text-slate-400">{t("全球类型")}</span><p className="font-medium">{t(LABELS[selected.kind])}</p></div>
          <div><span className="text-slate-400">{t("当地类型")}</span><p className="font-medium">{selected.local.visible && selected.local.localType ? t(LABELS[selected.local.localType]) : t("当地不可见")}</p></div>
          <div><span className="text-slate-400">{t("当地食甚")}</span><p>{displayTime(selected.local.maximumUtc, place.timezone)}</p></div>
          <div><span className="text-slate-400">{t("当地食分")}</span><p>{selected.local.magnitude === null ? "—" : selected.local.magnitude.toFixed(3)}</p></div>
          <div><span className="text-slate-400">{t("开始")}</span><p>{displayTime(selected.local.startUtc, place.timezone)}</p></div>
          <div><span className="text-slate-400">{t("结束")}</span><p>{displayTime(selected.local.endUtc, place.timezone)}</p></div>
          <p className="text-xs text-slate-400 sm:col-span-2">{t("时区")}：{place.timezone} · {t("计算来源：Swiss Ephemeris；全球类型与当地可见类型可能不同。")}{selected.local.visible && (!selected.local.startUtc || !selected.local.endUtc) ? ` ${t("横线表示该接触阶段在当地地平线下。")}` : ""}</p>
        </div> : <p className="mt-5 text-sm text-slate-400">{t("已切换为类型示意。选择左侧事件可查看当地时刻。")}</p>}
      </section>
    </div>
  </main>;
}
