export type EarthTab =
  | "zodiac"
  | "seven-stars"
  | "five-elements"
  | "annual-motion"
  | "tibetan-cycle";

export type SevenStarsSubtab =
  | "seven-stars"
  | "seven-data"
  | "five-elements-sphere"
  | "five-elements";

export type BasicDataSubtab =
  | "daily-all"
  | "five-elements"
  | "five-elements-sphere"
  | "five-planets"
  | "five-planets-sphere"
  | "tibetan-cycle"
  | "rahu"
  | "month-remainder"
  | "leap-month"
  | "duplicate-missing";

export function resolveSevenStarsSubtab(
  subtab: string | null | undefined
): SevenStarsSubtab {
  if (subtab === "seven-data" || subtab === "five-elements" || subtab === "five-elements-sphere") {
    return subtab;
  }
  return "seven-stars";
}

export function getEarthPageIndex(tab: string | null | undefined): number {
  if (tab === "five-elements" || tab === "tibetan-cycle") return 1;
  if (tab === "seven-stars") return 2;
  if (tab === "annual-motion") return 3;
  return 0;
}

export function getEarthTabLabel(tab: string | null | undefined): string {
  if (tab === "seven-stars") return "七星轨迹";
  if (tab === "five-elements" || tab === "tibetan-cycle") return "天文历算基本数据";
  if (tab === "annual-motion") return "周年视运动（地心坐标）";
  return "十二宫图";
}

export function resolveBasicDataSubtab(
  subtab: string | null | undefined
): BasicDataSubtab {
  if (
    subtab === "daily-all" ||
    subtab === "five-elements-sphere" ||
    subtab === "five-planets" ||
    subtab === "five-planets-sphere" ||
    subtab === "tibetan-cycle" ||
    subtab === "rahu" ||
    subtab === "month-remainder" ||
    subtab === "leap-month" ||
    subtab === "duplicate-missing"
  ) {
    return subtab;
  }
  return "five-elements";
}

export type BasicDataGroup = "five-elements" | "five-planets" | "other";

export function getBasicDataGroup(subtab: BasicDataSubtab): BasicDataGroup {
  if (subtab === "five-elements" || subtab === "five-elements-sphere") return "five-elements";
  if (subtab === "five-planets" || subtab === "five-planets-sphere") return "five-planets";
  return "other";
}

export function buildBasicDataHref(target: BasicDataSubtab, current: URLSearchParams): string {
  const mode = target === "five-elements" && current.get("mode") === "monthly" ? "monthly" : "daily";
  const query = new URLSearchParams({ tab: "five-elements", data: target, mode });
  for (const key of ["year", "month", "day", "gdate", "city"]) {
    const value = current.get(key);
    if (value) query.set(key, value);
  }
  return `/earth?${query.toString()}`;
}
