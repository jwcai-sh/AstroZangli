export interface DateSelection {
  year: number;
  month: number;
  day: number;
}

export const FIVE_ELEMENTS_YEAR_START = 1951;
export const FIVE_ELEMENTS_YEAR_END = 2051;

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function buildDayOptions(year: number, month: number): number[] {
  return Array.from({ length: getDaysInMonth(year, month) }, (_, index) => index + 1);
}

export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(day, 1), getDaysInMonth(year, month));
}

export function normalizeDateSelection(selection: DateSelection): DateSelection {
  return {
    year: selection.year,
    month: selection.month,
    day: clampDay(selection.year, selection.month, selection.day),
  };
}

export function formatApiDate(selection: DateSelection): string {
  return [
    selection.year,
    String(selection.month).padStart(2, "0"),
    String(selection.day).padStart(2, "0"),
  ].join("-");
}

export function buildYearOptions(): number[] {
  return Array.from(
    { length: FIVE_ELEMENTS_YEAR_END - FIVE_ELEMENTS_YEAR_START + 1 },
    (_, index) => FIVE_ELEMENTS_YEAR_START + index
  );
}
