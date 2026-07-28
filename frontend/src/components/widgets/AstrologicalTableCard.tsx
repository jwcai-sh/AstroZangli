import * as React from "react";

/**
 * AstrologicalTableCard
 * - 用途：展示占星相关的表格数据（定曜、太阳日月宿、定日、会合、作用）。
 * - 组件类型：展示型组件（Presentational）。
 * - 数据来源：通过 props 传入，若未提供则使用内置默认示例数据。
 * - 复用建议：在任意页面以卡片形式呈现占星/表格类信息。
 */

export interface AstrologicalRow {
  fixedWeekday: string | number;
  solarLunar: string | number;
  fixedDay: string | number;
  conjunction: string | number;
  effect?: string;
}

export interface AstrologicalTableCardProps {
  header?: { title: string; subtitle: string };
  rows?: AstrologicalRow[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
}

const AstrologicalTableCard: React.FC<AstrologicalTableCardProps> = ({
  header = { title: "木蛇年五月廿九", subtitle: "Astrological Data" },
  rows = [
    { fixedWeekday: 1, solarLunar: 15, fixedDay: 7, conjunction: 22, effect: "孺蜜" },
    { fixedWeekday: 2, solarLunar: 10, fixedDay: 7, conjunction: 17, effect: "贵种" },
    { fixedWeekday: 22, solarLunar: 45, fixedDay: 8, conjunction: 54, effect: "" },
    { fixedWeekday: 3, solarLunar: 5, fixedDay: 3, conjunction: 2, effect: "" },
    { fixedWeekday: 61, solarLunar: 8, fixedDay: 3, conjunction: 11, effect: "" },
    { fixedWeekday: 248, solarLunar: 459, fixedDay: 459, conjunction: "", effect: "" }
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

      {/* 藏历信息框 - 只显示矩形框，居中放置 */}
      <div className="flex justify-center mb-6">
        <div className="astro-tibetan-rect-centered">
          <span className="dateevents-tibetan-rect-text">{header.title}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm astro-table-compact">
          <thead>
            <tr className="border-b border-gray-500/50">
              <th className="text-center py-2 px-1 text-gray-300 font-semibold">定曜</th>
              <th className="text-center py-2 px-1 text-gray-300 font-semibold whitespace-nowrap">太阳日月宿</th>
              <th className="text-center py-2 px-1 text-gray-300 font-semibold">定日</th>
              <th className="text-center py-2 px-1 text-gray-300 font-semibold">会合</th>
              <th className="text-center py-2 px-1 text-gray-300 font-semibold">作用</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${idx}-${r.fixedWeekday}`} className={`${idx < rows.length - 1 ? "border-b border-gray-600/30" : ""} hover:bg-gray-800/20 transition-colors duration-200`}>
                <td className="py-1.5 px-1 text-gray-200 font-medium text-center">{r.fixedWeekday}</td>
                <td className="py-1.5 px-1 text-gray-200 font-medium text-center">{r.solarLunar}</td>
                <td className="py-1.5 px-1 text-gray-200 font-medium text-center">{r.fixedDay}</td>
                <td className="py-1.5 px-1 text-gray-200 font-medium text-center">{r.conjunction}</td>
                <td className="py-1.5 px-1 text-gray-200 font-medium text-center">{r.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AstrologicalTableCard;
