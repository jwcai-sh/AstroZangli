import test from "node:test";
import assert from "node:assert/strict";

import { buildEarthStarfield } from "./starfield";

test("buildEarthStarfield creates a stable varied sky", () => {
  const stars = buildEarthStarfield(24);

  assert.equal(stars.length, 24);
  assert.deepEqual(stars[0], {
    left: 8.19,
    top: 20.27,
    opacity: 0.82,
    sizeClass: "star--lg",
    toneClass: "star--warm",
  });
  assert.ok(stars.some((star) => star.sizeClass === "star--md"));
  assert.ok(stars.some((star) => star.sizeClass === "star--sm"));
  assert.ok(stars.some((star) => star.toneClass === "star--cold"));
  assert.ok(stars.every((star) => star.left >= 0 && star.left <= 100));
  assert.ok(stars.every((star) => star.top >= 0 && star.top <= 100));
});
