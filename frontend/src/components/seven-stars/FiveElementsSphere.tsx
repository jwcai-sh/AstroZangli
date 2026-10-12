"use client";
import { appText } from "@/i18n/copy";

import LocalizedText from "@/i18n/LocalizedText";
import { useEffect, useRef, useState } from "react";
import LocaleLink from "@/i18n/LocaleLink";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizePath } from "@/i18n/locale";
import GregorianTibetanDatePicker from "@/components/seven-stars/GregorianTibetanDatePicker";
import { DEFAULT_CITY, SUPPORTED_CITIES, type SupportedCity } from "@/constants/cities";
import type { DailyFiveElementsResponse, FiveElementsDayRow } from "@/services/fiveElementsApi";
import {
  buildConjunctionFormula,
  buildSphereValue,
  mixedValue,
  shiftTibetanDay,
  type ConjunctionFormula,
  type SphereValue,
} from "@/features/earth/fiveElementsGeometry";

const ELEMENTS = [
  { key: "fixedDay", title: "定日", subtitle: "太阳宿度", color: "#f9c967", description: "将定日的宿弧长换算为太阳方向。定日对应太阴日结束时的太阳位置；这里呈现传统历算的黄经投影。" },
  { key: "lunarPartner", title: "月伴星宿", subtitle: "月亮宿度", color: "#90dbf5", description: "月伴星宿对应太阳日开始时的月宿。蓝色标记表示它在27宿环上的方向；与定日的取时不同，不能把二者当作同一瞬间的实测日月位置。" },
  { key: "fixedWeekday", title: "定曜", subtitle: "曜次与结束时刻", color: "#83e2b2", description: "定曜的首位是曜次，后续位给出太阴日结束时的日内余分。下方时间环展示传统一日中的比例，不换算为当地民用时钟。" },
  { key: "conjunction", title: "会合", subtitle: "日月宿度相加 · 吉凶占卜", color: "#c4a3ff", description: "将月伴星宿与定日相加，并以27宿为周期取余；会合用于占卜吉凶。紫色虚线点是计算结果，不是第三颗天体，也不表示日月合朔。" },
  { key: "effect", title: "作用", subtitle: "半日分类编号 · 吉凶占卜", color: "#f1ada0", description: "作用是传统历算的吉凶分类，此处展示后半日的简式编号。" },
] as const;
type ElementKey = typeof ELEMENTS[number]["key"];
type Model = {
  sun: SphereValue;
  moon: SphereValue;
  sum: SphereValue;
  conjunction: ConjunctionFormula;
  time: number;
  weekday: string;
  effect: string;
  raw: Record<ElementKey, string>;
};
const inputStyle = "rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-cyan-300";
const buttonStyle = "rounded-lg border border-white/20 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-30";

function modelFrom(data: DailyFiveElementsResponse): Model {
  const sequence = (key: keyof FiveElementsDayRow) => data.rows.map(row => row[key]).filter(value => value !== "");
  const weekday = sequence("fixedWeekday");
  const time = mixedValue(weekday);
  const sun = buildSphereValue(sequence("fixedDay"));
  const moon = buildSphereValue(sequence("lunarPartner"));
  const sum = buildSphereValue(sequence("conjunction"));
  return {
    sun, moon, sum,
    conjunction: buildConjunctionFormula(moon.rawValue, sun.rawValue),
    time: time - Math.floor(time),
    weekday: String(weekday[0]), effect: sequence("effect").join(" / "),
    raw: Object.fromEntries(ELEMENTS.map(item => [item.key, sequence(item.key).join(" / ")])) as Record<ElementKey, string>,
  };
}

function spatialValue(model: Model, key: ElementKey): SphereValue | null {
  if (key === "fixedDay") return model.sun;
  if (key === "lunarPartner") return model.moon;
  if (key === "conjunction") return model.sum;
  return null;
}

function formatAngle(value: SphereValue): string {
  return `${value.angle.toFixed(4)}°`;
}

function Sphere({ model, active }: { model: Model; active: ElementKey }) {
  const locale = useLocale();
  const [rotation, setRotation] = useState(-35);
  const [tilt, setTilt] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState(true);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const radius = 208 * zoom;
  const project = (longitude: number, latitude = 0, scale = 1) => {
    const a = (longitude + rotation) * Math.PI / 180;
    const b = latitude * Math.PI / 180;
    const t = tilt * Math.PI / 180;
    const x = Math.cos(b) * Math.cos(a);
    const y = Math.cos(b) * Math.sin(a);
    const z = Math.sin(b);
    return { x: 360 + radius * scale * x, y: 265 - radius * scale * (y * Math.sin(t) + z * Math.cos(t)), depth: y * Math.cos(t) - z * Math.sin(t) };
  };
  const path = (start: number, extent: number, latitude = 0, scale = 1) => Array.from({ length: 97 }, (_, i) => {
    const p = project(start + extent * i / 96, latitude, scale);
    return `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");
  const activeValue = spatialValue(model, active);
  const activeElement = ELEMENTS.find(item => item.key === active)!;
  const activeMansionStart = activeValue ? activeValue.mansionIndex * 360 / 27 : 0;
  const points = [
    { key: "fixedDay", angle: model.sun.angle, title: "日", color: "#f9c967" },
    { key: "lunarPartner", angle: model.moon.angle, title: "月", color: "#90dbf5" },
    ...(active === "conjunction" ? [{ key: "conjunction", angle: model.sum.angle, title: "和", color: "#c4a3ff" }] : []),
  ];
  return <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#080f1c]">
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 text-xs text-slate-200"><span><LocalizedText text={"地心 · 27宿黄道投影"} /></span><label className="flex items-center gap-2"><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} /><LocalizedText text={"天球网格"} /></label></div>
    <svg viewBox="0 0 720 530" role="img" aria-label={appText(locale, "可旋转的地心天球：日月宿度与27宿环")} className="w-full touch-none cursor-grab active:cursor-grabbing"
      onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (!drag.current) return; setRotation(v => v + (e.clientX - drag.current!.x) * .45); setTilt(v => Math.max(10, Math.min(85, v + (e.clientY - drag.current!.y) * .3))); drag.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <defs><radialGradient id="five-earth"><stop stopColor="#367ca0" /><stop offset="1" stopColor="#0a233e" /></radialGradient></defs>
      <circle cx="360" cy="265" r={radius} fill="#0d192a" fillOpacity=".35" stroke="#27364b" />
      {grid && <g fill="none" stroke="#253449" strokeWidth=".7">
        {[-60, -30, 30, 60].map(lat => <path key={lat} d={path(0, 360, lat)} />)}
        {[0, 30, 60, 90, 120, 150].map(lon => <path key={lon} d={Array.from({length: 97}, (_, i) => { const p = project(lon, i * 360 / 96); return `${i ? "L" : "M"}${p.x},${p.y}`; }).join(" ")} />)}
      </g>}
      <g fill="none" stroke="#7b879c">{Array.from({length: 72}, (_, i) => <path key={i} d={path(i * 5, 5)} strokeOpacity={project(i * 5 + 2.5).depth < 0 ? .3 : .8} strokeDasharray={project(i * 5 + 2.5).depth < 0 ? "3 4" : undefined} />)}</g>
      {activeValue && <path d={path(activeMansionStart, 360 / 27, 0, 1.025)} fill="none" stroke={activeElement.color} strokeOpacity=".95" strokeWidth="9" strokeLinecap="round" />}
      {Array.from({length: 27}, (_, i) => { const a = i * 360 / 27; const p = project(a); const q = project(a, 0, 1.04); const label = project(a + 360 / 54, 0, 1.13); const isActiveMansion = activeValue?.mansionIndex === i; return <g key={i}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={isActiveMansion ? activeElement.color : "#69758a"} strokeWidth={isActiveMansion ? 2 : 1} /><text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fill={isActiveMansion ? activeElement.color : "#d7e2ee"} fontSize={isActiveMansion ? "13" : "11"} fontWeight={isActiveMansion ? "700" : "400"}>{i}</text></g>; })}
      {(active === "fixedDay" || active === "lunarPartner") && <path d={path(0, active === "fixedDay" ? model.sun.angle : model.moon.angle, 0, .94)} fill="none" stroke={active === "fixedDay" ? "#f9c967" : "#90dbf5"} strokeWidth="3" />}
      {active === "conjunction" && <g fill="none" strokeWidth="3"><path d={path(0, model.moon.angle, 0, .91)} stroke="#90dbf5" /><path d={path(model.moon.angle, model.sun.angle, 0, .91)} stroke="#c4a3ff" strokeDasharray="6 4" /></g>}
      {points.map(item => { const p = project(item.angle); const selected = item.key === active; return <g key={item.key}><line x1="360" y1="265" x2={p.x} y2={p.y} stroke={item.color} strokeOpacity={selected ? .8 : .35} strokeDasharray={item.key === "conjunction" ? "5 5" : undefined} /><circle cx={p.x} cy={p.y} r={selected ? 17 : 12} fill={item.color} fillOpacity=".13" /><circle cx={p.x} cy={p.y} r={item.key === "conjunction" ? 6 : 8} fill={item.key === "conjunction" ? "#080f1c" : item.color} stroke={item.color} strokeWidth="2" /><text x={p.x} y={p.y - 23} textAnchor="middle" fontSize="14" fill={item.color}>{item.title}</text></g>; })}
      <circle cx="360" cy="265" r="23" fill="url(#five-earth)" stroke="#71a6bc" /><path d="M342 259 Q358 249 378 264 M341 271 Q361 281 380 269" stroke="#508897" fill="none" />
      {activeValue && <g>
        <rect x="458" y="26" width="218" height="64" rx="14" fill="#020617" fillOpacity=".72" stroke={activeElement.color} strokeOpacity=".35" />
        <text x="476" y="51" fill={activeElement.color} fontSize="13">{activeElement.title} · {activeValue.label}</text>
        <text x="476" y="75" fill="#d7e2ee" fontSize="18">{formatAngle(activeValue)}</text>
      </g>}
      <text x="360" y="311" textAnchor="middle" fill="#b5c9d8" fontSize="12"><LocalizedText text={"地心"} /></text>
      <text x="28" y="490" fill="#d7e2ee" fontSize="12"><LocalizedText text={"0–26 为程序宿序 · 一宿 = 13⅓°"} /></text>
      <text x="28" y="512" fill="#cbd5e1" fontSize="11"><LocalizedText text={"日月均投影至黄道；半径为示意，未表达距离与黄纬。"} /></text>
    </svg>
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-300">
      <label className="flex items-center gap-2"><LocalizedText text={"旋转"} /><input aria-label={appText(locale, "天球旋转")} type="range" min="-180" max="180" value={((rotation + 180) % 360 + 360) % 360 - 180} onChange={e => setRotation(Number(e.target.value))} className="w-24 accent-cyan-300" /></label>
      <label className="flex items-center gap-2"><LocalizedText text={"俯仰"} /><input aria-label={appText(locale, "天球俯仰")} type="range" min="10" max="85" value={tilt} onChange={e => setTilt(Number(e.target.value))} className="w-20 accent-cyan-300" /></label>
      <button className={buttonStyle} onClick={() => setZoom(v => Math.min(1.05, v + .1))} aria-label={appText(locale, "放大天球")}>＋</button><button className={buttonStyle} onClick={() => setZoom(v => Math.max(.65, v - .1))} aria-label={appText(locale, "缩小天球")}>−</button>
      <button className={buttonStyle} onClick={() => { setRotation(-35); setTilt(32); setZoom(1); }}><LocalizedText text={"复位"} /></button><span className="text-slate-300"><LocalizedText text={"可拖动球面"} /></span>
    </div>
  </div>;
}

export default function FiveElementsSphere() {
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const bounded = (name: string, fallback: number, min: number, max: number) => { const n = Number(params.get(name)); return Number.isInteger(n) && n >= min && n <= max ? n : fallback; };
  const year = bounded("year", 2026, 1950, 2050), month = bounded("month", 8, 1, 12), day = bounded("day", 3, 1, 30);
  const gregorianDate = params.get("gdate") || "2026-09-14";
  const cityParam = params.get("city");
  const city: SupportedCity = SUPPORTED_CITIES.includes(cityParam as SupportedCity) ? cityParam as SupportedCity : DEFAULT_CITY;
  const [result, setResult] = useState<{ date: string; data?: DailyFiveElementsResponse; model?: Model; error?: string } | null>(null);
  const [active, setActive] = useState<ElementKey>("fixedDay");
  const [retry, setRetry] = useState(0);
  const dateKey = `${year}-${month}-${day}`;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/five-elements/daily-detail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({year, month, day}), signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.details || payload.error?.message || `读取失败（${response.status}）`);
        const model = modelFrom(payload.data);
        if (!controller.signal.aborted) setResult({ date: dateKey, data: payload.data, model });
      } catch (error) { if (!controller.signal.aborted) setResult({date: dateKey, error: error instanceof Error ? error.message : "读取失败"}); }
    }
    void load();
    return () => controller.abort();
  }, [year, month, day, dateKey, retry]);
  const selectDate = (y: number, m: number, d: number, nextGregorianDate = gregorianDate, nextCity = city) => {
    const basicDataView = params.get("tab") === "five-elements";
    const query = new URLSearchParams({ tab: basicDataView ? "five-elements" : "seven-stars", [basicDataView ? "data" : "subtab"]: "five-elements-sphere", year: String(y), month: String(m), day: String(d), gdate: nextGregorianDate, city: nextCity });
    router.replace(localizePath(locale, `/earth?${query.toString()}`), {scroll: false});
  };
  const stepDay = (step: number) => { const next = shiftTibetanDay(year, month, day, step); selectDate(next.year, next.month, next.day); };
  const current = result?.date === dateKey ? result : null;
  const model = current?.model;
  const selected = ELEMENTS.find(item => item.key === active)!;
  return <section className="mx-auto w-full max-w-7xl pb-28 text-slate-100" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs tracking-[.24em] text-cyan-300"><LocalizedText text={"时轮历算 · 每日天球图"} /></p><h1 className="text-2xl font-semibold sm:text-3xl"><LocalizedText text={"一日五要素，映于天球"} /></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200"><LocalizedText text={"以地心为视点，读日月宿度与时间的关系。选择一个要素，联动查看天球示意和历算解释。"} /></p></div><LocaleLink className={buttonStyle} href={`/earth?${new URLSearchParams({ tab: "five-elements", data: "five-elements", year: String(year), month: String(month), day: String(day), mode: "daily", gdate: gregorianDate, city })}`}><LocalizedText text={"查看五要素值 ↗"} /></LocaleLink></header>
    <div className="mb-5"><GregorianTibetanDatePicker initialDate={gregorianDate} initialCity={city} tone="dark" onResolved={({ gregorianDate: nextGregorianDate, city: nextCity, tibetan }) => selectDate(tibetan.year, tibetan.month, tibetan.day, nextGregorianDate, nextCity)} /></div>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <label className="text-xs text-slate-200"><LocalizedText text={"藏历年"} /> <select aria-label={appText(locale, "藏历年")} className={inputStyle} value={year} onChange={e => selectDate(Number(e.target.value), month, day)}>{Array.from({length: 101}, (_, i) => <option key={i} value={1950+i}>{1950+i}</option>)}</select></label>
      <label className="text-xs text-slate-200"><LocalizedText text={"月"} /> <select aria-label={appText(locale, "藏历月")} className={inputStyle} value={month} onChange={e => selectDate(year, Number(e.target.value), day)}>{Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>
      <label className="text-xs text-slate-200"><LocalizedText text={"日"} /> <select aria-label={appText(locale, "藏历日")} className={inputStyle} value={day} onChange={e => selectDate(year, month, Number(e.target.value))}>{Array.from({length: 30}, (_, i) => <option key={i} value={i+1}>{i+1}</option>)}</select></label>
      <button className={buttonStyle} disabled={year === 1950 && month === 1 && day === 1} onClick={() => stepDay(-1)}><LocalizedText text={"上一日"} /></button><button className={buttonStyle} disabled={year === 2050 && month === 12 && day === 30} onClick={() => stepDay(1)}><LocalizedText text={"下一日"} /></button>
      <span className="text-xs text-slate-200"><LocalizedText text={"按藏历日序切换 · 缺日明确提示"} /></span>
    </div>
    {!current ? <p role="status" className="py-24 text-center text-cyan-200"><LocalizedText text={"正在读取每日五要素…"} /></p> : current.error ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-8"><h2 className="text-lg"><LocalizedText text={"此日暂不可显示"} /></h2><p className="my-3 text-sm text-amber-100">{current.error}</p><p className="mb-4 text-sm text-slate-200"><LocalizedText text={"藏历缺日没有对应的公历日。可切换相邻日；若为读取错误，请重试。"} /></p><button className={buttonStyle} onClick={() => { setResult(null); setRetry(v => v+1); }}><LocalizedText text={"重试"} /></button></div> : model && <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><span>{current.data?.tibetanDateLabel}</span><span className="text-slate-300"><LocalizedText text={"公历"} /> {current.data?.gregorianDates.join(" / ")}</span><span className="rounded-full border border-emerald-400/20 px-2 py-1 text-[11px] text-emerald-300"><LocalizedText text={"最终计算结果"} /></span></div>
      <div className="mb-5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-5" role="group" aria-label={appText(locale, "选择五要素")}>
        {ELEMENTS.map(item => {
          const value = spatialValue(model, item.key);
          const displayValue = item.key === "fixedWeekday"
            ? `曜序 ${model.weekday} · 日内 ${(model.time * 100).toFixed(3)}%`
            : item.key === "effect"
              ? `后分简式编号 ${model.effect}`
              : value ? `${formatAngle(value)} · ${value.label}` : "";
          return <button key={item.key} aria-label={`${item.title} ${item.subtitle}`} aria-pressed={active === item.key} onClick={() => setActive(item.key)} className="min-w-0 rounded-xl border p-3 text-left transition hover:bg-white/5" style={{borderColor: active === item.key ? item.color : "#263247", background: active === item.key ? `${item.color}12` : "#0b1220"}}>
            <span className="text-sm" style={{color: item.color}}>{item.title}</span>
            <span className="mt-1 block text-[11px] text-slate-200">{item.subtitle}</span>
            <span className="mt-3 block text-[10px] text-slate-300"><LocalizedText text={"原始数值 · 按位序"} /></span>
            <span className="mt-1 block break-words font-mono text-sm leading-6 text-slate-100">{model.raw[item.key]}</span>
            <span className="mt-3 block border-t border-white/10 pt-2 text-sm tabular-nums" style={{color: item.color}}>{displayValue}</span>
          </button>;
        })}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]"><Sphere model={model} active={active} /><aside className="rounded-2xl border border-white/10 bg-slate-900/65 p-5" aria-live="polite">
        <p className="text-xs tracking-widest text-slate-300"><LocalizedText text={"读懂这个要素"} /></p><h2 className="mb-3 mt-2 text-2xl" style={{color: selected.color}}>{selected.title}</h2><p className="text-sm leading-7 text-slate-300">{selected.description}</p>
        <div className="my-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="mb-2 text-xs text-slate-300"><LocalizedText text={"历算数值"} /></p><p className="break-words font-mono text-sm" style={{color: selected.color}}>{model.raw[active]}</p></div>
        {active === "fixedWeekday" ? <div><div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full" style={{background: `conic-gradient(#83e2b2 ${model.time * 360}deg, #243245 0)`}}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-slate-900"><span className="text-xl"><LocalizedText text={"曜序"} /> {model.weekday}</span><span className="text-xs text-slate-200"><LocalizedText text={"日内"} /> {(model.time * 100).toFixed(3)}%</span></div></div><p className="mt-4 text-xs leading-6 text-slate-200"><LocalizedText text={"时间量单独展示，不作为空间方向。日内余分 = 漏刻/60 + 分/3600 + 后续细分。"} /></p></div> : active === "effect" ? <div><p className="text-4xl text-rose-200">{model.effect}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded border border-white/10 p-3 text-slate-200"><LocalizedText text={"前半日"} /><br /><LocalizedText text={"暂无数据"} /></div><div className="rounded border border-rose-300/30 p-3 text-rose-200"><LocalizedText text={"后分简式"} /><br /><LocalizedText text={"编号"} /> {model.effect}</div></div><p className="mt-4 text-xs leading-6 text-slate-200"><LocalizedText text={"编号属于传统历算分类，不代表天球角度。"} /></p></div> : (() => { const value = spatialValue(model, active)!; return <div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-300"><LocalizedText text={"宿区"} /></p><p className="mt-1 text-xl" style={{color: selected.color}}><LocalizedText text={"宿"} /> {value.mansionIndex}</p><p className="mt-1 text-xs text-slate-200"><LocalizedText text={"宿内"} /> {(value.mansionProgress * 100).toFixed(3)}%</p></div><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-300"><LocalizedText text={"天球角"} /></p><p className="mt-1 text-xl tabular-nums" style={{color: selected.color}}>{formatAngle(value)}</p><p className="mt-1 text-xs text-slate-200"><LocalizedText text={"27宿换算"} /></p></div></div>{active === "conjunction" && <p className="mt-4 rounded-lg bg-violet-300/5 p-3 font-mono text-xs leading-6 text-violet-200"><LocalizedText text={"月伴"} /> {model.moon.rawValue.toFixed(6)} <LocalizedText text={"+ 定日"} /> {model.sun.rawValue.toFixed(6)}<br />= {model.conjunction.rawSum.toFixed(6)}<LocalizedText text={"，取 27 宿余数"} /> {model.conjunction.wrappedMansion.toFixed(6)}</p>}<p className="mt-4 text-xs leading-6 text-slate-300"><LocalizedText text={"宿 + 弧刻/60 + 分/3600 + 息/21600 + 子位细分，再乘 360/27。球面高亮的是当前数值所在宿区，点位是宿内精确位置。"} /></p></div>; })()}
      </aside></div>
      <details className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-200"><summary className="cursor-pointer text-slate-300"><LocalizedText text={"图示口径与资料依据"} /></summary><div className="mt-3 space-y-2 leading-7"><p><LocalizedText text={"依据本仓库《五要素术语表》及规则链 3.11–3.14。这里沿用应用字段：定曜、月伴星宿、定日、会合、作用；文献另有将“日期”列入五要素、把“定日”作为中间量的口径。"} /></p><p><LocalizedText text={"会合和作用属于用于占卜吉凶的传统历算结果。会合是宿度组合，作用是前后半日分类；两者都不是现代天文学的天体位置。"} /></p><p><LocalizedText text={"这是传统历算结果的几何解释，不是现代实时星历。宿环标示程序零起算序号；未核实恒星宿名对应，因此不添加星座背景。月伴星宿取太阳日开始，定日取太阴日结束，二者不代表同一时刻；不能据图推断月相或日月食。"} /></p><p><LocalizedText text={"定曜用时间环表示。日月没有黄纬、实际距离与观测地参数，因此图中不添加地平线、方位或高度。旋转只改变观看角度。"} /></p></div></details>
    </>}
  </section>;
}
