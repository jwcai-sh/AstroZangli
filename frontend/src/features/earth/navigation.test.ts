import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBasicDataHref,
  getBasicDataGroup,
  getEarthPageIndex,
  getEarthTabLabel,
  resolveCelestialMotionView,
  resolveLunarPhenomenaView,
  resolveBasicDataSubtab,
  resolveSevenStarsSubtab,
} from "./navigation";

test("resolveSevenStarsSubtab accepts the new five-elements subtab and falls back safely", () => {
  assert.equal(resolveSevenStarsSubtab("five-elements"), "five-elements");
  assert.equal(resolveSevenStarsSubtab("seven-data"), "seven-data");
  assert.equal(resolveSevenStarsSubtab("unknown"), "seven-stars");
  assert.equal(resolveSevenStarsSubtab(null), "seven-stars");
});

test("earth page helpers place basic data before seven stars", () => {
  assert.equal(getEarthPageIndex("five-elements"), 1);
  assert.equal(getEarthPageIndex("tibetan-cycle"), 1);
  assert.equal(getEarthPageIndex("seven-stars"), 2);
  assert.equal(getEarthPageIndex("annual-motion"), 3);
  assert.equal(getEarthPageIndex("other"), 0);
  assert.equal(getEarthTabLabel("seven-stars"), "七星轨迹");
  assert.equal(getEarthTabLabel("five-elements"), "天文历算基本数据");
  assert.equal(getEarthTabLabel("tibetan-cycle"), "天文历算基本数据");
  assert.equal(resolveBasicDataSubtab("five-planets"), "five-planets");
  assert.equal(resolveBasicDataSubtab("tibetan-cycle"), "tibetan-cycle");
  assert.equal(resolveBasicDataSubtab("unknown"), "five-elements");
});

test("related sky views share section entries while legacy URLs keep their destinations", () => {
  assert.equal(getEarthPageIndex("celestial-motion"), 3);
  assert.equal(getEarthPageIndex("annual-motion"), 3);
  assert.equal(getEarthPageIndex("seven-stars", "geocentric-motion"), 3);
  assert.equal(resolveCelestialMotionView("annual-motion", null), "annual-motion");
  assert.equal(resolveCelestialMotionView("seven-stars", null, "geocentric-motion"), "geocentric-motion");
  assert.equal(getEarthTabLabel("annual-motion"), "天体运动");

  assert.equal(getEarthPageIndex("lunar-phenomena"), 4);
  assert.equal(getEarthPageIndex("moon-phases"), 4);
  assert.equal(getEarthPageIndex("eclipses"), 4);
  assert.equal(getEarthPageIndex("seven-stars", "sun-earth-moon"), 4);
  assert.equal(resolveLunarPhenomenaView("eclipses", null), "eclipses");
  assert.equal(resolveLunarPhenomenaView("seven-stars", null, "sun-earth-moon"), "sun-earth-moon");
  assert.equal(getEarthTabLabel("eclipses"), "日月运行与历象");
});

test("basic data resolves the five-elements sphere view", () => {
  assert.equal(resolveBasicDataSubtab("five-elements-sphere"), "five-elements-sphere");
});

test("basic data groups values and sphere views by subject", () => {
  assert.equal(resolveBasicDataSubtab("five-planets-sphere"), "five-planets-sphere");
  assert.equal(getBasicDataGroup("five-elements-sphere"), "five-elements");
  assert.equal(getBasicDataGroup("five-planets-sphere"), "five-planets");
  assert.equal(getBasicDataGroup("tibetan-cycle"), "other");
});

test("switching basic data views preserves the selected date and city", () => {
  const current = new URLSearchParams("tab=five-elements&data=five-elements&year=2026&month=8&day=3&mode=daily&gdate=2026-09-14&city=%E4%B8%8A%E6%B5%B7%E5%B8%82");
  const href = buildBasicDataHref("five-planets-sphere", current);
  const target = new URL(href, "http://localhost:3000");
  assert.equal(target.searchParams.get("data"), "five-planets-sphere");
  assert.equal(target.searchParams.get("year"), "2026");
  assert.equal(target.searchParams.get("month"), "8");
  assert.equal(target.searchParams.get("day"), "3");
  assert.equal(target.searchParams.get("gdate"), "2026-09-14");
  assert.equal(target.searchParams.get("city"), "上海市");
});
