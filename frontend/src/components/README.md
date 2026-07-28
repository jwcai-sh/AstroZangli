# Components 文档

本目录包含项目内的可复用组件（组件库雏形）。本说明文档覆盖组件的功能、props 定义、以及使用示例。

- 结构
  - `calendar/CalendarBox.tsx`
  - `widgets/DateEventsCard.tsx`
  - `widgets/AstrologicalTableCard.tsx`
  - `widgets/MoonPhaseCard.tsx`
  - `widgets/PlanetaryChartCard.tsx`

> 提示：所有组件均为 React 组件，使用 TailwindCSS 进行样式组织；导入方式建议通过路径别名 `@/*`。

---

## calendar/CalendarBox
用于渲染日历头部导航 + 星期行 + 天数网格的组合区块。

- 文件：`src/components/calendar/CalendarBox.tsx`
- 组件：`CalendarBox`
- 类型：可交互展示组件（Presentational + Callbacks）

### Props
- `currentMonth: string` 当前月份文案，例如 `"September 2021"`
- `selectedDay?: number` 当前选中的日期（1~daysInMonth）
- `onPrevMonth?: () => void` 点击左箭头触发
- `onNextMonth?: () => void` 点击右箭头触发
- `onSelectDay?: (day: number) => void` 点击日期触发
- `weekdays?: string[]` 星期栏文案，默认 `['SUN','MON','TUE','WED','THU','FRI','SAT']`
- `daysInMonth?: number` 本月天数，默认 `31`

### 使用示例
```tsx
import CalendarBox from "@/components/calendar/CalendarBox";

<CalendarBox
  currentMonth={"September 2021"}
  selectedDay={19}
  onPrevMonth={() => { /* TODO */ }}
  onNextMonth={() => { /* TODO */ }}
  onSelectDay={(d) => console.log("select", d)}
/>
```

---

## widgets/DateEventsCard
用于展示某天的标题/副标题、三个计数圆点、以及事件列表。

- 文件：`src/components/widgets/DateEventsCard.tsx`
- 组件：`DateEventsCard`
- 类型：展示组件（Presentational）

### Props
- `header?: { title: string; subtitle: string }`
- `dots?: number` 顶部白色小圆点个数（装饰）
- `counters?: Array<{ label: string; value: number | string; colorClass: string }>`
- `events?: Array<{ label: string; colorClass: string; daysLeftText?: string }>`

### 使用示例
```tsx
import DateEventsCard from "@/components/widgets/DateEventsCard";

<DateEventsCard
  header={{ title: "二零二五年六月廿九", subtitle: "2025年7月23日 周三" }}
  dots={3}
  counters={[
    { label: "农", value: 7, colorClass: "bg-blue-500" },
    { label: "公", value: 54, colorClass: "bg-green-500" },
    { label: "藏", value: 2, colorClass: "bg-purple-500" }
  ]}
  events={[
    { label: "国庆节 10月1日", colorClass: "bg-yellow-500", daysLeftText: "还剩5天" },
    { label: "立秋 8月7日", colorClass: "bg-gray-300", daysLeftText: "还剩5天" },
    { label: "雪顿节 28日", colorClass: "bg-blue-400", daysLeftText: "还剩5天" }
  ]}
/>
```

---

## widgets/AstrologicalTableCard
以卡片方式展示占星相关的表格数据。

- 文件：`src/components/widgets/AstrologicalTableCard.tsx`
- 组件：`AstrologicalTableCard`
- 类型：展示组件（Presentational）

### Props
- `header?: { title: string; subtitle: string }`
- `dots?: number` 顶部白色小圆点个数（装饰）
- `rows?: Array<{ fixedWeekday: string | number; solarLunar: string | number; fixedDay: string | number; conjunction: string | number; effect?: string }>`

### 使用示例
```tsx
import AstrologicalTableCard from "@/components/widgets/AstrologicalTableCard";

<AstrologicalTableCard
  header={{ title: "木蛇年五月廿九", subtitle: "Astrological Data" }}
  dots={3}
  rows={[
    { fixedWeekday: 1, solarLunar: 15, fixedDay: 7, conjunction: 22, effect: "孺蜜" },
    { fixedWeekday: 2, solarLunar: 10, fixedDay: 7, conjunction: 17, effect: "贵种" }
  ]}
/>
```

---

## widgets/MoonPhaseCard
展示某日期的月相信息（示意月面、照明度、升落时刻）。

- 文件：`src/components/widgets/MoonPhaseCard.tsx`
- 组件：`MoonPhaseCard`
- 类型：展示组件（Presentational）

### Props
- `header?: { title: string; subtitle: string }`
- `timeLabel?: string` 顶部次要时间点
- `illuminationText?: string` 照明度文本
- `culminationText?: string` 中天时间文本
- `moonRise?: string` 月出时间
- `moonSet?: string` 月落时间

### 使用示例
```tsx
import MoonPhaseCard from "@/components/widgets/MoonPhaseCard";

<MoonPhaseCard
  header={{ title: "二零二五年六月廿九", subtitle: "Moon Phase" }}
  timeLabel="11:26"
  illuminationText="照明度 99.6%"
  culminationText="中天 23:34"
  moonRise="05:19"
  moonSet="18:41"
/>
```

---

## widgets/PlanetaryChartCard
展示行星图（简化 SVG）与两侧时间点。

- 文件：`src/components/widgets/PlanetaryChartCard.tsx`
- 组件：`PlanetaryChartCard`
- 类型：展示组件（Presentational）

### Props
- `label?: string` 右侧星座/宫位标签
- `leftTime?: string` 左侧时间
- `rightTime?: string` 右侧时间

### 使用示例
```tsx
import PlanetaryChartCard from "@/components/widgets/PlanetaryChartCard";

<PlanetaryChartCard
  label="狮子宫"
  leftTime="05:14"
  rightTime="19:27"
/>
```

---

## 统一导出（建议）
建议新增 `src/components/index.ts` 聚合导出，方便按需引入：

```ts
export { default as CalendarBox } from "./calendar/CalendarBox";
export { default as DateEventsCard } from "./widgets/DateEventsCard";
export { default as AstrologicalTableCard } from "./widgets/AstrologicalTableCard";
export { default as MoonPhaseCard } from "./widgets/MoonPhaseCard";
export { default as PlanetaryChartCard } from "./widgets/PlanetaryChartCard";
```

使用：
```tsx
import { CalendarBox, DateEventsCard } from "@/components";
```

---

## 进阶建议：WidgetCarousel（可选）
将滑动手势与页面指示点抽象为 `WidgetCarousel` 容器，传入卡片数组进行轮播，令页面代码更简洁。

建议 API：
```ts
interface WidgetCarouselProps {
  items: React.ReactNode[];
  currentIndex: number;
  onChange: (idx: number) => void;
}
```

页面中：
```tsx
<WidgetCarousel
  items={[<DateEventsCard />, <AstrologicalTableCard />, <MoonPhaseCard />, <PlanetaryChartCard />]}
  currentIndex={currentPage}
  onChange={setCurrentPage}
/>
```

---

## 样式与一致性
- Tailwind 类名尽量保持一致，避免无意视觉变化。
- 将静态文案逐步上移为 props 以提升复用性。
- TypeScript 为每个组件导出清晰的 props 接口，禁止使用 any。

