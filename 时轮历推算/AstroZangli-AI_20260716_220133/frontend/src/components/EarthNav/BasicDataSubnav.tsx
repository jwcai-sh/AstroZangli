"use client";

import LocaleLink from "@/i18n/LocaleLink";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";
import { useSearchParams } from "next/navigation";
import { buildDayShortcut } from "@/features/earth/mobileShortcuts";
import {
  buildBasicDataHref,
  getBasicDataGroup,
  type BasicDataSubtab,
} from "@/features/earth/navigation";

interface BasicDataSubnavProps {
  currentSubtab: BasicDataSubtab;
}

const GROUPS = [
  { id: "other", label: "藏历绕迥纪年", target: "tibetan-cycle" },
  { id: "five-elements", label: "五要素", target: "five-elements" },
  { id: "five-planets", label: "五曜", target: "five-planets" },
] as const;

export default function BasicDataSubnav({
  currentSubtab,
}: BasicDataSubnavProps): React.JSX.Element {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const group = getBasicDataGroup(currentSubtab);
  const planets = group === "five-planets";
  const monthQuery = new URLSearchParams(searchParams);
  monthQuery.set("mode", "monthly");
  monthQuery.set("autoQuery", "1");
  const monthHref = `${buildBasicDataHref(planets ? "five-planets" : "five-elements", monthQuery).replace("mode=daily", "mode=monthly")}&autoQuery=1`;
  const quickClass = "flex min-h-11 items-center justify-center rounded-lg px-1 py-2 text-center text-xs text-slate-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200";
  const views: Array<{ id: BasicDataSubtab; label: string; available: boolean }> = group === "five-elements"
    ? [{ id: "five-elements", label: "数值", available: true }, { id: "five-elements-sphere", label: "天球图", available: true }]
    : group === "five-planets"
      ? [{ id: "five-planets", label: "数值", available: true }, { id: "five-planets-sphere", label: "天球图", available: true }]
      : [];
  const linkClass = (active: boolean, available = true) => `rounded-full border px-4 py-2 text-xs font-medium transition-all sm:text-sm ${active
    ? "border-cyan-300/65 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
    : available
      ? "border-white/10 bg-white/6 text-slate-200 hover:border-cyan-300/30 hover:bg-white/10"
      : "cursor-not-allowed border-white/10 bg-white/4 text-slate-500"}`;
  const commonName = appText(locale, planets ? "五曜" : "五要素");

  return (
    <nav aria-label={appText(locale, "天文历算基本数据")} className="space-y-2 px-2 pb-3 pt-1">
      {(group === "five-elements" || planets) && <div aria-label={`${commonName}${appText(locale, "快捷切换")}`} className="fixed left-1 top-1/2 z-40 flex w-10 -translate-y-1/2 flex-col gap-1 rounded-xl border border-cyan-100/20 bg-slate-950/95 p-1 shadow-lg sm:hidden">
        <button type="button" className={quickClass} aria-label={appText(locale, "返回页顶")} onClick={() => { document.querySelectorAll<HTMLElement>("div, main, section").forEach(element => { if (element.scrollTop > 0) element.scrollTo({ top: 0, behavior: "smooth" }); }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{appText(locale, "页顶")}</button>
        {views.map(view => <LocaleLink key={view.id} href={buildBasicDataHref(view.id, searchParams)} aria-label={`${appText(locale, "切换")}${commonName}${appText(locale, view.id.endsWith("sphere") ? "天球视角" : "数值")}`} aria-current={currentSubtab === view.id ? "page" : undefined} className={`${quickClass} ${currentSubtab === view.id ? "bg-cyan-300/20 text-cyan-100" : ""}`}>{appText(locale, view.id.endsWith("sphere") ? "天球" : "数值")}</LocaleLink>)}
        {([-1, 1] as const).map(step => { const href = buildDayShortcut(searchParams, step, planets); return href ? <LocaleLink key={step} href={href} scroll={false} className={quickClass} aria-label={appText(locale, step === -1 ? "快捷上一日" : "快捷下一日")}>{appText(locale, step === -1 ? "前日" : "后日")}</LocaleLink> : <span key={step} aria-disabled="true" className={`${quickClass} opacity-40`}>{appText(locale, step === -1 ? "前日" : "后日")}</span>; })}
        <LocaleLink href={monthHref} scroll={false} className={quickClass} aria-label={appText(locale, "快捷返回月度")}>{appText(locale, "月度")}</LocaleLink>
      </div>}
      <div className="flex flex-wrap justify-center gap-2" aria-label={appText(locale, "历算类别")}>
        {GROUPS.map(item => <LocaleLink key={item.id} href={buildBasicDataHref(item.target, searchParams)} className={linkClass(group === item.id)} aria-current={group === item.id ? "page" : undefined}>{appText(locale, item.label)}</LocaleLink>)}
      </div>
      {views.length > 0 && <div className="flex flex-wrap justify-center gap-2" aria-label={`${commonName}${appText(locale, "视图")} `}>
        {views.map(view => view.available
          ? <LocaleLink key={view.id} href={buildBasicDataHref(view.id, searchParams)} className={linkClass(currentSubtab === view.id)} aria-current={currentSubtab === view.id ? "page" : undefined}>{appText(locale, view.label)}</LocaleLink>
          : <span key={view.id} className={linkClass(false, false)} aria-disabled="true" title={`${appText(locale, view.label)}${appText(locale, "数据页面尚未接入")}`}>{appText(locale, view.label)}</span>)}
      </div>}
    </nav>
  );
}
