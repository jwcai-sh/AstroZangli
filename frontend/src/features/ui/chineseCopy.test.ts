import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("visible interface copy uses Chinese while preserving agreed technical names", () => {
  const userPage = source("../../app/user/page.tsx");
  const card = source("../../components/Card.tsx");
  const earthPage = source("../../app/earth/page.tsx");
  const detailsPage = source("../../app/details/[id]/page.tsx");
  const fiveElementsCompare = source("../../app/five-elements-compare/page.tsx");
  const fivePlanetsCompare = source("../../app/five-planets-compare/page.tsx");
  const fiveElementsRange = source("../../app/five-elements-range/page.tsx");
  const calendar = source("../../components/calendar/CalendarBox.tsx");
  const cityPicker = source("../../components/earth/WorldCityPicker.tsx");
  const fiveElementsSphere = source("../../components/seven-stars/FiveElementsSphere.tsx");
  const fivePlanetsSphere = source("../../components/seven-stars/FivePlanetsSphere.tsx");
  const fiveElementsSubtab = source("../../components/seven-stars/FiveElementsSubtab.tsx");
  const fivePlanetsSubtab = source("../../components/seven-stars/FivePlanetsSubtab.tsx");
  const starsPage = source("../../components/seven-stars/page.tsx");
  const calendarPage = source("../../app/cal/page.tsx");
  const calendarApi = source("../../services/calendarApi.ts");
  const planeApi = source("../../services/planeApi.ts");
  const chatApi = source("../../services/chatApi.ts");
  const fiveElementsApi = source("../../services/fiveElementsApi.ts");

  for (const [content, forbidden] of [
    [userPage, />Location<|>Notifications<|>Contact us<|>Log out<|Version 2\.0|aria-label="toggle notifications"|alex, egypt|Ziad Hamdy|zizo\.hamdy016|>EN<|clicked!/],
    [card, />\s*Read more\s*</],
    [earthPage, /Loading\.\.\./],
    [detailsPage, /Card not found\.|Back to docs/],
    [fiveElementsCompare, /COMPARE WORKSPACE|HTTP/],
    [fivePlanetsCompare, /ASTRONOMICAL CALENDAR DATA \/ FIVE PLANETS|HTTP \$\{/],
    [fiveElementsRange, /YEAR RANGE COMPARISON|HTTP \$\{/],
    [calendar, /aria-label="Previous month"|aria-label="Next month"|>selected</],
    [cityPicker, /GMT\+8 Shanghai|value\.timezone\.replace/],
    [fiveElementsSphere, /KĀLACAKRA · DAILY SPHERE|python_final/],
    [fivePlanetsSphere, /KĀLACAKRA · FIVE PLANETS/],
    [fiveElementsSubtab, /Earth \/ Seven Stars/],
    [fivePlanetsSubtab, /Earth \/ Astronomical Calendar Data|HTTP \$\{/],
    [starsPage, /title="qixingguiji"/],
    [calendarPage, /HTTP \$\{/],
    [calendarApi, /HTTP/],
    [planeApi, /HTTP/],
    [chatApi, /HTTP/],
    [fiveElementsApi, /HTTP/],
  ] as const) {
    assert.doesNotMatch(content, forbidden);
  }

  assert.match(fiveElementsCompare, /Python V3/);
  assert.match(fivePlanetsCompare, /Python V4/);
  assert.match(fiveElementsRange, /Python v2/);
});
