"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateEventsCard, MoonPhaseCard, PlanetaryChartCard, CalendarBox } from "@/components";
import AstrologicalTableCard, { type AstrologicalRow } from "@/components/widgets/AstrologicalTableCard";
import WidgetCarousel from "@/components/widgets/WidgetCarousel";
import FooterBar from "@/components/FooterBar";
import { fetchCalendarData } from "@/services/calendarApi";
import { SUPPORTED_CITIES } from "@/constants/cities";

const DEFAULT_CITY = "上海市";

type HolidayInfo = { name: string; date: string; isoDate?: string; daysLeft: number };
type FestivalKind = "solar" | "lunar" | "tibetan";
type FestivalPrediction =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: HolidayInfo }
  | { status: "empty" }
  | { status: "error"; message?: string };

function formatDaysLeftText(daysLeft?: number): string {
  if (typeof daysLeft !== "number" || !Number.isFinite(daysLeft)) return "";
  const d = Math.max(0, Math.floor(daysLeft));
  return d === 0 ? "今天" : `还剩${d}天`;
}

function normalizeHolidayInfo(input: unknown): HolidayInfo | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  if (typeof obj.name !== "string" || typeof obj.date !== "string") return null;
  const daysLeft = Number(obj.daysLeft);
  if (!Number.isFinite(daysLeft)) return null;
  const isoDate = typeof obj.isoDate === "string" ? obj.isoDate : undefined;
  return { name: obj.name, date: obj.date, isoDate, daysLeft: Math.max(0, Math.floor(daysLeft)) };
}




export default function CalendarPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [city, setCity] = useState(DEFAULT_CITY);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [year, setYear] = useState<number>(1970);
  const [month, setMonth] = useState<number>(0); // 0-11
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<Awaited<ReturnType<typeof fetchCalendarData>> | null>(null);
  const [stars, setStars] = useState<Array<{ left: number; top: number; opacity: number }>>([]);
  const [festivalPredictions, setFestivalPredictions] = useState<Record<FestivalKind, FestivalPrediction>>({
    solar: { status: "idle" },
    lunar: { status: "idle" },
    tibetan: { status: "idle" }
  });
  const festivalRequestSeq = useRef(0);
  

  // 在客户端生成星星位置，避免 hydration mismatch
  useEffect(() => {
    setStars(
      [...Array(160)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: 0.95,
      }))
    );
  }, []);

  const currentMonthLabel = useMemo(() => {
    if (!ready) return "";
    const d = new Date(year, month, 1);
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
  }, [ready, year, month]);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const startOffset = useMemo(() => {
    const first = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
    return first;
  }, [year, month]);

  const selectedDateStr = useMemo(() => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(selectedDay).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }, [year, month, selectedDay]);


  const loadFestivalPredictions = (dateStr: string) => {
    const parts = dateStr.split("-").map((v) => Number(v));
    const [y, m, d] = parts;
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;

    const requestId = ++festivalRequestSeq.current;
    setFestivalPredictions({
      solar: { status: "loading" },
      lunar: { status: "loading" },
      tibetan: { status: "loading" }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const post = async (url: string): Promise<HolidayInfo | null> => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: y, month: m, day: d }),
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      return normalizeHolidayInfo(json);
    };

    Promise.allSettled([
      post("/api/lunar-festival"),
      post("/api/lunar-holiday"),
      post("/api/tibetan-holiday")
    ])
      .then(([solarRes, lunarRes, tibetanRes]) => {
        if (festivalRequestSeq.current !== requestId) return;
        const mapResult = (r: PromiseSettledResult<HolidayInfo | null>): FestivalPrediction => {
          if (r.status === "rejected") return { status: "error", message: r.reason instanceof Error ? r.reason.message : undefined };
          if (!r.value) return { status: "empty" };
          if (!r.value.name.trim()) return { status: "empty" };
          return { status: "success", data: r.value };
        };

        setFestivalPredictions({
          solar: mapResult(solarRes),
          lunar: mapResult(lunarRes),
          tibetan: mapResult(tibetanRes)
        });
      })
      .catch((e) => {
        if (festivalRequestSeq.current !== requestId) return;
        setFestivalPredictions({
          solar: { status: "error", message: e instanceof Error ? e.message : undefined },
          lunar: { status: "error", message: e instanceof Error ? e.message : undefined },
          tibetan: { status: "error", message: e instanceof Error ? e.message : undefined }
        });
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  };


  const loadData = async (date?: string, cityName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarData({ date, cityName });
      setCalendarData(data || null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "加载失败";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // 处理城市选择 - 坐标由后端自动处理
  const handleCityChange = (selectedCity: string) => {
    setCity(selectedCity);
    setIsCityOpen(false);
    loadData(selectedDateStr, selectedCity);
  };

  const handlePrevMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    // 调整选中日不超过当月最大日
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const newDay = Math.min(selectedDay, dim);
    setSelectedDay(newDay);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(newDay).padStart(2, "0");
    const dateStr = `${d.getFullYear()}-${mm}-${dd}`;
    loadData(dateStr, city);
    loadFestivalPredictions(dateStr);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const newDay = Math.min(selectedDay, dim);
    setSelectedDay(newDay);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(newDay).padStart(2, "0");
    const dateStr = `${d.getFullYear()}-${mm}-${dd}`;
    loadData(dateStr, city);
    loadFestivalPredictions(dateStr);
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${year}-${mm}-${dd}`;
    loadData(dateStr, city);
    loadFestivalPredictions(dateStr);
  };

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    setYear(y);
    setMonth(m);
    setSelectedDay(d);
    setReady(true);

    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const dateStr = `${y}-${mm}-${dd}`;
    loadData(dateStr, DEFAULT_CITY);
    loadFestivalPredictions(dateStr);
  }, []);

  const buildFestivalEvent = (kind: FestivalKind, fallback?: HolidayInfo) => {
    const prediction = festivalPredictions[kind];
    if (prediction.status === "loading") {
      return { label: "节日预测加载中...", colorClass: "bg-gray-500", daysLeftText: "" };
    }
    if (prediction.status === "error") {
      return { label: "节日预测暂不可用", colorClass: "bg-gray-500", daysLeftText: "" };
    }
    if (prediction.status === "empty") {
      return { label: "暂无节日", colorClass: "bg-gray-500", daysLeftText: "" };
    }
    const holiday =
      prediction.status === "success"
        ? prediction.data
        : fallback;

    if (!holiday?.name) {
      return { label: "暂无节日", colorClass: "bg-gray-500", daysLeftText: "" };
    }
    return {
      label: `${holiday.name} ${holiday.date}`,
      colorClass: "bg-gray-500",
      daysLeftText: formatDaysLeftText(holiday.daysLeft)
    };
  };

  const items = [
    <DateEventsCard
      key="date"
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={4}
      header={{
        title: calendarData?.dateEvents?.lunarInfo?.fullDate || "",
        subtitle: calendarData?.dateEvents?.solarInfo?.fullDate || ""
      }}
      counters={[
        { label: "农", value: calendarData?.dateEvents?.lunarInfo?.fullDate || "", colorClass: "bg-blue-400" },
        { label: "公", value: calendarData?.dateEvents?.solarInfo?.fullDate || "", colorClass: "bg-purple-500" },
        { label: "藏", value: calendarData?.dateEvents?.tibetanInfo?.fullDate || "", colorClass: "bg-pink-400" }
      ]}
      events={[
        buildFestivalEvent("solar", calendarData?.dateEvents?.events?.solarHoliday),
        buildFestivalEvent("lunar", calendarData?.dateEvents?.events?.lunarHoliday),
        buildFestivalEvent("tibetan", calendarData?.dateEvents?.events?.tibetanHoliday)
      ]}
    />,
    <AstrologicalTableCard
      key="astro"
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={4}
      header={{
        title: calendarData?.astrologicalTable?.tibetanDate || "",
        subtitle: "Astrological Data"
      }}
      rows={calendarData?.astrologicalTable?.tableData as AstrologicalRow[] || []}
    />,
    <MoonPhaseCard
      key="moon"
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={4}
      header={{ title: calendarData?.moonPhase?.lunarDate || "", subtitle: "Moon Phase" }}
      timeLabel={calendarData?.moonPhase?.observationTime || ""}
      illumination={calendarData?.moonPhase?.illumination}
      culminationText={`中天 ${calendarData?.moonPhase?.culminationTime || ""}`}
      moonRise={calendarData?.moonPhase?.moonriseTime || ""}
      moonSet={calendarData?.moonPhase?.moonsetTime || ""}
      lunarDay={calendarData?.moonPhase?.lunar_day}
    />,
    <PlanetaryChartCard
      key="planet"
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={4}
      solarDate={calendarData?.planetaryChart?.solarDate || ""}
      label={calendarData?.planetaryChart?.constellation || ""}
      leftTime={calendarData?.planetaryChart?.riseTime || ""}
      rightTime={calendarData?.planetaryChart?.setTime || ""}
    />
  ];

  return (
    <div className="text-white min-h-screen flex flex-col starfield-bg">
      <div className="fixed inset-0 starfield-bg">
        <div className="absolute inset-0 opacity-80">
          {stars.map((star, i) => {
            const sizeClass = i % 11 === 0 ? "star--lg" : i % 3 === 0 ? "star--md" : "star--sm";
            const toneClass = i % 7 === 0 ? "star--warm" : i % 5 === 0 ? "star--cold" : "star--neutral";
            return (
              <div
                key={i}
                className={`absolute rounded-full star ${sizeClass} ${toneClass}`}
                style={{ left: `${star.left}%`, top: `${star.top}%`, opacity: star.opacity }}
              />
            );
          })}
        </div>
      </div>

      {/* 主内容区域 - 可滚动布局 */}
      <div className="relative z-10 min-h-screen flex flex-col pb-20">
        <div className="flex flex-col p-4">
          {/* 城市选择器 */}
          <div className="flex justify-center items-center py-2 relative mt-8">{/*"上海市"距离顶部距离*/}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg hover:bg-gray-700/70 transition-colors cursor-pointer"
                onClick={() => setIsCityOpen((v) => !v)}
              >
                <span className="text-lg font-medium">{city}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  className="text-gray-300"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isCityOpen && (
                <div className="absolute left-0 right-0 mt-2 w-48 bg-gray-900/90 border border-gray-700 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {SUPPORTED_CITIES.map((c) => (
                    <button
                      key={c}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700/70 ${c === city ? "text-white bg-gray-700/50" : "text-gray-300"
                        }`}
                      onClick={() => handleCityChange(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center mt-2">{/*日历距离顶部距离*/}
            <div className="w-[90%] sm:w-[82%] md:w-[70%] max-w-[520px]">
              {ready ? (
                <CalendarBox
                  currentMonth={currentMonthLabel}
                  containerClassName="rounded-20 selected-26"
                  startOffset={startOffset}
                  daysInMonth={daysInMonth}
                  initialSelected={selectedDay}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onSelectDay={handleSelectDay}
                />
              ) : (
                <div className="text-center text-gray-300 py-10">加载中...</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center mt-6 mb-6">{/*上下两个框之间的距离*/}
            <div className="w-[90%] sm:w-[82%] md:w-[70%] max-w-[520px]">
              {loading ? (
                <div className="text-center text-gray-300 py-12">加载中...</div>
              ) : error ? (
                <div className="text-center text-red-400 py-12">{error}</div>
              ) : (
                <WidgetCarousel items={items} currentIndex={currentPage} onChange={setCurrentPage} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 固定在底部的FooterBar */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <FooterBar />
      </div>
    </div>
  );
}
