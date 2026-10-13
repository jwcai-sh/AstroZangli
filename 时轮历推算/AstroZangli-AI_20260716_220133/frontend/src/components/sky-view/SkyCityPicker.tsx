"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";
import { CITIES } from "@/features/sky-view/model";

type Props = {
  city: string;
  onChange: (city: string) => void;
  className?: string;
};

export default function SkyCityPicker({ city, onChange, className = "" }: Props) {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);

  return (
    <label className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-300">
      <span className="shrink-0">{t("观测城市")}</span>
      <select
        aria-label={t("观测城市")}
        value={city}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${className}`}
      >
        <optgroup label={t("中国主要城市")}>
          {CITIES.filter((item) => item.region === "china").map((item) => (
            <option key={item.id} value={item.id}>{t(item.name)}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
