"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  buildBasicDataHref,
  getBasicDataGroup,
  type BasicDataSubtab,
} from "@/features/earth/navigation";

interface BasicDataSubnavProps {
  currentSubtab: BasicDataSubtab;
}

const GROUPS = [
  { id: "five-elements", label: "五要素", target: "five-elements" },
  { id: "five-planets", label: "五曜", target: "five-planets" },
  { id: "other", label: "其它历算", target: "tibetan-cycle" },
] as const;

const OTHER_VIEWS: Array<{ id: BasicDataSubtab; label: string; available: boolean }> = [
  { id: "tibetan-cycle", label: "藏历绕迥纪年", available: true },
  { id: "duplicate-missing", label: "重日和缺日", available: false },
];

export default function BasicDataSubnav({
  currentSubtab,
}: BasicDataSubnavProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const group = getBasicDataGroup(currentSubtab);
  const views: Array<{ id: BasicDataSubtab; label: string; available: boolean }> = group === "five-elements"
    ? [{ id: "five-elements", label: "数值", available: true }, { id: "five-elements-sphere", label: "天球图", available: true }]
    : group === "five-planets"
      ? [{ id: "five-planets", label: "数值", available: true }, { id: "five-planets-sphere", label: "天球图", available: true }]
      : OTHER_VIEWS;
  const linkClass = (active: boolean, available = true) => `rounded-full border px-4 py-2 text-xs font-medium transition-all sm:text-sm ${active
    ? "border-cyan-300/65 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
    : available
      ? "border-white/10 bg-white/6 text-slate-200 hover:border-cyan-300/30 hover:bg-white/10"
      : "cursor-not-allowed border-white/10 bg-white/4 text-slate-500"}`;
  return (
    <nav aria-label="天文历算基本数据" className="space-y-2 px-2 pb-3 pt-1">
      <div className="flex flex-wrap justify-center gap-2" aria-label="历算类别">
        {GROUPS.map(item => <Link key={item.id} href={buildBasicDataHref(item.target, searchParams)} className={linkClass(group === item.id)} aria-current={group === item.id ? "page" : undefined}>{item.label}</Link>)}
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label={`${group === "five-elements" ? "五要素" : group === "five-planets" ? "五曜" : "其它历算"}视图`}>
        {views.map(view => view.available
          ? <Link key={view.id} href={buildBasicDataHref(view.id, searchParams)} className={linkClass(currentSubtab === view.id)} aria-current={currentSubtab === view.id ? "page" : undefined}>{view.label}</Link>
          : <span key={view.id} className={linkClass(false, false)} aria-disabled="true" title={`${view.label}数据页面尚未接入`}>{view.label}</span>)}
      </div>
    </nav>
  );
}
