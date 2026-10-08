import test from "node:test";
import assert from "node:assert/strict";

import { buildFivePlanetPositions } from "./fivePlanetsGeometry";

test("five-planet sphere uses the final fast-position field and each planet's radix", () => {
  const positions = buildFivePlanetPositions([
    { name: "迟行定数", columns: [{ label: "火曜", values: [3, 0, 0, 0, 0] }] },
    { name: "疾行定数", columns: [
      { label: "火曜", values: [13, 30, 0, 0, 0, 0] },
      { label: "水曜", values: [6, 45, 0, 0, 0, 0] },
    ] },
  ]);
  assert.equal(positions.length, 2);
  assert.equal(positions[0].name, "火曜");
  assert.equal(positions[0].angle, 180);
  assert.equal(positions[0].mansion, 13.5);
  assert.equal(positions[1].name, "水曜");
  assert.equal(positions[1].angle, 90);
});

test("five-planet sphere does not invent positions from missing data", () => {
  assert.deepEqual(buildFivePlanetPositions([]), []);
  assert.deepEqual(buildFivePlanetPositions([{ name: "疾行定数", columns: [{ label: "火曜", values: [null] }] }]), []);
});

test("the fifth place uses each planet's own unit", () => {
  const positions = buildFivePlanetPositions([{ name: "疾行定数", columns: [
    { label: "火曜", values: [0, 0, 0, 0, 229, 0] },
    { label: "水曜", values: [0, 0, 0, 0, 229, 0] },
  ] }]);
  assert.ok(Math.abs(positions[0].angle - 1 / 1620) < 1e-12);
  assert.ok(Math.abs(positions[1].angle - 229 / (1620 * 8797)) < 1e-12);
});
