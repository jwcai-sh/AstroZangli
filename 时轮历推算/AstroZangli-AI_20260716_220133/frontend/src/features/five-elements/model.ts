import type { AstrologicalRow } from "@/components/widgets/AstrologicalTableCard";

export type FiveElementPanelId =
  | "fixedWeekday"
  | "solarLunar"
  | "fixedDay"
  | "conjunction"
  | "effect";

export interface FiveElementValue {
  label: string;
  value: string;
  numericValue: number | null;
}

export interface FiveElementPanel {
  id: FiveElementPanelId;
  title: string;
  shortTitle: string;
  metricLabel: string;
  description: string;
  accentClassName: string;
  values: FiveElementValue[];
  tibetanDate: string;
}

const PANEL_META: Record<
  FiveElementPanelId,
  Omit<FiveElementPanel, "values" | "tibetanDate">
> = {
  fixedWeekday: {
    id: "fixedWeekday",
    title: "定曜",
    shortTitle: "曜",
    metricLabel: "六层序列",
    description: "展示定曜在当前日期下的多层数值结构。",
    accentClassName: "from-cyan-300/80 via-sky-400/60 to-blue-500/80",
  },
  solarLunar: {
    id: "solarLunar",
    title: "月伴星宿",
    shortTitle: "宿",
    metricLabel: "宿位序列",
    description: "展示月伴星宿的层级结果，用于观察宿位序列变化。",
    accentClassName: "from-violet-300/80 via-fuchsia-400/60 to-indigo-500/80",
  },
  fixedDay: {
    id: "fixedDay",
    title: "定日",
    shortTitle: "日",
    metricLabel: "五层序列",
    description: "展示定日的层级结果，用于观察数列推进。",
    accentClassName: "from-emerald-300/80 via-teal-400/60 to-cyan-500/80",
  },
  conjunction: {
    id: "conjunction",
    title: "会合",
    shortTitle: "合",
    metricLabel: "和合序列",
    description: "展示定日与月宿和合后的结果。",
    accentClassName: "from-amber-300/80 via-orange-400/60 to-rose-500/80",
  },
  effect: {
    id: "effect",
    title: "作用",
    shortTitle: "用",
    metricLabel: "前后分",
    description: "展示作用的前后分名称，强调文本结果而非纯数值。",
    accentClassName: "from-pink-300/80 via-rose-400/60 to-purple-500/80",
  },
};

function toDisplayValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return String(value);
}

function toNumericValue(value: string): number | null {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildNumericValues(
  rows: AstrologicalRow[],
  id: Exclude<FiveElementPanelId, "effect">
): FiveElementValue[] {
  return rows
    .map((row, index) => {
      const value = toDisplayValue(row[id]);
      return {
        label: `序位 ${index + 1}`,
        value,
        numericValue: toNumericValue(value),
      };
    })
    .filter((item) => item.value !== "");
}

function buildEffectValues(rows: AstrologicalRow[]): FiveElementValue[] {
  const values = rows
    .map((row, index) => {
      const value = toDisplayValue(row.effect);
      return {
        label: index === 0 ? "前分" : index === 1 ? "后分" : `序位 ${index + 1}`,
        value,
        numericValue: null,
      };
    })
    .filter((item) => item.value !== "");

  return values.length > 0
    ? values
    : [{ label: "前后分", value: "未给出", numericValue: null }];
}

export function buildFiveElementPanels(
  rows: AstrologicalRow[],
  tibetanDate: string
): FiveElementPanel[] {
  return [
    {
      ...PANEL_META.fixedWeekday,
      values: buildNumericValues(rows, "fixedWeekday"),
      tibetanDate,
    },
    {
      ...PANEL_META.solarLunar,
      values: buildNumericValues(rows, "solarLunar"),
      tibetanDate,
    },
    {
      ...PANEL_META.fixedDay,
      values: buildNumericValues(rows, "fixedDay"),
      tibetanDate,
    },
    {
      ...PANEL_META.conjunction,
      values: buildNumericValues(rows, "conjunction"),
      tibetanDate,
    },
    {
      ...PANEL_META.effect,
      values: buildEffectValues(rows),
      tibetanDate,
    },
  ];
}

export function clampStageIndex(index: number, panel: FiveElementPanel): number {
  if (panel.values.length === 0) return 0;
  return Math.min(Math.max(index, 0), panel.values.length - 1);
}
