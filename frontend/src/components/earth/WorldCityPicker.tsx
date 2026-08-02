"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type WorldCity = {
  id: number;
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
};

type Props = {
  value: WorldCity;
  onSelect: (city: WorldCity) => void;
  extraControls?: React.ReactNode;
  side?: "left" | "right";
};

function buildLabel(city: WorldCity) {
  const names: Record<string, string> = {
    Shanghai: "上海", Tianjin: "天津", Beijing: "北京", London: "伦敦", "New York": "纽约", Tokyo: "东京", Paris: "巴黎", Sydney: "悉尼",
    Cairo: "开罗", Nairobi: "内罗毕", "Cape Town": "开普敦", Moscow: "莫斯科", Berlin: "柏林", Madrid: "马德里", Rome: "罗马", Istanbul: "伊斯坦布尔", Dubai: "迪拜", Delhi: "德里", Bangkok: "曼谷", Singapore: "新加坡", Seoul: "首尔", Jakarta: "雅加达", Manila: "马尼拉", Canberra: "堪培拉", Wellington: "惠灵顿", "Mexico City": "墨西哥城", "Sao Paulo": "圣保罗", "Buenos Aires": "布宜诺斯艾利斯", Lima: "利马", Toronto: "多伦多", "Los Angeles": "洛杉矶", Honolulu: "檀香山", Reykjavik: "雷克雅未克", Oslo: "奥斯陆", Stockholm: "斯德哥尔摩", Helsinki: "赫尔辛基", Warsaw: "华沙", Vienna: "维也纳", Athens: "雅典", Lisbon: "里斯本", Brussels: "布鲁塞尔", Amsterdam: "阿姆斯特丹", Zurich: "苏黎世", Prague: "布拉格", Budapest: "布达佩斯", Copenhagen: "哥本哈根", Dublin: "都柏林", "Kuala Lumpur": "吉隆坡", Hanoi: "河内", Kathmandu: "加德满都", Colombo: "科伦坡", Dhaka: "达卡", Karachi: "卡拉奇", Doha: "多哈", Riyadh: "利雅得", "Tel Aviv": "特拉维夫"
  };
  const countries: Record<string, string> = { China: "中国", "United Kingdom": "英国", "United States": "美国", Japan: "日本", France: "法国", Australia: "澳大利亚", Egypt: "埃及", Germany: "德国", Russia: "俄罗斯", Italy: "意大利", Spain: "西班牙", India: "印度", Thailand: "泰国", Singapore: "新加坡", Canada: "加拿大", Brazil: "巴西", Mexico: "墨西哥", Norway: "挪威", Sweden: "瑞典", Finland: "芬兰", Greece: "希腊", Portugal: "葡萄牙", Netherlands: "荷兰", Ireland: "爱尔兰", Vietnam: "越南", Indonesia: "印度尼西亚", Philippines: "菲律宾", Turkey: "土耳其", Qatar: "卡塔尔", Israel: "以色列" };
  return [names[city.name] ?? city.name, city.country && (countries[city.country] ?? city.country)].filter(Boolean).join(", ");
}

export default function WorldCityPicker({ value, onSelect, extraControls, side = "right" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [apiCities, setApiCities] = useState<WorldCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cities = useMemo<WorldCity[]>(() => [
    value,
    { id: 1792947, name: "Tianjin", country: "China", admin1: "Tianjin", timezone: "Asia/Shanghai", latitude: 39.1394, longitude: 117.1767, elevation: 11 },
    { id: 1816670, name: "Beijing", country: "China", admin1: "Beijing", timezone: "Asia/Shanghai", latitude: 39.9042, longitude: 116.4074, elevation: 43 },
    { id: 2643743, name: "London", country: "United Kingdom", timezone: "Europe/London", latitude: 51.5074, longitude: -0.1278, elevation: 11 },
    { id: 5128581, name: "New York", country: "United States", timezone: "America/New_York", latitude: 40.7128, longitude: -74.006, elevation: 10 },
    { id: 1850147, name: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", latitude: 35.6762, longitude: 139.6503, elevation: 40 },
    { id: 2988507, name: "Paris", country: "France", timezone: "Europe/Paris", latitude: 48.8566, longitude: 2.3522, elevation: 35 },
    { id: 2147714, name: "Sydney", country: "Australia", timezone: "Australia/Sydney", latitude: -33.8688, longitude: 151.2093, elevation: 58 },
  ...apiCities,
  ].filter((city, index, all) => all.findIndex((item) => item.id === city.id) === index), [apiCities, value]);

  useEffect(() => {
    if (apiCities.length > 0) return;
    const cached = window.localStorage.getItem("astrozangli-global-cities-v1");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as WorldCity[];
        if (parsed.length) { setApiCities(parsed); return; }
      } catch { /* ignore invalid cache */ }
    }
    const capitals = ["Cairo", "Nairobi", "Cape Town", "Moscow", "Berlin", "Madrid", "Rome", "Istanbul", "Dubai", "Delhi", "Bangkok", "Singapore", "Seoul", "Jakarta", "Manila", "Canberra", "Wellington", "Mexico City", "Sao Paulo", "Buenos Aires", "Lima", "Toronto", "Los Angeles", "Honolulu", "Reykjavik", "Oslo", "Stockholm", "Helsinki", "Warsaw", "Vienna", "Athens", "Lisbon", "Brussels", "Amsterdam", "Zurich", "Prague", "Budapest", "Copenhagen", "Dublin", "Kuala Lumpur", "Hanoi", "Kathmandu", "Colombo", "Dhaka", "Karachi", "Doha", "Riyadh", "Tel Aviv"];
    const controller = new AbortController();
    setCitiesLoading(true);
    Promise.all(capitals.map(async (name) => {
      const params = new URLSearchParams({ name, count: "1", language: "zh", format: "json" });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal: controller.signal });
      if (!response.ok) return null;
      const data = await response.json() as { results?: WorldCity[] };
      return data.results?.[0] ?? null;
    })).then((items) => {
      const loaded = items.filter((item): item is WorldCity => Boolean(item));
      setApiCities(loaded);
      if (loaded.length) window.localStorage.setItem("astrozangli-global-cities-v1", JSON.stringify(loaded));
    }).catch(() => undefined).finally(() => setCitiesLoading(false));
    return () => controller.abort();
  }, [apiCities.length]);

  const locationLabel = value.timezone ? `位置 (${value.timezone.replace("Asia/", "GMT+8 ")})` : "位置";
  const formatCoordinate = (coordinate: number, positive: string, negative: string) => {
    const direction = coordinate >= 0 ? positive : negative;
    return `${Math.abs(coordinate).toFixed(2)}° ${direction}`;
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        top: 12,
        [side]: 16,
        zIndex: 30,
        width: "min(440px, calc(100vw - 32px))",
      }}
      >
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          background: "rgba(8, 18, 34, 0.86)",
          border: "1px solid rgba(133, 164, 255, 0.28)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
          backdropFilter: "blur(14px)",
        }}
      >
        {extraControls ? <div style={{ borderRadius: 12, padding: "10px 12px", marginBottom: 10, background: "rgba(20, 31, 52, 0.92)", border: "1px solid rgba(133,164,255,0.16)" }}>{extraControls}</div> : null}
        <button type="button" onClick={() => setExpanded((current) => !current)} style={{ width: "100%", border: "none", background: "transparent", color: "#fff", textAlign: "left", cursor: "pointer", padding: "12px 16px" }}>
          <div style={{ fontSize: "clamp(14px, 2vw, 18px)", fontWeight: 600 }}>{locationLabel}</div>
          <div style={{ marginTop: 4, color: "rgba(255,255,255,0.65)", fontSize: "clamp(12px, 1.7vw, 14px)" }}>
            {formatCoordinate(value.latitude, "北", "南")} · {formatCoordinate(value.longitude, "东", "西")}
          </div>
        </button>
        {expanded ? <div style={{ padding: "0 12px 12px" }}>
          <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(39, 52, 78, 0.78)", color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.7 }}>
            <div style={{ fontSize: 16, marginBottom: 5 }}>位置</div>
            <div><span style={{ display: "inline-block", width: 54, color: "rgba(255,255,255,0.65)" }}>地区</span>{value.timezone ?? "—"}</div>
            <div><span style={{ display: "inline-block", width: 54, color: "rgba(255,255,255,0.65)" }}>纬度</span>{value.latitude.toFixed(2)}° ({formatCoordinate(value.latitude, "北", "南")})</div>
            <div><span style={{ display: "inline-block", width: 54, color: "rgba(255,255,255,0.65)" }}>经度</span>{value.longitude.toFixed(2)}° ({formatCoordinate(value.longitude, "东", "西")})</div>
            <div><span style={{ display: "inline-block", width: 54, color: "rgba(255,255,255,0.65)" }}>海拔</span>{typeof value.elevation === "number" ? `${Math.round(value.elevation)} 米` : "—"}</div>
          </div>
          <select value={value.id} onChange={(event) => { const city = cities.find((item) => item.id === Number(event.target.value)); if (city) onSelect(city); }} style={{ width: "100%", boxSizing: "border-box", marginTop: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(133,164,255,0.2)", outline: "none", background: "#27344e", color: "#fff", fontSize: 14 }} aria-label="选择城市">
            {cities.map((city) => <option key={city.id} value={city.id}>{buildLabel(city)}</option>)}
          </select>
          {citiesLoading ? <div style={{ marginTop: 6, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>正在从 Open-Meteo 导入全球城市…</div> : null}
          <button type="button" onClick={() => setExpanded(false)} style={{ width: "100%", marginTop: 10, padding: "10px 14px", border: "none", borderRadius: 10, background: "#3eaa87", color: "#fff", fontSize: 14, cursor: "pointer" }}>使用位置</button>
          <button type="button" disabled style={{ width: "100%", marginTop: 8, padding: "10px 14px", border: "none", borderRadius: 10, background: "rgba(164,168,184,0.55)", color: "rgba(255,255,255,0.78)", fontSize: 14 }}>固定坐标</button>
        </div> : null}
      </div>
    </div>
  );
}
