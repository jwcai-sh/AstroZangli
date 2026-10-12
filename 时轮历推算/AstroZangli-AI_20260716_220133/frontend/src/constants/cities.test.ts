import test from "node:test";
import assert from "node:assert/strict";

import * as cities from "./cities";

test("the website default city is Lhasa", () => {
  assert.equal((cities as { DEFAULT_CITY?: string }).DEFAULT_CITY, "拉萨市");
});

test("the astronomy location default uses Lhasa coordinates", () => {
  const location = (cities as { DEFAULT_WORLD_CITY?: { name: string; latitude: number; longitude: number; elevation: number } }).DEFAULT_WORLD_CITY;
  assert.deepEqual(location, {
    id: 1280737,
    name: "Lhasa",
    country: "China",
    admin1: "Tibet",
    timezone: "Asia/Shanghai",
    latitude: 29.647,
    longitude: 91.1175,
    elevation: 3658,
  });
});
