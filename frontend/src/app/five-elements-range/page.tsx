"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Day = { day: number; fields: string[]; python: Record<string, number[]>; website: Record<string, number[]> };
type Month = { month: number; status: "match" | "difference" | "unavailable"; reason: string; differentDays: number[]; days: Day[] };
type Year = { year: number; months: Month[] };
const labels = { match: "一致", difference: "有差异", unavailable: "未对照" };
const panel = "rounded-3xl border border-[#d5b99c] bg-[#f4e8d6] p-5 md:p-8";

async function request(start: number, end: number, signal: AbortSignal, month?: number): Promise<Year[]> {
  const query = new URLSearchParams({ start: String(start), end: String(end) });
  if (month !== undefined) query.set("month", String(month));
  const response = await fetch(`/api/five-elements/range-compare?${query}`, { signal });
  if (!response.ok) throw new Error(`对照请求失败（HTTP ${response.status}）`);
  const body = await response.json();
  if (!body.success) throw new Error(body.error?.message || "读取失败");
  return body.data.years;
}

export default function RangeCompare(): React.JSX.Element {
  const [start, setStart] = useState("2020");
  const [end, setEnd] = useState("2035");
  const [years, setYears] = useState<Year[]>([]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(true);
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
    setYears([]); setDetail(null); setRunning(true); setMessage("开始对照…");
    try {
      for (let cursor = a; cursor <= b; cursor += 25) {
        const last = Math.min(cursor + 24, b);
        const batch = await request(cursor, last, controller.signal);
        if (controller.signal.aborted) return;
        setYears(previous => [...previous, ...batch]);
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
      if (!controller.signal.aborted) setDetail({ year, month: result[0].months[0] });
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "明细加载失败");
    }
  }

  const months = years.flatMap(y => y.months);
  const different = months.filter(m => m.status === "difference").length;
  const missing = months.filter(m => m.status === "unavailable").length;
  const visible = years.filter(y => !onlyIssues || y.months.some(m => m.status !== "match"));
  return <main className="min-h-screen bg-[#0c0b09] px-4 py-8 text-[#392d20] md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <section className={panel}>
        <p className="text-xs tracking-[0.3em] text-[#946b44]">YEAR RANGE COMPARISON</p>
        <h1 className="my-3 text-3xl font-semibold">Python / 参考网站 · 年份区间对照</h1>
        <p>公元 1–2500 年；按藏历月、日比较定曜、月伴星宿、定日、会合，不计月头与作用。</p>
        <p className="mt-2 text-sm">Python：shilun_calendar_months12_compare_final.py。只读本地预计算及网站快照，不实时抓取；版本过期或数据缺失会标为未对照。</p>
        <div className="my-5 flex flex-wrap items-end gap-4">
          <label>起始年份<input className="mt-1 block w-36 rounded-lg border p-2" type="number" min="1" max="2500" step="1" value={start} disabled={running} onChange={e => setStart(e.target.value)} /></label>
          <label>结束年份<input className="mt-1 block w-36 rounded-lg border p-2" type="number" min="1" max="2500" step="1" value={end} disabled={running} onChange={e => setEnd(e.target.value)} /></label>
          <button className="rounded-full bg-[#644629] px-5 py-3 text-white disabled:opacity-50" disabled={running} onClick={() => void run()}>开始区间对照</button>
          {running && <button className="rounded-full border px-5 py-3" onClick={() => scan.current?.abort()}>停止</button>}
          <Link className="underline" href="/five-elements-compare">返回三方对照页</Link>
        </div>
        <p role="status" aria-live="polite">{message}</p>
      </section>
      {years.length > 0 && <section className={panel}>
        <h2 className="text-xl font-semibold">已检查 {months.length} 个月：一致 {months.length - different - missing}，差异 {different}，未对照 {missing}</h2>
        <p className="my-3">差异日期共 {months.reduce((n, m) => n + m.differentDays.length, 0)} 天。点击月份查看逐字段数值。</p>
        <label><input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} /> 仅显示有差异或未对照的年份</label>
        {visible.length === 0 && <p className="mt-4">已检查范围内没有差异或缺失月份。</p>}
        <div className="mt-4 max-h-[36rem] space-y-3 overflow-auto">
          {visible.map(y => <details key={y.year} className="rounded-xl border border-[#d5b99c] p-3">
            <summary className="cursor-pointer font-semibold">公元 {y.year} 年 · 差异 {y.months.filter(m => m.status === "difference").length} 月 · 未对照 {y.months.filter(m => m.status === "unavailable").length} 月</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{y.months.map(m => <button key={m.month} onClick={() => void openMonth(y.year, m.month)} className={`rounded-xl border p-3 text-left ${m.status === "difference" ? "border-red-400 bg-red-50" : m.status === "unavailable" ? "border-amber-500 bg-amber-50" : "border-[#acbda1]"}`}>
              {m.month} 月 · {labels[m.status]}<span className="mt-1 block text-sm">{m.reason || `${m.differentDays.length} 个差异日`}</span>
            </button>)}</div>
          </details>)}
        </div>
      </section>}
      {detail && <section className={panel}>
        <h2 className="text-xl font-semibold">公元 {detail.year} 年 · 藏历 {detail.month.month} 月</h2>
        <p className="my-3">{detail.month.reason || (detail.month.differentDays.length ? `差异日期：${detail.month.differentDays.join("、")}` : "30 日四项共同字段全部一致。")}</p>
        {detail.month.days.filter(d => d.fields.length > 0).map(d => <div key={d.day} className="my-4 overflow-x-auto">
          <h3 className="font-semibold">藏历 {d.day} 日</h3>
          <table className="w-full text-left text-sm"><thead><tr><th className="p-2">字段</th><th>Python</th><th>参考网站</th></tr></thead><tbody>
            {Object.keys(d.python).map(k => <tr key={k} className={d.fields.includes(k) ? "bg-red-50 text-red-800" : ""}><td className="p-2">{k}</td>{(["python", "website"] as const).map(source => <td key={source} className="whitespace-nowrap pr-4">{d[source][k].map((v, i) => <span key={i} className={v !== d[source === "python" ? "website" : "python"][k][i] ? "font-bold underline" : ""}>{i > 0 ? " / " : ""}{v}</span>)}</td>)}</tr>)}
          </tbody></table>
        </div>)}
      </section>}
    </div>
  </main>;
}
