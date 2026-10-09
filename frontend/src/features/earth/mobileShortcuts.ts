import { shiftTibetanDay } from "./fiveElementsGeometry";

export function buildDayShortcut(current: URLSearchParams, step: -1 | 1, planets: boolean): string | null {
  const values = ["year", "month", "day"].map(key => Number(current.get(key)));
  const [year, month, day] = values;
  const min = planets ? 1 : 1950;
  const max = planets ? 2500 : 2050;
  if (!values.every(Number.isInteger) || year < min || year > max || month < 1 || month > 12 || day < 1 || day > 30) return null;
  const next = shiftTibetanDay(year, month, day, step);
  if (next.year < min || next.year > max) return null;
  const query = new URLSearchParams(current);
  for (const [key, value] of Object.entries(next)) query.set(key, String(value));
  query.set("mode", "daily");
  query.delete("gdate");
  query.delete("view");
  query.delete("autoQuery");
  return `/earth?${query}`;
}
