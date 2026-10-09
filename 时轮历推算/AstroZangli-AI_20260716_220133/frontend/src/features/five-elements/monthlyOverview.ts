export interface MonthlySummary {
  tibetanDateLabel: string;
  accumulativeMonth: number;
  leapRemainder: number;
  weekdayBase: Array<number | string>;
  zeroBase: {
    integer: number | string;
    fractional: number | string;
  };
  solarBase: Array<number | string>;
}

export interface MonthlyDayRow {
  fixedWeekday: number | string;
  lunarPartner: number | string;
  fixedDay: number | string;
  conjunction: number | string;
  effect: string;
}

export interface MonthlyDayCard {
  day: number;
  dayLabel: string;
  tibetanDate: string;
  gregorianDate: string;
  rows: MonthlyDayRow[];
}

export interface MonthlySummaryCard {
  title: string;
  values: string[];
}

export function buildMonthlySummaryCards(
  summary: MonthlySummary
): MonthlySummaryCard[] {
  return [
    {
      title: "积月闰余",
      values: [String(summary.accumulativeMonth), String(summary.leapRemainder)],
    },
    {
      title: "曜基数",
      values: summary.weekdayBase.map((value) => String(value)),
    },
    {
      title: "整零数",
      values: [String(summary.zeroBase.integer), String(summary.zeroBase.fractional)],
    },
    {
      title: "太阳基数",
      values: summary.solarBase.map((value) => String(value)),
    },
  ];
}

export function buildMonthlyTitle(year: number, tibetanDateLabel: string): string {
  const compactLabel = tibetanDateLabel.replaceAll(" ", "");
  return `公元${year}年藏历${compactLabel}`.trim();
}

export function buildMonthlyDayCards(days: Array<{
  day: number;
  gregorianDate: string;
  tibetanDate: string;
  rows: MonthlyDayRow[];
}>): MonthlyDayCard[] {
  return days.map((day) => ({
    day: day.day,
    dayLabel: `${day.day} 日`,
    tibetanDate: day.tibetanDate,
    gregorianDate: day.gregorianDate,
    rows: day.rows,
  }));
}
