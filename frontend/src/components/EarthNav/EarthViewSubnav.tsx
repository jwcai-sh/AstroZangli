"use client";

import LocaleLink from "@/i18n/LocaleLink";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

interface EarthViewSubnavProps {
  currentView: string;
  views: Array<{ id: string; label: string; href: string }>;
}

export default function EarthViewSubnav({ currentView, views }: EarthViewSubnavProps) {
  const locale = useLocale();

  return (
    <nav aria-label={appText(locale, "页面视图")} className="flex flex-wrap justify-center gap-2 px-2 pb-3 pt-1">
      {views.map((view) => (
        <LocaleLink
          key={view.id}
          href={view.href}
          aria-current={currentView === view.id ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 sm:text-sm ${
            currentView === view.id
              ? "border-cyan-300/65 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
              : "border-white/10 bg-white/6 text-slate-200 hover:border-cyan-300/30 hover:bg-white/10"
          }`}
        >
          {appText(locale, view.label)}
        </LocaleLink>
      ))}
    </nav>
  );
}
