export type EarthTab =
  | "zodiac"
  | "seven-stars"
  | "annual-motion"
  | "tibetan-cycle";

export type SevenStarsSubtab =
  | "seven-stars"
  | "seven-data"
  | "five-elements-sphere"
  | "five-elements";

export function resolveSevenStarsSubtab(
  subtab: string | null | undefined
): SevenStarsSubtab {
  if (subtab === "seven-data" || subtab === "five-elements" || subtab === "five-elements-sphere") {
    return subtab;
  }
  return "seven-stars";
}

export function getEarthPageIndex(tab: string | null | undefined): number {
  if (tab === "seven-stars") return 1;
  if (tab === "annual-motion") return 2;
  if (tab === "tibetan-cycle") return 3;
  return 0;
}

export function getEarthTabLabel(tab: string | null | undefined): string {
  if (tab === "seven-stars") return "七星轨迹";
  if (tab === "annual-motion") return "周年视运动（地心坐标）";
  if (tab === "tibetan-cycle") return "藏历绕迥纪年";
  return "十二宫图";
}
