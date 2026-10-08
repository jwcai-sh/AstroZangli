"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import GregorianTibetanDatePicker from "@/components/seven-stars/GregorianTibetanDatePicker";
import { SUPPORTED_CITIES, type SupportedCity } from "@/constants/cities";
import FivePlanetsCompare from "@/app/five-planets-compare/page";
import { buildBasicDataHref } from "@/features/earth/navigation";

type QueryMode = "monthly" | "daily";
type Value = number | null;
type DailyStatus = "match" | "different" | "missing" | "unavailable";
type CompareRow = {
  planet: string;
  field: string;
  python: Value[];
  website: Value[] | null;
  status: "match" | "different" | "missing";
};
type CompareDayResult = {
  day: number;
  status: DailyStatus;
  counts: { match: number; different: number; missing: number };
  rows: CompareRow[];
};
type MonthlyResult = {
  year: number;
  month: number;
  days: CompareDayResult[];
  stats: {
    expectedDays: number;
    comparedDays: number;
    matchingDays: number;
    differentDays: number;
    missingDays: number;
    differentFieldCount: number;
  };
};
type QueryColumn = { label: string; values: Value[] };
type QuerySection = { name: string; columns: QueryColumn[] };
type DailyQueryResult = {
  year: number;
  month: number;
  day: number;
  label: string;
  summary: Record<string, Value[]>;
  sections: QuerySection[];
  sourceUrl: string;
  available: boolean;
  error: string;
};

const YEARS = Array.from({ length: 2500 }, (_, index) => index + 1);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const DAYS = Array.from({ length: 30 }, (_, index) => index + 1);
const SUMMARY_FIELDS = ["积月闰余", "曜基数", "整零数", "太阳基数"];

function valuesText(values: Value[] | undefined): string {
  if (!values || values.length === 0) return "—";
  return values.map((value) => value ?? "—").join(" / ");
}

function ValueList({ values }: { values: Value[] | undefined }): React.JSX.Element {
  if (!values || values.length === 0) return <span>—</span>;
  return (
    <span className="space-y-1 font-mono">
      {values.map((value, index) => <span className="block" key={`${value}-${index}`}>{value ?? "—"}</span>)}
    </span>
  );
}

async function fetchDaily(year: number, month: number, day: number): Promise<DailyQueryResult> {
  const response = await fetch("/api/five-planets/daily-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month, day }),
  });
  const payload = await response.json() as { success: boolean; data?: DailyQueryResult; error?: string };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload.data;
}

async function fetchMonthly(year: number, month: number): Promise<MonthlyResult> {
  const response = await fetch("/api/five-planets/monthly-compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month }),
  });
  const payload = await response.json() as { success: boolean; data?: MonthlyResult; error?: string };
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload.data;
}

function QuerySummary({ stats }: { stats: MonthlyResult["stats"] }): React.JSX.Element {
  const cards = [
    ["月份天数", stats.expectedDays],
    ["参考数据日", stats.comparedDays],
    ["未找到数据日", stats.missingDays],
  ] as const;
  return <div className="grid gap-3 sm:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4 text-center"><p className="text-sm text-[#806448]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}</div>;
}

function DailyQueryTable({ daily }: { daily: DailyQueryResult }): React.JSX.Element {
  const common = daily.sections.find((section) => section.name === "五曜公积日");
  const groups = daily.sections.filter((section) => section.name !== "五曜公积日");

  if (!daily.available) {
    return <section className="mt-5 rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-8 text-amber-900">参考网站没有缓存公元 {daily.year} 年藏历 {daily.month} 月 {daily.day} 日的数据。</section>;
  }

  return <section className="mt-5 rounded-[24px] border border-[#d3c1af] bg-[#f2e7d7]/70 px-3 pb-7 pt-5 sm:px-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-xl font-semibold">{daily.label || `公元${daily.year}年藏历${daily.month}月${daily.day}日`}</h3>
        <p className="mt-2 text-sm text-[#856444]">以下内容来自参考网站的每日五曜值页面。</p>
      </div>
      {daily.sourceUrl && <a href={daily.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#d0b79c] bg-[#fff9f0] px-3 py-2 text-sm text-[#5c4631] hover:bg-[#f6eadc]">打开参考网站原页</a>}
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SUMMARY_FIELDS.map((field) => <div key={field} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4 text-center"><p className="text-sm text-[#806448]">{field}</p><p className="mt-3 text-lg"><ValueList values={daily.summary[field]} /></p></div>)}
    </div>

    {common && <div className="mt-5 rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4 text-center"><p className="text-sm text-[#806448]">五曜公积日</p><p className="mt-2 text-lg"><ValueList values={common.columns[0]?.values} /></p></div>}

    {groups.map((section) => <section key={section.name} className="mt-6"><h4 className="text-base font-semibold">{section.name}</h4><div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">{section.columns.map((column) => <div key={`${section.name}-${column.label}`} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4 text-center"><p className="text-sm font-medium text-[#806448]">{column.label}</p><p className="mt-3 text-base"><ValueList values={column.values} /></p></div>)}</div></section>)}
  </section>;
}

function FivePlanetsQuery(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = Number(searchParams.get("year"));
  const monthParam = Number(searchParams.get("month"));
  const dayParam = Number(searchParams.get("day"));
  const dateParam = searchParams.get("gdate") || "2024-04-09";
  const cityParam = searchParams.get("city");
  const initialCity: SupportedCity = SUPPORTED_CITIES.includes(cityParam as SupportedCity)
    ? cityParam as SupportedCity
    : "上海市";
  const [queryMode, setQueryMode] = useState<QueryMode>(searchParams.get("mode") === "daily" ? "daily" : "monthly");
  const [year, setYear] = useState(Number.isInteger(yearParam) && yearParam >= 1 && yearParam <= 2500 ? yearParam : 2024);
  const [month, setMonth] = useState(Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : 3);
  const [day, setDay] = useState(Number.isInteger(dayParam) && dayParam >= 1 && dayParam <= 30 ? dayParam : 1);
  const [monthly, setMonthly] = useState<MonthlyResult | null>(null);
  const [daily, setDaily] = useState<DailyQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dailyResultRef = useRef<HTMLElement | null>(null);
  const scrollToDailyResultRef = useRef(false);
  const initialQuery = useRef({ year, month, day, queryMode });

  useEffect(() => {
    if (daily && scrollToDailyResultRef.current) {
      scrollToDailyResultRef.current = false;
      dailyResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [daily]);

  const queryDailyDate = useCallback(async function queryDailyDate(
    targetYear: number,
    targetMonth: number,
    targetDay: number,
    clearMonthly: boolean,
    scrollToResult = false,
    syncRoute = false,
  ): Promise<void> {
    if (syncRoute) {
      const query = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries({ year: targetYear, month: targetMonth, day: targetDay })) query.set(key, String(value));
      router.replace(buildBasicDataHref("five-planets", query), { scroll: false });
    }
    setLoading(true);
    setError("");
    setDaily(null);
    scrollToDailyResultRef.current = scrollToResult;
    if (clearMonthly) setMonthly(null);
    try {
      setDaily(await fetchDaily(targetYear, targetMonth, targetDay));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "五曜查询失败"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    const initial = initialQuery.current;
    if (initial.queryMode === "daily") void queryDailyDate(initial.year, initial.month, initial.day, true);
  }, [queryDailyDate]);

  async function query(): Promise<void> {
    if (queryMode === "daily") {
      await queryDailyDate(year, month, day, true, false, true);
      return;
    }
    setLoading(true); setError("");
    try { setMonthly(await fetchMonthly(year, month)); setDaily(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "五曜查询失败"); }
    finally { setLoading(false); }
  }

  async function queryDay(targetDay: number): Promise<void> {
    setDay(targetDay);
    setQueryMode("daily");
    await queryDailyDate(year, month, targetDay, false, true, true);
  }

  const dayCards = useMemo(() => monthly?.days ?? [], [monthly]);

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 pb-2">
    <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f6ecde_0%,#efe1cf_100%)] px-4 py-5 text-[#2f2418] shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:px-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.35em] text-[#8e6b47]">Earth / Astronomical Calendar Data</p><h2 className="mt-3 text-2xl font-semibold tracking-wide sm:text-3xl">五曜值</h2><p className="mt-3 text-sm leading-6 text-[#5f4a35] sm:text-base">按藏历年、月、日查询五曜值；参考网站的逐项对照保留在“参考网站对照”页面。</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setQueryMode("monthly")} className={`rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50 ${queryMode === "monthly" ? "border-[#8b6b49] bg-[#8b6b49] text-white" : "border-[#d0b79c] bg-[#fff8ef] text-[#5c4631]"}`}>月度查询</button><button type="button" onClick={() => setQueryMode("daily")} className={`rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50 ${queryMode === "daily" ? "border-[#8b6b49] bg-[#8b6b49] text-white" : "border-[#d0b79c] bg-[#fff8ef] text-[#5c4631]"}`}>每日查询</button><Link href="/earth?tab=five-elements&data=five-planets&view=compare" className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 text-sm text-[#5c4631] outline-none hover:bg-[#f6eadc] focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50">参考网站对照</Link></div></div></section>
    <GregorianTibetanDatePicker
      initialDate={/^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : "2024-04-09"}
      initialCity={initialCity}
      onResolved={({ gregorianDate, city, tibetan }) => {
        setYear(tibetan.year);
        setMonth(tibetan.month);
        setDay(tibetan.day);
        setQueryMode("daily");
        const url = new URL(window.location.href);
        url.searchParams.set("year", String(tibetan.year));
        url.searchParams.set("month", String(tibetan.month));
        url.searchParams.set("day", String(tibetan.day));
        url.searchParams.set("mode", "daily");
        url.searchParams.set("gdate", gregorianDate);
        url.searchParams.set("city", city);
        router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
        void queryDailyDate(tibetan.year, tibetan.month, tibetan.day, true);
      }}
    />
    <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f9f1e6_0%,#f1e4d5_100%)] px-4 py-5 text-[#2f2418] shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:px-6"><div className="flex flex-wrap items-end gap-4"><label className="flex items-center gap-2"><span className="text-sm">藏历年</span><select aria-label="藏历年" value={year} onChange={(event) => setYear(Number(event.target.value))} className="min-w-[110px] rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm">{YEARS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="flex items-center gap-2"><span className="text-sm">藏历月</span><select aria-label="藏历月" value={month} onChange={(event) => setMonth(Number(event.target.value))} className="min-w-[90px] rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm">{MONTHS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{queryMode === "daily" && <label className="flex items-center gap-2"><span className="text-sm">藏历日</span><select aria-label="藏历日" value={day} onChange={(event) => setDay(Number(event.target.value))} className="min-w-[90px] rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm">{DAYS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}<button type="button" onClick={() => void query()} disabled={loading} className="rounded-md bg-[#8b6b49] px-5 py-2 text-sm text-white outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50">{loading ? "正在查询…" : "开始查询"}</button></div>{error && <p role="alert" className="mt-4 text-sm text-[#b34d3e]">{error}</p>}</section>
    {monthly && <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f9f1e6_0%,#f1e4d5_100%)] px-4 py-5 text-[#2f2418] shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:px-6"><h3 className="text-2xl font-semibold">公元 {monthly.year} 年藏历 {monthly.month} 月 · 五曜查询</h3><p className="mt-2 text-sm text-[#856444]">以下卡片显示参考网站缓存的五曜公积日，不展示 Python 对照状态。</p><div className="mt-5"><QuerySummary stats={monthly.stats} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dayCards.map((item) => { const common = item.rows.find((row) => row.field === "五曜公积日"); return <button key={item.day} type="button" onClick={() => void queryDay(item.day)} disabled={loading} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4 text-center transition hover:-translate-y-0.5 outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50"><div className="font-semibold"><span>{item.day} 日</span></div><p className="mt-2 text-xs text-[#806448]">五曜公积日</p><p className="mt-1 font-mono text-sm">{valuesText(common?.website ?? undefined)}</p></button>; })}</div></section>}
    {daily && <section ref={dailyResultRef} className="scroll-mt-6 rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f9f1e6_0%,#f1e4d5_100%)] px-4 py-5 text-[#2f2418] shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl font-semibold">五曜每日查询</h3><button type="button" onClick={() => { setDaily(null); setQueryMode("monthly"); }} className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 text-sm text-[#5c4631] outline-none focus-visible:ring-2 focus-visible:ring-[#8b6b49]/50">返回月度查询</button></div><DailyQueryTable daily={daily} /></section>}
  </div>;
}

export default function FivePlanetsSubtab(): React.JSX.Element {
  const searchParams = useSearchParams();
  return searchParams.get("view") === "compare" ? <FivePlanetsCompare /> : <FivePlanetsQuery />;
}
