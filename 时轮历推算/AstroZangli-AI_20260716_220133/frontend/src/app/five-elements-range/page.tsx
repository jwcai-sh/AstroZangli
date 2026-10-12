"use client";

import LocalizedText from "@/i18n/LocalizedText";
import LocaleLink from "@/i18n/LocaleLink";
import { useEffect, useRef, useState } from "react";

type Day = { day: number; fields: string[]; python: Record<string, number[]>; website: Record<string, number[]> };
type Month = { month: number; status: "match" | "difference" | "unavailable"; reason: string; differentDays: number[]; days: Day[] };
type Year = { year: number; months: Month[] };
type RangeStats = {
  monthCount: number;
  matchedMonths: number;
  differentMonths: number;
  unavailableMonths: number;
  comparedDays: number;
  matchingDays: number;
  differentDays: number;
  fieldDifferenceCounts: Record<string, number>;
};
type RangeResponse = { years: Year[]; stats: RangeStats };
const fields = ["定曜", "月伴星宿", "定日", "会合"];
const YEARS_PER_PAGE = 50;
const labels = { match: "一致", difference: "有差异", unavailable: "未对照" };
const panel = "rounded-3xl border border-[#d5b99c] bg-[#f4e8d6] p-5 md:p-8";

async function request(start: number, end: number, signal: AbortSignal, month?: number): Promise<RangeResponse> {
  const query = new URLSearchParams({ start: String(start), end: String(end) });
  if (month !== undefined) query.set("month", String(month));
  const response = await fetch(`/api/five-elements/range-compare?${query}`, { signal });
  if (!response.ok) throw new Error(`对照请求失败（服务状态码 ${response.status}）`);
  const body = await response.json();
  if (!body.success) throw new Error(body.error?.message || "读取失败");
  return body.data;
}

export default function RangeCompare(): React.JSX.Element {
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("2500");
  const [years, setYears] = useState<Year[]>([]);
  const [stats, setStats] = useState<RangeStats | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [yearPage, setYearPage] = useState(0);
  const [detail, setDetail] = useState<{ year: number; month: Month } | null>(null);
  const scan = useRef<AbortController | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { scan.current?.abort(); detailRequest.current?.abort(); }, []);

  async function run() {
    const a = Number(start), b = Number(end);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > 2500 || a > b) {
      setMessage("请输入 1–2500 内的整数年份，且起始年不晚于结束年。"); return;
    }
    scan.current?.abort(); detailRequest.current?.abort();
    const controller = new AbortController(); scan.current = controller;
    setYears([]); setStats(null); setDetail(null); setYearPage(0); setRunning(true); setMessage("开始对照…");
    const totalStats: RangeStats = {
      monthCount: 0, matchedMonths: 0, differentMonths: 0, unavailableMonths: 0,
      comparedDays: 0, matchingDays: 0, differentDays: 0,
      fieldDifferenceCounts: Object.fromEntries(fields.map(field => [field, 0])),
    };
    try {
      for (let cursor = a; cursor <= b; cursor += 25) {
        const last = Math.min(cursor + 24, b);
        const batch = await request(cursor, last, controller.signal);
        if (controller.signal.aborted) return;
        setYears(previous => [...previous, ...batch.years]);
        for (const key of ["monthCount", "matchedMonths", "differentMonths", "unavailableMonths", "comparedDays", "matchingDays", "differentDays"] as const) {
          totalStats[key] += batch.stats[key];
        }
        for (const field of fields) {
          totalStats.fieldDifferenceCounts[field] += batch.stats.fieldDifferenceCounts[field] ?? 0;
        }
        setStats({ ...totalStats, fieldDifferenceCounts: { ...totalStats.fieldDifferenceCounts } });
        setMessage(`已检查 ${last - a + 1} / ${b - a + 1} 年（${a}–${last}）`);
      }
      setMessage(`对照完成：公元 ${a}–${b} 年。未对照月份不代表一致。`);
    } catch (error) {
      setMessage(controller.signal.aborted ? "已停止，保留已完成结果。" : `${error instanceof Error ? error.message : "加载失败"}；保留已完成结果，可重新开始。`);
    } finally { setRunning(false); }
  }

  async function openMonth(year: number, month: number) {
    detailRequest.current?.abort();
    const controller = new AbortController(); detailRequest.current = controller;
    setDetail(null);
    try {
      const result = await request(year, year, controller.signal, month);
      if (!controller.signal.aborted) setDetail({ year, month: result.years[0].months[0] });
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "明细加载失败");
    }
  }

  const months = years.flatMap(y => y.months);
  const different = stats?.differentMonths ?? months.filter(m => m.status === "difference").length;
  const missing = stats?.unavailableMonths ?? months.filter(m => m.status === "unavailable").length;
  const matched = stats?.matchedMonths ?? months.length - different - missing;
  const requestedMonths = (Number(end) - Number(start) + 1) * 12;
  const fieldComparisonCount = (stats?.comparedDays ?? 0) * fields.length;
  const fieldDifferenceCount = stats
    ? Object.values(stats.fieldDifferenceCounts).reduce((sum, count) => sum + count, 0)
    : 0;
  const matchingFieldCount = fieldComparisonCount - fieldDifferenceCount;
  const visible = years.filter(y => !onlyIssues || y.months.some(m => m.status !== "match"));
  const pageCount = Math.max(1, Math.ceil(visible.length / YEARS_PER_PAGE));
  const visiblePage = visible.slice(yearPage * YEARS_PER_PAGE, (yearPage + 1) * YEARS_PER_PAGE);
  return <main className="min-h-screen bg-[#0c0b09] px-4 py-8 text-[#392d20] md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <section className={panel}>
        <p className="text-xs tracking-[0.3em] text-[#946b44]"><LocalizedText text={"年份区间对照"} /></p>
        <h1 className="my-3 text-3xl font-semibold"><LocalizedText text={"Python / 参考网站 · 年份区间对照"} /></h1>
        <p><LocalizedText text={"公元 1–2500 年；按藏历月、日比较定曜、月伴星宿、定日、会合，不计月头与作用。"} /></p>
        <p className="mt-2 text-sm"><LocalizedText text={"Python v2：从 1987 年起连续累计积年。只读本地预计算及网站快照，不实时抓取；版本过期或数据缺失会标为未对照。"} /></p>
        <div className="my-5 flex flex-wrap items-end gap-4">
          <label><LocalizedText text={"起始年份"} /><input className="mt-1 block w-36 rounded-lg border p-2" type="number" min="1" max="2500" step="1" value={start} disabled={running} onChange={e => { setStart(e.target.value); setYears([]); setStats(null); setDetail(null); setYearPage(0); }} /></label>
          <label><LocalizedText text={"结束年份"} /><input className="mt-1 block w-36 rounded-lg border p-2" type="number" min="1" max="2500" step="1" value={end} disabled={running} onChange={e => { setEnd(e.target.value); setYears([]); setStats(null); setDetail(null); setYearPage(0); }} /></label>
          <button className="rounded-full bg-[#644629] px-5 py-3 text-white disabled:opacity-50" disabled={running} onClick={() => void run()}><LocalizedText text={"开始区间对照"} /></button>
          <button className="rounded-full border border-[#b99b7d] px-5 py-3 disabled:opacity-50" disabled={running} onClick={() => { setStart("1"); setEnd("2500"); setYears([]); setStats(null); setDetail(null); setYearPage(0); }}><LocalizedText text={"设为完整范围"} /></button>
          {running && <button className="rounded-full border px-5 py-3" onClick={() => scan.current?.abort()}><LocalizedText text={"停止"} /></button>}
          <LocaleLink className="underline" href="/five-elements-compare"><LocalizedText text={"返回三方对照页"} /></LocaleLink>
        </div>
        <p role="status" aria-live="polite">{message}</p>
      </section>
      {years.length > 0 && <section className={panel}>
        <h2 className="text-xl font-semibold"><LocalizedText text={"整体统计 · 已检查"} /> {stats?.monthCount ?? months.length} <LocalizedText text={"个月"} /></h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["覆盖月份", `${stats?.monthCount ?? months.length} / ${requestedMonths}`],
            ["一致月份", `${matched}`],
            ["差异月份", `${different}`],
            ["未对照月份", `${missing}`],
            ["已比较日数", `${stats?.comparedDays ?? 0}`],
            ["完全一致日", `${stats?.matchingDays ?? 0}`],
            ["有差异日", `${stats?.differentDays ?? months.reduce((n, m) => n + m.differentDays.length, 0)}`],
            ["一致字段数", `${matchingFieldCount} / ${fieldComparisonCount}`],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#d5b99c] bg-[#fff9f0] p-4"><p className="text-sm text-[#806448]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
        </div>
        {stats && <div className="mt-5 overflow-x-auto">
          <h3 className="mb-2 font-semibold"><LocalizedText text={"逐日字段差异"} /></h3>
          <table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-[#d5b99c]"><th className="p-2"><LocalizedText text={"字段"} /></th><th className="p-2"><LocalizedText text={"差异日数"} /></th><th className="p-2"><LocalizedText text={"该字段差异率"} /></th></tr></thead><tbody>
            {fields.map(field => {
              const count = stats.fieldDifferenceCounts[field] ?? 0;
              const denominator = stats.comparedDays;
              return <tr key={field} className="border-b border-[#e5d5c2]"><td className="p-2 font-medium">{field}</td><td className="p-2">{count}</td><td className="p-2">{denominator ? `${(count / denominator * 100).toFixed(3)}%（${count} / ${denominator} 日）` : "—"}</td></tr>;
            })}
          </tbody></table>
        </div>}
        <p className="my-3 text-sm"><LocalizedText text={"月一致表示该月四项逐日字段全一致；未对照月份不计入一致率。点击月份查看逐字段数值。"} /></p>
        <label><input type="checkbox" checked={onlyIssues} onChange={e => { setOnlyIssues(e.target.checked); setYearPage(0); }} /> <LocalizedText text={"仅显示有差异或未对照的年份"} /></label>
        {visible.length === 0 && <p className="mt-4"><LocalizedText text={"已检查范围内没有差异或缺失月份。"} /></p>}
        <div className="mt-4 max-h-[36rem] space-y-3 overflow-auto">
          {visiblePage.map(y => <details key={y.year} className="rounded-xl border border-[#d5b99c] p-3">
            <summary className="cursor-pointer font-semibold"><LocalizedText text={"公元"} /> {y.year} <LocalizedText text={"年 · 差异"} /> {y.months.filter(m => m.status === "difference").length} <LocalizedText text={"月 · 未对照"} /> {y.months.filter(m => m.status === "unavailable").length} <LocalizedText text={"月"} /></summary>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{y.months.map(m => <button key={m.month} onClick={() => void openMonth(y.year, m.month)} className={`rounded-xl border p-3 text-left ${m.status === "difference" ? "border-red-400 bg-red-50" : m.status === "unavailable" ? "border-amber-500 bg-amber-50" : "border-[#acbda1]"}`}>
              {m.month} <LocalizedText text={"月 ·"} /> {labels[m.status]}<span className="mt-1 block text-sm">{m.reason || `${m.differentDays.length} 个差异日`}</span>
            </button>)}</div>
          </details>)}
        </div>
        {visible.length > YEARS_PER_PAGE && <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button className="rounded-full border border-[#b99b7d] px-4 py-2 disabled:opacity-40" disabled={yearPage === 0} onClick={() => setYearPage(page => Math.max(0, page - 1))}><LocalizedText text={"上一页"} /></button>
          <span><LocalizedText text={"年份明细"} /> {yearPage * YEARS_PER_PAGE + 1}–{Math.min((yearPage + 1) * YEARS_PER_PAGE, visible.length)} / {visible.length}<LocalizedText text={"（每页"} /> {YEARS_PER_PAGE} <LocalizedText text={"年）"} /></span>
          <button className="rounded-full border border-[#b99b7d] px-4 py-2 disabled:opacity-40" disabled={yearPage + 1 >= pageCount} onClick={() => setYearPage(page => Math.min(pageCount - 1, page + 1))}><LocalizedText text={"下一页"} /></button>
        </div>}
      </section>}
      {detail && <section className={panel}>
        <h2 className="text-xl font-semibold"><LocalizedText text={"公元"} /> {detail.year} <LocalizedText text={"年 · 藏历"} /> {detail.month.month} <LocalizedText text={"月"} /></h2>
        <p className="my-3">{detail.month.reason || (detail.month.differentDays.length ? `差异日期：${detail.month.differentDays.join("、")}` : "30 日四项共同字段全部一致。")}</p>
        {detail.month.days.filter(d => d.fields.length > 0).map(d => <div key={d.day} className="my-4 overflow-x-auto">
          <h3 className="font-semibold"><LocalizedText text={"藏历"} /> {d.day} <LocalizedText text={"日"} /></h3>
          <table className="w-full text-left text-sm"><thead><tr><th className="p-2"><LocalizedText text={"字段"} /></th><th>Python</th><th><LocalizedText text={"参考网站"} /></th></tr></thead><tbody>
            {Object.keys(d.python).map(k => <tr key={k} className={d.fields.includes(k) ? "bg-red-50 text-red-800" : ""}><td className="p-2">{k}</td>{(["python", "website"] as const).map(source => <td key={source} className="whitespace-nowrap pr-4">{d[source][k].map((v, i) => <span key={i} className={v !== d[source === "python" ? "website" : "python"][k][i] ? "font-bold underline" : ""}>{i > 0 ? " / " : ""}{v}</span>)}</td>)}</tr>)}
          </tbody></table>
        </div>)}
      </section>}
    </div>
  </main>;
}
