"use client";

import LocaleLink from "@/i18n/LocaleLink";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

interface EarthNavProps {
    currentPage?: string;
}

export default function EarthNav({ currentPage }: EarthNavProps) {
    const locale = useLocale();
    const activeTab = currentPage || "十二宫图";

    const tabs = [
        { name: "十二宫图", path: "/earth?tab=zodiac" },
        { name: "日月运行与历象", path: "/earth?tab=lunar-phenomena&phenomena=moon-phases" },
        { name: "天文历算基本数据", path: "/earth?tab=five-elements&data=five-elements" },
        { name: "七星轨迹", path: "/earth?tab=seven-stars" },
        { name: "天体运动", path: "/earth?tab=celestial-motion&motion=geocentric-motion" },
    ];

    return (
        <div className="flex flex-wrap justify-center gap-4 p-6 whitespace-nowrap">
            {tabs.map((tab) => (
                <LocaleLink
                    key={appText(locale, tab.name)}
                    href={tab.path}
                    className={`px-3 py-1 rounded-md text-sm transition-all duration-300 ${activeTab === tab.name
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                        }`}
                >
                    {appText(locale, tab.name)}
                </LocaleLink>
            ))}
        </div>
    );
}
