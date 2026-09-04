"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CalendarBox, FooterBar } from "@/components";
import FiveElementsExplorer from "@/components/widgets/FiveElementsExplorer";
import { SUPPORTED_CITIES } from "@/constants/cities";
import {
  buildFiveElementPanels,
  clampStageIndex,
  type FiveElementPanelId,
} from "@/features/five-elements/model";
import { fetchCalendarData } from "@/services/calendarApi";

const DEFAULT_CITY = "上海市";

export default function FiveElementsPage(): React.JSX.Element {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [year, setYear] = useState(1970);
  const [month, setMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] =
    useState<Awaited<ReturnType<typeof fetchCalendarData>> | null>(null);
  const [stars, setStars] = useState<
    Array<{ left: number; top: number; opacity: number }>
  >([]);
  const [activePanelId, setActivePanelId] =
    useState<FiveElementPanelId>("fixedWeekday");
  const [activeStageIndex, setActiveStageIndex] = useState(0);

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
    const date = new Date(year, month, 1);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
    });
  }, [ready, year, month]);

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  const startOffset = useMemo(
    () => new Date(year, month, 1).getDay(),
    [year, month]
  );

  const selectedDateStr = useMemo(() => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(selectedDay).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }, [year, month, selectedDay]);

  const panels = useMemo(
    () =>
      buildFiveElementPanels(
        calendarData?.astrologicalTable?.tableData || [],
        calendarData?.astrologicalTable?.tibetanDate || ""
      ),
    [calendarData]
  );

  const activePanel =
    panels.find((panel) => panel.id === activePanelId) ?? panels[0];

  useEffect(() => {
    if (!activePanel) return;
    setActiveStageIndex((prev) => clampStageIndex(prev, activePanel));
  }, [activePanel]);

  const loadData = async (date?: string, cityName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarData({ date, cityName });
      setCalendarData(data || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedDate = (nextYear: number, nextMonth: number, nextDay: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setSelectedDay(nextDay);
    const mm = String(nextMonth + 1).padStart(2, "0");
    const dd = String(nextDay).padStart(2, "0");
    const dateStr = `${nextYear}-${mm}-${dd}`;
    loadData(dateStr, city);
  };

  const handleCityChange = (selectedCity: string) => {
    setCity(selectedCity);
    setIsCityOpen(false);
    loadData(selectedDateStr, selectedCity);
  };

  const handlePrevMonth = () => {
    const date = new Date(year, month, 1);
    date.setMonth(date.getMonth() - 1);
    const nextDay = Math.min(
      selectedDay,
      new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    );
    updateSelectedDate(date.getFullYear(), date.getMonth(), nextDay);
  };

  const handleNextMonth = () => {
    const date = new Date(year, month, 1);
    date.setMonth(date.getMonth() + 1);
    const nextDay = Math.min(
      selectedDay,
      new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    );
    updateSelectedDate(date.getFullYear(), date.getMonth(), nextDay);
  };

  const handleSelectDay = (day: number) => {
    updateSelectedDate(year, month, day);
  };

  useEffect(() => {
    const now = new Date();
    const initialYear = now.getFullYear();
    const initialMonth = now.getMonth();
    const initialDay = now.getDate();
    setYear(initialYear);
    setMonth(initialMonth);
    setSelectedDay(initialDay);
    setReady(true);
    loadData(
      `${initialYear}-${String(initialMonth + 1).padStart(2, "0")}-${String(initialDay).padStart(2, "0")}`,
      DEFAULT_CITY
    );
  }, []);

  return (
    <div className="min-h-screen text-white starfield-bg">
      <div className="fixed inset-0 starfield-bg">
        <div className="absolute inset-0 opacity-80">
          {stars.map((star, index) => {
            const sizeClass =
              index % 11 === 0
                ? "star--lg"
                : index % 3 === 0
                  ? "star--md"
                  : "star--sm";
            const toneClass =
              index % 7 === 0
                ? "star--warm"
                : index % 5 === 0
                  ? "star--cold"
                  : "star--neutral";

            return (
              <div
                key={index}
                className={`absolute rounded-full star ${sizeClass} ${toneClass}`}
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  opacity: star.opacity,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 min-h-screen pb-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-8 sm:px-6">
          <div className="flex justify-center items-center py-2 relative mt-8">
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-1 transition-colors hover:bg-gray-700/70 cursor-pointer"
                onClick={() => setIsCityOpen((value) => !value)}
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
                <div className="absolute left-0 right-0 z-20 mt-2 max-h-60 w-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/90 shadow-lg">
                  {SUPPORTED_CITIES.map((supportedCity) => (
                    <button
                      key={supportedCity}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700/70 ${
                        supportedCity === city
                          ? "bg-gray-700/50 text-white"
                          : "text-gray-300"
                      }`}
                      onClick={() => handleCityChange(supportedCity)}
                    >
                      {supportedCity}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-[90%] max-w-[520px] sm:w-[82%] md:w-[70%]">
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
                <div className="py-10 text-center text-gray-300">加载中...</div>
              )}
            </div>
          </div>

          <section className="mx-auto w-full max-w-5xl rounded-[30px] border border-cyan-200/10 bg-slate-950/60 px-5 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/70">
                  Kalachakra
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-wide text-white sm:text-4xl">
                  五要素交互式可视化
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  复用当前日历接口中的五要素数据，把定曜、太阳日月宿、定日、会合、作用拆成可切换、可聚焦的序列视图，方便在单日维度上追踪结构与变化。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/cal"
                  className="rounded-full border border-cyan-300/25 bg-cyan-300/8 px-4 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-300/14"
                >
                  返回日历页
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
                >
                  返回首页
                </Link>
              </div>
            </div>
          </section>

          <div className="mx-auto w-full max-w-5xl">
            {loading ? (
              <div className="rounded-[28px] border border-white/10 bg-slate-950/70 py-16 text-center text-gray-300 backdrop-blur-xl">
                正在载入五要素数据...
              </div>
            ) : error ? (
              <div className="rounded-[28px] border border-red-400/20 bg-slate-950/70 py-16 text-center text-red-300 backdrop-blur-xl">
                {error}
              </div>
            ) : (
              <FiveElementsExplorer
                panels={panels}
                activePanelId={activePanelId}
                activeStageIndex={activeStageIndex}
                selectedDate={calendarData?.selectedDate || selectedDateStr}
                secondaryLabel="城市"
                secondaryValue={calendarData?.selectedCity || city}
                onPanelChange={(panelId) => {
                  setActivePanelId(panelId);
                  setActiveStageIndex(0);
                }}
                onStageChange={setActiveStageIndex}
              />
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30">
        <FooterBar />
      </div>
    </div>
  );
}
