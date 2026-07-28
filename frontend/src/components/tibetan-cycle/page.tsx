"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";

export default function TibetanCyclePage() {
    const baseYear = 2025;
    const [year, setYear] = useState<number>(baseYear);
    const [result, setResult] = useState<string>("");
    const [rotation, setRotation] = useState({ tg: 18, dz: 195 });
    const [isOpen, setIsOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // 天干地支计算表
    const ganzhiList = useMemo(() => {
        const tiangan = ["铁", "铁", "水", "水", "木", "木", "火", "火", "土", "土"];
        const dizhi = ["虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪", "鼠", "牛"];
        const list: string[] = [];
        for (let i = 0; i < 60; i++) {
            list.push(tiangan[(i - 6 + 10) % 10] + dizhi[(i - 2 + 12) % 12]);
        }
        return list;
    }, []);

    // 年份列表
    const years = useMemo(() => Array.from({ length: 201 }, (_, i) => baseYear - 100 + i), [baseYear]);

    // 计算干支与旋转角
    const calculate = useCallback((y: number) => {
        const offsetYear = (y - 2025) % 60;
        const dzAngle = -offsetYear * 30;
        const tgAngle = -offsetYear * 36;
        setRotation({
            dz: 240 + 360 + dzAngle,
            tg: -54 + 360 + tgAngle,
        });
        const index = (y + 56 + 60) % 60;
        setResult(`${y} 年是 【${ganzhiList[index]}】年`);
    }, [ganzhiList]);

    useEffect(() => {
        calculate(year);
    }, [year, calculate]);

    // 打开下拉时滚动至当前年份顶部
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            const index = years.indexOf(year);
            const itemHeight = 40;
            const top = index * itemHeight;
            setTimeout(() => {
                scrollRef.current!.scrollTo({
                    top: top > 0 ? top : 0,
                    behavior: "auto",
                });
            }, 30);
        }
    }, [isOpen, year, years]);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest(".year-selector")) setIsOpen(false);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <div className="bg-black text-white min-h-screen flex flex-col items-center pt-6">
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeInUp { animation: fadeInUp 200ms ease-out; }
                .no-scrollbar::-webkit-scrollbar { width: 6px; }
                .no-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 8px; }
            `}</style>

            {/* 年份选择 */}
            <div className="relative mt-4 year-selector">
                <button
                    onClick={() => setIsOpen((v) => !v)}
                    className={`relative z-10 px-6 py-3 text-xl font-semibold rounded-xl transition-all ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                        }`}
                >
                    {year}
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        className={`inline-block ml-2 text-gray-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                            }`}
                    >
                        <path
                            d="M4 6l4 4 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 p-[2px] rounded-2xl bg-white/40 border border-white/60 shadow-[0_0_10px_rgba(255,255,255,0.4)] animate-fadeInUp z-20"
                    >
                        {/* 毛玻璃内部层 */}
                        <div
                            ref={scrollRef}
                            className="w-28 h-[200px] rounded-2xl backdrop-blur-md 
                            bg-white/10 border border-gray-600/60 shadow-inner 
                            text-center overflow-y-auto no-scrollbar"
                        >
                            {years.map((y) => {
                                const isActive = y === year;
                                return (
                                    <button
                                        key={y}
                                        onClick={() => {
                                            setYear(y);
                                            calculate(y);
                                            setIsOpen(false);
                                        }}
                                        className={`block w-full h-[40px] text-lg transition-all duration-200 
                                            ${isActive ? "text-blue-400 scale-110" : "text-gray-200 scale-105"
                                            }`}
                                    >
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 天干地支旋转盘 */}
            <div className="relative mt-8 w-80 h-80">
                <div
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        transform: `rotate(${rotation.dz}deg)`,
                        transition: "transform 1s ease-out",
                    }}
                >
                    <Image
                        src="/pho/地支.png"
                        alt="地支盘"
                        width={320}
                        height={320}
                        className="w-full h-full select-none pointer-events-none"
                    />
                </div>
                <div
                    className="absolute top-0 left-0 w-full h-full"
                    style={{
                        transform: `rotate(${rotation.tg}deg)`,
                        transition: "transform 1s ease-out",
                    }}
                >
                    <Image
                        src="/pho/天干.png"
                        alt="天干盘"
                        width={320}
                        height={320}
                        className="w-full h-full select-none pointer-events-none"
                    />
                </div>
                <div className="absolute top-0 left-0 w-full h-full">
                    <Image
                        src="/pho/指针.png"
                        alt="指针"
                        width={320}
                        height={320}
                        className="w-full h-full select-none pointer-events-none"
                    />
                </div>
            </div>

            {/* 干支结果 */}
            <div className="mt-8 mb-4 text-lg h-[30px] text-center w-full">
                {result}
            </div>
        </div>
    );
}
