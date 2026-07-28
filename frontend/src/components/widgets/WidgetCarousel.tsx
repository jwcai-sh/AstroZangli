"use client";

import * as React from "react";

export interface WidgetCarouselProps {
  items: React.ReactNode[];
  currentIndex: number;
  onChange: (idx: number) => void;
  /** 滑动阈值（像素），默认 50 */
  swipeThreshold?: number;
}

/**
 * WidgetCarousel
 * - 用途：包装滑动手势与页面指示点，切换传入的 items。
 * - 使用：见 README 里的示例。
 */
const WidgetCarousel: React.FC<WidgetCarouselProps> = ({
  items,
  currentIndex,
  onChange,
  swipeThreshold = 50
}) => {
  const touchStartRef = React.useRef<number>(0);
  const touchEndRef = React.useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = 0;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    const start = touchStartRef.current;
    const end = touchEndRef.current;
    if (!start || !end) return;
    const distance = start - end;
    if (distance > swipeThreshold) onChange((currentIndex + 1) % items.length);
    if (distance < -swipeThreshold) onChange((currentIndex - 1 + items.length) % items.length);
  };

  return (
    <div className="w-full">
      {/* 主内容区域 */}
      <div className="relative">
        <div
          className="transition-shadow duration-300"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {items[currentIndex]}
        </div>
        
        {/* 渐变遮罩效果 */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-transparent via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
      </div>

    </div>
  );
};

export default WidgetCarousel;
