"use client";

import Link from "next/link";

interface EarthNavProps {
    currentPage?: string;
}

export default function EarthNav({ currentPage }: EarthNavProps) {
    const activeTab = currentPage || "十二宫图";

    const tabs = [
        { name: "十二宫图", path: "/earth?tab=zodiac" },
        { name: "七星轨迹", path: "/earth?tab=seven-stars" },
        { name: "周年视运动（地心坐标）", path: "/earth?tab=annual-motion" },
        { name: "藏历绕迥纪年", path: "/earth?tab=tibetan-cycle" },
    ];

    return (
        <div className="flex flex-wrap justify-center gap-4 p-6 whitespace-nowrap">
            {tabs.map((tab) => (
                <Link
                    key={tab.name}
                    href={tab.path}
                    className={`px-3 py-1 rounded-md text-sm transition-all duration-300 ${activeTab === tab.name
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                        }`}
                >
                    {tab.name}
                </Link>
            ))}
        </div>
    );
}
