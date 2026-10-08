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
    tibetanDate: {
      year: number;
      month: number;
      day: number;
      label: string;
    } | null;
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

export type AstronomyEventType =
  | "new_moon" | "full_moon"
  | "solar_partial" | "solar_total" | "solar_annular" | "solar_hybrid"
  | "lunar_partial" | "lunar_total" | "lunar_penumbral";

export type CalendarDisplayMode = "astronomy" | "tibetan";
export type CalendarEventType = AstronomyEventType | "tibetan_festival";

export interface MonthlyCalendarEvent {
  date: string;
  type: CalendarEventType;
  label: string;
  time?: string;
  tibetanDate?: string;
}

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

export async function fetchMonthlyAstronomyEvents(year: number, month: number): Promise<MonthlyCalendarEvent[]> {
  const response = await fetch(`${API_BASE}/calendar/monthly-astronomy-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month }),
  });
  const json = await response.json() as { success: boolean; data?: { events?: MonthlyCalendarEvent[] }; error?: { message?: string } };
  if (!response.ok || !json.success) throw new Error(json.error?.message || `HTTP ${response.status}`);
  return json.data?.events || [];
}

export async function fetchMonthlyTibetanFestivals(year: number, month: number): Promise<MonthlyCalendarEvent[]> {
  const response = await fetch(`${API_BASE}/calendar/monthly-tibetan-festivals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month }),
  });
  const json = await response.json() as { success: boolean; data?: { events?: MonthlyCalendarEvent[] }; error?: { message?: string } };
  if (!response.ok || !json.success) throw new Error(json.error?.message || `HTTP ${response.status}`);
  return json.data?.events || [];
}
