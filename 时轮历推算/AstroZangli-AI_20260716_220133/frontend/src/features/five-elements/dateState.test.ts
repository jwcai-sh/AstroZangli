import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDayOptions,
  clampDay,
  formatApiDate,
  normalizeDateSelection,
} from "./dateState";

test("day helpers keep dropdown values inside the valid days of the selected month", () => {
  assert.deepEqual(buildDayOptions(2026, 2).slice(-3), [26, 27, 28]);
  assert.equal(clampDay(2026, 2, 31), 28);
  assert.equal(clampDay(2024, 2, 31), 29);
});

test("normalizeDateSelection preserves valid inputs and returns API-ready dates", () => {
  const normalized = normalizeDateSelection({ year: 2026, month: 2, day: 31 });

  assert.deepEqual(normalized, { year: 2026, month: 2, day: 28 });
  assert.equal(formatApiDate(normalized), "2026-02-28");
  assert.equal(formatApiDate({ year: 2051, month: 2, day: 11 }), "2051-02-11");
});
