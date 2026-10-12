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
import { buildBasicDataHref } from "@/features/earth/navigation";
import {
  buildFivePlanetPositions,
  type PlanetPosition,
  type PlanetSection,
} from "@/features/earth/fivePlanetsGeometry";

type DailyPlanetData = {
  available: boolean;
  label: string;
  sections: PlanetSection[];
  sourceUrl: string;
  error: string;
};

const controlClass = "rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10";

function PlanetSphere({ positions, selected, onSelect }: {
  positions: PlanetPosition[];
  selected: PlanetPosition;
  onSelect: (name: PlanetPosition["name"]) => void;
}): React.JSX.Element {
  const locale = useLocale();
  const [rotation, setRotation] = useState(-35);
  const [tilt, setTilt] = useState(32);
  const [grid, setGrid] = useState(true);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const project = (angle: number, latitude = 0, scale = 1) => {
    const a = (angle + rotation) * Math.PI / 180;
    const b = latitude * Math.PI / 180;
    const t = tilt * Math.PI / 180;
    const x = Math.cos(b) * Math.sin(a);
    const y = Math.cos(b) * Math.cos(a);
    const z = Math.sin(b);
    return { x: 320 + 193 * scale * x, y: 245 - 193 * scale * (y * Math.sin(t) + z * Math.cos(t)), depth: y * Math.cos(t) - z * Math.sin(t) };
  };
  const path = (start: number, extent: number, latitude = 0, scale = 1) => Array.from({ length: 97 }, (_, index) => {
    const point = project(start + extent * index / 96, latitude, scale);
    return `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(" ");

  return <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#080f1c]">
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 text-xs text-slate-300">
      <span><LocalizedText text={"地心示意 · 五曜疾行定数 · 27 宿"} /></span>
      <label className="flex items-center gap-2"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} /><LocalizedText text={"天球网格"} /></label>
    </div>
    <svg viewBox="0 0 640 490" role="img" aria-label={appText(locale, "可旋转的五曜地心天球图")} className="w-full touch-none cursor-grab active:cursor-grabbing"
      onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}
      onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, moved: false }; }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        setRotation(value => value + dx * .45);
        setTilt(value => Math.max(10, Math.min(85, value + dy * .3)));
        drag.current = { x: event.clientX, y: event.clientY, moved: true };
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <defs><radialGradient id="five-planets-earth"><stop stopColor="#367ca0" /><stop offset="1" stopColor="#0a233e" /></radialGradient></defs>
      <circle cx="320" cy="245" r="193" fill="#0d192a" fillOpacity=".4" stroke="#27364b" />
      {grid && <g fill="none" stroke="#26394d" strokeWidth=".7">
        {[-60, -30, 30, 60].map(latitude => <path key={latitude} d={path(0, 360, latitude)} />)}
        {[0, 30, 60, 90, 120, 150].map(longitude => <path key={longitude} d={Array.from({ length: 97 }, (_, index) => { const point = project(longitude, index * 360 / 96); return `${index ? "L" : "M"}${point.x},${point.y}`; }).join(" ")} />)}
      </g>}
      <g fill="none" stroke="#7b879c">{Array.from({ length: 72 }, (_, index) => <path key={index} d={path(index * 5, 5)} strokeOpacity={project(index * 5 + 2.5).depth < 0 ? .3 : .8} strokeDasharray={project(index * 5 + 2.5).depth < 0 ? "3 4" : undefined} />)}</g>
      <path d={path(selected.mansionIndex * 360 / 27, 360 / 27, 0, 1.03)} fill="none" stroke={selected.color} strokeWidth="8" strokeLinecap="round" />
      {Array.from({ length: 27 }, (_, index) => { const point = project((index + .5) * 360 / 27, 0, 1.13); return <text key={index} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle" fill={selected.mansionIndex === index ? selected.color : "#a4aec0"} fontSize="11">{index}</text>; })}
      {positions.map(position => { const point = project(position.angle); const active = position.name === selected.name; return <g key={position.name}>
        <line x1="320" y1="245" x2={point.x} y2={point.y} stroke={position.color} strokeOpacity={active ? .7 : .23} />
        <circle cx={point.x} cy={point.y} r={active ? 18 : 14} fill={position.color} fillOpacity=".18" />
        <circle cx={point.x} cy={point.y} r={active ? 8 : 6} fill={position.color} stroke="#08101e" strokeWidth="2" />
        <text x={point.x} y={point.y - 20} textAnchor="middle" fill={position.color} fontSize="13">{position.name}</text>
        <circle cx={point.x} cy={point.y} r="23" fill="transparent" role="button" tabIndex={0} aria-label={`选择${position.name}`} onClick={() => onSelect(position.name)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(position.name); } }} className="cursor-pointer" />
      </g>; })}
      <circle cx="320" cy="245" r="22" fill="url(#five-planets-earth)" stroke="#71a6bc" />
      <text x="320" y="278" textAnchor="middle" fill="#b5c9d8" fontSize="12"><LocalizedText text={"地心"} /></text>
      <text x="22" y="458" fill="#8999ad" fontSize="12"><LocalizedText text={"程序宿序 0–26 · 一宿 = 13⅓°"} /></text>
      <text x="22" y="478" fill="#63768e" fontSize="11"><LocalizedText text={"黄道投影；不表达实际距离、黄纬或当地可见性。"} /></text>
    </svg>
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-300">
      <label className="flex items-center gap-2"><LocalizedText text={"旋转"} /><input aria-label={appText(locale, "五曜天球旋转")} type="range" min="-180" max="180" value={((rotation + 180) % 360 + 360) % 360 - 180} onChange={event => setRotation(Number(event.target.value))} className="w-28 accent-cyan-300" /></label>
      <label className="flex items-center gap-2"><LocalizedText text={"俯仰"} /><input aria-label={appText(locale, "五曜天球俯仰")} type="range" min="10" max="85" value={tilt} onChange={event => setTilt(Number(event.target.value))} className="w-20 accent-cyan-300" /></label>
      <button type="button" className={controlClass} onClick={() => { setRotation(-35); setTilt(32); }}><LocalizedText text={"复位"} /></button>
      <span className="text-slate-500"><LocalizedText text={"可拖动球面或点击曜点"} /></span>
    </div>
  </div>;
}

export default function FivePlanetsSphere(): React.JSX.Element {
  const params = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const bounded = (name: string, fallback: number, min: number, max: number) => { const value = Number(params.get(name)); return Number.isInteger(value) && value >= min && value <= max ? value : fallback; };
  const year = bounded("year", 2026, 1, 2500);
  const month = bounded("month", 8, 1, 12);
  const day = bounded("day", 3, 1, 30);
  const gregorianDate = params.get("gdate") || "2026-09-14";
  const cityParam = params.get("city");
  const city: SupportedCity = SUPPORTED_CITIES.includes(cityParam as SupportedCity) ? cityParam as SupportedCity : DEFAULT_CITY;
  const dateKey = `${year}-${month}-${day}`;
  const [result, setResult] = useState<{ dateKey: string; data?: DailyPlanetData; error?: string } | null>(null);
  const [selectedName, setSelectedName] = useState<PlanetPosition["name"]>("火曜");

  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/five-planets/daily-query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, month, day }), signal: controller.signal });
        const payload = await response.json() as { success: boolean; data?: DailyPlanetData; error?: string };
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || `读取失败（${response.status}）`);
        if (!controller.signal.aborted) setResult({ dateKey, data: payload.data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ dateKey, error: error instanceof Error ? error.message : "读取失败" });
      }
    }
    void load();
    return () => controller.abort();
  }, [dateKey, year, month, day]);

  const switchDate = (next: { year: number; month: number; day: number; gregorianDate: string; city: SupportedCity }) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries({ year: next.year, month: next.month, day: next.day, gdate: next.gregorianDate, city: next.city })) query.set(key, String(value));
    router.push(localizePath(locale, buildBasicDataHref("five-planets-sphere", query)), { scroll: false });
  };
  const current = result?.dateKey === dateKey ? result : null;
  const positions = current?.data?.available ? buildFivePlanetPositions(current.data.sections) : [];
  const selected = positions.find(position => position.name === selectedName) ?? positions[0];

  return <section className="mx-auto w-full max-w-7xl pb-28 text-slate-100" onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs tracking-[.24em] text-cyan-300"><LocalizedText text={"时轮历算 · 五曜天球图"} /></p><h1 className="text-2xl font-semibold sm:text-3xl"><LocalizedText text={"五曜，映于天球"} /></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400"><LocalizedText text={"选择一曜，对照疾行定数的原始位序、宿区和黄道投影。"} /></p></div>
      <LocaleLink className={controlClass} href={buildBasicDataHref("five-planets", params)}><LocalizedText text={"查看五曜值 ↗"} /></LocaleLink>
    </header>
    <div className="mb-5"><GregorianTibetanDatePicker key={`${gregorianDate}-${city}`} initialDate={gregorianDate} initialCity={city} tone="dark" onResolved={({ gregorianDate: nextDate, city: nextCity, tibetan }) => switchDate({ year: tibetan.year, month: tibetan.month, day: tibetan.day, gregorianDate: nextDate, city: nextCity })} /></div>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm"><span><LocalizedText text={"藏历"} /> {year} <LocalizedText text={"年"} /> {month} <LocalizedText text={"月"} /> {day} <LocalizedText text={"日"} /></span><span className="text-slate-500"><LocalizedText text={"公历输入"} /> {gregorianDate} · {city}</span><span className="rounded-full border border-amber-300/20 px-2 py-1 text-xs text-amber-200"><LocalizedText text={"参考数据"} /></span></div>
    {!current ? <p role="status" className="py-24 text-center text-cyan-200"><LocalizedText text={"正在读取五曜数据…"} /></p>
      : current.error ? <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-950/20 p-6 text-rose-200">{current.error}</p>
      : !current.data?.available ? <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-950/20 p-6 text-amber-100"><LocalizedText text={"此日暂无五曜数据，无法绘制天球图。请换一天查询。"} /></p>
      : !selected ? <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-950/20 p-6 text-amber-100"><LocalizedText text={"此日缺少可用的疾行定数，无法绘制天球图。"} /></p>
      : <>
        <p className="mb-4 text-sm text-slate-300">{current.data.label} <LocalizedText text={"· 点击曜卡或球面标记查看数值"} /></p>
        <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-5" role="group" aria-label={appText(locale, "选择五曜")}>
          {positions.map(position => <button key={position.name} type="button" aria-pressed={selected.name === position.name} onClick={() => setSelectedName(position.name)} className="min-w-0 rounded-xl border p-3 text-left transition hover:bg-white/5" style={{ borderColor: selected.name === position.name ? position.color : "#263247", background: selected.name === position.name ? `${position.color}12` : "#0b1220" }}>
            <span className="text-sm font-medium" style={{ color: position.color }}>{position.name}</span>
            <span className="mt-2 block text-xs text-slate-400"><LocalizedText text={"疾行定数 · 原始位序"} /></span>
            <span className="mt-1 block break-words font-mono text-sm text-slate-100">{position.values.join(" / ")}</span>
            <span className="mt-3 block border-t border-white/10 pt-2 text-sm tabular-nums" style={{ color: position.color }}><LocalizedText text={"宿"} /> {position.mansionIndex} · {position.angle.toFixed(4)}°</span>
          </button>)}
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
          <PlanetSphere positions={positions} selected={selected} onSelect={setSelectedName} />
          <aside className="rounded-2xl border border-white/10 bg-slate-900/65 p-5" aria-live="polite">
            <p className="text-xs tracking-widest text-slate-500"><LocalizedText text={"五曜数值对照"} /></p><h2 className="mt-3 text-2xl" style={{ color: selected.color }}>{selected.name}</h2>
            <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500"><LocalizedText text={"疾行定数"} /></p><p className="mt-2 break-words font-mono text-lg">{selected.values.join(" / ")}</p></div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500"><LocalizedText text={"宿区"} /></p><p className="mt-1 text-xl" style={{ color: selected.color }}><LocalizedText text={"宿"} /> {selected.mansionIndex}</p><p className="mt-1 text-xs text-slate-400"><LocalizedText text={"宿内"} /> {((selected.mansion - selected.mansionIndex) * 100).toFixed(3)}%</p></div><div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs text-slate-500"><LocalizedText text={"投影角"} /></p><p className="mt-1 text-xl tabular-nums" style={{ color: selected.color }}>{selected.angle.toFixed(4)}°</p><p className="mt-1 text-xs text-slate-400"><LocalizedText text={"27 宿换算"} /></p></div></div>
            <p className="mt-5 text-xs leading-6 text-slate-400"><LocalizedText text={"使用各曜自己的子位进制，将疾行定数换算为 27 宿环上的方向。零起算宿序；没有黄纬、距离或观测地视线数据。"} /></p>
            {current.data.sourceUrl && <a href={current.data.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-cyan-300 underline underline-offset-4"><LocalizedText text={"查看参考网站原页 ↗"} /></a>}
          </aside>
        </div>
        <details className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-400"><summary className="cursor-pointer text-slate-300"><LocalizedText text={"图示口径"} /></summary><p className="mt-3 leading-7"><LocalizedText text={"依据五曜疾行定数绘制传统历算的地心黄道投影示意，不是现代实时星历。旋转只改变观看角度；图上不表示纬度、距离、升落或当地可见性。"} /></p></details>
      </>}
  </section>;
}
