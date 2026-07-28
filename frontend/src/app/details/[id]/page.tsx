"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import FooterBar from "@/components/FooterBar";

// 模拟卡片数据，实际应用中你可能会从API获取
const cards = [
    {
        id: 1,
        titleLeft: "Mercury Sextile",
        titleRight: "Your Mercury",
        desc: "With Mercury, the planet of communication, in conjunction with your natal moon, you can expect a period of heightened emotional sensitivity and intuitive insights. Your thoughts and feelings will be closely intertwined, making it an excellent time for journaling, creative writing, or heart-to-heart conversations. You may find yourself more attuned to the needs of others and better able to express your own feelings with clarity and compassion.",
        img: "/pho/太阳系1.gif",
    },
    {
        id: 2,
        titleLeft: "Mars Sextile",
        titleRight: "Your Sun",
        desc: "When Mars forms a sextile aspect to your Sun, it ignites your vitality, courage, and determination. This is a time of high energy and motivation, where you can make significant progress towards your goals. Your confidence will be boosted, and you'll have the drive to take on new challenges. It's an excellent period for physical activities, starting new projects, or asserting yourself in a positive and constructive way.",
        img: "/pho/黄道12宫.png",
    },
    {
        id: 3,
        titleLeft: "Venus Trine",
        titleRight: "Your Jupiter",
        desc: "A trine between Venus and Jupiter brings a wave of good fortune, optimism, and generosity. This is a wonderful time for socializing, romance, and creative pursuits. You'll find that people are more receptive to your charm and that opportunities for growth and expansion seem to appear effortlessly. It's a favorable period for financial investments, educational endeavors, or simply enjoying the pleasures of life.",
        img: "/pho/天球.gif",
    },
];

export default function DetailPage() {
    const params = useParams();
    const id = params.id;
    const card = cards.find(c => c.id.toString() === id);
    const [stars, setStars] = useState<Array<{ left: number; top: number }>>([]);

    useEffect(() => {
        setStars(
            [...Array(80)].map(() => ({
                left: Math.random() * 100,
                top: Math.random() * 100,
            }))
        );
    }, []);

    if (!card) {
        return (
            <div className="bg-black text-white min-h-screen flex flex-col items-center justify-center">
                <p>Card not found.</p>
                <Link href="/docs" className="mt-4 text-blue-400">Back to docs</Link>
            </div>
        );
    }

    return (
        <div className="bg-black text-white min-h-screen flex flex-col">
            {/* 星空背景 */}
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
                {/* 顶部：返回 */}
                <div className="p-4 pt-3 flex items-center">
                    <Link href="/docs" className="text-gray-300 hover:text-white">
                        <div className="w-4 h-4 border-l-2 border-t-2 border-current rotate-[-45deg]"></div>
                    </Link>
                </div>

                {/* 详情内容 */}
                <div className="flex-1 overflow-y-auto px-4 pb-24">
                    <h1 className="text-3xl font-bold mb-4">{card.titleLeft} - {card.titleRight}</h1>
                    <Image src={card.img} alt={card.titleLeft} width={500} height={300} className="w-full h-auto rounded-lg mb-4" />
                    <p className="text-lg leading-relaxed">{card.desc}</p>
                </div>

                {/* 底部导航栏 */}
                <FooterBar />
            </div>
        </div>
    );
}
