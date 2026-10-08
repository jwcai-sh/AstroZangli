import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSphereValue,
  buildConjunctionFormula,
  mansionDegrees,
  mixedValue,
} from "./fiveElementsGeometry";

test("buildSphereValue exposes mansion index, progress, and display angle", () => {
  const value = buildSphereValue([8, 30, 0, 0, 0]);

  assert.equal(value.mansionIndex, 8);
  assert.equal(value.mansionProgress, 0.5);
  assert.equal(value.angle, mansionDegrees([8, 30, 0, 0, 0]));
  assert.equal(value.label, "宿 8 · 50.000%");
});

test("buildConjunctionFormula keeps the moon plus sun relationship explicit", () => {
  const moon = mixedValue([15, 0, 0, 0, 0]);
  const sun = mixedValue([8, 30, 0, 0, 0]);
  const formula = buildConjunctionFormula(moon, sun);

  assert.equal(formula.rawSum, 23.5);
  assert.equal(formula.wrappedMansion, 23.5);
  assert.equal(formula.label, "15.000000 + 8.500000 = 23.500000");
});
