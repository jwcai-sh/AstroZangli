import test from "node:test";
import assert from "node:assert/strict";

import { buildFiveElementPanels, clampStageIndex } from "./model";

const SAMPLE_ROWS = [
  { fixedWeekday: 6, solarLunar: 15, fixedDay: 8, conjunction: 24, effect: "孺蜜" },
  { fixedWeekday: 43, solarLunar: 49, fixedDay: 26, conjunction: 15, effect: "贵种" },
  { fixedWeekday: 4, solarLunar: 0, fixedDay: 4, conjunction: 5, effect: "" },
  { fixedWeekday: 4, solarLunar: 0, fixedDay: 5, conjunction: 0, effect: "" },
  { fixedWeekday: 44, solarLunar: 59, fixedDay: 37, conjunction: 29, effect: "" },
  { fixedWeekday: 390, solarLunar: 317, fixedDay: "", conjunction: 317, effect: "" },
];

test("buildFiveElementPanels returns ordered panels and filters empty effect values", () => {
  const panels = buildFiveElementPanels(SAMPLE_ROWS, "火马年 七月初九");

  assert.equal(panels.length, 5);
  assert.deepEqual(
    panels.map((panel) => panel.id),
    ["fixedWeekday", "solarLunar", "fixedDay", "conjunction", "effect"]
  );

  const effectPanel = panels.find((panel) => panel.id === "effect");

  assert.ok(effectPanel);
  assert.deepEqual(
    effectPanel.values.map((item) => item.value),
    ["孺蜜", "贵种"]
  );
  assert.equal(effectPanel.metricLabel, "前后分");
});

test("clampStageIndex keeps the active node inside current panel bounds", () => {
  const panels = buildFiveElementPanels(SAMPLE_ROWS, "火马年 七月初九");
  const weekdayPanel = panels[0];
  const effectPanel = panels[4];

  assert.equal(clampStageIndex(-3, weekdayPanel), 0);
  assert.equal(clampStageIndex(999, weekdayPanel), weekdayPanel.values.length - 1);
  assert.equal(clampStageIndex(5, effectPanel), effectPanel.values.length - 1);
});
