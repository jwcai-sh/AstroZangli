import { NextRequest, NextResponse } from "next/server";

type FestivalResponse =
  | { name: string; date: string; isoDate: string; daysLeft: number }
  | null;

type LunarCalendarDateInfo = {
  year: number;
  month: number;
  day: number;
  solarFestival?: string;
  lunarFestival?: string;
};

type LunarCalendarMonthData = {
  monthData?: LunarCalendarDateInfo[];
};

type LunarCalendarApi = {
  calendar: (year: number, month: number, includeLunar: boolean) => LunarCalendarMonthData;
};

let lunarCalendarModulePromise: Promise<LunarCalendarApi> | null = null;
const responseCache = new Map<string, { value: FestivalResponse; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function diffDaysUtc(start: Date, end: Date): number {
  return utcDayNumber(end) - utcDayNumber(start);
}

// 延迟加载模块，避免构建时解析问题
async function getLunarCalendar() {
  try {
    if (!lunarCalendarModulePromise) {
      lunarCalendarModulePromise = import("lunar-calendar").then((mod: unknown) => {
        const withDefault = mod as { default?: unknown };
        const candidate = withDefault.default ?? mod;
        return candidate as unknown as LunarCalendarApi;
      });
    }
    return await lunarCalendarModulePromise;
  } catch (error) {
    console.error("无法加载 lunar-calendar 模块:", error);
    throw new Error("无法加载 lunar-calendar 模块");
  }
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

    // 在运行时加载模块
    const calendar = await getLunarCalendar();

    const selectedDate = new Date(yearNum, monthNum - 1, dayNum);
    const cacheKey = `lunar:${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const cached = responseCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.value);
    }

    const currentYear = yearNum;
    const currentMonth = monthNum;
    const currentDay = dayNum;

    // 最多查找未来2年的数据
    const maxMonths = 24;
    let monthsChecked = 0;

    // 从当前月份开始查找
    let checkYear = currentYear;
    let checkMonth = currentMonth;

    while (monthsChecked < maxMonths) {
      try {
        // 获取该月的日历数据
        const monthData = calendar.calendar(checkYear, checkMonth, false);

        if (monthData && monthData.monthData && Array.isArray(monthData.monthData)) {
          // 遍历该月的每一天
          for (const dateInfo of monthData.monthData) {
            const dateYear = dateInfo.year;
            const dateMonth = dateInfo.month;
            const dateDay = dateInfo.day;
            const lunarFestival = dateInfo.lunarFestival;

            // 如果是当前月份，跳过选中日期之前的日期
            if (checkYear === currentYear && checkMonth === currentMonth && dateDay < currentDay) {
              continue;
            }

            // 检查是否有农历节日
            if (lunarFestival && lunarFestival.trim() !== "") {
              const festivalDate = new Date(dateYear, dateMonth - 1, dateDay);
              const daysLeft = diffDaysUtc(selectedDate, festivalDate);
              if (daysLeft >= 0) {

                // 格式化日期显示 - 使用公历日期（因为用户看到的是公历日期）
                const dateStr = `${dateMonth}月${dateDay}日`;
                const isoDate = `${dateYear}-${String(dateMonth).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`;

                const response: FestivalResponse = {
                  name: lunarFestival,
                  date: dateStr,
                  isoDate,
                  daysLeft,
                };
                responseCache.set(cacheKey, { value: response, expiresAt: now + CACHE_TTL_MS });
                return NextResponse.json(response);
              }
            }
          }
        }

        // 移动到下一个月
        checkMonth++;
        if (checkMonth > 12) {
          checkMonth = 1;
          checkYear++;
        }
        monthsChecked++;
      } catch {
        // 如果获取数据失败，继续查找下一个月
        checkMonth++;
        if (checkMonth > 12) {
          checkMonth = 1;
          checkYear++;
        }
        monthsChecked++;
      }
    }

    // 如果2年内都没找到，返回 null
    responseCache.set(cacheKey, { value: null, expiresAt: now + CACHE_TTL_MS });
    return NextResponse.json(null);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "服务器错误";
    console.error("获取农历节日失败:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

