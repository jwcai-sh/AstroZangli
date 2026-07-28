import { NextRequest, NextResponse } from "next/server";

type FestivalResponse =
  | { name: string; date: string; isoDate: string; daysLeft: number }
  | null;

type TibetanFestivalModule = typeof import("@/utils/zanglifestival");
let tibetanFestivalModulePromise: Promise<TibetanFestivalModule> | null = null;
const responseCache = new Map<string, { value: FestivalResponse; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function diffDaysUtc(start: Date, end: Date): number {
  return utcDayNumber(end) - utcDayNumber(start);
}

async function getTibetanFestivalModule() {
  if (!tibetanFestivalModulePromise) {
    tibetanFestivalModulePromise = import("@/utils/zanglifestival");
  }
  return tibetanFestivalModulePromise;
}

function pickFirstFestivalName(raw: string): string {
  const name = raw.trim();
  if (!name) return "";
  const separators = /[、，,/\|]/;
  if (separators.test(name)) {
    return name.split(separators)[0].trim();
  }
  if (name.includes(" ")) {
    return name.split(" ")[0].trim();
  }
  return name;
}

export async function POST(request: NextRequest) {
  try {
    const { year, month, day } = await request.json();
    const yearNum = Number(year);
    const monthNum = Number(month);
    const dayNum = Number(day);

    if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum) || !Number.isFinite(dayNum)) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const selectedDate = new Date(yearNum, monthNum - 1, dayNum);
    const cacheKey = `tibetan:${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const cached = responseCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.value);
    }

    const { getNextTibetanFestival } = await getTibetanFestivalModule();
    const next = getNextTibetanFestival(selectedDate);
    if (!next || !next.gregorianDate) {
      responseCache.set(cacheKey, { value: null, expiresAt: now + CACHE_TTL_MS });
      return NextResponse.json(null);
    }

    const [y, m, d] = next.gregorianDate.split("-").map((v: string) => Number(v));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      responseCache.set(cacheKey, { value: null, expiresAt: now + CACHE_TTL_MS });
      return NextResponse.json(null);
    }

    const festivalDate = new Date(y, m - 1, d);
    const daysLeft = diffDaysUtc(selectedDate, festivalDate);
    const response: FestivalResponse = {
      name: pickFirstFestivalName(next.festival || ""),
      date: `${m}月${d}日`,
      isoDate: next.gregorianDate,
      daysLeft: Math.max(0, daysLeft)
    };

    responseCache.set(cacheKey, { value: response, expiresAt: now + CACHE_TTL_MS });
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
