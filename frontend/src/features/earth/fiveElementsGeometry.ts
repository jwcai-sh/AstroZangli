// Display conversion only. Evidence: docs/kalachakra-five-elements/glossary.md
// and system-school-rule-chain.md §§3.11–3.14. No astronomical ephemeris.
export const RADICES = [60, 60, 6, 67, 707] as const;

export function mixedValue(values: Array<number | string>): number {
  if (values.length < 5 || values.length > 6) throw new Error("五要素位序不完整");
  let denominator = 1;
  return values.reduce<number>((sum, value, index) => {
    if (value === "" || !Number.isFinite(Number(value))) throw new Error("五要素包含无效数值");
    if (index > 0) denominator *= RADICES[index - 1];
    return sum + Number(value) / denominator;
  }, 0);
}

export const wrap = (value: number, cycle = 360) => ((value % cycle) + cycle) % cycle;
export const mansionDegrees = (values: Array<number | string>) => wrap(mixedValue(values) * 360 / 27);

export function shiftTibetanDay(year: number, month: number, day: number, step: number) {
  const offset = (year * 12 + month - 1) * 30 + day - 1 + step;
  return { year: Math.floor(offset / 360), month: Math.floor(offset / 30) % 12 + 1, day: offset % 30 + 1 };
}
