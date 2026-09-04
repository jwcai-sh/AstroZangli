export interface FiveElementsMonthSummary {
  tibetanDateLabel: string;
  accumulativeMonth: number;
  leapRemainder: number;
  weekdayBase: Array<number | string>;
  zeroBase: {
    integer: number | string;
    fractional: number | string;
  };
  solarBase: Array<number | string>;
  isLeapMonth: boolean;
}

export interface FiveElementsDayRow {
  fixedWeekday: number | string;
  lunarPartner: number | string;
  fixedDay: number | string;
  conjunction: number | string;
  effect: string;
}

export interface MonthlyFiveElementsResponse {
  year: number;
  month: number;
  monthSummary: FiveElementsMonthSummary;
  days: Array<{
    day: number;
    gregorianDate: string;
    tibetanDate: string;
    rows: FiveElementsDayRow[];
  }>;
  dailyInteractive: {
    available: boolean;
    message: string;
  };
}

export interface DailyFiveElementsResponse {
  year: number;
  month: number;
  day: number;
  tibetanDateLabel: string;
  gregorianDates: string[];
  monthSummary: FiveElementsMonthSummary;
  rows: FiveElementsDayRow[];
}

export interface MonthlyFiveElementsCompareResponse {
  year: number;
  month: number;
  summary: Array<{
    label: string;
    python: Array<number | string | null>;
    matlabOracle: Array<number | string | null>;
    local: Array<number | string | null>;
    website: Array<number | string | null>;
    matches: boolean;
    pairwiseMatches: {
      pythonMatlab: boolean;
      pythonWebsite: boolean;
      matlabWebsite: boolean;
    };
  }>;
  days: Array<{
    day: number;
    python: {
      fixedWeekday: Array<number | string | null>;
      lunarPartner: Array<number | string | null>;
      fixedDay: Array<number | string | null>;
      conjunction: Array<number | string | null>;
      effect: string[];
    };
    matlabOracle: {
      fixedWeekday: Array<number | string | null>;
      lunarPartner: Array<number | string | null>;
      fixedDay: Array<number | string | null>;
      conjunction: Array<number | string | null>;
    };
    local: {
      fixedWeekday: Array<number | string | null>;
      lunarPartner: Array<number | string | null>;
      fixedDay: Array<number | string | null>;
      conjunction: Array<number | string | null>;
      effect: string[];
    };
    website: {
      fixedWeekday: Array<number | string | null>;
      lunarPartner: Array<number | string | null>;
      fixedDay: Array<number | string | null>;
      conjunction: Array<number | string | null>;
    };
    diffFields: string[];
    pairwiseDiffFields: {
      pythonMatlab: string[];
      pythonWebsite: string[];
      matlabWebsite: string[];
    };
    matches: boolean;
  }>;
  stats: {
    differentSummaryCount: number;
    differentDayCount: number;
    differentPythonMatlabSummaryCount: number;
    differentPythonWebsiteSummaryCount: number;
    differentMatlabWebsiteSummaryCount: number;
    differentPythonMatlabDayCount: number;
    differentPythonWebsiteDayCount: number;
    differentMatlabWebsiteDayCount: number;
  };
  sources: {
    websiteUrl: string;
    websiteLabel: string;
    websiteAvailable?: boolean;
    websiteError?: string;
    pythonAlgorithm: string;
    pythonAlgorithmId: string;
    matlabOracleFile: string;
    matlabOracleMode: string;
    matlabOracleAvailable: boolean;
    localAlgorithm: string;
    localAlgorithmId: string;
    websiteHtmlLength: number;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export async function fetchMonthlyFiveElementsOverview(params: {
  year: number;
  month: number;
}): Promise<MonthlyFiveElementsResponse> {
  const response = await fetch("/api/five-elements/monthly-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = (await response.json()) as ApiEnvelope<MonthlyFiveElementsResponse>;
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "请求失败");
  }

  return json.data;
}

export async function fetchMonthlyFiveElementsCompare(params: {
  year: number;
  month: number;
}, options?: { signal?: AbortSignal }): Promise<MonthlyFiveElementsCompareResponse> {
  const response = await fetch("/api/five-elements/monthly-compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: options?.signal,
  });

  const json = (await response.json()) as ApiEnvelope<MonthlyFiveElementsCompareResponse>;
  if (!response.ok) {
    const detail = json.error?.details ? `：${json.error.details}` : "";
    throw new Error((json.error?.message || `HTTP ${response.status}`) + detail);
  }

  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "请求失败");
  }

  return json.data;
}

export async function fetchDailyFiveElementsDetail(params: {
  year: number;
  month: number;
  day: number;
}): Promise<DailyFiveElementsResponse> {
  const response = await fetch("/api/five-elements/daily-detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = (await response.json()) as ApiEnvelope<DailyFiveElementsResponse>;
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || "请求失败");
  }

  return json.data;
}
