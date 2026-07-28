import * as React from "react";

/**
 * PlanetaryChartCard
 * - 用途：展示一个行星图（简化的 SVG 示意）以及左右两侧的关键时间点。
 * - 组件类型：展示型组件（Presentational）。
 * - 数据来源：通过 props 传入，未提供时使用默认示例值。
 * - 复用建议：用于天文可视化、占星图示意等卡片区域。
 */
export interface PlanetaryChartCardProps {
  /** 当前公历日期 */
  solarDate?: string;
  /** 右侧星座/宫位标签 */
  label?: string;
  /** 左侧时间文本 */
  leftTime?: string;
  /** 右侧时间文本 */
  rightTime?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

const PlanetaryChartCard: React.FC<PlanetaryChartCardProps> = ({
  solarDate = "",
  label = "狮子宫",
  leftTime = "05:14",
  rightTime = "19:27",
  currentPage = 0,
  onPageChange,
  totalPages = 4
}) => {
  return (
    <div className="frosted-card calendar-gradient-neo widget-card-border px-6 pt-6 pb-4 light-purple-border transparent-purple-blue-gradient text-center shadow-2xl backdrop-blur-xl card-enter hover-lift dateevents-gradient-bg">
      {/* 四个卡片的指示器 - 位于卡片内部最上边 */}
      {onPageChange && (
        <div className="flex justify-center space-x-3 mb-4">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => onPageChange(index)}
              className={`relative transition-all duration-300 hover:scale-110 ${
                index === currentPage 
                  ? 'w-8 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full shadow-lg shadow-blue-500/50' 
                  : 'w-2 h-2 bg-gray-500 rounded-full hover:bg-gray-400'
              }`}
              aria-label={`切换到第 ${index + 1} 个卡片`}
            >
              {index === currentPage && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 公历信息框 - 只显示紫色矩形框，居中放置 */}
      <div className="flex justify-center mb-6">
        <div className="astro-solar-rect-centered">
          <span className="dateevents-solar-rect-text">{solarDate || "日期暂不可用"}</span>
        </div>
      </div>

      {/* 图表区域（SVG 简化示意） - 改进设计 */}
      <div className="relative w-full aspect-square max-w-xs mx-auto mb-6 group">
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
          {/* 外圈 - 改进样式 */}
          <circle cx="100" cy="100" r="95" fill="none" stroke="#facc15" strokeWidth="3" opacity="0.8" />
          {/* 虚线圈（旋转 45 度） */}
          <g transform="rotate(45 100 100)">
            <circle cx="100" cy="100" r="95" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
          </g>
          {/* 内圈 - 改进样式 */}
          <circle cx="100" cy="100" r="35" fill="none" stroke="#64748b" strokeOpacity="0.8" strokeWidth="2" />
          <circle cx="100" cy="100" r="55" fill="none" stroke="#64748b" strokeOpacity="0.8" strokeWidth="2" />
          {/* 中心点 - 改进样式 */}
          <circle cx="100" cy="100" r="8" fill="#f97316" filter="drop-shadow(0 0 4px #f97316)" />
          <line x1="100" y1="92" x2="100" y2="108" stroke="#f97316" strokeWidth="3" strokeLinecap="round" filter="drop-shadow(0 0 2px #f97316)" />
          {/* 四象限点 - 改进样式 */}
          <circle cx="100" cy="45" r="4" fill="#60a5fa" filter="drop-shadow(0 0 3px #60a5fa)" />
          <circle cx="100" cy="155" r="4" fill="#34d399" filter="drop-shadow(0 0 3px #34d399)" />
          <circle cx="45" cy="100" r="4" fill="#f87171" filter="drop-shadow(0 0 3px #f87171)" />
          <circle cx="155" cy="100" r="4" fill="#facc15" filter="drop-shadow(0 0 3px #facc15)" />
          
          {/* 连接线 */}
          <line x1="100" y1="45" x2="100" y2="155" stroke="#64748b" strokeOpacity="0.4" strokeWidth="1" />
          <line x1="45" y1="100" x2="155" y2="100" stroke="#64748b" strokeOpacity="0.4" strokeWidth="1" />
        </svg>
        
        {/* 星座标签（位于图右侧中部） - 改进样式 */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 text-sm text-yellow-400 font-bold bg-gray-900/80 px-2 py-1 rounded-lg border border-yellow-400/30">
          {label}
        </div>
        
        {/* 装饰性光晕 */}
        <div className="absolute -top-2 -left-2 w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute -top-1 -right-3 w-1 h-1 bg-orange-400 rounded-full opacity-80 animate-pulse delay-1000"></div>
      </div>

      {/* 底部左右时间 - 改进设计 */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center space-x-3 group">
          <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-md group-hover:scale-110 transition-transform duration-300 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
          </div>
          <span className="text-sm text-white font-semibold">{leftTime}</span>
        </div>
        <div className="flex items-center space-x-3 group">
          <span className="text-sm text-white font-semibold">{rightTime}</span>
          <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-md group-hover:scale-110 transition-transform duration-300 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetaryChartCard;
