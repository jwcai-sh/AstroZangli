import assert from "node:assert/strict";
import { buildDayShortcut } from "./mobileShortcuts";

const current = new URLSearchParams("tab=five-elements&data=five-elements&year=2024&month=3&day=30&gdate=2024-04-09&city=上海市");
const next = new URL(buildDayShortcut(current, 1, false)!, "http://localhost").searchParams;
assert.equal(next.get("month"), "4");
assert.equal(next.get("day"), "1");
assert.equal(next.get("city"), "上海市");
assert.equal(next.has("gdate"), false);
assert.equal(buildDayShortcut(new URLSearchParams("year=1950&month=1&day=1"), -1, false), null);
assert.equal(buildDayShortcut(new URLSearchParams("year=2500&month=12&day=30"), 1, true), null);
assert.equal(buildDayShortcut(new URLSearchParams(), 1, false), null);
const prev = new URL(buildDayShortcut(new URLSearchParams("year=2024&month=1&day=1"), -1, true)!, "http://localhost").searchParams;
assert.equal(prev.get("year"), "2023");
assert.equal(prev.get("month"), "12");
assert.equal(prev.get("day"), "30");
