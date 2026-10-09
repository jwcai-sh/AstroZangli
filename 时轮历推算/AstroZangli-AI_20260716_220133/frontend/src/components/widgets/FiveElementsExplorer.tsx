"use client";

import type {
  FiveElementPanel,
  FiveElementPanelId,
} from "@/features/five-elements/model";

interface FiveElementsExplorerProps {
  panels: FiveElementPanel[];
  activePanelId: FiveElementPanelId;
  activeStageIndex: number;
  selectedDate: string;
  secondaryLabel: string;
  secondaryValue: string;
  onPanelChange: (panelId: FiveElementPanelId) => void;
  onStageChange: (index: number) => void;
}

function formatValueBadge(value: string): string {
  return value.trim() ? value : "--";
}

export default function FiveElementsExplorer({
  panels,
  activePanelId,
  activeStageIndex,
  selectedDate,
  secondaryLabel,
  secondaryValue,
  onPanelChange,
  onStageChange,
}: FiveElementsExplorerProps): React.JSX.Element {
  const activePanel =
    panels.find((panel) => panel.id === activePanelId) ?? panels[0];
  const activeValue = activePanel?.values[activeStageIndex];

  if (!activePanel) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center text-sm text-slate-300 backdrop-blur-xl">
        暂无五要素数据
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {panels.map((panel) => {
          const isActive = panel.id === activePanel.id;
          const preview = panel.values
            .slice(0, 2)
            .map((item) => item.value)
            .join(" / ");

          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => onPanelChange(panel.id)}
              className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
                isActive
                  ? "border-cyan-300/70 bg-slate-900/85 shadow-[0_0_30px_rgba(59,130,246,0.18)]"
                  : "border-white/10 bg-slate-950/70 hover:border-cyan-400/40 hover:bg-slate-900/80"
              }`}
            >
              <div
                className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${panel.accentClassName}`}
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{panel.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{panel.metricLabel}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                  {panel.values.length} 项
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-slate-400">
                {preview || "等待数据"}
              </p>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[30px] border border-cyan-200/15 bg-slate-950/75 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="border-b border-white/8 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div
                className={`mb-3 h-1.5 w-28 rounded-full bg-gradient-to-r ${activePanel.accentClassName}`}
              />
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-wide text-white sm:text-3xl">
                  {activePanel.title}
                </h2>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 text-xs tracking-[0.28em] text-cyan-100 uppercase">
                  Five Elements
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {activePanel.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-slate-200 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">日期</p>
                <p className="mt-2 font-medium text-white">{selectedDate}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{secondaryLabel}</p>
                <p className="mt-2 font-medium text-white">{secondaryValue}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">层级数</p>
                <p className="mt-2 font-medium text-white">{activePanel.values.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">藏历</p>
                <p className="mt-2 truncate font-medium text-white">
                  {activePanel.tibetanDate || "--"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6 sm:px-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)]">
          <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(91,191,255,0.18),transparent_42%),linear-gradient(180deg,rgba(8,16,31,0.94),rgba(6,11,22,0.92))] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                  交互序列
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  点击任一节点，查看该要素在当前日期下的层级结果。
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {activePanel.shortTitle}
              </div>
            </div>

            <div className="relative mt-8">
              <div className="absolute left-8 right-8 top-7 hidden h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent md:block" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activePanel.values.map((item, index) => {
                  const isSelected = index === activeStageIndex;

                  return (
                    <button
                      key={`${activePanel.id}-${item.label}-${index}`}
                      type="button"
                      onClick={() => onStageChange(index)}
                      className={`relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-cyan-300/75 bg-cyan-300/10 shadow-[0_0_30px_rgba(96,165,250,0.18)]"
                          : "border-white/10 bg-slate-950/55 hover:border-cyan-400/35 hover:bg-slate-900/75"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${activePanel.accentClassName}`}
                      />
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-4 text-2xl font-semibold tracking-wide text-white">
                        {formatValueBadge(item.value)}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.numericValue === null
                          ? "文本结果"
                          : `数值 ${item.numericValue}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">当前焦点</p>
              <h3 className="mt-3 text-xl font-semibold text-white">
                {activeValue?.label || "序位 1"}
              </h3>
              <p className="mt-3 text-4xl font-semibold tracking-wide text-cyan-100">
                {formatValueBadge(activeValue?.value || "--")}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {activePanel.description}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">阅读提示</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>
                  当前视图保留后端给出的原始序位顺序，不额外改写算法口径。
                </li>
                <li>
                  数值型节点以序列方式展示，便于比较同一要素内部的层级变化。
                </li>
                <li>
                  作用以文本前后分展示，避免把文本结果误解为连续数值。
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
