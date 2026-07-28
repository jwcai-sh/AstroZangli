// Describes the data for a single planet
export interface PlanetInfo {
    rise: string;
    set: string;
    transit: string;
    declination: string;
}

// Describes the entire object returned from the backend, with planet names as keys
export type PlanetsData = {
    [planetName: string]: PlanetInfo;
};

export interface PlaneApiResponse {
    success: boolean;
    data?: PlanetsData;
    error?: {
        code: string;
        message: string;
        details?: string;
    };
}

// Interface for the parameters required by the fetch function
export interface FetchPlanetsDataParams {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    longitude: number;
    latitude: number;
}

const API_BASE = "/api";

export async function fetchPlanetsData(params: FetchPlanetsDataParams): Promise<PlaneApiResponse["data"]> {
    // 转换为后端期望的格式：date 字符串和 time 字符串
    const body = {
        date: `${params.year}-${String(params.month).padStart(2, '0')}-${String(params.day).padStart(2, '0')}`,
        time: `${String(params.hour).padStart(2, '0')}:${String(params.minute).padStart(2, '0')}`,
        longitude: params.longitude,
        latitude: params.latitude,
    };

    const res = await fetch(`${API_BASE}/planets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const json: PlaneApiResponse = await res.json();

    if (!json.success) {
        throw new Error(json.error?.message || "请求失败");
    }

    return json.data;
}
