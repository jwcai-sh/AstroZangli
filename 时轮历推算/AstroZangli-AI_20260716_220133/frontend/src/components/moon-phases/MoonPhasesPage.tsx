"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

type MoonDay = {
  date: string;
  phaseName: string;
  phaseIndex: number;
  elongation: number;
  illumination: number;
  majorPhase: { kind: MajorPhaseKind; localTime: string } | null;
};
type MajorPhaseKind = "new_moon" | "first_quarter" | "full_moon" | "last_quarter";
type MoonMonth = { year: number; month: number; timeZone: string; sampleTime: string; days: MoonDay[] };

const MAJOR_PHASE_LABELS: Record<MajorPhaseKind, string> = {
  new_moon: "新月", first_quarter: "上弦月", full_moon: "满月", last_quarter: "下弦月",
};

const ZONES = [
  { name: "北京时间", value: "Asia/Shanghai" },
  { name: "协调世界时", value: "UTC" },
  { name: "伦敦时间", value: "Europe/London" },
  { name: "纽约时间", value: "America/New_York" },
  { name: "东京时间", value: "Asia/Tokyo" },
  { name: "悉尼时间", value: "Australia/Sydney" },
];
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function MajorPhaseBadge({ kind, southern = false }: { kind: MajorPhaseKind; southern?: boolean }) {
  const first = kind === "first_quarter";
  const last = kind === "last_quarter";
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="drop-shadow-[0_0_5px_rgba(177,189,255,.7)]">
    <circle cx="12" cy="12" r="9" fill={kind === "full_moon" ? "#c3caff" : "#0b1028"} stroke="#b7c2ff" strokeWidth="2" />
    {(first || last) && <path d={(first !== southern) ? "M 12 3 A 9 9 0 0 1 12 21 Z" : "M 12 3 A 9 9 0 0 0 12 21 Z"} fill="#bfc8ff" />}
    {kind === "full_moon" && <><circle cx="9" cy="9" r="1.4" fill="#7e8cc9" /><circle cx="15" cy="13" r="1.8" fill="#7e8cc9" /></>}
    {kind === "new_moon" && <circle cx="12" cy="12" r="3" fill="#4b5898" />}
  </svg>;
}

function dateInZone(zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function MoonDisk({ day, size = 52, southern = false, textured = false, className = "" }: { day: MoonDay; size?: number; southern?: boolean; textured?: boolean; className?: string }) {
  const clipId = useId();
  const fraction = day.illumination;
  const radius = Math.max(0.01, Math.abs(1 - 2 * fraction) * 38);
  const waxing = day.elongation < 180;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = (fraction < 0.5) === waxing ? 0 : 1;
  const terminator = Math.abs(fraction - 0.5) < 0.002
    ? "L 50 12"
    : `A ${radius} 38 0 0 ${innerSweep} 50 12`;
  const litPath = `M 50 12 A 38 38 0 0 ${outerSweep} 50 88 ${terminator} Z`;

  return <svg width={size} height={size} viewBox="8 8 84 84" role="img" aria-label={day.phaseName} className={`shrink-0 ${textured ? "drop-shadow-[0_0_10px_rgba(209,219,242,.16)]" : "drop-shadow-[0_0_12px_rgba(241,218,158,.22)]"} ${southern ? "rotate-180" : ""} ${className}`}>
    {textured ? <>
      <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={litPath} /></clipPath></defs>
      <image href="/moon_pic/moon_image_00001.png" x="12" y="12" width="76" height="76" />
      {fraction >= 0.995
        ? <image href="/moon_pic/moon_image_00016.png" x="12" y="12" width="76" height="76" />
        : fraction > 0.005 && <image href="/moon_pic/moon_image_00016.png" x="12" y="12" width="76" height="76" clipPath={`url(#${clipId})`} />}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#dbeafe" strokeOpacity=".12" strokeWidth=".5" />
    </> : <>
      <circle cx="50" cy="50" r="38" fill="#1e293b" stroke="#6b7280" strokeWidth="1.5" />
      {fraction >= 0.995 ? <circle cx="50" cy="50" r="38" fill="#f5e7bb" /> : fraction > 0.005 && <path d={litPath} fill="#f5e7bb" />}
      <circle cx="50" cy="50" r="38" fill="none" stroke="#f6e4ac" strokeOpacity=".4" strokeWidth="1" />
    </>}
  </svg>;
}

export default function MoonPhasesPage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const today = useMemo(() => dateInZone("Asia/Shanghai"), []);
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [yearInput, setYearInput] = useState(today.year);
  const [zone, setZone] = useState("Asia/Shanghai");
  const [southern, setSouthern] = useState(false);
  const [textured, setTextured] = useState(true);
  const [selectedDate, setSelectedDate] = useState(`${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`);
  const [data, setData] = useState<MoonMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ year: String(view.year), month: String(view.month), timezone: zone });
    setLoading(true);
    setError("");
    fetch(`/api/calendar/moon-phases?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || "查询失败");
        return result.data as MoonMonth;
      })
      .then(month => { setData(month); setError(""); setLoading(false); })
      .catch(cause => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "查询失败"); setLoading(false); } });
    return () => controller.abort();
  }, [view, zone]);

  const current = data?.year === view.year && data.month === view.month && data.timeZone === zone ? data : null;
  const chosen = current?.days.find(day => day.date === selectedDate) ?? current?.days[0];
  const offset = current ? (new Date(Date.UTC(current.year, current.month - 1, 1)).getUTCDay() + 6) % 7 : 0;
  const zoneToday = dateInZone(zone);
  const todayDate = `${zoneToday.year}-${String(zoneToday.month).padStart(2, "0")}-${String(zoneToday.day).padStart(2, "0")}`;

  const moveMonth = (direction: number) => {
    const target = new Date(Date.UTC(view.year, view.month - 1 + direction, 1));
    const year = target.getUTCFullYear();
    if (year < 1800 || year > 2100) return;
    const month = target.getUTCMonth() + 1;
    setView({ year, month }); setYearInput(year);
    setSelectedDate(`${year}-${String(month).padStart(2, "0")}-01`);
  };

  return <main className="mx-auto max-h-[calc(100vh-165px)] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/85 p-4 pb-20 text-slate-100 shadow-2xl sm:p-7">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[.25em] text-amber-300">LUNAR PHASE CALENDAR</p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("月相")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("按公历月查看每天的月相、照明度与月面形状。")}</p>
      </div>
      <form onSubmit={event => { event.preventDefault(); if (yearInput >= 1800 && yearInput <= 2100) { setView(previous => ({ ...previous, year: yearInput })); setSelectedDate(`${yearInput}-${String(view.month).padStart(2, "0")}-01`); } }} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-300">{t("公历年")}<input aria-label={t("公历年")} type="number" min="1800" max="2100" value={yearInput} onChange={event => setYearInput(Number(event.target.value))} className="mt-1 block w-24 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white" /></label>
        <label className="text-xs text-slate-300">{t("月份")}<select aria-label={t("月份")} value={view.month} onChange={event => { const month = Number(event.target.value); setView(previous => ({ ...previous, month })); setSelectedDate(`${view.year}-${String(month).padStart(2, "0")}-01`); }} className="mt-1 block w-24 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white">{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label>
        <label className="text-xs text-slate-300">{t("时区")}<select aria-label={t("时区")} value={zone} onChange={event => setZone(event.target.value)} className="mt-1 block w-36 rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-base text-white">{ZONES.map(item => <option key={item.value} value={item.value}>{t(item.name)}</option>)}</select></label>
        <button type="submit" disabled={yearInput < 1800 || yearInput > 2100} className="rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-50">{t("查询")}</button>
      </form>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-rose-200">{t("查询失败：")}{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.85fr)]">
      <section aria-label={t("每日月相日历")} className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><button type="button" aria-label={t("上个月")} onClick={() => moveMonth(-1)} className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">‹</button><h2 className="text-lg font-semibold">{view.year} {t("年")} {view.month} {t("月")}</h2><button type="button" aria-label={t("下个月")} onClick={() => moveMonth(1)} className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">›</button></div>
        <div className="mb-4 flex items-center justify-end gap-2 text-xs">
          <span className={textured ? "font-medium text-sky-100" : "text-slate-400"}>{t("月面纹理")}</span>
          <button type="button" role="switch" aria-checked={!textured} aria-label={t("几何示意")} onClick={() => setTextured(previous => !previous)} className="relative h-6 w-11 rounded-full border border-sky-300/50 bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${textured ? "" : "translate-x-5"}`} />
          </button>
          <span className={textured ? "text-slate-400" : "font-medium text-sky-100"}>{t("几何示意")}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">{WEEKDAYS.map(day => <div key={day} className="pb-1 text-center text-[10px] text-slate-400 sm:text-xs">{t(day)}</div>)}
          {Array.from({ length: offset }, (_, index) => <div key={`pad-${index}`} />)}
          {current?.days.map(day => <button type="button" key={day.date} onClick={() => setSelectedDate(day.date)} aria-label={`${day.date} ${t(day.phaseName)}${day.majorPhase ? ` · ${t("主要月相时刻")} ${t(MAJOR_PHASE_LABELS[day.majorPhase.kind])} ${day.majorPhase.localTime}` : ""}`} aria-pressed={chosen?.date === day.date} className={`relative flex min-h-[70px] items-center justify-center rounded-xl border p-0.5 text-center transition sm:min-h-[104px] sm:p-1 ${chosen?.date === day.date ? "border-amber-300 bg-amber-300/15" : "border-white/10 bg-slate-900/50 hover:border-amber-200/50"}`}>
            {day.majorPhase && <span className="absolute left-0.5 top-0.5 z-10 sm:left-1 sm:top-1" title={`${t(MAJOR_PHASE_LABELS[day.majorPhase.kind])} ${day.majorPhase.localTime}`}><MajorPhaseBadge kind={day.majorPhase.kind} southern={southern} /></span>}
            <span className="relative block aspect-square w-full max-w-[92px]"><MoonDisk day={day} size={92} southern={southern} textured={textured} className="h-full w-full"/><span aria-hidden="true" style={{ WebkitTextStroke: "1px rgba(3,9,22,.85)" }} className={`absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.95)] sm:text-xl ${day.date === todayDate ? "underline decoration-amber-300 decoration-2 underline-offset-4" : ""}`}>{Number(day.date.slice(-2))}</span></span>
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">{(["new_moon", "first_quarter", "full_moon", "last_quarter"] as MajorPhaseKind[]).map(kind => <span key={kind} className="flex items-center gap-1"><MajorPhaseBadge kind={kind} southern={southern} />{t(MAJOR_PHASE_LABELS[kind])}</span>)}</div>
        {!current && !error && <p className="py-16 text-center text-sm text-slate-400" role="status">{loading ? t("查询中…") : t("本月没有查询结果")}</p>}
      </section>
      <section aria-label={t("当日月相详情")} className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {chosen ? <>
          <p className="text-xs uppercase tracking-[.2em] text-amber-200">{t("所选日期")}</p>
          <h2 className="mt-2 text-xl font-semibold">{chosen.date}</h2>
          <div className={`my-4 flex justify-center rounded-2xl py-4 ${textured ? "bg-[radial-gradient(circle_at_center,rgba(185,203,241,.1),transparent_67%)]" : "bg-[radial-gradient(circle_at_center,rgba(245,205,105,.12),transparent_67%)]"}`}><MoonDisk day={chosen} size={190} southern={southern} textured={textured}/></div>
          <div className="flex items-baseline justify-between"><h3 className="text-xl font-medium text-amber-100">{t(chosen.phaseName)}</h3><span className="text-2xl font-semibold tabular-nums">{(chosen.illumination * 100).toFixed(1)}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200" style={{ width: `${chosen.illumination * 100}%` }}/></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">{t("照明度")}</span><p className="mt-1 font-medium">{(chosen.illumination * 100).toFixed(1)}%</p></div><div className="rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">{t("月日黄经差")}</span><p className="mt-1 font-medium">{chosen.elongation.toFixed(1)}°</p></div></div>
          {chosen.majorPhase && <p className="mt-4 rounded-xl border border-indigo-300/25 bg-indigo-400/10 px-3 py-2 text-sm text-indigo-100">{t("主要月相时刻")}：{t(MAJOR_PHASE_LABELS[chosen.majorPhase.kind])} · {chosen.majorPhase.localTime}（{zone}）</p>}
          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={southern} onChange={event => setSouthern(event.target.checked)} className="accent-amber-300"/>{t("南半球方向示意")}</label>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">{t("每日数据按所选时区的当地 12:00 计算；阶段名称按月日黄经差划分，朔望弦的精确时刻可能落在相邻日期。图示仅表示照亮形状，月亮实际倾角随地点和时间变化。")}</p>
          {textured && <p className="mt-2 text-xs leading-5 text-slate-500">{t("月面纹理取自项目已有素材；亮面轮廓按所选日期的照明度绘制。")}</p>}
          <p className="mt-2 text-xs text-slate-500">{t("计算来源：Swiss Ephemeris（地心位置与照明比例）；PyEphem（主要月相时刻）。")}</p>
        </> : <p className="py-16 text-center text-sm text-slate-400">{loading ? t("查询中…") : t("选择一个日期查看详情")}</p>}
      </section>
    </div>
  </main>;
}
