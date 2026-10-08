"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "match" | "different" | "missing" | "unavailable";
type Mode = "month" | "year" | "range";
type Value = number | null;
type CompareRow = { planet: string; field: string; python: Value[]; website: Value[] | null; status: "match" | "different" | "missing" };
type DailyResult = { day: number; websiteAvailable: boolean; status: Status; sourceUrl: string; counts: { match: number; different: number; missing: number }; rows: CompareRow[] };
type MonthStats = { expectedDays: number; comparedDays: number; matchingDays: number; differentDays: number; missingDays: number; differentFieldCount: number; missingFieldCount: number };
type MonthResult = { year: number; month: number; status: Status; hasDifferences: boolean; days: DailyResult[]; stats: MonthStats; verification: { generatedAt: string; passed: boolean } | null };
type MonthSummary = MonthStats & { month: number; status: Status; hasDifferences: boolean };
type RangeStats = { monthCount: number; completeMonthCount: number; matchingMonthCount: number; differentMonthCount: number; unavailableMonthCount: number; comparedDays: number; matchingDays: number; differentDays: number; missingDays: number; differentFieldCount: number };
type YearResult = { year: number; months: MonthSummary[]; stats: RangeStats };
type RangeResult = { startYear: number; endYear: number; years: YearResult[]; stats: RangeStats };

const PLANETS = ["火曜", "木曜", "土曜", "水曜", "金曜"];
const GROUPS = ["五曜殊日", "太阳日中行定数", "迟行定数", "疾行定数"];
const YEARS = Array.from({ length: 2500 }, (_, index) => index + 1);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function statusLabel(status: Status): string {
  return { match: "一致", different: "有差异", missing: "未对照", unavailable: "不完整" }[status];
}

function statusClass(status: Status): string {
  return { match: "border-[#acbda1] bg-[#f0f8eb]", different: "border-red-300 bg-red-50 text-red-800", missing: "border-amber-300 bg-amber-50 text-amber-900", unavailable: "border-amber-300 bg-amber-50 text-amber-900" }[status];
}

function PairedValues({ row }: { row: CompareRow }) {
  const size = Math.max(row.python.length, row.website?.length ?? 0);
  return <div className="mx-auto max-w-[190px]" data-compare-status={row.status}>
    <div className="grid grid-cols-2 gap-2 pb-1 text-xs text-[#856444]"><span>Python</span><span>网站</span></div>
    {Array.from({ length: size }, (_, index) => {
      const python = row.python[index]; const website = row.website?.[index]; const different = row.website !== null && python !== website;
      return <div key={index} className={`grid grid-cols-2 gap-2 py-1 font-mono tabular-nums ${different ? "font-semibold text-[#b52b25]" : ""}`}><span>{python ?? "—"}</span><span className={website === undefined ? "text-[#987b5c]" : ""}>{website ?? "—"}</span></div>;
    })}
    <p className={`mt-2 text-xs ${row.status === "different" ? "text-[#b52b25]" : "text-[#856444]"}`}>{statusLabel(row.status)}</p>
  </div>;
}

function DailyTable({ daily }: { daily: DailyResult }) {
  const common = daily.rows.find((row) => row.field === "五曜公积日");
  return <article className="mt-5 border border-[#d3c1af] bg-[#f2e7d7]/60 px-3 pb-8 pt-5 sm:px-8">
    <h3 className="flex items-center gap-4 text-center text-lg font-semibold before:flex-1 before:border-t before:border-dashed before:border-[#bfa58b] after:flex-1 after:border-t after:border-dashed after:border-[#bfa58b]"><span>藏历 {daily.day} 日</span></h3>
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm"><span className={`rounded-full border px-3 py-1 ${statusClass(daily.status)}`}>{statusLabel(daily.status)}</span><span className="text-[#856444]">一致 {daily.counts.match} 项 · 差异 {daily.counts.different} 项 · 未对照 {daily.counts.missing} 项</span></div>
    {common && <section className="py-7 text-center"><h4 className="mb-4 text-lg">五曜公积日</h4><PairedValues row={common} /></section>}
    {GROUPS.map((field) => {
      const groupRows = PLANETS.map((planet) => daily.rows.find((row) => row.field === field && row.planet === planet));
      return <section key={field} className="mt-7">
        <h4 className="flex items-center gap-4 text-center text-lg font-semibold before:flex-1 before:border-t before:border-dashed before:border-[#bfa58b] after:flex-1 after:border-t after:border-dashed after:border-[#bfa58b]"><span>{field}</span></h4>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] table-fixed text-center text-sm"><thead><tr>{PLANETS.map((planet) => <th key={planet} className="pb-4 text-base font-medium">{planet}</th>)}</tr></thead><tbody><tr>{groupRows.map((row, index) => <td key={PLANETS[index]} className="align-top">{row ? <PairedValues row={row} /> : <span className="text-xs text-[#987b5c]">—</span>}</td>)}</tr></tbody></table></div>
      </section>;
    })}
  </article>;
}

function StatCards({ stats }: { stats: RangeStats | MonthStats }) {
  const expectedDays = "expectedDays" in stats ? stats.expectedDays : stats.comparedDays + stats.missingDays;
  const values = [["已比较日", `${stats.comparedDays} / ${expectedDays}`], ["一致日", stats.matchingDays], ["有差异日", stats.differentDays], ["未对照日", stats.missingDays], ["差异字段组", stats.differentFieldCount]] as const;
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{values.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><p className="text-sm text-[#806448]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>;
}

async function request<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.status === 404) throw new Error("后端接口未加载，请重启本地后端服务后再试");
  let payload: { success: boolean; data?: T; error?: string };
  try { payload = await response.json() as typeof payload; }
  catch { throw new Error(`后端未返回有效数据（HTTP ${response.status}），请检查后端服务`); }
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload.data;
}

export default function FivePlanetsCompare() {
  const [mode, setMode] = useState<Mode>("month");
  const [year, setYear] = useState(2024); const [month, setMonth] = useState(3); const [day, setDay] = useState(1);
  const [startYear, setStartYear] = useState(2024); const [endYear, setEndYear] = useState(2025);
  const [monthResult, setMonthResult] = useState<MonthResult | null>(null); const [yearResult, setYearResult] = useState<YearResult | null>(null); const [rangeResult, setRangeResult] = useState<RangeResult | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [onlyDifferences, setOnlyDifferences] = useState(false); const [yearlyLoading, setYearlyLoading] = useState(false); const [yearlyError, setYearlyError] = useState("");
  const [progress, setProgress] = useState("");

  async function run() {
    setBusy(true); setError(""); setYearlyError(""); setProgress("");
    try {
      if (mode === "month") { setMonthResult(await request<MonthResult>("/api/five-planets/monthly-compare", { year, month })); setDay(1); }
      else if (mode === "year") setYearResult(await request<YearResult>("/api/five-planets/yearly-compare", { year }));
      else {
        if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear < 1 || endYear > 2500 || startYear > endYear) throw new Error("年份必须在1–2500内，起始年不晚于结束年");
        setRangeResult(null);
        const combined: RangeResult = { startYear, endYear, years: [], stats: { monthCount: 0, completeMonthCount: 0, matchingMonthCount: 0, differentMonthCount: 0, unavailableMonthCount: 0, comparedDays: 0, matchingDays: 0, differentDays: 0, missingDays: 0, differentFieldCount: 0 } };
        for (let start = startYear; start <= endYear; start += 25) {
          const end = Math.min(start + 24, endYear);
          setProgress(`正在对照 ${start}–${end} 年；已完成 ${start - startYear}/${endYear - startYear + 1} 年`);
          const batch = await request<RangeResult>("/api/five-planets/range-compare", { startYear: start, endYear: end });
          combined.years.push(...batch.years);
          for (const key of Object.keys(combined.stats) as (keyof RangeStats)[]) combined.stats[key] += batch.stats[key];
        }
        setRangeResult(combined);
        setProgress(`已完成 ${endYear - startYear + 1} 年对照`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "对照失败"); }
    finally { setBusy(false); }
  }

  async function openMonth(nextMonth: number) {
    setMode("month"); setMonth(nextMonth); setMonthResult(null); setYearResult(null); setRangeResult(null); setError(""); setYearlyError(""); setBusy(true);
    try { setMonthResult(await request<MonthResult>("/api/five-planets/monthly-compare", { year, month: nextMonth })); setDay(1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "月份对照失败"); }
    finally { setBusy(false); }
  }

  async function loadYearlyDifferences() {
    setMode("year"); setMonthResult(null); setRangeResult(null); setYearlyLoading(true); setYearlyError("");
    try { setYearResult(await request<YearResult>("/api/five-planets/yearly-compare", { year })); }
    catch (cause) { setYearlyError(cause instanceof Error ? cause.message : "年度差异加载失败"); }
    finally { setYearlyLoading(false); }
  }

  const visibleDays = monthResult ? (onlyDifferences ? monthResult.days.filter((item) => item.status === "different") : monthResult.days) : [];
  const selectedDay = visibleDays.find((item) => item.day === day) ?? visibleDays[0];
  const visibleYearMonths = yearResult ? (onlyDifferences ? yearResult.months.filter((item) => item.status === "different") : yearResult.months) : [];
  const clearForMode = (next: Mode) => { setMode(next); setError(""); setYearlyError(""); setMonthResult(null); setYearResult(null); setRangeResult(null); };

  return <main className="min-h-screen bg-black px-4 py-6 text-[#382b1d] sm:px-8">
    <section className="mx-auto max-w-6xl rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f6ecde_0%,#efe1cf_100%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-7">
      <p className="text-xs uppercase tracking-[0.35em] text-[#8e6b47]">ASTRONOMICAL CALENDAR DATA / FIVE PLANETS</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-wide">五曜值对照</h1><p className="mt-3 max-w-3xl leading-7 text-[#5f4a35]">Python V4 网站兼容版 · 21 组数值逐项对照；网站缓存缺失时不把缺失误判为一致。</p></div><div className="flex flex-wrap gap-2"><Link href="/earth?tab=five-elements&data=five-planets&view=query" className="inline-flex items-center rounded-full border border-[#cba982] bg-[#fff8ef] px-4 py-2 text-sm text-[#65472b] transition hover:bg-[#f6eadc]">返回五曜查询</Link><Link href="/earth?tab=five-elements&data=five-elements" className="inline-flex items-center rounded-full border border-[#cba982] bg-[#fff8ef] px-4 py-2 text-sm text-[#65472b] transition hover:bg-[#f6eadc]">返回天文历算基本数据</Link></div></div>
      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="对照范围">{([["month", "单年单月"], ["year", "单年 12 个月"], ["range", "选定年份区间"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => clearForMode(key)} className={`rounded-full border px-4 py-2 ${mode === key ? "border-[#754927] bg-[#754927] text-white" : "border-[#d0b79c] bg-[#fff8ef]"}`}>{label}</button>)}</div>
      <form className="mt-5 flex flex-wrap items-end gap-4" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        {mode !== "range" ? <label>年份<select aria-label="年份" className="ml-2 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={year} disabled={busy} onChange={(event) => setYear(Number(event.target.value))}>{YEARS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : <><label>起始年份<input aria-label="起始年份" className="ml-2 w-28 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" type="number" min="1" max="2500" value={startYear} disabled={busy} onChange={(event) => setStartYear(Number(event.target.value))} /></label><label>结束年份<input aria-label="结束年份" className="ml-2 w-28 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" type="number" min="1" max="2500" value={endYear} disabled={busy} onChange={(event) => setEndYear(Number(event.target.value))} /></label></>}
        {mode === "month" && <label>月份<select aria-label="月份" className="ml-2 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={month} disabled={busy} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        <button className="rounded bg-[#754927] px-5 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? "正在计算…" : "开始对照"}</button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#6d5440]"><label className="inline-flex items-center gap-2 rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2"><input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} />仅看存在差异的日期</label><button type="button" onClick={() => void loadYearlyDifferences()} disabled={yearlyLoading || busy} className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 transition hover:bg-[#f6eadc] disabled:cursor-wait disabled:opacity-60">{yearlyLoading ? "正在汇总年度差异..." : "查看年度差异月份"}</button></div>
      {progress && <p role="status" className="mt-3 text-sm text-[#856444]">{progress}</p>}
      {error && <p role="alert" className="mt-5 text-[#b52b25]">{error}</p>}
      {yearlyError && <p role="alert" className="mt-3 text-[#b52b25]">年度差异加载失败：{yearlyError}</p>}
    </section>

    {mode === "month" && monthResult && <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">公元 {monthResult.year} 年藏历 {monthResult.month} 月</h2><p className="mt-2 text-sm text-[#856444]">{monthResult.stats.missingDays ? `网站缓存缺失 ${monthResult.stats.missingDays} 日；这些日期保留为未对照。` : "本月 30 日均有网站缓存。"}</p></div>{visibleDays.length > 0 && <select aria-label="查看日期" className="rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={selectedDay?.day || 1} onChange={(event) => setDay(Number(event.target.value))}>{visibleDays.map((item) => <option key={item.day} value={item.day}>藏历 {item.day} 日 · {statusLabel(item.status)}</option>)}</select>}</div><StatCards stats={monthResult.stats} />{selectedDay ? <DailyTable daily={selectedDay} /> : <p className="mt-5 text-sm text-[#856444]">当前月份没有存在差异的日期。</p>}{onlyDifferences && <p className="mt-3 text-xs text-[#856444]">已筛选：仅显示有差异的 {visibleDays.length} 天。</p>}{monthResult.verification && <p className="mt-4 text-xs text-[#856444]">历史回归快照：{monthResult.verification.passed ? "通过" : "未通过"}（仅代表已缓存日期范围）。</p>}</section>}

    {mode === "year" && yearResult && <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8"><h2 className="text-2xl font-semibold">公元 {yearResult.year} 年 · 12 个月汇总</h2><StatCards stats={yearResult.stats} />{visibleYearMonths.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visibleYearMonths.map((item) => <button key={item.month} type="button" disabled={busy} onClick={() => void openMonth(item.month)} className={`rounded-2xl border p-4 text-left disabled:opacity-60 ${statusClass(item.status)}`}><div className="flex justify-between font-semibold"><span>{item.month} 月</span><span>{statusLabel(item.status)}</span></div><p className="mt-2 text-sm">比较 {item.comparedDays}/{item.expectedDays} 日 · 差异 {item.differentDays} 日</p><p className="mt-1 text-xs">{item.missingDays ? `未对照 ${item.missingDays} 日` : `一致 ${item.matchingDays} 日`}</p></button>)}</div> : <p className="mt-5 rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-5 text-sm text-[#856444]">当前年度没有存在差异的月份。</p>}<p className="mt-4 text-xs text-[#856444]">{onlyDifferences ? `已筛选：仅显示有差异的 ${visibleYearMonths.length} 个月。` : "点击月份直接展开该月逐日 21 组明细。"}</p></section>}

    {mode === "range" && rangeResult && <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8"><h2 className="text-2xl font-semibold">公元 {rangeResult.startYear}–{rangeResult.endYear} 年区间汇总</h2><StatCards stats={rangeResult.stats} /><div className="mt-5 space-y-4">{rangeResult.years.map((item) => <details key={item.year} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><summary className="cursor-pointer font-semibold">公元 {item.year} 年 · 完整月 {item.stats.completeMonthCount}/12 · 差异月 {item.stats.differentMonthCount} · 不完整月 {item.stats.unavailableMonthCount}</summary><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{item.months.map((monthItem) => <div key={monthItem.month} className={`rounded-xl border p-3 ${statusClass(monthItem.status)}`}><div className="flex justify-between text-sm font-medium"><span>{monthItem.month} 月</span><span>{statusLabel(monthItem.status)}</span></div><p className="mt-1 text-xs">{monthItem.comparedDays}/{monthItem.expectedDays} 日 · 差异 {monthItem.differentDays}</p></div>)}</div></details>)}</div><p className="mt-4 text-xs text-[#856444]">区间模式只返回月份统计，不展开全部逐日数组；选择单年单月可查看 30 日明细。</p></section>}
  </main>;
}
