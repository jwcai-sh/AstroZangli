import * as React from "react";
import Image from "next/image";
import { useCallback } from "react";

/**
 * MoonPhaseCard
 * - 用途：展示某日期的月相信息（标题、副标题、时间点、示意月面、照明度、日出日落/升落时刻）。
 * - 组件类型：展示型组件（Presentational）。
 * - 数据来源：通过 props 传入，若未提供则使用默认示例值。
 * - 复用建议：用于天文相关的卡片区，或详情页模块。
 */
export interface MoonPhaseCardProps {
  header?: { title: string; subtitle: string };
  /** 某个时间点展示，例如观测时间 */
  timeLabel?: string;
  /** 照明度（0-1，实际是百分比） */
  illumination?: number;
  /** 中天时间文本 */
  culminationText?: string;
  /** 月出时间（左侧） */
  moonRise?: string;
  /** 月落时间（右侧） */
  moonSet?: string;
  /** 农历日期（1-30），用于显示对应的月相图片 */
  lunarDay?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

const MoonPhaseCard: React.FC<MoonPhaseCardProps> = ({
  header = { title: "二零二五年六月廿九", subtitle: "Moon Phase" },
  
  illumination = 0.996,
  culminationText = "中天 23 : 34",
  moonRise = "05 : 19",
  moonSet = "18 : 41",
  lunarDay,
  currentPage = 1,
  onPageChange,
  totalPages = 3
}) => {
  // 根据农历日期计算月相图片编号（1-31）
  // 如果 lunarDay 不存在或无效，使用照明度来估算
  const getMoonImageIndex = useCallback((): number => {
    if (lunarDay && lunarDay >= 1 && lunarDay <= 30) {
      // 农历日期 1-30 对应图片 1-30
      return lunarDay;
    }
    // 如果没有农历日期，根据照明度估算
    // 照明度为 0 时是新月（初一），为 1 时是满月（十五），然后逐渐减少
    if (illumination !== undefined) {
      // 将照明度映射到 1-30
      // 新月（0）-> 1, 满月（1）-> 15, 然后逐渐减少到 30
      if (illumination <= 0.5) {
        // 上半月：照明度 0-0.5 对应农历 1-15
        return Math.max(1, Math.min(15, Math.round(illumination * 28 + 1)));
      } else {
        // 下半月：照明度 0.5-1 对应农历 15-30
        return Math.max(16, Math.min(30, Math.round((illumination - 0.5) * 28 + 15)));
      }
    }
    // 默认返回第15张（满月）
    return 15;
  }, [lunarDay, illumination]);

  const moonImageIndex = getMoonImageIndex();
  const moonImagePath = `/moon_pic/moon_image_${String(moonImageIndex).padStart(5, '0')}.png`;
  return (
    <div className="frosted-card calendar-gradient-neo widget-card-border px-6 pt-6 pb-4 light-purple-border transparent-purple-blue-gradient text-center shadow-2xl backdrop-blur-xl card-enter hover-lift dateevents-gradient-bg relative">
      {/* 三个卡片的指示器 - 位于卡片内部最上边 */}
      {onPageChange && (
        <div className="flex justify-center space-x-3 mb-4">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => onPageChange(index)}
              className={`relative transition-all duration-300 hover:scale-110 ${
                index === currentPage 
                  ? 'w-2 h-2 bg-white rounded-full shadow-lg' 
                  : 'w-2 h-2 bg-gray-500 rounded-full hover:bg-gray-400'
              }`}
              aria-label={`切换到第 ${index + 1} 个卡片`}
            >
            </button>
          ))}
        </div>
      )}

      {/* 顶部布局：居中显示农历信息框 */}
      <div className="flex justify-center items-center mb-8">
        {/* 农历信息框 - 居中 */}
        <div className="astro-lunar-rect-centered">
          <span className="dateevents-lunar-rect-text">{header.title}</span>
        </div>
      </div>

      {/* 主体内容区域 - 使用绝对定位实现四个角布局 */}
      <div className="relative h-56 -mt-4">
        {/* 中央月相图 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-32 h-32">
            {/* 月相光晕效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-lg"></div>
            
            {/* 真实月相图片 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={moonImagePath}
                alt={`月相图 - 农历${lunarDay || '未知'}日`}
                width={128}
                height={128}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* 右上角：照明度 */}
        <div className="absolute top-8 right-0 text-right">
          <div className="relative text-white/80 font-medium text-lg px-2" style={{ fontSize: '70%' }}>
            <span className="text-gray-300/80">照明度</span>
            <span className="font-semibold ml-1">
              {illumination !== undefined ? `${(illumination * 100).toFixed(1)}%` : '99.6%'}
            </span>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30 -mx-2"></div>
          </div>
        </div>

        {/* 右下角：中天时间 */}
        <div className="absolute bottom-14 right-4 text-right">
          <div className="relative text-white/80 font-medium text-lg px-2" style={{ fontSize: '70%' }}>
            <span className="text-gray-300/80">中天</span>
            <span className="font-semibold ml-1">
              {culminationText ? (culminationText.includes(' ') ? culminationText.split(' ')[1] : culminationText) : '--:--'}
            </span>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30 -mx-2"></div>
          </div>
        </div>

        {/* 左中上：月出时间 */}
        <div className="absolute top-1/3 left-0 transform -translate-y-1/2">
          <div className="relative flex items-center space-x-2 text-white/80 font-medium text-lg px-2" style={{ fontSize: '70%' }}>
            <div className="w-4 h-4 flex items-center justify-center">
              <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                {/* 横线 */}
                <rect x="3" y="5" width="14" height="2" />
                {/* 直杆 */}
                <rect x="8" y="8" width="4" height="5" />
                {/* 向下箭头：三角形箭头头 */}
                <path d="M10 18L6 13h8L10 18z" />
              </svg>
            </div>
            <span>{moonRise || '--:--'}</span>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30 -mx-2"></div>
          </div>
        </div>
        
        {/* 左下角：月落时间 */}
        <div className="absolute bottom-6 left-0">
          <div className="relative flex items-center space-x-2 text-white/80 font-medium text-lg px-2" style={{ fontSize: '70%' }}>
            <div className="w-4 h-4 flex items-center justify-center">
              <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                {/* 向上箭头：三角形箭头头 */}
                <path d="M10 2L6 7h8L10 2z" />
                {/* 直杆 */}
                <rect x="8" y="7" width="4" height="5" />
                {/* 横线 */}
                <rect x="3" y="13" width="14" height="2" />
              </svg>
            </div>
            <span>{moonSet || '--:--'}</span>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30 -mx-2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoonPhaseCard;
