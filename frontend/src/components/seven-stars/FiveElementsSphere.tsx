"use client";
import { appText } from "@/i18n/copy";

import LocalizedText from "@/i18n/LocalizedText";
import { useEffect, useMemo, useState } from "react";
import CelestialSphere, { type SphereMarker, type SphereTrail } from "@/components/celestial-sphere/CelestialSphere";
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

function Sphere({ model, active, onSelect, focusToken }: { model: Model; active: ElementKey; onSelect: (key: ElementKey) => void; focusToken: number }) {
  const locale = useLocale();
  const activeValue = spatialValue(model, active);
  const activeElement = ELEMENTS.find(item => item.key === active)!;
  const markers = useMemo<SphereMarker[]>(() => [
    { id: "fixedDay", longitude: model.sun.angle, latitude: 0, name: `${appText(locale, "定日")} · ${appText(locale, "太阳宿度")}`, color: "#f9c967", kind: "sun" },
    { id: "lunarPartner", longitude: model.moon.angle, latitude: 0, name: `${appText(locale, "月伴")} · ${appText(locale, "月亮宿度")}`, color: "#90dbf5", kind: "moon" },
    ...(active === "conjunction" ? [{ id: "conjunction", longitude: model.sum.angle, latitude: 0, name: `${appText(locale, "会合")} · ${appText(locale, "宿度和")}`, color: "#c4a3ff", kind: "virtual" as const }] : []),
  ], [model, active, locale]);
  const trails = useMemo<SphereTrail[]>(() => {
    const arc = (start: number, extent: number) => Array.from({ length: 181 }, (_, i) => ({ longitude: start + extent * i / 180, latitude: 0 }));
    if (active === "conjunction") return [
      { id: "moon", color: "#90dbf5", points: arc(0, model.moon.angle) },
      { id: "sum", color: "#c4a3ff", points: arc(model.moon.angle, model.sun.angle), dashed: true },
    ];
    const value = spatialValue(model, active);
    return value ? [{ id: active, color: ELEMENTS.find(item => item.key === active)!.color, points: arc(0, value.angle) }] : [];
  }, [model, active]);
  return <CelestialSphere title={appText(locale, "地心 · 27宿黄道投影")} subtitle={appText(locale, "传统历算 · 程序宿序 0–26")} traditional
    note={appText(locale, "27宿几何示意 · 不代表同一时刻的实测日月位置")}
    markers={markers} selected={active} focusToken={focusToken} onSelect={id => onSelect(id as ElementKey)} trails={trails}
    mansion={activeValue ? { index: activeValue.mansionIndex, color: activeElement.color } : undefined}
    t={text => appText(locale, text)} />;
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
  const [focusToken, setFocusToken] = useState(0);
  const selectElement = (key: ElementKey) => { setActive(key); setFocusToken(value => value + 1); };
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
    {!current ? <p role="status" className="py-24 text-center text-cyan-200"><LocalizedText text={"正在读取每日五要素…"} /></p> : current.error ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-8"><h2 className="text-lg"><LocalizedText text={"此日暂不可显示"} /></h2><p className="my-3 text-sm text-amber-100">{appText(locale, current.error)}</p><p className="mb-4 text-sm text-slate-200"><LocalizedText text={"藏历缺日没有对应的公历日。可切换相邻日；若为读取错误，请重试。"} /></p><button className={buttonStyle} onClick={() => { setResult(null); setRetry(v => v+1); }}><LocalizedText text={"重试"} /></button></div> : model && <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><span>{appText(locale, current.data?.tibetanDateLabel || "")}</span><span className="text-slate-300"><LocalizedText text={"公历"} /> {current.data?.gregorianDates.join(" / ")}</span><span className="rounded-full border border-emerald-400/20 px-2 py-1 text-[11px] text-emerald-300"><LocalizedText text={"最终计算结果"} /></span></div>
      <div className="mb-5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-5" role="group" aria-label={appText(locale, "选择五要素")}>
        {ELEMENTS.map(item => {
          const value = spatialValue(model, item.key);
          const displayValue = item.key === "fixedWeekday"
            ? `${appText(locale, "曜序")} ${model.weekday} · ${appText(locale, "日内")} ${(model.time * 100).toFixed(3)}%`
            : item.key === "effect"
              ? `${appText(locale, "后分简式编号")} ${model.effect}`
              : value ? `${formatAngle(value)} · ${appText(locale, "宿")} ${value.mansionIndex} · ${(value.mansionProgress * 100).toFixed(3)}%` : "";
          return <button key={item.key} aria-label={`${appText(locale, item.title)} ${appText(locale, item.subtitle)}`} aria-pressed={active === item.key} onClick={() => selectElement(item.key)} className="min-w-0 rounded-xl border p-3 text-left transition hover:bg-white/5" style={{borderColor: active === item.key ? item.color : "#263247", background: active === item.key ? `${item.color}12` : "#0b1220"}}>
            <span className="text-sm" style={{color: item.color}}>{appText(locale, item.title)}</span>
            <span className="mt-1 block text-[11px] text-slate-200">{appText(locale, item.subtitle)}</span>
            <span className="mt-3 block text-[10px] text-slate-300"><LocalizedText text={"原始数值 · 按位序"} /></span>
            <span className="mt-1 block break-words font-mono text-sm leading-6 text-slate-100">{model.raw[item.key]}</span>
            <span className="mt-3 block border-t border-white/10 pt-2 text-sm tabular-nums" style={{color: item.color}}>{displayValue}</span>
          </button>;
        })}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]"><Sphere model={model} active={active} onSelect={selectElement} focusToken={focusToken} /><aside className="rounded-2xl border border-white/10 bg-slate-900/65 p-5" aria-live="polite">
        <p className="text-xs tracking-widest text-slate-300"><LocalizedText text={"读懂这个要素"} /></p><h2 className="mb-3 mt-2 text-2xl" style={{color: selected.color}}>{appText(locale, selected.title)}</h2><p className="text-sm leading-7 text-slate-300">{appText(locale, selected.description)}</p>
        <div className="my-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="mb-2 text-xs text-slate-300"><LocalizedText text={"历算数值"} /></p><p className="break-words font-mono text-sm" style={{color: selected.color}}>{model.raw[active]}</p></div>
        {active === "fixedWeekday" ? <div><div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full" style={{background: `conic-gradient(#83e2b2 ${model.time * 360}deg, #243245 0)`}}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-slate-900"><span className="text-xl"><LocalizedText text={"曜序"} /> {model.weekday}</span><span className="text-xs text-slate-200"><LocalizedText text={"日内"} /> {(model.time * 100).toFixed(3)}%</span></div></div><p className="mt-4 text-xs leading-6 text-slate-200"><LocalizedText text={"时间量单独展示，不作为空间方向。日内余分 = 漏刻/60 + 分/3600 + 后续细分。"} /></p></div> : active === "effect" ? <div><p className="text-4xl text-rose-200">{model.effect}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded border border-white/10 p-3 text-slate-200"><LocalizedText text={"前半日"} /><br /><LocalizedText text={"暂无数据"} /></div><div className="rounded border border-rose-300/30 p-3 text-rose-200"><LocalizedText text={"后分简式"} /><br /><LocalizedText text={"编号"} /> {model.effect}</div></div><p className="mt-4 text-xs leading-6 text-slate-200"><LocalizedText text={"编号属于传统历算分类，不代表天球角度。"} /></p></div> : (() => { const value = spatialValue(model, active)!; return <div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-300"><LocalizedText text={"宿区"} /></p><p className="mt-1 text-xl" style={{color: selected.color}}><LocalizedText text={"宿"} /> {value.mansionIndex}</p><p className="mt-1 text-xs text-slate-200"><LocalizedText text={"宿内"} /> {(value.mansionProgress * 100).toFixed(3)}%</p></div><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-300"><LocalizedText text={"天球角"} /></p><p className="mt-1 text-xl tabular-nums" style={{color: selected.color}}>{formatAngle(value)}</p><p className="mt-1 text-xs text-slate-200"><LocalizedText text={"27宿换算"} /></p></div></div>{active === "conjunction" && <p className="mt-4 rounded-lg bg-violet-300/5 p-3 font-mono text-xs leading-6 text-violet-200"><LocalizedText text={"月伴"} /> {model.moon.rawValue.toFixed(6)} <LocalizedText text={"+ 定日"} /> {model.sun.rawValue.toFixed(6)}<br />= {model.conjunction.rawSum.toFixed(6)}<LocalizedText text={"，取 27 宿余数"} /> {model.conjunction.wrappedMansion.toFixed(6)}</p>}<p className="mt-4 text-xs leading-6 text-slate-300"><LocalizedText text={"宿 + 弧刻/60 + 分/3600 + 息/21600 + 子位细分，再乘 360/27。球面高亮的是当前数值所在宿区，点位是宿内精确位置。"} /></p></div>; })()}
      </aside></div>
      <details className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-200"><summary className="cursor-pointer text-slate-300"><LocalizedText text={"图示口径与资料依据"} /></summary><div className="mt-3 space-y-2 leading-7"><p><LocalizedText text={"依据本仓库《五要素术语表》及规则链 3.11–3.14。这里沿用应用字段：定曜、月伴星宿、定日、会合、作用；文献另有将“日期”列入五要素、把“定日”作为中间量的口径。"} /></p><p><LocalizedText text={"会合和作用属于用于占卜吉凶的传统历算结果。会合是宿度组合，作用是前后半日分类；两者都不是现代天文学的天体位置。"} /></p><p><LocalizedText text={"这是传统历算结果的几何解释，不是现代实时星历。宿环标示程序零起算序号；未核实恒星宿名对应，因此不添加星座背景。月伴星宿取太阳日开始，定日取太阴日结束，二者不代表同一时刻；不能据图推断月相或日月食。"} /></p><p><LocalizedText text={"定曜用时间环表示。日月没有黄纬、实际距离与观测地参数，因此图中不添加地平线、方位或高度。旋转只改变观看角度。"} /></p></div></details>
    </>}
  </section>;
}
