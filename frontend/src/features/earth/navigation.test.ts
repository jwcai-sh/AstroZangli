import test from "node:test";
import assert from "node:assert/strict";

import {
  getEarthPageIndex,
  getEarthTabLabel,
  resolveSevenStarsSubtab,
} from "./navigation";

test("resolveSevenStarsSubtab accepts the new five-elements subtab and falls back safely", () => {
  assert.equal(resolveSevenStarsSubtab("five-elements"), "five-elements");
  assert.equal(resolveSevenStarsSubtab("seven-data"), "seven-data");
  assert.equal(resolveSevenStarsSubtab("unknown"), "seven-stars");
  assert.equal(resolveSevenStarsSubtab(null), "seven-stars");
});

test("earth page helpers keep seven-stars and its subtab on the second carousel page", () => {
  assert.equal(getEarthPageIndex("seven-stars"), 1);
  assert.equal(getEarthPageIndex("annual-motion"), 2);
  assert.equal(getEarthPageIndex("other"), 0);
  assert.equal(getEarthTabLabel("seven-stars"), "七星轨迹");
  assert.equal(getEarthTabLabel("tibetan-cycle"), "藏历绕迥纪年");
});
