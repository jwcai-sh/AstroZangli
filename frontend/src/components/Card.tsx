"use client";

import Image from "next/image";

// 定义卡片数据类型
export interface CardData {
    id: number;
    titleLeft: string;
    titleRight: string;
    desc: string;
    img: string;
}

// 定义Card组件的props类型
interface CardProps {
    card: CardData;
    onReadMore?: (card: CardData) => void;
}

export default function Card({ card, onReadMore }: CardProps) {
    const handleReadMore = () => {
        if (onReadMore) {
            onReadMore(card);
        }
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1c1c22]/80 shadow">
            {/* 顶部图片 */}
            <div className="relative h-36 w-full">
                <Image src={card.img} alt="banner" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60"></div>
            </div>
            
            {/* 文本区域 */}
            <div className="p-4">
                <div className="text-[18px] font-semibold">
                    <span className="text-orange-300">{card.titleLeft}</span>
                    <span className="text-orange-300">&nbsp;{card.titleRight}</span>
                </div>
                <p className="mt-3 text-gray-300 text-sm line-clamp-2">{card.desc}</p>
                
                {/* Read more 行 */}
                <div className="mt-3 flex items-center text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                    <button 
                        onClick={handleReadMore}
                        className="mx-3 text-white/90 hover:text-white transition-colors"
                    >
                        Read more
                    </button>
                    <div className="flex-1 h-px bg-white/40"></div>
                </div>
            </div>
        </div>
    );
}
