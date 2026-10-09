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

export interface SphereValue {
  rawValue: number;
  mansionIndex: number;
  mansionProgress: number;
  angle: number;
  label: string;
}

export interface ConjunctionFormula {
  rawSum: number;
  wrappedMansion: number;
  angle: number;
  label: string;
}

export function buildSphereValue(values: Array<number | string>): SphereValue {
  const rawValue = mixedValue(values);
  const wrappedMansion = wrap(rawValue, 27);
  const mansionIndex = Math.floor(wrappedMansion);
  const mansionProgress = wrappedMansion - mansionIndex;
  return {
    rawValue,
    mansionIndex,
    mansionProgress,
    angle: wrap(wrappedMansion * 360 / 27),
    label: `宿 ${mansionIndex} · ${(mansionProgress * 100).toFixed(3)}%`,
  };
}

export function buildConjunctionFormula(moonRawValue: number, sunRawValue: number): ConjunctionFormula {
  const rawSum = moonRawValue + sunRawValue;
  const wrappedMansion = wrap(rawSum, 27);
  return {
    rawSum,
    wrappedMansion,
    angle: wrap(wrappedMansion * 360 / 27),
    label: `${moonRawValue.toFixed(6)} + ${sunRawValue.toFixed(6)} = ${rawSum.toFixed(6)}`,
  };
}

export function shiftTibetanDay(year: number, month: number, day: number, step: number) {
  const offset = (year * 12 + month - 1) * 30 + day - 1 + step;
  return { year: Math.floor(offset / 360), month: Math.floor(offset / 30) % 12 + 1, day: offset % 30 + 1 };
}
