"use client";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

import LocalizedText from "@/i18n/LocalizedText";
import React, { useMemo, useState } from "react";

import WorldCityPicker, { type WorldCity } from "@/components/earth/WorldCityPicker";
import { DEFAULT_WORLD_CITY } from "@/constants/cities";

const AnnualMotionEmbed: React.FC = () => {
  const locale = useLocale();
    const [city, setCity] = useState<WorldCity>(DEFAULT_WORLD_CITY);
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
        <div style={{ width: "100%", height: "min(760px, calc(100dvh - 128px))", minHeight: 460, overflow: "hidden", position: "relative" }}>
            <WorldCityPicker side="left" value={city} onSelect={setCity} extraControls={<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}><LocalizedText text={"年份"} /><select value={year} onChange={(event) => setYear(Number(event.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(133,164,255,0.2)", background: "#27344e", color: "#fff" }}>{[2024, 2025, 2026, 2027, 2028].map((item) => <option key={item} value={item}>{item}<LocalizedText text={"年"} /></option>)}</select></label>
                <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}><LocalizedText text={"采样时刻"} /><select value={sampleHour} onChange={(event) => setSampleHour(Number(event.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(133,164,255,0.2)", background: "#27344e", color: "#fff" }}>{[0, 6, 9, 12, 15, 18].map((item) => <option key={item} value={item}>{String(item).padStart(2, "0")}:00</option>)}</select></label>
            </div>} />
            <iframe
                key={iframeSrc}
                src={iframeSrc}
                title={appText(locale, "周年视运动（地心坐标）")}
                style={{
                    display: "block",
                    width: "100%",
                    height: "calc(100% - 184px)",
                    marginTop: 184,
                    border: "none",
                    background: "#000",
                }}
            />
        </div>
    );
};

export default AnnualMotionEmbed;
