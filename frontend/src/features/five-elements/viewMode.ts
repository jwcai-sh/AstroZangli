export type FiveElementsViewMode = "monthly" | "daily";

export function resolveFiveElementsViewMode(
  mode: string | null | undefined
): FiveElementsViewMode {
  return mode === "daily" ? "daily" : "monthly";
}
