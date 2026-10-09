"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import GregorianTibetanDatePicker from "@/components/seven-stars/GregorianTibetanDatePicker";
import { SUPPORTED_CITIES, type SupportedCity } from "@/constants/cities";
import FiveElementsExplorer from "@/components/widgets/FiveElementsExplorer";
import {
  buildFiveElementPanels,
  clampStageIndex,
  type FiveElementPanelId,
} from "@/features/five-elements/model";
import {
  buildMonthlyDayCards,
  buildMonthlySummaryCards,
  buildMonthlyTitle,
} from "@/features/five-elements/monthlyOverview";
import {
  resolveFiveElementsViewMode,
  type FiveElementsViewMode,
} from "@/features/five-elements/viewMode";
import {
  fetchDailyFiveElementsDetail,
  fetchMonthlyFiveElementsOverview,
} from "@/services/fiveElementsApi";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const DAY_OPTIONS = Array.from({ length: 30 }, (_, index) => index + 1);
const TIBETAN_YEAR_START = 1950;
const TIBETAN_YEAR_END = 2050;
const YEAR_OPTIONS = Array.from(
  { length: TIBETAN_YEAR_END - TIBETAN_YEAR_START + 1 },
  (_, index) => TIBETAN_YEAR_START + index
);
const DEFAULT_DATE = { year: 2026, month: 8, day: 22 };

function clampInitialYear(year: number): number {
  return Math.min(Math.max(year, TIBETAN_YEAR_START), TIBETAN_YEAR_END);
}

function clampMonth(month: number): number {
  return Math.min(Math.max(month, 1), 12);
}

function clampDay(day: number): number {
  return Math.min(Math.max(day, 1), 30);
}

function buildNextUrl(
  year: number,
  month: number,
  day: number,
  mode: FiveElementsViewMode,
  gregorianDate?: string,
  city?: SupportedCity,
): string {
  const query = new URLSearchParams({ tab: "five-elements", data: "five-elements", year: String(year), month: String(month), day: String(day), mode });
  if (gregorianDate) query.set("gdate", gregorianDate);
  if (city) query.set("city", city);
  return `/earth?${query.toString()}`;
}

export default function FiveElementsSubtab(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();

  const parsedYear = useMemo(
    () => clampInitialYear(Number(searchParams.get("year")) || DEFAULT_DATE.year),
    [searchParams]
  );
  const parsedMonth = useMemo(
    () => clampMonth(Number(searchParams.get("month")) || DEFAULT_DATE.month),
    [searchParams]
  );
  const parsedDay = useMemo(
    () => clampDay(Number(searchParams.get("day")) || DEFAULT_DATE.day),
    [searchParams]
  );
  const parsedMode = useMemo(
    () => resolveFiveElementsViewMode(searchParams.get("mode")),
    [searchParams]
  );
  const gregorianDate = searchParams.get("gdate") || "2026-09-14";
  const cityParam = searchParams.get("city");
  const city: SupportedCity = SUPPORTED_CITIES.includes(cityParam as SupportedCity) ? cityParam as SupportedCity : "上海市";

  const [selection, setSelection] = useState({
    year: parsedYear,
    month: parsedMonth,
    day: parsedDay,
  });
  const [mode, setMode] = useState<FiveElementsViewMode>(parsedMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] =
    useState<Awaited<ReturnType<typeof fetchMonthlyFiveElementsOverview>> | null>(null);
  const [dailyData, setDailyData] =
    useState<Awaited<ReturnType<typeof fetchDailyFiveElementsDetail>> | null>(null);
  const [activePanelId, setActivePanelId] =
    useState<FiveElementPanelId>("fixedWeekday");
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    setSelection({ year: parsedYear, month: parsedMonth, day: parsedDay });
    setMode(parsedMode);
  }, [parsedDay, parsedMode, parsedMonth, parsedYear]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (mode === "monthly") {
          const data = await fetchMonthlyFiveElementsOverview({
            year: selection.year,
            month: selection.month,
          });
          if (!cancelled) {
            setMonthlyData(data);
          }
          return;
        }

        const data = await fetchDailyFiveElementsDetail({
          year: selection.year,
          month: selection.month,
          day: selection.day,
        });
        if (!cancelled) {
          setDailyData(data);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, selection]);

  const summaryCards = useMemo(
    () => (monthlyData ? buildMonthlySummaryCards(monthlyData.monthSummary) : []),
    [monthlyData]
  );
  const dayCards = useMemo(
    () => (monthlyData ? buildMonthlyDayCards(monthlyData.days) : []),
    [monthlyData]
  );
  const monthTitle = useMemo(
    () =>
      monthlyData
        ? buildMonthlyTitle(
            monthlyData.year,
            monthlyData.monthSummary.tibetanDateLabel
          )
        : "",
    [monthlyData]
  );

  const dailySummaryCards = useMemo(
    () => (dailyData ? buildMonthlySummaryCards(dailyData.monthSummary) : []),
    [dailyData]
  );
  const dailyRows = useMemo(
    () =>
      dailyData
        ? dailyData.rows.map((row) => ({
            fixedWeekday: row.fixedWeekday,
            solarLunar: row.lunarPartner,
            fixedDay: row.fixedDay,
            conjunction: row.conjunction,
            effect: row.effect,
          }))
        : [],
    [dailyData]
  );
  const dailyPanels = useMemo(
    () => buildFiveElementPanels(dailyRows, dailyData?.tibetanDateLabel || ""),
    [dailyData, dailyRows]
  );
  const activeDailyPanel =
    dailyPanels.find((panel) => panel.id === activePanelId) ?? dailyPanels[0];

  useEffect(() => {
    if (mode !== "daily" || !activeDailyPanel) return;
    setActiveStageIndex((previous) => clampStageIndex(previous, activeDailyPanel));
  }, [activeDailyPanel, mode]);

  const syncUrl = (next: {
    year?: number;
    month?: number;
    day?: number;
    mode?: FiveElementsViewMode;
  }) => {
    const nextYear = next.year ?? selection.year;
    const nextMonth = next.month ?? selection.month;
    const nextDay = next.day ?? selection.day;
    const nextMode = next.mode ?? mode;
    router.push(buildNextUrl(nextYear, nextMonth, nextDay, nextMode, gregorianDate, city));
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-2 pb-2">
      <section className="rounded-[28px] border border-cyan-100/15 bg-slate-950/55 px-4 py-5 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Earth / Seven Stars
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-wide sm:text-3xl">
              五要素值
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              当前支持按藏历年、月查看月度总览，也支持按藏历年、月、日进入单日交互式可视化；两者都读取数据库中的 Python final 预计算结果。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {(["monthly", "daily"] as const).map((item) => {
              const isActive = mode === item;
              const label = item === "monthly" ? "月度总览" : "每日查询";
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    syncUrl({ mode: item });
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition-all ${
                    isActive
                      ? "border-[#8b6b49] bg-[#8b6b49] text-white"
                      : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {mode === "daily" && (
              <Link
                href={`/earth?${new URLSearchParams({ tab: "five-elements", data: "five-elements-sphere", year: String(selection.year), month: String(selection.month), day: String(selection.day), gdate: gregorianDate, city })}`}
                className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-all hover:bg-cyan-300/20"
              >
                查看天球视角 ↗
              </Link>
            )}
            <Link
              href="/five-elements-compare"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-all hover:bg-white/10"
            >
              参考网站对照
            </Link>
          </div>
        </div>
      </section>

      <GregorianTibetanDatePicker
        initialDate={gregorianDate}
        initialCity={city}
        tone="dark"
        onResolved={({ gregorianDate: nextGregorianDate, city: nextCity, tibetan }) => {
          router.push(buildNextUrl(tibetan.year, tibetan.month, tibetan.day, "daily", nextGregorianDate, nextCity));
        }}
      />

      {mode === "monthly" ? (
        <>
          <section className="rounded-[28px] border border-cyan-100/15 bg-slate-950/55 px-4 py-5 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">查询藏历月份</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-sm">藏历年</span>
                    <select
                      value={selection.year}
                      onChange={(event) => {
                        const nextYear = Number(event.target.value);
                        setSelection((current) => ({ ...current, year: nextYear }));
                        syncUrl({ year: nextYear });
                      }}
                      className="min-w-[110px] rounded-md border border-cyan-100/25 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-sm">藏历月</span>
                    <select
                      value={selection.month}
                      onChange={(event) => {
                        const nextMonth = Number(event.target.value);
                        setSelection((current) => ({ ...current, month: nextMonth }));
                        syncUrl({ month: nextMonth });
                      }}
                      className="min-w-[88px] rounded-md border border-cyan-100/25 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {monthTitle ? (
                <div className="rounded-[20px] border border-white/15 bg-white/5 px-5 py-3 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                  <p className="text-lg font-semibold tracking-wide">{monthTitle}</p>
                </div>
              ) : null}
            </div>
          </section>

          {loading ? (
            <div className="rounded-[28px] border border-[#d7c3ac] bg-[#f7eddf] py-16 text-center text-[#6d5440]">
              正在载入月度五要素数据...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-[#d7c3ac] bg-[#f7eddf] py-16 text-center text-[#b34d3e]">
              {error}
            </div>
          ) : (
            <>
              <section className="rounded-[28px] border border-[#e2c6a2]/30 bg-slate-950/10 px-5 py-6 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                <div className="grid gap-4 md:grid-cols-4">
                  {summaryCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-[22px] border border-[#e2c6a2]/45 bg-[#8b6b49]/5 px-4 py-4 text-center"
                    >
                      <p className="text-sm font-semibold tracking-wide text-cyan-100/80">
                        {card.title}
                      </p>
                      <div className="mt-4 space-y-2 text-center text-lg font-medium">
                        {card.values.map((value, index) => (
                          <div key={`${card.title}-${index}`}>{value}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                {dayCards.map((card) => (
                  <article
                    key={card.day}
                    className="rounded-[26px] border border-[#e2c6a2]/30 bg-[#8b6b49]/5 px-4 py-5 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
                  >
                    <div className="border-b border-white/10 pb-3 text-center">
                      <p className="text-2xl font-semibold">{card.dayLabel}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {card.tibetanDate || "藏历信息待补充"}
                      </p>
                      <p className="mt-1 text-xs tracking-[0.12em] text-slate-400">
                        对应公历 {card.gregorianDate}
                      </p>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[420px] text-center text-sm">
                        <thead>
                          <tr className="text-cyan-100/80">
                            <th className="pb-3 font-semibold">定曜</th>
                            <th className="pb-3 font-semibold">月伴星宿</th>
                            <th className="pb-3 font-semibold">定日</th>
                            <th className="pb-3 font-semibold">会合</th>
                            <th className="pb-3 font-semibold">作用</th>
                          </tr>
                        </thead>
                        <tbody>
                          {card.rows.map((row, index) => (
                            <tr
                              key={`${card.day}-${index}`}
                              className="border-t border-white/10"
                            >
                              <td className="py-2">{row.fixedWeekday || ""}</td>
                              <td className="py-2">{row.lunarPartner || ""}</td>
                              <td className="py-2">{row.fixedDay || ""}</td>
                              <td className="py-2">{row.conjunction || ""}</td>
                              <td className="py-2">{row.effect || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
        </>
      ) : (
        <>
          <section className="rounded-[28px] border border-cyan-100/15 bg-slate-950/55 px-4 py-5 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">查询藏历单日</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-sm">藏历年</span>
                    <select
                      value={selection.year}
                      onChange={(event) => {
                        const nextYear = Number(event.target.value);
                        setSelection((current) => ({ ...current, year: nextYear }));
                        syncUrl({ year: nextYear });
                      }}
                      className="min-w-[110px] rounded-md border border-cyan-100/25 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-sm">藏历月</span>
                    <select
                      value={selection.month}
                      onChange={(event) => {
                        const nextMonth = Number(event.target.value);
                        setSelection((current) => ({ ...current, month: nextMonth }));
                        syncUrl({ month: nextMonth });
                      }}
                      className="min-w-[88px] rounded-md border border-cyan-100/25 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      {MONTH_OPTIONS.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-sm">藏历日</span>
                    <select
                      value={selection.day}
                      onChange={(event) => {
                        const nextDay = Number(event.target.value);
                        setSelection((current) => ({ ...current, day: nextDay }));
                        syncUrl({ day: nextDay });
                      }}
                      className="min-w-[88px] rounded-md border border-cyan-100/25 bg-transparent px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/15 bg-white/5 px-5 py-3 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <p className="text-sm tracking-[0.2em] text-cyan-100/70">交互说明</p>
                <p className="mt-2 text-sm text-slate-300">
                  缺日标“缺”并显示当日数值；重日标“重”并列出对应公历日期。
                </p>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="rounded-[28px] border border-[#d7c3ac] bg-[#f7eddf] py-16 text-center text-[#6d5440]">
              正在载入单日五要素数据...
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-[#d7c3ac] bg-[#f7eddf] py-16 text-center text-[#b34d3e]">
              {error}
            </div>
          ) : dailyData ? (
            <>
              <section className="rounded-[28px] border border-[#e2c6a2]/30 bg-slate-950/10 px-5 py-6 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                      Daily Interactive
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold">
                      {dailyData.tibetanDateLabel}
                      {dailyData.dayStatus !== "normal" ? (
                        <span className="ml-3 inline-flex align-middle rounded-full border border-[#caa984] bg-[#fff8ef] px-3 py-1 text-base font-medium text-[#765638]">
                          {dailyData.dayStatus === "missing" ? "缺" : "重"}
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      对应公历：
                      {dailyData.gregorianDates.length > 0
                        ? ` ${dailyData.gregorianDates.join(" / ")}`
                        : " 暂无映射"}
                    </p>
                    {dailyData.gregorianDates.length > 1 ? (
                      <p className="mt-2 text-xs tracking-[0.08em] text-slate-400">
                        当前藏历日对应多个公历日期，按重日显示。
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/45 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">藏历选择</p>
                      <p className="mt-2 font-medium">
                        {selection.year} 年 {selection.month} 月 {selection.day} 日
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-slate-900/45 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">算法口径</p>
                      <p className="mt-2 font-medium">Python final 预计算缓存</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-cyan-100/15 bg-slate-950/50 px-5 py-6 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-md">
                <div className="grid gap-4 md:grid-cols-4">
                  {dailySummaryCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-[22px] border border-[#e2c6a2]/45 bg-[#8b6b49]/5 px-4 py-4 text-center"
                    >
                      <p className="text-sm font-semibold tracking-wide text-cyan-100/80">
                        {card.title}
                      </p>
                      <div className="mt-4 space-y-2 text-center text-lg font-medium">
                        {card.values.map((value, index) => (
                          <div key={`${card.title}-${index}`}>{value}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <FiveElementsExplorer
                panels={dailyPanels}
                activePanelId={activePanelId}
                activeStageIndex={activeStageIndex}
                selectedDate={dailyData.tibetanDateLabel}
                secondaryLabel="对应公历"
                secondaryValue={dailyData.gregorianDates.join(" / ") || "--"}
                onPanelChange={(panelId) => {
                  setActivePanelId(panelId);
                  setActiveStageIndex(0);
                }}
                onStageChange={setActiveStageIndex}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
