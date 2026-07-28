"use client";

import * as React from "react";
import Image from "next/image";
// Use project SVG assets provided by the user
import LeftArrowSvg from "@/components/左箭头.svg";
import RightArrowSvg from "@/components/右箭头.svg";

/**
 * CalendarBox
 * - 用途：渲染日历头部导航 + 星期行 + 天数网格的组合区块。
 * - 组件类型：可交互的展示组件（Presentational + Callbacks）。
 * - 数据来源：通过 props 控制当前月份文案、天数等；点击日期后内部状态负责高亮；
 *   通过回调把交互抛给父级。
 * - 复用建议：作为页面中上方日历框的通用组件；后续可扩展首日偏移、禁用日期等能力。
 */
export interface CalendarBoxProps {
  /** 当前月份文案，例如："September 2021" */
  currentMonth: string;
  /** 上一月回调（点击左箭头时触发） */
  onPrevMonth?: () => void;
  /** 下一月回调（点击右箭头时触发） */
  onNextMonth?: () => void;
  /** 选中某天（点击某个日期格时触发） */
  onSelectDay?: (day: number) => void;
  /** 星期标题（默认 SUN~SAT） */
  weekdays?: string[];
  /** 当前月的天数（默认 31） */
  daysInMonth?: number;
  /** 容器额外类名（用于 AB 对比外观） */
  containerClassName?: string;
  /** 月起始偏移：0=周日, 1=周一, 2=周二 ... 用于控制1号开始的星期 */
  startOffset?: number;
  /** 初始高亮日期（例如 19） */
  initialSelected?: number | null;
}

export const CalendarBox: React.FC<CalendarBoxProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  daysInMonth = 31,
  containerClassName,
  startOffset = 0,
  initialSelected = null
}) => {
  // 内部状态：高亮的日期，默认 null（不高亮任何一天）
  const [selectedDay, setSelectedDay] = React.useState<number | null>(initialSelected);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    onSelectDay?.(day);
  };

  return (
    <div className={`frosted-card calendar-gradient-neo gradient-border gradient-border--a calendar-sans rounded-[18px] px-6 py-7 sm:px-7 sm:py-8 md:px-8 md:py-9 ${containerClassName ?? ""}`}>    
      {/* 头部：左右切换按钮 + 当前月份文案（居中） */}
      <div className="grid grid-cols-3 items-center gap-4 mb-4 sm:mb-5">
        <div className="flex items-center justify-center">
          <button
            className="hover:opacity-80 transition-opacity"
            onClick={onPrevMonth}
            aria-label="Previous month"
          >
            <Image src={LeftArrowSvg} alt="prev" width={16} height={16} />
          </button>
        </div>
        <div className="flex justify-center">
          <span className="month-label block text-base sm:text-lg font-medium tracking-wide text-center">{currentMonth}</span>
        </div>
        <div className="flex items-center justify-center">
          <button
            className="hover:opacity-80 transition-opacity"
            onClick={onNextMonth}
            aria-label="Next month"
          >
            <Image src={RightArrowSvg} alt="next" width={16} height={16} />
          </button>
        </div>
      </div>

      {/* 星期标题行 */}
      <div className="week-row text-gray-300/80 mb-3">
        {weekdays.map((label, index) => (
          <div key={index} className="week-cell text-[11px] sm:text-xs">{label}</div>
        ))}
      </div>

      {/* 日期网格：支持起始偏移与自适应行数 */}
      <div className="day-grid">
        {/* 起始空白单元格，用于把 1 号顶到 startOffset 对应的星期 */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} className="day-cell"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              className={`day-cell transition-colors ${isSelected ? "" : "hover:bg-white/5"}`}
              onClick={() => handleSelectDay(day)}
              aria-pressed={isSelected}
            >
              {isSelected ? (
                <span className="selected-badge">
                  <span className="day-number">{day}</span>
                </span>
              ) : (
                <span className="day-number">{day}</span>
              )}
              {isSelected && <span className="sr-only">selected</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarBox;
