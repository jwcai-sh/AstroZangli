export interface CalendarApiResponse {
  success: boolean;
  data?: {
    selectedDate: string;
    selectedCity: string;
    location: { latitude: number; longitude: number; altitude: number };
    dateEvents: {
      lunarInfo: { fullDate: string };
      solarInfo: { fullDate: string };
      tibetanInfo: { fullDate: string };
      events?: {
        solarHoliday?: { name: string; date: string; daysLeft: number };
        lunarHoliday?: { name: string; date: string; daysLeft: number };
        tibetanHoliday?: { name: string; date: string; daysLeft: number };
      };
    };
    astrologicalTable: {
      tibetanDate: string;
      tableData: Array<{
        fixedWeekday: number | string;
        solarLunar: number | string;
        fixedDay: number | string;
        conjunction: number | string;
        effect?: string;
      }>;
    };
    moonPhase: {
      lunarDate: string;
      lunar_day: number; // 农历日期（1-30）
      observationTime: string;
      illumination: number; // 照明度（0-1，实际是百分比）
      culminationTime: string;
      moonriseTime: string;
      moonsetTime: string;
      phaseName: string;
      phaseAngle: number;
    };
    planetaryChart: {
      solarDate: string;
      constellation: string;
      riseTime: string;
      setTime: string;
      transitTime: string;
      zodiacPosition: { sign: string; degree: number; minute: number };
    };
  };
  error?: { code: string; message: string; details?: string };
}

const API_BASE = "/api";

export async function fetchCalendarData(params?: { date?: string; cityName?: string }): Promise<CalendarApiResponse["data"]> {
  const body = {
    date: params?.date,
    cityName: params?.cityName || "上海市"
  };

  const res = await fetch(`${API_BASE}/calendar/date-comprehensive-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json: CalendarApiResponse = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "请求失败");
  }
  return json.data!;
}


