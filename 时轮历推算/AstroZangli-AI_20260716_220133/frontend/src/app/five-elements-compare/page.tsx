"use client";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

import LocalizedText from "@/i18n/LocalizedText";
import LocaleLink from "@/i18n/LocaleLink";
import { useState } from "react";

import {
  fetchMonthlyFiveElementsCompare,
  fetchYearlyFiveElementsCompare,
  type MonthlyFiveElementsCompareResponse,
  type YearlyFiveElementsCompareResponse,
} from "@/services/fiveElementsApi";

type Mode = "month" | "year" | "range";
type RangePageSize = 10 | 20;
type Source = "python" | "matlab" | "website";
type Value = number | string | null;
type RangeMonth = {
  month: number;
  status: "match" | "difference" | "unavailable";
  differentDays: number[];
  reason: string;
  days: Array<{ day: number; fields: string[]; python: Record<string, Value[]>; website: Record<string, Value[]> }>;
};
type RangeData = {
  years: Array<{ year: number; months: RangeMonth[] }>;
  stats: {
    monthCount: number;
    matchedMonths: number;
    differentMonths: number;
    unavailableMonths: number;
    comparedDays: number;
    matchingDays: number;
    differentDays: number;
    fieldDifferenceCounts: Record<string, number>;
  };
};

const YEARS = Array.from({ length: 2500 }, (_, index) => index + 1);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const FIELDS = [
  ["fixedWeekday", "定曜"],
  ["lunarPartner", "月伴星宿"],
  ["fixedDay", "定日"],
  ["conjunction", "会合"],
] as const;

function valuesEqual(left: Value[], right: Value[]): boolean {
  return left.length === right.length && left.every((value, index) => String(value ?? "") === String(right[index] ?? ""));
}

function renderValues(values: Value[] | undefined): string {
  if (!values || values.length === 0) return "—";
  return values.map((value) => value === null || value === undefined ? "—" : String(value)).join(" / ");
}

function statusText(status: "match" | "difference" | "unavailable"): string {
  return { match: "一致", difference: "有差异", unavailable: "未对照" }[status];
}

function statusClass(status: "match" | "difference" | "unavailable"): string {
  return {
    match: "border-[#acbda1] bg-[#f0f8eb]",
    difference: "border-red-300 bg-red-50 text-red-800",
    unavailable: "border-amber-300 bg-amber-50 text-amber-900",
  }[status];
}

function sourceLabel(source: Source, locale: "zh" | "bo" = "zh"): string {
  return appText(locale, { python: "Python", matlab: "MATLAB", website: "网站" }[source]);
}

async function fetchRange(start: number, end: number): Promise<RangeData> {
  const query = new URLSearchParams({ start: String(start), end: String(end) });
  const response = await fetch("/api/five-elements/range-compare?" + query.toString());
  if (response.status === 404) throw new Error("五要素区间接口未找到，请确认后端服务已启动");
  const body = await response.text();
  let payload: { success: boolean; data?: RangeData; error?: { message?: string } };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch {
    throw new Error("五要素后端未返回有效数据（服务状态码 " + response.status + "），请检查后端服务及算法文件路径");
  }
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || ("服务状态码 " + response.status));
  return payload.data;
}

function MonthSummary({ data }: { data: MonthlyFiveElementsCompareResponse }) {
  const locale = useLocale();
  const websiteAvailable = data.sources.websiteAvailable !== false;
  return <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {[
      ["比较日期", data.days.length + " 日"],
      ["完全一致日", data.days.filter((day) => websiteAvailable && day.matches).length + " 日"],
      ["有差异日", data.stats.differentDayCount + " 日"],
      ["未对照", websiteAvailable ? "0 日" : "30 日"],
    ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><p className="text-sm text-[#806448]">{appText(locale, String(label))}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
  </div>;
}

function DailyTable({ day, visibility }: { day: MonthlyFiveElementsCompareResponse["days"][number]; visibility: Record<Source, boolean> }) {
  const locale = useLocale();
  const sources = (["python", "matlab", "website"] as Source[]).filter((source) => visibility[source]);
  return <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d5b99c] bg-[#fff9f0]">
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-[#f3e3d1] text-[#654a33]"><tr><th className="p-3"><LocalizedText text={"字段"} /></th>{sources.map((source) => <th key={source} className="p-3">{sourceLabel(source, locale)}</th>)}<th className="p-3"><LocalizedText text={"状态"} /></th></tr></thead>
      <tbody>{FIELDS.map(([key, label]) => {
        const python = day.python[key]; const matlab = day.matlabOracle[key]; const website = day.website[key];
        const allMatch = valuesEqual(python, matlab) && (!visibility.website || valuesEqual(python, website));
        return <tr key={key} className={"border-t border-[#ead9c5] " + (allMatch ? "" : "bg-red-50")}>
          <td className="p-3 font-medium">{appText(locale, String(label))}</td>
          {sources.map((source) => <td key={source} className={"p-3 align-top " + (source === "website" && !websiteAvailable(day) ? "text-[#9a6b37]" : "")}>{source === "python" ? renderValues(python) : source === "matlab" ? renderValues(matlab) : renderValues(website)}</td>)}
          <td className={"p-3 font-medium " + (allMatch ? "text-[#657b5f]" : "text-[#b52b25]")}>{appText(locale, allMatch ? "一致" : "差异")}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function MonthHeaderTable({ data, visibility }: { data: MonthlyFiveElementsCompareResponse; visibility: Record<Source, boolean> }) {
  const locale = useLocale();
  const sources = (["python", "matlab", "website"] as Source[]).filter((source) => visibility[source]);
  const websiteAvailable = data.sources.websiteAvailable !== false;
  const matlabAvailable = data.sources.matlabOracleAvailable !== false;
  const comparisonAvailable = websiteAvailable && matlabAvailable;
  return <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d5b99c] bg-[#fff9f0]">
    <div className="border-b border-[#ead9c5] px-4 py-3"><h3 className="font-semibold"><LocalizedText text={"月头汇总"} /></h3><p className="mt-1 text-xs text-[#806448]"><LocalizedText text={"积月闰余、曜基数、整零数和太阳基数逐项对照，红色表示存在差异。"} /></p></div>
    <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="bg-[#f3e3d1] text-[#654a33]"><tr><th className="p-3"><LocalizedText text={"字段"} /></th>{sources.map((source) => <th key={source} className="p-3">{sourceLabel(source, locale)}</th>)}<th className="p-3"><LocalizedText text={"状态"} /></th></tr></thead>
      <tbody>{data.summary.map((item) => {
        const python = item.python; const matlab = item.matlabOracle; const website = item.website;
        const matches = comparisonAvailable && item.matches;
        const unavailable = !comparisonAvailable;
        return <tr key={item.label} className={"border-t border-[#ead9c5] " + (unavailable ? "bg-amber-50" : matches ? "" : "bg-red-50")}>
          <td className="p-3 font-medium">{appText(locale, item.label)}</td>
          {sources.map((source) => <td key={source} className="p-3 align-top">{source === "python" ? renderValues(python) : source === "matlab" ? renderValues(matlab) : renderValues(website)}</td>)}
          <td className={"p-3 font-medium " + (unavailable ? "text-[#9a6b37]" : matches ? "text-[#657b5f]" : "text-[#b52b25]")}>{appText(locale, unavailable ? "未对照" : matches ? "一致" : "差异")}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function websiteAvailable(day: MonthlyFiveElementsCompareResponse["days"][number]): boolean {
  return day.website.fixedDay.length > 0 || day.website.conjunction.length > 0;
}

function MonthDetail({ data, dayNumber, setDayNumber, visibility, onlyDiffs }: {
  data: MonthlyFiveElementsCompareResponse;
  dayNumber: number;
  setDayNumber: (day: number) => void;
  visibility: Record<Source, boolean>;
  onlyDiffs: boolean;
}) {
  const locale = useLocale();
  const websiteAvailable = data.sources.websiteAvailable !== false;
  const visibleDays = onlyDiffs && websiteAvailable ? data.days.filter((item) => !item.matches) : data.days;
  const day = visibleDays.find((item) => item.day === dayNumber) || visibleDays[0];
  return <section className="mt-5 rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold"><LocalizedText text={"公元"} /> {data.year} <LocalizedText text={"年藏历"} /> {data.month} <LocalizedText text={"月"} /></h2><p className="mt-2 text-sm text-[#856444]">{appText(locale, websiteAvailable ? "三方结果按字段逐项对照，红色表示存在差异。" : "参考网站暂不可用，当前只显示本地结果。")}</p></div>{visibleDays.length > 0 && <select aria-label={appText(locale, "查看日期")} className="rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={day?.day || 1} onChange={(event) => setDayNumber(Number(event.target.value))}>{visibleDays.map((item) => <option key={item.day} value={item.day}><LocalizedText text={"藏历"} /> {item.day} <LocalizedText text={"日"} /></option>)}</select>}</div>
    <MonthSummary data={data} />
    <div className="mt-5 flex flex-wrap gap-2 text-sm">{(["python", "matlab", "website"] as Source[]).map((source) => <span key={source} className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-3 py-2">{sourceLabel(source, locale)}</span>)}</div>
    <MonthHeaderTable data={data} visibility={visibility} />
    {day ? <DailyTable day={day} visibility={visibility} /> : <p className="mt-5 text-sm text-[#856444]"><LocalizedText text={"当前月份没有存在差异的日期。"} /></p>}
    {onlyDiffs && websiteAvailable && <p className="mt-3 text-xs text-[#856444]"><LocalizedText text={"已筛选：仅显示存在差异的"} /> {visibleDays.length} <LocalizedText text={"天。"} /></p>}
  </section>;
}

export default function FiveElementsComparePage() {
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("month");
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(3);
  const [startYear, setStartYear] = useState(2024);
  const [endYear, setEndYear] = useState(2025);
  const [monthData, setMonthData] = useState<MonthlyFiveElementsCompareResponse | null>(null);
  const [yearData, setYearData] = useState<YearlyFiveElementsCompareResponse | null>(null);
  const [rangeData, setRangeData] = useState<RangeData | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [onlyDiffs, setOnlyDiffs] = useState(false);
  const [visibility] = useState<Record<Source, boolean>>({ python: true, matlab: true, website: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyError, setYearlyError] = useState("");
  const [rangePageSize, setRangePageSize] = useState<RangePageSize>(10);
  const [rangePage, setRangePage] = useState(1);

  const rangePageCount = rangeData ? Math.max(1, Math.ceil(rangeData.years.length / rangePageSize)) : 1;
  const visibleRangeYears = rangeData?.years.slice((rangePage - 1) * rangePageSize, rangePage * rangePageSize) || [];
  const visibleYearMonths = yearData ? (onlyDiffs ? yearData.months.filter((item) => item.status === "difference") : yearData.months) : [];

  function changeMode(next: Mode) {
    setMode(next); setError(""); setYearlyError(""); setMonthData(null); setYearData(null); setRangeData(null); setRangePage(1);
  }

  async function run() {
    setBusy(true); setError("");
    try {
      if (mode === "month") { setMonthData(await fetchMonthlyFiveElementsCompare({ year, month })); setDayNumber(1); }
      else if (mode === "year") setYearData(await fetchYearlyFiveElementsCompare(year));
      else {
        setRangePage(1);
        setRangeData(await fetchRange(startYear, endYear));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "对照失败"); }
    finally { setBusy(false); }
  }

  async function openMonth(nextYear: number, nextMonth: number) {
    setMode("month"); setYear(nextYear); setMonth(nextMonth); setMonthData(null); setYearData(null); setRangeData(null); setError(""); setYearlyError(""); setBusy(true);
    try { setMonthData(await fetchMonthlyFiveElementsCompare({ year: nextYear, month: nextMonth })); setDayNumber(1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "月份对照失败"); }
    finally { setBusy(false); }
  }

  async function loadYearlyDifferences() {
    setYearlyLoading(true); setYearlyError("");
    try { setYearData(await fetchYearlyFiveElementsCompare(year)); }
    catch (cause) { setYearlyError(cause instanceof Error ? cause.message : "年度差异加载失败"); }
    finally { setYearlyLoading(false); }
  }

  return <main className="min-h-screen bg-[#eee2d0] px-4 py-8 text-[#382b1d] sm:px-10">
    <section className="mx-auto max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 shadow-sm sm:p-8">
      <p className="text-xs tracking-[0.3em] text-[#986639]"><LocalizedText text={"五要素对照工作台"} /></p>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-3 text-3xl font-semibold"><LocalizedText text={"五要素结果对照"} /></h1><p className="mt-3 leading-7"><LocalizedText text={"Python V3、MATLAB 最终脚本与参考网站三方结果逐项对照。"} /></p><p className="mt-1 text-sm text-[#856444]"><LocalizedText text={"V3 以公元1年藏历编号三月为积月0；内部仍使用1987配套计算基数。MATLAB 保留原编号，月头可能仍显示三方差异。"} /></p></div><LocaleLink href="/five-planets-compare" className="underline"><LocalizedText text={"五曜结果对照"} /></LocaleLink></div>
      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={appText(locale, "对照范围")}>{([["month", "单年单月"], ["year", "单年 12 个月"], ["range", "选定年份区间"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => changeMode(key)} className={"rounded-full border px-4 py-2 " + (mode === key ? "border-[#754927] bg-[#754927] text-white" : "border-[#d0b79c] bg-[#fff8ef]")}>{appText(locale, String(label))}</button>)}</div>
      <form className="mt-5 flex flex-wrap items-end gap-4" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        {mode !== "range" ? <label><LocalizedText text={"年份"} /><select aria-label={appText(locale, "年份")} className="ml-2 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={year} disabled={busy} onChange={(event) => setYear(Number(event.target.value))}>{YEARS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : <><label><LocalizedText text={"起始年份"} /><input aria-label={appText(locale, "起始年份")} className="ml-2 w-28 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" type="number" min="1" max="2500" value={startYear} disabled={busy} onChange={(event) => setStartYear(Number(event.target.value))} /></label><label><LocalizedText text={"结束年份"} /><input aria-label={appText(locale, "结束年份")} className="ml-2 w-28 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" type="number" min="1" max="2500" value={endYear} disabled={busy} onChange={(event) => setEndYear(Number(event.target.value))} /></label></>}
        {mode === "month" && <label><LocalizedText text={"月份"} /><select aria-label={appText(locale, "月份")} className="ml-2 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={month} disabled={busy} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        <button className="rounded bg-[#754927] px-5 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? "正在计算…" : "开始对照"}</button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#6d5440]">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2"><input type="checkbox" checked={onlyDiffs} onChange={(event) => setOnlyDiffs(event.target.checked)} /><LocalizedText text={"仅看存在差异的日期"} /></label>
        <button type="button" onClick={() => void loadYearlyDifferences()} disabled={yearlyLoading || busy} className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 transition hover:bg-[#f6eadc] disabled:cursor-wait disabled:opacity-60">{yearlyLoading ? "正在汇总年度差异..." : "查看年度差异月份"}</button>
      </div>
      {error && <p role="alert" className="mt-5 text-[#b52b25]">{error}</p>}
      {yearlyError && <p role="alert" className="mt-3 text-[#b52b25]"><LocalizedText text={"年度差异加载失败："} />{yearlyError}</p>}
    </section>

    {mode === "month" && monthData && <MonthDetail data={monthData} dayNumber={dayNumber} setDayNumber={setDayNumber} visibility={visibility} onlyDiffs={onlyDiffs} />}
    {yearData && <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold"><LocalizedText text={"公元"} /> {yearData.year} <LocalizedText text={"年 · 年度差异月份"} /></h2><p className="mt-2 text-sm text-[#856444]"><LocalizedText text={"共"} /> {yearData.differentMonths.length} <LocalizedText text={"个月存在已确认差异，点击月份查看逐日明细。"} /></p></div><span className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-3 py-2 text-sm"><LocalizedText text={"未对照"} /> {yearData.stats.unavailableMonthCount} <LocalizedText text={"月"} /></span></div>{visibleYearMonths.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visibleYearMonths.map((item) => <button key={item.month} type="button" disabled={busy} onClick={() => void openMonth(yearData.year, item.month)} className={"rounded-2xl border p-4 text-left disabled:opacity-60 " + statusClass(item.status)}><div className="flex justify-between font-semibold"><span>{item.month} <LocalizedText text={"月"} /></span><span>{appText(locale, statusText(item.status))}</span></div><p className="mt-2 text-sm"><LocalizedText text={"差异"} /> {item.differentDayCount} <LocalizedText text={"日 · 月头差异"} /> {item.differentSummaryCount} <LocalizedText text={"项"} /></p><p className="mt-1 text-xs">{appText(locale, item.websiteAvailable ? "网站已对照" : "网站未对照")}</p></button>)}</div> : <p className="mt-5 rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-5 text-sm text-[#856444]"><LocalizedText text={"当前年度没有存在差异的月份。"} /></p>}<p className="mt-4 text-xs text-[#856444]">{onlyDiffs ? `已筛选：仅显示有差异的 ${visibleYearMonths.length} 个月。` : "点击月份查看逐日明细。"}</p></section>}
    {mode === "range" && rangeData && <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-[#d0b79c] bg-[#f7eddf] p-5 sm:p-8"><h2 className="text-2xl font-semibold"><LocalizedText text={"公元"} /> {startYear}–{endYear} <LocalizedText text={"年区间汇总"} /></h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["比较月份", rangeData.stats.monthCount], ["一致月份", rangeData.stats.matchedMonths], ["差异月份", rangeData.stats.differentMonths], ["未对照月份", rangeData.stats.unavailableMonths], ["有差异日", rangeData.stats.differentDays]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><p className="text-sm text-[#806448]">{appText(locale, String(label))}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><label className="text-sm text-[#806448]"><LocalizedText text={"每页显示"} /><select aria-label={appText(locale, "每页显示年份数")} className="ml-2 rounded border border-[#d0b79c] bg-[#fff8ef] p-2" value={rangePageSize} onChange={(event) => { setRangePageSize(Number(event.target.value) as RangePageSize); setRangePage(1); }}><option value={10}><LocalizedText text={"10 年"} /></option><option value={20}><LocalizedText text={"20 年"} /></option></select></label><span className="text-sm text-[#806448]"><LocalizedText text={"第"} /> {rangePage} / {rangePageCount} <LocalizedText text={"页 · 共"} /> {rangeData.years.length} <LocalizedText text={"年"} /></span><div className="flex gap-2"><button type="button" className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={rangePage <= 1} onClick={() => setRangePage((page) => Math.max(1, page - 1))}><LocalizedText text={"上一页"} /></button><button type="button" className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={rangePage >= rangePageCount} onClick={() => setRangePage((page) => Math.min(rangePageCount, page + 1))}><LocalizedText text={"下一页"} /></button></div></div><div className="mt-5 space-y-4">{visibleRangeYears.map((item) => <details key={item.year} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><summary className="cursor-pointer font-semibold"><LocalizedText text={"公元"} /> {item.year} <LocalizedText text={"年"} /></summary><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{item.months.map((monthItem) => <button key={monthItem.month} type="button" onClick={() => void openMonth(item.year, monthItem.month)} className={"rounded-xl border p-3 text-left " + statusClass(monthItem.status)}><div className="flex justify-between text-sm font-medium"><span>{monthItem.month} <LocalizedText text={"月"} /></span><span>{statusText(monthItem.status)}</span></div><p className="mt-1 text-xs">{monthItem.differentDays.length ? "差异日 " + monthItem.differentDays.length : monthItem.reason || "逐日一致"}</p></button>)}</div></details>)}</div><p className="mt-4 text-xs text-[#856444]"><LocalizedText text={"区间模式按页显示年份，每页可选择10年或20年；点击月份可查看明细。"} /></p></section>}
  </main>;
}
