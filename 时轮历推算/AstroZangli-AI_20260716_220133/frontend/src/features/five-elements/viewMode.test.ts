import test from "node:test";
import assert from "node:assert/strict";

import { resolveFiveElementsViewMode } from "./viewMode";

test("resolveFiveElementsViewMode defaults to monthly and accepts daily placeholder mode", () => {
  assert.equal(resolveFiveElementsViewMode("monthly"), "monthly");
  assert.equal(resolveFiveElementsViewMode("daily"), "daily");
  assert.equal(resolveFiveElementsViewMode("other"), "monthly");
  assert.equal(resolveFiveElementsViewMode(null), "monthly");
});
