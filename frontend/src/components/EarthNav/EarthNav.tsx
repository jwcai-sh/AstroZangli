"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface EarthNavProps {
    currentPage?: string;
}

export default function EarthNav({ currentPage }: EarthNavProps) {
    const pathname = usePathname();

    // 根据当前路径确定激活状态
    const getActiveTab = () => {
        if (pathname.includes("zodiac")) return "十二宫";
        if (pathname.includes("seven-stars")) return "七星轨迹";
        if (pathname.includes("tibetan-cycle")) return "藏历绕迥纪年";
        return currentPage || "十二宫";
    };

    const activeTab = getActiveTab();

    const tabs = [
        { name: "十二宫图", path: "/earth?tab=zodiac" },
        { name: "七星轨迹", path: "/earth?tab=seven-stars" },
        { name: "藏历绕迥纪年", path: "/earth?tab=tibetan-cycle" },
    ];

    return (
        <div className="flex justify-center space-x-10 p-6 whitespace-nowrap">
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
