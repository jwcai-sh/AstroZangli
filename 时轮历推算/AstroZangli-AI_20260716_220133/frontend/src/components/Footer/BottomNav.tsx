import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";
import LocalizedText from "@/i18n/LocalizedText";
import LocaleLink from "@/i18n/LocaleLink";
import Image from "next/image";

interface BottomNavProps {
    active?: "calendar" | "earth" | "chat" | "docs" | "user";
}

export default function BottomNav({ active = "earth" }: BottomNavProps) {
  const locale = useLocale();
    return (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900/80 border-t border-gray-700 p-2 z-50">
            <div className="flex justify-around items-center w-full max-w-[390px] mx-auto">
                {/* 日历 */}
                <LocaleLink
                    href="/cal"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "calendar"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/cal.png" alt={appText(locale, "日历")} width={24} height={24} />
                    <span className="text-xs"><LocalizedText text={"日历"} /></span>
                </LocaleLink>

                {/* 地球 */}
                <LocaleLink
                    href="/earth"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "earth"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/globe.png" alt={appText(locale, "可视")} width={24} height={24} />
                    <span className="text-xs"><LocalizedText text={"可视"} /></span>
                </LocaleLink>

                {/* 聊天 */}
                <LocaleLink
                    href="/chat"
                    className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors text-white"
                    style={{
                        backgroundColor: "#0051feff",  // 始终使用这个背景色
                    }}
                >
                    <Image src="/cond/chat.png" alt={appText(locale, "聊天")} width={24} height={24} />
                    <span className="text-xs"><LocalizedText text={"聊天"} /></span>
                </LocaleLink>



                {/* 文档 */}
                <LocaleLink
                    href="/docs"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "docs"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/book.png" alt={appText(locale, "文档")} width={24} height={24} />
                    <span className="text-xs"><LocalizedText text={"文档"} /></span>
                </LocaleLink>

                {/* 用户 */}
                <LocaleLink
                    href="/user"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "user"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/user.png" alt={appText(locale, "用户")} width={24} height={24} />
                    <span className="text-xs"><LocalizedText text={"用户"} /></span>
                </LocaleLink>
            </div>
        </div>
    );
}
