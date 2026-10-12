export type EarthTab =
  | "zodiac"
  | "eclipses"
  | "moon-phases"
  | "lunar-phenomena"
  | "celestial-motion"
  | "seven-stars"
  | "five-elements"
  | "annual-motion"
  | "tibetan-cycle";

export type SevenStarsSubtab =
  | "seven-stars"
  | "sun-earth-moon"
  | "geocentric-motion"
  | "seven-data"
  | "five-elements-sphere"
  | "five-elements";

export type LunarPhenomenaView = "moon-phases" | "sun-earth-moon" | "eclipses";
export type CelestialMotionView = "geocentric-motion" | "annual-motion";

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
  if (subtab === "seven-data" || subtab === "sun-earth-moon" || subtab === "geocentric-motion" || subtab === "five-elements" || subtab === "five-elements-sphere") {
    return subtab;
  }
  return "seven-stars";
}

export function resolveLunarPhenomenaView(
  tab: string | null | undefined,
  view: string | null | undefined,
  legacySubtab?: string | null
): LunarPhenomenaView {
  if (view === "sun-earth-moon" || view === "eclipses" || view === "moon-phases") return view;
  if (tab === "eclipses") return "eclipses";
  if (tab === "seven-stars" && legacySubtab === "sun-earth-moon") return "sun-earth-moon";
  return "moon-phases";
}

export function resolveCelestialMotionView(
  tab: string | null | undefined,
  view: string | null | undefined,
  legacySubtab?: string | null
): CelestialMotionView {
  if (view === "annual-motion" || view === "geocentric-motion") return view;
  if (tab === "annual-motion") return "annual-motion";
  if (tab === "seven-stars" && legacySubtab === "geocentric-motion") return "geocentric-motion";
  return "geocentric-motion";
}

export function getEarthPageIndex(tab: string | null | undefined, subtab?: string | null): number {
  if (tab === "lunar-phenomena" || tab === "moon-phases" || tab === "eclipses" || (tab === "seven-stars" && subtab === "sun-earth-moon")) return 4;
  if (tab === "celestial-motion" || tab === "annual-motion" || (tab === "seven-stars" && subtab === "geocentric-motion")) return 3;
  if (tab === "five-elements" || tab === "tibetan-cycle") return 1;
  if (tab === "seven-stars") return 2;
  return 0;
}

export function getEarthTabLabel(tab: string | null | undefined, subtab?: string | null): string {
  if (tab === "moon-phases" || tab === "eclipses" || tab === "lunar-phenomena" || (tab === "seven-stars" && subtab === "sun-earth-moon")) return "日月运行与历象";
  if (tab === "celestial-motion" || tab === "annual-motion" || (tab === "seven-stars" && subtab === "geocentric-motion")) return "天体运动";
  if (tab === "seven-stars") return "七星轨迹";
  if (tab === "five-elements" || tab === "tibetan-cycle") return "天文历算基本数据";
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
