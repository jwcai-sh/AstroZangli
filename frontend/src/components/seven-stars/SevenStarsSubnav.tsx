"use client";

import LocaleLink from "@/i18n/LocaleLink";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

import type { SevenStarsSubtab } from "@/features/earth/navigation";

interface SevenStarsSubnavProps {
  currentSubtab: SevenStarsSubtab;
}

const SUBTABS: Array<{ id: SevenStarsSubtab; label: string }> = [
  { id: "seven-stars", label: "七星轨迹" },
  { id: "sun-earth-moon", label: "日地月运动与月相（日心视角）" },
  { id: "geocentric-motion", label: "七曜每日运动（地心视角）" },
  { id: "seven-data", label: "七星数据" },
];

export default function SevenStarsSubnav({
  currentSubtab,
}: SevenStarsSubnavProps): React.JSX.Element {
  const locale = useLocale();
  return (
    <div className="flex flex-wrap justify-center gap-2 px-2 pb-3 pt-1">
      {SUBTABS.map((subtab) => (
        <LocaleLink
          key={subtab.id}
          href={`/earth?tab=seven-stars&subtab=${subtab.id}`}
          className={`rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 sm:text-sm ${
            currentSubtab === subtab.id
              ? "border-cyan-300/65 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
              : "border-white/10 bg-white/6 text-slate-200 hover:border-cyan-300/30 hover:bg-white/10"
          }`}
        >
          {appText(locale, subtab.label)}
        </LocaleLink>
      ))}
    </div>
  );
}
