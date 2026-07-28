"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FooterBar from "@/components/FooterBar";

export default function TopicDetailPage() {
    const params = useParams();
    const id = Number(params.id);
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stars, setStars] = useState<Array<{ left: number; top: number }>>([]);

    // 主题标题映射：根据你给出的条目整理，尽量覆盖常见 id
    const topicTitles: Record<number, string> = {
        0: "藏历是什么：种类、流派与发展历史",
        1: "解密藏历智慧之工具 — 萨雄与图珠（日圭）",
        2: "藏历与农历的比较（阴阳历差异与闰月）",
        3: "历法与节气算法：藏历计算体系原理",
        4: "藏历的纪年方法（生肖、教历、绕迥等）",
        5: "藏历的纪月方法（十二/月与闰月规则）",
        6: "藏历的纪日方法（数字、生肖、弦月配日）",
        7: "藏历的纪时方法（生肖时、漏刻）",
        8: "历算五支：曜、日、宿、会合、作用（五基数）",
        9: "藏历的十曜体系（含罗睺、劫火、长尾彗星）",
        11: "藏历历书：天文与气象并重的历书传统",
        12: "六历对照：银巴万年历及其基础历派说明",
        13: "藏历与季节：节气、季节划分与地域特色",
        14: "藏历历书与二十四节气（藏历节气与汉历节气）",
        15: "五星（曜）运动、缺日与重日、日月食预测",
        16: "藏历是什么（补充：地域特色、应用与跨文化）",
        17: "三种日的概念：太阳日、太阴日与宫日",
        18: "五行与五大（五源）学说在藏历中的应用",
        19: "2025年满月日历（全年满月列表）",
        20: "2025年17大罕见天文事件总览",
        21: "2025年天文事件日历（全年事件汇总）",
        22: "2025年彗星时间表与观测要点",
        23: "2025年春分与节气时间说明",
        24: "二十八（七）星宿——古代观测标志与运用",
        25: "太阳周年视运动与宫年概念",
        26: "三种年的概念：太阳年、回归年、恒星年",
        27: "三种月的概念：太阴月（朔望月）、恒星月、太阳月",
        28: "黄道十二宫定义与天文划分",
        29: "藏历中的十曜与五星（曜）细解",
        30: "太阳日与地球自转周期（太阳日含义）",
        31: "太阴月与月亮的视运动与月相变化",
        32: "藏历的时间四维体系：纪年、纪月、纪日、纪时",
        33: "藏历与农历差异补充（闰月设置的意义）",
        34: "历法长期修正与万年历编制方法（绕迥计年）",
        35: "天球视角：藏历的宇宙观与天球模型",
        36: "太阳年、节气与历算中的时间计量",
        37: "月食类型、图像与发生频率说明",
        38: "藏历与占卜：历法在民俗与占算中的应用",
        39: "黄道十二宫与二十八星宿的合并解读",
        40: "（已合并）该条目内容已在其他主题中覆盖",
        41: "时轮历的时间与空间计量体系（单位与进制）",
        42: "（备用）",
        43: "时轮历的日月食预测方法综述",
        44: "年/月/日等多周期合并与历法设计",
        45: "三种日/年/月合并说明（体系整合）",
        46: "藏历的缺日与重日规则详解",
        // 如果未来需要可以继续添加更多条目
    };

    useEffect(() => {
        const fetchHtmlContent = async () => {
            try {
                // 优先按 /database/topic{id}.html 拉取（保持你原有结构）
                const response = await fetch(`/database/topic${id}.html`);
                if (!response.ok) {
                    throw new Error(`无法加载主题内容 (${response.status})`);
                }
                const html = await response.text();
                setContent(html);
                setLoading(false);
            } catch (err) {
                console.error("加载HTML内容失败:", err);
                setError("无法加载主题内容，请稍后再试");
                setLoading(false);
            }
        };

        if (!Number.isNaN(id)) {
            fetchHtmlContent();
        } else {
            setError("无效的主题 id");
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setStars(
            [...Array(100)].map(() => ({
                left: Math.random() * 100,
                top: Math.random() * 100,
            }))
        );
    }, []);

    return (
        <div className="bg-black text-white min-h-screen overflow-x-hidden">
            {/* 星空背景 */}
            <div className="fixed inset-0 bg-black pointer-events-none">
                <div className="absolute inset-0 opacity-30">
                    {stars.map((star, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full star"
                            style={{
                                left: `${star.left}%`,
                                top: `${star.top}%`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* 主内容区域 - 与cal页面保持一致的布局 */}
            <div className="relative z-10 min-h-screen flex flex-col pb-20">
                {/* 顶部：返回 + 真实主题名 */}
                <div className="p-4 pt-3 flex items-center">
                    <Link href="/docs" className="text-gray-300 hover:text-white">
                        <div className="w-4 h-4 border-l-2 border-t-2 border-current rotate-[-45deg]" />
                    </Link>
                    <div className="ml-4 text-lg font-medium">
                        {topicTitles[id] || `藏历主题 ${id}`}
                    </div>
                </div>

                {/* 内容区域 - 可滚动，限制宽度防止溢出 */}
                <div className="flex-1 overflow-y-auto px-4 overflow-x-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="text-white">加载中...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-400">
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div
                            className="prose prose-invert prose-sm max-w-3xl mx-auto pb-8"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </div>
            </div>

            {/* 固定在底部的FooterBar */}
            <div className="fixed bottom-0 left-0 right-0 z-50">
                <FooterBar />
            </div>
        </div>
    );
}
