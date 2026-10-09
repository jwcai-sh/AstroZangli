import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMonthlyDayCards,
  buildMonthlySummaryCards,
  buildMonthlyTitle,
} from "./monthlyOverview";

const MONTHLY_RESPONSE = {
  year: 2026,
  month: 8,
  monthSummary: {
    tibetanDateLabel: "火马年 八月",
    accumulativeMonth: 25052,
    leapRemainder: 34,
    weekdayBase: [5, 3, 22, 2, 302],
    zeroBase: { integer: 17, fractional: 72 },
    solarBase: [7, 51, 29, 3, 21],
  },
  days: [
    {
      day: 1,
      gregorianDate: "2026-09-12",
      tibetanDate: "火马年 八月初一",
      rows: [
        { fixedWeekday: 5, lunarPartner: 8, fixedDay: 7, conjunction: 16, effect: "孺蜜" },
      ],
    },
    {
      day: 3,
      gregorianDate: "2026-09-14",
      tibetanDate: "火马年 八月初三",
      rows: [
        { fixedWeekday: 6, lunarPartner: 9, fixedDay: 7, conjunction: 17, effect: "贵种" },
      ],
    },
  ],
};

test("buildMonthlySummaryCards exposes reference-style summary groups", () => {
  const cards = buildMonthlySummaryCards(MONTHLY_RESPONSE.monthSummary);

  assert.deepEqual(cards.map((card) => card.title), [
    "积月闰余",
    "曜基数",
    "整零数",
    "太阳基数",
  ]);
  assert.deepEqual(cards[0].values, ["25052", "34"]);
  assert.deepEqual(cards[2].values, ["17", "72"]);
});

test("monthly overview helpers build title and daily cards for the grid", () => {
  assert.equal(buildMonthlyTitle(2026, "火马年 八月"), "公元2026年藏历火马年八月");

  const cards = buildMonthlyDayCards(MONTHLY_RESPONSE.days);

  assert.equal(cards.length, 2);
  assert.equal(cards[0].dayLabel, "1 日");
  assert.equal(cards[0].tibetanDate, "火马年 八月初一");
  assert.equal(cards[0].gregorianDate, "2026-09-12");
  assert.equal(cards[0].rows[0].lunarPartner, 8);
  assert.equal(cards[1].dayLabel, "3 日");
  assert.equal(cards[1].rows[0].effect, "贵种");
});
