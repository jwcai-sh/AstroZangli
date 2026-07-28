"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import Image from "next/image";

// 定义行星数据接口
interface PlanetInfo {
    rise: string;
    transit: string;
    set: string;
    declination: string;
}

// 定义行星数据类型
type PlanetData = Record<string, PlanetInfo>;

// ✅ 演示数据
const demoData: PlanetData = {
    "太阳": { rise: "05 : 11 : 52", transit: "12 : 00 : 21", set: "18 : 40 : 12", declination: "17.582549" },
    "月球": { rise: "04 : 05 : 23", transit: "11 : 12 : 48", set: "17 : 54 : 09", declination: "19.482000" },
    "水星": { rise: "05 : 45 : 13", transit: "12 : 09 : 42", set: "18 : 33 : 21", declination: "8.923451" },
    "金星": { rise: "06 : 15 : 01", transit: "12 : 33 : 12", set: "18 : 51 : 22", declination: "-2.145325" },
    "火星": { rise: "02 : 12 : 41", transit: "09 : 21 : 09", set: "16 : 29 : 37", declination: "4.231123" },
    "木星": { rise: "19 : 22 : 15", transit: "01 : 55 : 34", set: "08 : 28 : 53", declination: "-15.678901" },
    "土星": { rise: "22 : 11 : 34", transit: "04 : 35 : 01", set: "10 : 58 : 28", declination: "-10.234789" },
};

export default function PlanetCalculator() {
    const [formData, setFormData] = useState({
        latitude: "30.67",
        longitude: "104.06",
        date: "",
        time: "",
        altitude: "500",
    });

    const [planetsData, setPlanetsData] = useState<PlanetData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().slice(0, 5);
        setFormData((prev) => ({ ...prev, date: dateStr, time: timeStr }));
        setPlanetsData(demoData);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setPlanetsData(null);
        try {
            const res = await axios.post("/api/planets", {
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                date: formData.date,
                time: formData.time,
            });

            if (res.data && res.data.success) {
                const responseData = res.data.data;
                // ✅ 转换为 demoData 格式
                const formattedData: PlanetData = {};
                for (const planet of Object.keys(responseData)) {
                    const p = responseData[planet];
                    const declination = Number(p.declination);
                    formattedData[planet] = {
                        rise: p.rise || "-- : -- : --",
                        transit: p.transit || "-- : -- : --",
                        set: p.set || "-- : -- : --",
                        declination: Number.isFinite(declination) ? declination.toFixed(6) : "--",
                    };
                }
                setPlanetsData(formattedData);
            } else {
                throw new Error(res.data?.error?.message || "获取行星数据失败");
            }
        } catch (err) {
            let errorMessage = "获取行星数据失败，请稍后再试。";
            if (axios.isAxiosError(err) && err.response) {
                errorMessage = err.response.data?.error?.message || err.message;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-start pt-4 pb-2 overflow-hidden">
            {/* 背景 */}
            <div className="absolute inset-0 bg-[url('/stars-bg.png')] bg-cover bg-center opacity-40 pointer-events-none"></div>

            {/* 输入表单 */}
            <form
                onSubmit={handleSubmit}
                className="relative z-10 mt-2 w-[92%] max-w-2xl backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl px-0 py-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-sm"
            >
                <div className="flex items-end gap-2">
                    {/* 左侧 80% 输入框 */}
                    <div className="w-4/5 space-y-1 px-3">
                        {[
                            ["纬度 Latitude", "latitude"],
                            ["经度 Longitude", "longitude"],
                            ["日期 Date", "date"],
                            ["时间 Time(HH:MM)", "time"],
                            ["海拔 Altitude", "altitude"],
                        ].map(([label, name]) => (
                            <div key={name}>
                                <label className="block text-xs mb-1 opacity-80">{label}</label>
                                <input
                                    type={name === "date" ? "date" : name === "time" ? "time" : "text"}
                                    name={name}
                                    value={formData[name as keyof typeof formData] || ""}
                                    onChange={handleChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-full px-2 py-1.5 text-left text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 text-sm"
                                    required={name !== "altitude"}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 右侧 20% 图片按钮 */}
                    <div className="w-1/5 flex justify-center">
                        <button type="submit" disabled={loading} className="p-0 bg-transparent border-none">
                            <Image
                                src="/pho/箭头.png"
                                alt={loading ? "计算中..." : "开始计算"}
                                width={80}
                                height={80}
                                className="w-full h-auto"
                            />
                        </button>
                    </div>
                </div>
            </form>



            <div className="relative z-10 my-2 w-[92%] max-w-md border-t border-white/20"></div>
            {/* 表头按钮风格 */}
            <div className="grid grid-cols-5 gap-2 text-center mb-2">
                {['行星', '升起', '中天', '落下', '赤纬角'].map((title) => (
                    <div
                        key={title}
                        className="bg-[rgb(90,89,122)] text-white text-xs py-1 px-3 rounded-full cursor-default select-none"
                    >
                        {title}
                    </div>
                ))}
            </div>

            {/* 行星数据表 */}
            {planetsData && (
                <div className="p-3 text-sm">
                    <div className="space-y-0.5 text-xs text-gray-100">
                        {Object.entries(planetsData).map(([planet, d]) => (
                            <div
                                key={planet}
                                className="grid grid-cols-5 gap-0.5 text-center py-0.5 rounded hover:bg-white/5 transition"
                            >
                                <span className="whitespace-nowrap">{planet}</span>
                                <span className="whitespace-nowrap">{d.rise}</span>
                                <span className="whitespace-nowrap">{d.transit}</span>
                                <span className="whitespace-nowrap">{d.set}</span>
                                <span className="whitespace-nowrap">{d.declination}°</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}



            {error && (
                <div className="z-10 mt-2 text-red-400 bg-red-900/30 px-3 py-1.5 rounded-lg text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
