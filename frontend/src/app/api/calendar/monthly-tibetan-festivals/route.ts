import { NextRequest, NextResponse } from "next/server";

type TibetanFestivalModule = typeof import("@/utils/zanglifestival");
let tibetanFestivalModulePromise: Promise<TibetanFestivalModule> | null = null;

async function getTibetanFestivalModule() {
  if (!tibetanFestivalModulePromise) {
    tibetanFestivalModulePromise = import("@/utils/zanglifestival");
  }
  return tibetanFestivalModulePromise;
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function festivalLabel(extraInfo: string, festival: string): string {
  return [extraInfo, festival]
    .map((value) => value.replace(/<br\s*\/?>/gi, "、").trim())
    .filter(Boolean)
    .join("、");
}

export async function POST(request: NextRequest) {
  try {
    const { year, month } = await request.json();
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ success: false, error: { message: "年份或月份无效" } }, { status: 400 });
    }

    const { getZangli } = await getTibetanFestivalModule();
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const events = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const tibetan = getZangli(new Date(yearNum, monthNum - 1, day));
      if (!("day_d" in tibetan) || tibetan.dayLeap_d) return null;
      const label = festivalLabel(tibetan.extraInfo || "", tibetan.festival || "");
      if (!label) return null;
      return {
        date: formatDate(yearNum, monthNum, day),
        type: "tibetan_festival",
        label,
        tibetanDate: tibetan.value,
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, data: { year: yearNum, month: monthNum, events } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
