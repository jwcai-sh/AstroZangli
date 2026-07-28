import * as React from "react";

/**
 * DateEventsCard
 * - 用途：展示某天的标题/副标题、三个计数圆点（自定义标签与颜色）、以及事件列表（带枚举颜色与剩余天数）。
 * - 组件类型：展示型组件（Presentational）。
 * - 数据来源：通过 props 传入，未提供时使用默认示例值。
 * - 复用建议：首页卡片区域、日期详情的摘要区等。
 */
export interface DateEventsHeader {
  title: string;
  subtitle: string;
}

export interface DateCounter {
  /** 圆点中显示的短标签，比如 "农"、"公"、"藏" */
  label: string;
  /** 标签对应的计数值 */
  value: number | string;
  /** 背景色（Tailwind 类名），例如 "bg-blue-500" */
  colorClass: string;
}

export interface DateEventItem {
  /** 事件显示名称 */
  label: string;
  /** 左侧小圆点颜色（Tailwind 类名），例如 "bg-yellow-500" */
  colorClass: string;
  /** 剩余天数的文案，比如 "还剩5天"。若为空则不显示右侧文案 */
  daysLeftText?: string;
}

export interface DateEventsCardProps {
  header?: DateEventsHeader;
  counters?: DateCounter[];
  events?: DateEventItem[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

const DateEventsCard: React.FC<DateEventsCardProps> = ({
  counters = [
    { label: "农", value: "二零二五年 六月廿九", colorClass: "bg-blue-400" },
    { label: "公", value: "2025年7月23日 周三", colorClass: "bg-purple-500" },
    { label: "藏", value: "木蛇年 五月廿九", colorClass: "bg-pink-400" }
  ],
  events = [
    { label: "国庆节 10月1日", colorClass: "bg-gray-500", daysLeftText: "还剩5天" },
    { label: "立秋 8月7日", colorClass: "bg-gray-500", daysLeftText: "还剩5天" },
    { label: "雪顿节 8月8日", colorClass: "bg-gray-500", daysLeftText: "还剩5天" }
  ],
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

      {/* 顶部大/小字已移除（按需求隐藏） */}

      {/* 纵向排列：农、公、藏分别在小圆背景下纵向排列 */}
      <div className="mb-4"> {/* 从mb-6改为mb-2，减少前三行容器与节日框容器之间的间距 */}
        {/* 第1行：农历信息行 */}
        <div className="dateevents-row-lunar">
          <div className="dateevents-lunar-circle">
            <span className="dateevents-lunar-text">{counters[0]?.label || ''}</span>
          </div>
          <div className="dateevents-lunar-rect">
            <span className="dateevents-lunar-rect-text">{counters[0]?.value || ''}</span>
          </div>
        </div>

        {/* 第2行：公历信息行 */}
        <div className="dateevents-row-solar">
          <div className="dateevents-solar-circle">
            <span className="dateevents-solar-text">{counters[1]?.label || ''}</span>
          </div>
          <div className="dateevents-solar-rect">
            <span className="dateevents-solar-rect-text">{counters[1]?.value || ''}</span>
          </div>
        </div>

        {/* 第3行：藏历信息行 */}
        <div className="dateevents-row-tibetan">
          <div className="dateevents-tibetan-circle">
            <span className="dateevents-tibetan-text">{counters[2]?.label || ''}</span>
          </div>
          <div className="dateevents-tibetan-rect">
            <span className="dateevents-tibetan-rect-text">{counters[2]?.value || ''}</span>
          </div>
        </div>
      </div>

      {/* 节日倒计时区域：两个灰色长条框 */}
      <div>
        {/* 第4行：第一个节日倒计时 */}
        <div className="dateevents-row-holiday1">
          <div className="dateevents-holiday1-bar bg-custom-gray">
            <svg className="dateevents-holiday1-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="dateevents-holiday1-text">{events[0]?.label || ''} {events[0]?.daysLeftText || ''}</span>
          </div>
        </div>

        {/* 第5行：第二个节日倒计时 */}
        <div className="dateevents-row-holiday2">
          <div className="dateevents-holiday2-bar bg-custom-gray">
            <svg className="dateevents-holiday2-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="dateevents-holiday2-text">{events[1]?.label || ''} {events[1]?.daysLeftText || ''}</span>
          </div>
        </div>

        {/* 第6行：第三个节日倒计时 */}
        <div className="dateevents-row-holiday3">
          <div className="dateevents-holiday3-bar bg-custom-gray">
            <svg className="dateevents-holiday3-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="dateevents-holiday3-text">{events[2]?.label || ''} {events[2]?.daysLeftText || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateEventsCard;