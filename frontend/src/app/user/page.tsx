"use client";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

import LocalizedText from "@/i18n/LocalizedText";
import { useEffect, useState } from "react";
import LocaleLink from "@/i18n/LocaleLink";
import Image from "next/image";
import FooterBar from "@/components/FooterBar";

export default function UserPage() {
  const locale = useLocale();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [stars, setStars] = useState<Array<{ left: number; top: number }>>([]);

    useEffect(() => {
        setStars(
            [...Array(80)].map(() => ({
                left: Math.random() * 100,
                top: Math.random() * 100,
            }))
        );
    }, []);

    // 模拟点击事件
    const handleClick = (msg: string) => {
        alert(`${msg}功能暂未开放`);
    };

    return (
        <div className="bg-black text-white min-h-screen flex flex-col">
            {/* 背景星空效果 */}
            <div className="fixed inset-0 bg-black">
                <div className="absolute inset-0 opacity-30">
                    {stars.map((star, i) => (
                        <div
                            key={i}
                            className={`absolute w-1 h-1 bg-white rounded-full star`}
                            style={{
                                left: `${star.left}%`,
                                top: `${star.top}%`,
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="relative z-10 flex flex-col h-screen">
                {/* 顶部导航 */}
                <div className="flex items-center p-4">
                    <LocaleLink
                        href="/"
                        className="flex items-center text-gray-300 hover:text-white"
                    >
                        <div className="w-4 h-4 border-l-2 border-t-2 border-current rotate-[-45deg]"></div>
                        <span className="ml-2 text-sm"><LocalizedText text={"返回"} /></span>
                    </LocaleLink>
                </div>

                {/* 头像与昵称 */}
                <div
                    className="flex flex-col items-center mt-2 px-4 cursor-pointer hover:opacity-90"
                    onClick={() => handleClick("个人资料")}
                >
                    <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg mb-4">
                        <Image
                            src="/pho/天球2.png"
                            alt={appText(locale, "个人头像")}
                            width={112}
                            height={112}
                            className="object-cover w-full h-full"
                        />
                    </div>
                    <div className="text-xl font-semibold"><LocalizedText text={"本地演示用户"} /></div>
                    <div className="text-sm text-gray-400 mt-1">
                        <LocalizedText text={"演示账户"} />
                    </div>
                </div>

                {/* 设置卡片列表 */}
                <div className="mt-6 px-4 space-y-3">
                    {/* 地点 */}
                    <button
                        onClick={() => handleClick("地点")}
                        className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-[#2b2b33]/90"
                    >
                        <div className="text-left">
                            <div className="text-base"><LocalizedText text={"地点"} /></div>
                            <div className="text-xs text-gray-400 mt-1"><LocalizedText text={"未设置"} /></div>
                        </div>
                        <div className="ml-3 w-5 h-5 relative">
                            <div className="absolute right-0 top-1.5 w-2 h-2 border-r-2 border-b-2 border-gray-300 rotate-[-45deg]"></div>
                        </div>
                    </button>

                    {/* 通知 */}
                    <div className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between">
                        <div className="text-base"><LocalizedText text={"通知"} /></div>
                        <button
                            onClick={() => setNotificationsEnabled((v) => !v)}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${notificationsEnabled ? "bg-blue-500" : "bg-gray-600"
                                }`}
                            aria-label={appText(locale, "切换通知")}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow ${notificationsEnabled ? "translate-x-7" : "translate-x-1"
                                    }`}
                            />
                        </button>
                    </div>

                    {/* 语言 */}
                    <button
                        onClick={() => handleClick("语言")}
                        className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-[#2b2b33]/90"
                    >
                        <div className="text-left">
                            <div className="text-base"><LocalizedText text={"语言"} /></div>
                            <div className="text-xs text-gray-400 mt-1"><LocalizedText text={"中文"} /></div>
                        </div>
                        <div className="ml-3 w-5 h-5 relative">
                            <div className="absolute right-0 top-1.5 w-2 h-2 border-r-2 border-b-2 border-gray-300 rotate-[-45deg]"></div>
                        </div>
                    </button>

                    {/* 联系我们 */}
                    <button
                        onClick={() => handleClick("联系我们")}
                        className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-[#2b2b33]/90"
                    >
                        <div className="text-base"><LocalizedText text={"联系我们"} /></div>
                        <div className="ml-3 w-5 h-5 relative">
                            <div className="absolute right-0 top-1.5 w-2 h-2 border-r-2 border-b-2 border-gray-300 rotate-[-45deg]"></div>
                        </div>
                    </button>

                    {/* 帮助 */}
                    <button
                        onClick={() => handleClick("帮助")}
                        className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-[#2b2b33]/90"
                    >
                        <div className="text-base"><LocalizedText text={"帮助"} /></div>
                        <div className="ml-3 w-5 h-5 relative">
                            <div className="absolute right-0 top-1.5 w-2 h-2 border-r-2 border-b-2 border-gray-300 rotate-[-45deg]"></div>
                        </div>
                    </button>

                    {/* 退出 */}
                    <button
                        onClick={() => handleClick("退出登录")}
                        className="w-full bg-gradient-to-b from-[#2b2b33]/70 to-[#24242b]/70 rounded-xl px-4 py-4 border border-white/10 flex items-center justify-between hover:bg-[#2b2b33]/90"
                    >
                        <div className="text-base"><LocalizedText text={"退出登录"} /></div>
                        <div className="ml-3 w-5 h-5 relative">
                            <div className="absolute right-0 top-1.5 w-2 h-2 border-r-2 border-b-2 border-gray-300 rotate-[-45deg]"></div>
                        </div>
                    </button>
                </div>

                {/* 版本号 */}
                <div className="px-4 text-[10px] text-gray-400 mt-4"><LocalizedText text={"版本 2.0"} /></div>

                {/* 底部导航栏 */}
                <div className="fixed bottom-0 left-0 right-0 z-30">
                    <FooterBar />
                </div>
            </div>
        </div>
    );
}
