import test from "node:test";
import assert from "node:assert/strict";

import { fetchCalendarData } from "./calendarApi";

test("calendar API defaults to Lhasa when no city is provided", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  }) as typeof fetch;

  try {
    await fetchCalendarData({ date: "2026-09-14" });
    assert.equal(requestBody?.cityName, "拉萨市");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calendar API preserves an explicitly selected city", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  }) as typeof fetch;

  try {
    await fetchCalendarData({ date: "2026-09-14", cityName: "上海市" });
    assert.equal(requestBody?.cityName, "上海市");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
