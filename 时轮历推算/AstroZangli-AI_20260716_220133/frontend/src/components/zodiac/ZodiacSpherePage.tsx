"use client";

import { useMemo, useState } from "react";
import CelestialSphere, { type SphereMarker } from "@/components/celestial-sphere/CelestialSphere";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";

const ZODIAC = ["白羊宫", "金牛宫", "双子宫", "巨蟹宫", "狮子宫", "处女宫", "天秤宫", "天蝎宫", "射手宫", "摩羯宫", "水瓶宫", "双鱼宫"];
const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const ecliptic = Array.from({ length: 361 }, (_, index) => ({ longitude: index, latitude: 0 }));

function solarLongitude(date: string) {
  const year = Number(date.slice(0, 4));
  const start = Date.UTC(year, 0, 1);
  const day = (Date.parse(`${date}T00:00:00Z`) - start) / 86400000;
  return ((day + 79) / 365.2422 * 360 + 360) % 360;
}

export default function ZodiacSpherePage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const sunLongitude = solarLongitude(date);
  const markers = useMemo<SphereMarker[]>(() => [
    ...ZODIAC.map((name, index) => ({ id: `zodiac-${index}`, name, longitude: index * 30 + 15, latitude: 0, color: "#b8a878", kind: "virtual" as const })),
    { id: "sun", name: "太阳", longitude: sunLongitude, latitude: 0, color: "#ffd17b", kind: "sun" },
  ], [sunLongitude]);

  return <main className="mx-auto max-h-[calc(100vh-170px)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 p-4 pb-20 text-slate-100 shadow-2xl sm:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[.24em] text-cyan-300">ZODIAC · ECLIPTIC</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("黄道十二宫")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("在统一球面总览中查看黄道、十二宫分区与太阳当前位置。")}</p></div>
      <label className="text-xs text-slate-300">{t("日期")}<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 block rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white" /></label>
    </header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.7fr)]">
      <CelestialSphere title="黄道十二宫" subtitle="球面总览" note="黄道带按 12 个 30° 区段显示；太阳位置为日期的近似黄经。" markers={markers} selected="sun" onSelect={() => undefined} trails={[{ id: "ecliptic", color: "#d1b77a", points: ecliptic }]} starFrame={{ matrix: identity, date }} t={t} />
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs tracking-[.2em] text-cyan-300">{t("当前观测")}</p><h2 className="mt-2 text-xl font-semibold">{date}</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-400">{t("太阳黄经")}</dt><dd className="font-medium text-amber-200">{sunLongitude.toFixed(1)}°</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">{t("参考平面")}</dt><dd>{t("黄道面")}</dd></div></dl><p className="mt-6 text-xs leading-5 text-slate-400">{t("球面总览默认开启，可拖动旋转、滚轮缩放，并通过左侧图层控制显示内容。")}</p></aside>
    </div>
  </main>;
}
