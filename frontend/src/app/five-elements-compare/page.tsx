"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchMonthlyFiveElementsCompare } from "@/services/fiveElementsApi";

const YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => 2020 + index);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const DAILY_FIELD_KEYS = ["fixedWeekday", "lunarPartner", "fixedDay", "conjunction"] as const;
type DailyFieldKey = (typeof DAILY_FIELD_KEYS)[number];
type DailySourceValues = Record<DailyFieldKey, Array<number | string | null>>;
const FIELD_LABELS: Record<DailyFieldKey, string> = {
  fixedWeekday: "定曜",
  lunarPartner: "月伴星宿",
  fixedDay: "定日",
  conjunction: "会合",
};

function clampYear(year: number): number {
  return YEAR_OPTIONS.includes(year) ? year : 2026;
}

function clampMonth(month: number): number {
  return MONTH_OPTIONS.includes(month) ? month : 7;
}

function buildUrl(year: number, month: number): string {
  return `/five-elements-compare?year=${year}&month=${month}`;
}

function renderValue(values: Array<number | string | null>): string {
  if (values.length === 0) return "-";
  return values
    .map((value) => (value === null || value === undefined ? "-" : String(value)))
    .join(" / ");
}

function valuesEqual(
  left: Array<number | string | null>,
  right: Array<number | string | null>
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => String(value ?? "") === String(right[index] ?? ""))
  );
}

function dailySourcesEqual(left: DailySourceValues, right: DailySourceValues): boolean {
  return DAILY_FIELD_KEYS.every((field) => valuesEqual(left[field], right[field]));
}

function dailyDiffFields(left: DailySourceValues, right: DailySourceValues): string[] {
  return DAILY_FIELD_KEYS.filter((field) => !valuesEqual(left[field], right[field]));
}

function diffValueClass(isDifferent: boolean): string {
  return isDifferent ? "font-semibold text-[#c83b32]" : "";
}

function fieldLabel(field: string): string {
  return field in FIELD_LABELS ? FIELD_LABELS[field as DailyFieldKey] : field;
}

function getVectorValue(
  values: Array<number | string | null>,
  index: number
): number | string | null {
  return index < values.length ? values[index] : null;
}

function sourceValueDiffers(
  value: number | string | null,
  peers: Array<number | string | null>
): boolean {
  return peers.some((peer) => String(value ?? "") !== String(peer ?? ""));
}

function renderVectorValues(
  values: Array<number | string | null>,
  peerVectors: Array<Array<number | string | null>>
): React.JSX.Element {
  const rowCount = Math.max(values.length, ...peerVectors.map((peer) => peer.length));

  return (
    <div className="flex min-h-[8.5rem] flex-col items-center justify-start gap-2">
      {Array.from({ length: rowCount }, (_, index) => {
        const value = getVectorValue(values, index);
        const peers = peerVectors.map((peer) => getVectorValue(peer, index));
        const isDifferent = sourceValueDiffers(value, peers);

        return (
          <span key={index} className={diffValueClass(isDifferent)}>
            {value === null || value === undefined ? "-" : value}
          </span>
        );
      })}
    </div>
  );
}

function FiveElementsCompareContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parsedYear = useMemo(
    () => clampYear(Number(searchParams.get("year")) || 2026),
    [searchParams]
  );
  const parsedMonth = useMemo(
    () => clampMonth(Number(searchParams.get("month")) || 7),
    [searchParams]
  );

  const [selection, setSelection] = useState({ year: parsedYear, month: parsedMonth });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [compareData, setCompareData] =
    useState<Awaited<ReturnType<typeof fetchMonthlyFiveElementsCompare>> | null>(null);

  useEffect(() => {
    setSelection({ year: parsedYear, month: parsedMonth });
  }, [parsedMonth, parsedYear]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMonthlyFiveElementsCompare(selection, {
          signal: controller.signal,
        });
        if (!cancelled) {
          setCompareData(data);
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
      controller.abort();
    };
  }, [selection]);

  const filteredDays = useMemo(() => {
    if (!compareData) return [];
    if (compareData.sources.websiteAvailable === false) return compareData.days;
    if (!showOnlyDiffs) return compareData.days;
    return compareData.days.filter(
      (day) => !dailySourcesEqual(day.matlabOracle, day.website)
    );
  }, [compareData, showOnlyDiffs]);

  const handleSelectionChange = (next: { year?: number; month?: number }) => {
    const nextYear = next.year ?? selection.year;
    const nextMonth = next.month ?? selection.month;
    setSelection({ year: nextYear, month: nextMonth });
    router.push(buildUrl(nextYear, nextMonth));
  };

  const websiteAvailable = compareData?.sources.websiteAvailable !== false;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1b1b1b_0%,#080808_55%,#020202_100%)] px-4 py-8 text-[#2f2418] sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="rounded-[30px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f6ecde_0%,#efe1cf_100%)] px-5 py-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-[#8e6b47]">
                Compare Workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-wide sm:text-4xl">
                五要素结果对照
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#5f4a35] sm:text-base">
                该页面逐项并排展示 MATLAB 代码输出（年度 Excel）与参考网站结果，并对两方差异做红色高亮标记。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <span className="text-sm">年份</span>
                <select
                  value={selection.year}
                  onChange={(event) => handleSelectionChange({ year: Number(event.target.value) })}
                  className="min-w-[120px] rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm outline-none"
                >
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-sm">月份</span>
                <select
                  value={selection.month}
                  onChange={(event) => handleSelectionChange({ month: Number(event.target.value) })}
                  className="min-w-[96px] rounded-md border border-[#ccb296] bg-[#fff8ef] px-3 py-2 text-sm outline-none"
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

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#6d5440]">
            <label className="inline-flex items-center gap-2 rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2">
              <input
                type="checkbox"
                checked={showOnlyDiffs}
                onChange={(event) => setShowOnlyDiffs(event.target.checked)}
              />
              仅看存在差异的日期
            </label>
            <Link
              href="/earth?tab=seven-stars&subtab=five-elements"
              className="rounded-full border border-[#d0b79c] bg-[#fff8ef] px-4 py-2 transition hover:bg-[#f6eadc]"
            >
              返回五要素展示页
            </Link>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f8efe3_0%,#efe1cf_100%)] px-6 py-16 text-center text-[#6d5440] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            正在载入对照数据...
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f8efe3_0%,#efe1cf_100%)] px-6 py-16 text-center text-[#b34d3e] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            {error}
          </section>
        ) : compareData ? (
          <>
            <section className="rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f9f1e6_0%,#f1e4d5_100%)] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col gap-2 text-sm text-[#6d5440]">
                <p className="text-lg font-semibold text-[#2f2418]">
                  {compareData.sources.websiteLabel}
                </p>
                <p>
                  MATLAB 代码输出（Excel）：{compareData.sources.matlabOracleFile}（{compareData.sources.matlabOracleMode}）
                </p>
                {!compareData.sources.matlabOracleAvailable ? (
                  <p className="font-semibold text-[#c83b32]">
                    当前年份没有完整的 MATLAB 代码输出 Excel，无法完成两方对照。
                  </p>
                ) : null}
                <p>网站来源：{compareData.sources.websiteUrl}</p>
                {websiteAvailable ? (
                  <p>
                    MATLAB / 网站：月头 {compareData.stats.differentMatlabWebsiteSummaryCount} 项，逐日{" "}
                    {compareData.stats.differentMatlabWebsiteDayCount} 天
                  </p>
                ) : (
                  <p className="font-semibold text-[#c83b32]">
                    网站暂不可用：{compareData.sources.websiteError || "参考网站连接失败"}
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-[#d7c3ac] bg-[linear-gradient(180deg,#f8efe3_0%,#efe1cf_100%)] shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
              <div className="border-b border-[#dcc7ae] px-5 py-4">
                <h2 className="text-xl font-semibold">月头数据对照</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f6eadb] text-[#6b513a]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">项目</th>
                      <th className="px-4 py-3 font-semibold">MATLAB 代码输出（Excel）</th>
                      <th className="px-4 py-3 font-semibold">网站</th>
                      <th className="px-4 py-3 font-semibold">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareData.summary.map((row) => (
                      (() => {
                        const sourcesMatch = websiteAvailable && valuesEqual(row.matlabOracle, row.website);
                        const matlabDiffers = websiteAvailable && !sourcesMatch;
                        const websiteDiffers = websiteAvailable && !sourcesMatch;

                        return (
                          <tr
                            key={row.label}
                            className={`border-t border-[#ead9c5] ${
                              sourcesMatch ? "bg-transparent" : "bg-[#fff0ea]"
                            }`}
                          >
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className={`px-4 py-3 ${diffValueClass(matlabDiffers)}`}>
                          {renderValue(row.matlabOracle)}
                        </td>
                        <td className={`px-4 py-3 ${diffValueClass(websiteDiffers)}`}>
                          {websiteAvailable ? renderValue(row.website) : "暂不可用"}
                        </td>
                        <td className={`px-4 py-3 ${diffValueClass(!sourcesMatch)}`}>
                          {websiteAvailable ? (sourcesMatch ? "两方一致" : "两方差异") : "等待网站数据"}
                        </td>
                          </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {filteredDays.map((day) => {
                const diffFields = websiteAvailable ? dailyDiffFields(day.matlabOracle, day.website) : [];
                const sourcesMatch = websiteAvailable && diffFields.length === 0;

                return (
                  <article
                    key={day.day}
                    className={`rounded-[26px] border px-4 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.14)] ${
                      sourcesMatch
                        ? "border-[#d7c3ac] bg-[linear-gradient(180deg,#f8efe3_0%,#efe1cf_100%)]"
                        : "border-[#e7a084] bg-[linear-gradient(180deg,#fff0ea_0%,#f3dfd3_100%)]"
                    }`}
                  >
                  <div className="flex items-center justify-between border-b border-[#dcc7ae] pb-3">
                    <div>
                      <p className="text-2xl font-semibold">{day.day} 日</p>
                      <p className="mt-1 text-sm text-[#6d5440]">
                        {sourcesMatch
                          ? "该日完全一致"
                          : !websiteAvailable
                            ? "网站暂不可用，先显示本地结果"
                            : compareData.sources.matlabOracleAvailable
                            ? `差异字段：${diffFields.map(fieldLabel).join("、")}`
                            : "MATLAB 代码输出缺失，无法完成两方对照"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        sourcesMatch
                          ? "bg-[#ede2d2] text-[#6b513a]"
                          : "bg-[#d76e45] text-white"
                      }`}
                    >
                      {websiteAvailable ? (day.matches ? "MATCH" : "DIFF") : "SITE N/A"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {[
                      {
                        label: "MATLAB 代码输出（Excel）",
                        data: day.matlabOracle,
                        peers: websiteAvailable ? [day.website] : [],
                      },
                      ...(websiteAvailable
                        ? [
                            {
                              label: "网站",
                              data: day.website,
                              peers: [day.matlabOracle],
                            },
                          ]
                        : []),
                    ].map((source) => (
                      <div
                        key={source.label}
                        className="overflow-x-auto rounded-[18px] border border-[#e0ccb6] bg-[#fff8ef]/72"
                      >
                        <div className="border-b border-[#e8d7c2] px-4 py-3 text-sm font-semibold text-[#6b513a]">
                          {source.label}
                        </div>
                        <div className="grid min-w-[620px] grid-cols-5 text-center text-sm">
                          {DAILY_FIELD_KEYS.map((field) => (
                            <div
                              key={field}
                              className="border-r border-[#ead9c5]/80 px-3 py-3 last:border-r-0"
                            >
                              <p className="mb-3 font-semibold text-[#4f3a27]">
                                {FIELD_LABELS[field]}
                              </p>
                              {renderVectorValues(
                                source.data[field],
                                source.peers.map((peer) => peer[field])
                              )}
                            </div>
	                    ))}
                    {!websiteAvailable ? (
                      <div className="rounded-[18px] border border-[#e0ccb6] bg-[#fff8ef]/72 px-4 py-6 text-sm font-semibold text-[#c83b32]">
                        网站数据暂不可用，无法显示该日网站列。
                      </div>
                    ) : null}
                  </div>
                        <div className="border-t border-[#e8d7c2] px-4 py-3 text-sm text-[#8b7259]">
                          作用：MATLAB 代码与网站未提供
                        </div>
                      </div>
                    ))}
                  </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function FiveElementsComparePage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#080808] px-4 py-16 text-center text-[#f6ecde]">
          正在载入对照页面...
        </main>
      }
    >
      <FiveElementsCompareContent />
    </Suspense>
  );
}
