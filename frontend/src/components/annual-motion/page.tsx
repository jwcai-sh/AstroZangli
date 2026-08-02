"use client";

import React, { useMemo, useState } from "react";

import WorldCityPicker, { type WorldCity } from "@/components/earth/WorldCityPicker";

const DEFAULT_CITY: WorldCity = {
    id: 1796236,
    name: "Shanghai",
    country: "China",
    admin1: "Shanghai",
    timezone: "Asia/Shanghai",
    latitude: 31.2304,
    longitude: 121.4737,
    elevation: 4,
};

const AnnualMotionEmbed: React.FC = () => {
    const [city, setCity] = useState<WorldCity>(DEFAULT_CITY);
    const [year, setYear] = useState(2026);
    const [sampleHour, setSampleHour] = useState(12);
    const iframeSrc = useMemo(() => {
        const params = new URLSearchParams({
            lat: String(city.latitude),
            lon: String(city.longitude),
            city: city.name,
            tz: city.timezone ?? "Asia/Shanghai",
            year: String(year),
            hour: String(sampleHour),
        });
        if (typeof city.elevation === "number") params.set("alt", String(city.elevation));
        return `/api/annual-motion-view?${params.toString()}`;
    }, [city, sampleHour, year]);

    return (
        <div style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>
            <WorldCityPicker side="left" value={city} onSelect={setCity} extraControls={<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>年份<select value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(133,164,255,0.2)", background: "#27344e", color: "#fff" }}>{[2024, 2025, 2026, 2027, 2028].map((item) => <option key={item} value={item}>{item}年</option>)}</select></label>
                <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>采样时刻<select value={sampleHour} onChange={(event) => setSampleHour(Number(event.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(133,164,255,0.2)", background: "#27344e", color: "#fff" }}>{[0, 6, 9, 12, 15, 18].map((item) => <option key={item} value={item}>{String(item).padStart(2, "0")}:00</option>)}</select></label>
            </div>} />
            <iframe
                key={iframeSrc}
                src={iframeSrc}
                title="周年视运动（地心坐标）"
                style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    background: "#000",
                }}
            />
        </div>
    );
};

export default AnnualMotionEmbed;
