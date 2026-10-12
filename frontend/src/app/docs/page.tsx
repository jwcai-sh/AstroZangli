"use client";

import { useState, useEffect } from "react";
import LocaleLink from "@/i18n/LocaleLink";
import Image from "next/image";
import FooterBar from "@/components/FooterBar";
import { CardData } from "@/components";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

// 定义HTML文件信息的接口
interface HtmlFileInfo {
    id: number;
    filename: string;
    title: string;
    desc: string;
    img: string; // 添加 img 属性
}

export default function DocsPage() {
    const locale = useLocale();
    const [cards, setCards] = useState<CardData[]>([]);
    const [stars, setStars] = useState<Array<{ left: number; top: number }>>([]);

    useEffect(() => {
        // 藏历主题与简介映射
        const htmlFiles: HtmlFileInfo[] = [
            { id: 0, filename: 'topic0.html', title: '藏历是什么', desc: '介绍藏历的种类与流派、发展历史、地域特色与节气划分、计算体系原理、实际应用以及跨文化传播。', img: '/back/AI生成7.png' },
            { id: 1, filename: 'topic1.html', title: '解密藏历智慧之工具——萨雄与图珠', desc: '萨雄相当于藏族的算盘，用于历算；图珠（日圭）是观测太阳影长的工具，用于时间推算。', img: '/back/日影.gif' },
            { id: 2, filename: 'topic2.html', title: '六历对照银巴万年历说明', desc: '以浦尔派、极孜、楚尔派、甘登新为基础，再加上农历与公历，形成六历对照体系。', img: '/back/天赤道与黄道1.jpg' },
            { id: 3, filename: 'topic3.html', title: '藏历与农历的区别', desc: '藏历与农历同属阴阳历，但纪月与闰月设置不同，导致新年与春节有时不一致。', img: '/back/日历.gif' },
            { id: 4, filename: 'topic4.html', title: '藏历的纪年方法', desc: '包括生肖纪年、教历纪年、美卡加措纪年、饶迥纪年、夏迦纪年等多种体系。', img: '/back/白天黑夜.gif' },
            { id: 5, filename: 'topic5.html', title: '藏历的纪月方法', desc: '平年十二个月，闰年十三个月，常用数字纪月、十二望宿纪月与十二生肖纪月等方式。', img: '/back/月相0.jpg' },
            { id: 6, filename: 'topic6.html', title: '藏历的纪日方法', desc: '采用数字纪日、生肖纪日与上弦下弦配合纪日等多种方式。', img: '/back/日地.jpg' },
            { id: 7, filename: 'topic7.html', title: '藏历的纪时方法', desc: '主要包括生肖纪时与漏刻纪时两种方式。', img: '/back/黄道带.png' },
            { id: 8, filename: 'topic8.html', title: '历算五支——曜、日、宿、会合、作用', desc: '五支是时轮历的重要数值基础，用于推算天象与时间结构。', img: '/back/五要素.jpeg' },
            { id: 9, filename: 'topic9.html', title: '藏历的十曜体系', desc: '包括日月、五星（水木火金土）、罗睺、劫火和长尾彗星，用于占算与天象推测。', img: '/back/太阳系1.gif' },
            { id: 11, filename: 'topic11.html', title: '藏历历书的智慧', desc: '藏历历书不仅是天文历法成果，更是气象历书，指导农业与日常生产。', img: '/back/节气.jpg' },
            { id: 12, filename: 'topic12.html', title: '二十四节气的藏历表达', desc: '藏历节气与汉历节气并存，反映不同地域对季节变化的理解。', img: '/back/四季.gif' },
            { id: 13, filename: 'topic13.html', title: '藏历与季节', desc: '通过太阳视运动与节气推算，定义季节变化的规律。', img: '/back/四季.jpg' },
            { id: 15, filename: 'topic15.html', title: '五星（曜）运动与日月食预测', desc: '分析五星的运动特征，并通过时轮历法预报日月食与缺重日。', img: '/back/日月食.jpg' },
            { id: 17, filename: 'topic17.html', title: '三种日的概念', desc: '太阳日、太阴日与宫日共同构成藏历时间体系的重要基础。', img: '/back/太阳周日视运动.gif' },
            { id: 18, filename: 'topic18.html', title: '五行与五大（五源）学说', desc: '藏历天文历算的两种体系分别建立在五行占算与时轮五源理论之上。', img: '/back/七大行星1.gif' },
            { id: 19, filename: 'topic19.html', title: '2025年满月日历', desc: '展示2025年全年满月日期及相关天文现象。', img: '/back/月相.jpeg' },
            { id: 20, filename: 'topic20.html', title: '2025年17大罕见天文事件', desc: '涵盖彗星、日月食、流星雨等重要天文观测事件。', img: '/back/宇宙.png' },
            { id: 21, filename: 'topic21.html', title: '2025年天文事件总览', desc: '汇总全年天文活动时间表与可观测性。', img: '/back/恒星日与太阳日2.gif' },
            { id: 22, filename: 'topic22.html', title: '2025年彗星时间表', desc: '记录全年彗星出现时间与观测方位。', img: '/back/彗星.jpeg' },
            { id: 23, filename: 'topic23.html', title: '2025年春分与节气', desc: '春分时间的确定方式与节气变换规律。', img: '/back/节气.jpg' },
            { id: 24, filename: 'topic24.html', title: '二十八星宿与黄道十二宫', desc: '藏历结合二十八星宿与十二宫用于标识太阳与行星运行。', img: '/back/28星宿.jpg' },
            { id: 25, filename: 'topic25.html', title: '太阳周年视运动', desc: '解释太阳在黄道上的周年运动及其在天球上的反映。', img: '/back/太阳周日视运动.gif' },
            { id: 26, filename: 'topic26.html', title: '三种年的概念', desc: '太阳年、回归年、恒星年的区别与天文意义。', img: '/back/进动.gif' },
            { id: 27, filename: 'topic27.html', title: '三种月的概念', desc: '包括太阴月、恒星月与太阳月，构成历法周期核心。', img: '/back/月相0.jpg' },
            { id: 29, filename: 'topic29.html', title: '黄道十二宫与28星宿', desc: '天文坐标体系下的十二宫与星宿划分方法。', img: '/back/黄道12宫.png' },
            { id: 30, filename: 'topic30.html', title: '太阳日与地球自转周期', desc: '阐述太阳日的形成原理与地球自转关系。', img: '/back/黄道12宫.jpeg' },
            { id: 31, filename: 'topic31.html', title: '太阴月与月亮视运动', desc: '解释月相变化与地月日相对位置的关系。', img: '/back/597.jpg' },
            { id: 32, filename: 'topic32.html', title: '藏历纪年四维体系', desc: '纪年、纪月、纪日、纪时构成藏历时间体系的完整框架。', img: '/back/绕迥.png' },
            { id: 35, filename: 'topic35.html', title: '天球视角：藏历的宇宙观', desc: '以地球为中心的天球模型展示日月星辰运行轨迹。', img: '/back/天球.gif' },
            { id: 36, filename: 'topic36.html', title: '太阳年与节气体系', desc: '讲述太阳运动与节气变化的时间计算方法。', img: '/back/太阳周日视运动.gif' },
            { id: 37, filename: 'topic37.html', title: '月食与类型', desc: '介绍月食的形成类型、发生频率与图像示意。', img: '/back/朔.png' },
            { id: 41, filename: 'topic41.html', title: '时轮历中的时间与空间计量体系', desc: '时轮历的时间单位、空间单位与进制体系解析。', img: '/back/四季.gif' },
        ];

        // 转换为卡片数据
        const newCards = htmlFiles.map((file) => ({
            id: file.id,
            titleLeft: file.title,
            titleRight: ``,
            desc: file.desc,
            img: file.img,
        }));

        setCards(newCards);
    }, []);

    useEffect(() => {
        setStars(
            [...Array(100)].map(() => ({
                left: Math.random() * 100,
                top: Math.random() * 100,
            }))
        );
    }, []);

    return (
        <div className="bg-black text-white min-h-screen flex flex-col">
            {/* 星空背景 */}
            <div className="fixed inset-0 bg-black">
                <div className="absolute inset-0 opacity-30">
                    {stars.map((star, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full star"
                            style={{
                                left: `${star.left}%`,
                                top: `${star.top}%`,
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="relative z-10 flex flex-col h-screen">
                {/* 顶部搜索栏 */}
                <div className="p-4 pt-3 flex items-center space-x-3">
                    <LocaleLink href="/" className="text-gray-300 hover:text-white">
                        <div className="w-4 h-4 border-l-2 border-t-2 border-current rotate-[-45deg]"></div>
                    </LocaleLink>
                    <div className="flex-1">
                        <div className="flex items-center bg-white/10 border border-white/15 rounded-full px-4 py-2">
                            <input
                                placeholder={appText(locale, "搜索藏历主题...")}
                                className="flex-1 bg-transparent outline-none text-sm placeholder-gray-300"
                            />
                            <div className="ml-2 w-5 h-5 rounded-full border border-white/50 flex items-center justify-center text-xs">
                                🔍
                            </div>
                        </div>
                    </div>
                </div>

                {/* 卡片列表 */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">
                    {cards.map((card) => (
                        <LocaleLink
                            key={card.id}
                            href={`/details/topic/${card.id}`}
                            className="block group"
                        >
                            <div className="bg-white/10 border border-white/15 rounded-2xl overflow-hidden hover:bg-white/15 transition-all duration-300">
                                {/* 图片部分 */}
                                <div className="w-full h-48 overflow-hidden">
                                    <Image
                                        src={card.img}
                                        alt={appText(locale, card.titleLeft)}
                                        width={500}
                                        height={300}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {/* 文本内容 */}
                                <div className="p-4">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg font-semibold text-white">
                                            {appText(locale, card.titleLeft)}
                                        </h2>
                                        <span className="text-xs text-gray-400">{card.titleRight}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                                        {appText(locale, card.desc)}
                                    </p>
                                </div>
                            </div>
                        </LocaleLink>
                    ))}

                </div>

                {/* 底部导航栏 */}
                <FooterBar />
            </div>
        </div>
    );
}
