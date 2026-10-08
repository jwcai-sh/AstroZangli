"use client";

import * as React from "react";
import Image from "next/image";
// Use project SVG assets provided by the user
import LeftArrowSvg from "@/components/左箭头.svg";
import RightArrowSvg from "@/components/右箭头.svg";
import type { CalendarDisplayMode, MonthlyCalendarEvent } from "@/services/calendarApi";

const EVENT_MARKS: Record<MonthlyCalendarEvent["type"], string> = {
  new_moon: "🌑", full_moon: "🌕",
  solar_partial: "日偏", solar_total: "日全", solar_annular: "日环", solar_hybrid: "日全环",
  lunar_partial: "月偏", lunar_total: "月全", lunar_penumbral: "月半",
  tibetan_festival: "🪔",
};

function BuddhaLineMark({ className }: { className: string }): React.JSX.Element {
  return (
    <svg aria-hidden="true" className={`calendar-festival-icon ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9.2" r="6.1" />
      <path d="M12 4.8c1 .7 1.1 1.7.5 2.4M12 4.8c-1 .7-1.1 1.7-.5 2.4M9.5 8.1c.6-.8 1.4-1.2 2.5-1.2s1.9.4 2.5 1.2M9.4 8.7c.1 1.7 1 2.9 2.6 2.9s2.5-1.2 2.6-2.9" />
      <path d="M8.4 12.2c-2.1.8-3.2 2.5-3.4 5.2M15.6 12.2c2.1.8 3.2 2.5 3.4 5.2M8.2 14.3c1.1.7 2.4 1 3.8 1s2.7-.3 3.8-1" />
      <path d="M5.5 18.3c1.7-1.8 3.8-2.7 6.5-2.7s4.8.9 6.5 2.7M4.3 20.1h15.4M7 18.8c1.4.7 3.1 1.1 5 1.1s3.6-.4 5-1.1" />
    </svg>
  );
}

function TibetanFestivalMark({ label }: { label: string }): React.JSX.Element {
  if (label.includes("莲师")) {
    return <svg aria-hidden="true" className="calendar-festival-icon calendar-festival-icon--lotus" viewBox="0 0 24 24" fill="none"><path d="M12 20c-4.4 0-7.5-1.6-9-4.5 3.5-.2 5.8 1 9 4.5Zm0 0c4.4 0 7.5-1.6 9-4.5-3.5-.2-5.8 1-9 4.5Zm0-1.3c-3.7-2.4-5.4-5.2-4.4-8.3 2.4 1.1 3.9 3.2 4.4 8.3Zm0 0c3.7-2.4 5.4-5.2 4.4-8.3-2.4 1.1-3.9 3.2-4.4 8.3ZM12 17c-2.2-3.5-2.1-6.6 0-9.4 2.1 2.8 2.2 5.9 0 9.4Z" /></svg>;
  }
  if (label.includes("药师佛")) {
    return <BuddhaLineMark className="calendar-festival-icon--medicine" />;
  }
  if (label.includes("阿弥陀佛")) {
    return <BuddhaLineMark className="calendar-festival-icon--amitabha" />;
  }
  return <span aria-hidden="true">🪔</span>;
}

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
  /** 当月按公历日期归类的当前口径标记 */
  astronomyEvents?: MonthlyCalendarEvent[];
  eventMode?: CalendarDisplayMode;
  onEventModeChange?: (mode: CalendarDisplayMode) => void;
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
  initialSelected = null,
  astronomyEvents = [],
  eventMode = "astronomy",
  onEventModeChange,
}) => {
  // 内部状态：高亮的日期，默认 null（不高亮任何一天）
  const [selectedDay, setSelectedDay] = React.useState<number | null>(initialSelected);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    onSelectDay?.(day);
  };
  const eventsByDay = React.useMemo(() => astronomyEvents.reduce<Record<number, MonthlyCalendarEvent[]>>((map, event) => {
    const day = Number(event.date.slice(-2));
    if (Number.isInteger(day)) (map[day] ||= []).push(event);
    return map;
  }, {}), [astronomyEvents]);

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
          const events = eventsByDay[day] || [];
          return (
            <button
              key={day}
              className={`day-cell transition-colors ${isSelected ? "" : "hover:bg-white/5"}`}
              onClick={() => handleSelectDay(day)}
              aria-pressed={isSelected}
            >
              {events.length > 0 && <span className="calendar-event-marks" aria-label={events.map(event => [event.label, event.time, event.tibetanDate].filter(Boolean).join(" ")).join("；")}>
                {events.map(event => <span key={`${event.type}-${event.time || event.tibetanDate || event.label}`} className={`calendar-event-mark calendar-event-mark--${event.type}`} title={[event.label, event.time, event.tibetanDate].filter(Boolean).join(" · ")}>{event.type === "tibetan_festival" ? <TibetanFestivalMark label={event.label} /> : EVENT_MARKS[event.type]}</span>)}
              </span>}
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="日历标记口径">
        <div className="calendar-event-legend calendar-event-legend--footer" aria-label={eventMode === "astronomy" ? "现代天文事件图例" : "藏历节日图例"}>
          {eventMode === "astronomy" ? <>
            <span>🌑 新月</span>
            <span>🌕 满月</span>
            <span className="calendar-event-legend--solar">日偏／日全／日环</span>
            <span className="calendar-event-legend--lunar">月偏／月全</span>
        </> : <>
          <span className="calendar-event-legend--tibetan"><BuddhaLineMark className="calendar-festival-icon--medicine" /> 药师佛</span>
          <span className="calendar-event-legend--tibetan"><TibetanFestivalMark label="莲师荟供日" /> 莲师</span>
          <span className="calendar-event-legend--tibetan"><BuddhaLineMark className="calendar-festival-icon--amitabha" /> 阿弥陀佛</span>
          <span className="calendar-event-legend--tibetan">🪔 其他节日</span>
        </>}
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-white/15 text-xs">
          <button type="button" aria-pressed={eventMode === "astronomy"} onClick={() => onEventModeChange?.("astronomy")} className={`px-3 py-2 transition ${eventMode === "astronomy" ? "bg-cyan-300/20 text-cyan-100" : "text-slate-400 hover:bg-white/5"}`}>现代天文</button>
          <button type="button" aria-pressed={eventMode === "tibetan"} onClick={() => onEventModeChange?.("tibetan")} className={`border-l border-white/15 px-3 py-2 transition ${eventMode === "tibetan" ? "bg-amber-300/20 text-amber-100" : "text-slate-400 hover:bg-white/5"}`}>藏历节日</button>
        </div>
      </div>
    </div>
  );
};

export default CalendarBox;
