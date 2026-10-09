"use client";

import { useState } from "react";

import { SUPPORTED_CITIES, type SupportedCity } from "@/constants/cities";
import { fetchCalendarData } from "@/services/calendarApi";

export interface GregorianTibetanDatePickerProps {
  initialDate: string;
  initialCity: SupportedCity;
  tone?: "light" | "dark";
  onResolved: (value: {
    gregorianDate: string;
    city: SupportedCity;
    tibetan: { year: number; month: number; day: number; label: string };
  }) => void;
}

export default function GregorianTibetanDatePicker({
  initialDate,
  initialCity,
  tone = "light",
  onResolved,
}: GregorianTibetanDatePickerProps): React.JSX.Element {
  const [date, setDate] = useState(initialDate);
  const [city, setCity] = useState<SupportedCity>(initialCity);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDark = tone === "dark";
  const inputClass = isDark
    ? "calendar-date-input rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
    : "rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm text-[#2f2418]";

  const convert = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await fetchCalendarData({ date, cityName: city });
      const tibetan = data?.tibetanDate;
      if (!tibetan) throw new Error("该公历日期没有可用的藏历映射");
      onResolved({ gregorianDate: date, city, tibetan });
      setStatus(`已换算：${tibetan.label}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "换算失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`rounded-2xl border p-4 ${isDark ? "border-cyan-100/15 bg-slate-950/50 text-slate-100 backdrop-blur-md" : "border-[#d7c3ac] bg-[#fff8ef] text-[#2f2418]"}`}>
      <div>
        <p className={`text-xs tracking-[0.22em] ${isDark ? "text-cyan-300" : "text-[#8e6b47]"}`}>公历转藏历</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs"><span>公历年月日</span><input aria-label="公历年月日" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
          <label className="flex flex-col gap-1 text-xs"><span>地点</span><select aria-label="地点" value={city} onChange={(event) => setCity(event.target.value as SupportedCity)} className={inputClass}>{SUPPORTED_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => void convert()} disabled={loading || !date} className={isDark ? "rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50" : "rounded-md border border-[#8b6b49] bg-[#8b6b49] px-4 py-2 text-sm text-white transition hover:bg-[#765638] disabled:opacity-50"}>{loading ? "换算中…" : "换算"}</button>
        </div>
      </div>
      {status ? <p role="status" className={`mt-3 text-sm ${status.startsWith("已换算") ? (isDark ? "text-emerald-300" : "text-[#557047]") : "text-rose-500"}`}>{status}</p> : null}
    </section>
  );
}
