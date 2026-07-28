import Link from "next/link";
import Image from "next/image";

interface BottomNavProps {
    active?: "calendar" | "earth" | "chat" | "docs" | "user";
}

export default function BottomNav({ active = "earth" }: BottomNavProps) {
    return (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900/80 border-t border-gray-700 p-2 z-50">
            <div className="flex justify-around items-center w-full max-w-[390px] mx-auto">
                {/* 日历 */}
                <Link
                    href="/cal"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "calendar"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/cal.png" alt="日历" width={24} height={24} />
                    <span className="text-xs">日历</span>
                </Link>

                {/* 地球 */}
                <Link
                    href="/earth"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "earth"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/globe.png" alt="可视" width={24} height={24} />
                    <span className="text-xs">可视</span>
                </Link>

                {/* 聊天 */}
                <Link
                    href="/chat"
                    className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors text-white"
                    style={{
                        backgroundColor: "#0051feff",  // 始终使用这个背景色
                    }}
                >
                    <Image src="/cond/chat.png" alt="聊天" width={24} height={24} />
                    <span className="text-xs">聊天</span>
                </Link>



                {/* 文档 */}
                <Link
                    href="/docs"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "docs"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/book.png" alt="文档" width={24} height={24} />
                    <span className="text-xs">文档</span>
                </Link>

                {/* 用户 */}
                <Link
                    href="/user"
                    className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${active === "user"
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-700 text-gray-400"
                        }`}
                >
                    <Image src="/cond/user.png" alt="用户" width={24} height={24} />
                    <span className="text-xs">用户</span>
                </Link>
            </div>
        </div>
    );
}
