"use client";

import { useEffect, useMemo, useState } from "react";
import CelestialSphere, { type SphereMarker, type SpherePoint } from "@/components/celestial-sphere/CelestialSphere";
import { appText } from "@/i18n/copy";
import { useLocale } from "@/i18n/LocaleProvider";
import { BODIES, CITIES, annualIndex, beijingNow, type BodyId, type SkyData, type SkyFrame } from "@/features/sky-view/model";

const control = "rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 disabled:opacity-40";
const point = (frame: SkyFrame, body: BodyId): SpherePoint => ({ longitude: frame.bodies[body].azimuth, latitude: frame.bodies[body].altitude });

export default function AnnualMotionSpherePage() {
  const locale = useLocale();
  const t = (value: string) => appText(locale, value);
  const [date, setDate] = useState(() => beijingNow().slice(0, 10));
  const [city, setCity] = useState("lhasa");
  const [hour, setHour] = useState(12);
  const [index, setIndex] = useState(() => annualIndex(beijingNow().slice(0, 10)));
  const [selected, setSelected] = useState<BodyId>("sun");
  const [data, setData] = useState<SkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const year = date.slice(0, 4);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPlaying(false);
    setData(null);
    fetch(`/api/astronomy/sky-view?city=${city}&mode=annual&date=${year}-01-01&hour=${hour}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error?.message || "星历数据加载失败");
        return payload.data as SkyData;
      })
      .then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        setIndex(previous => Math.min(previous, result.frames.length - 1));
        setError("");
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(reason instanceof Error ? reason.message : "星历数据加载失败");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [city, hour, year]);

  useEffect(() => {
    if (!playing || !data) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % data.frames.length), 220);
    return () => window.clearInterval(timer);
  }, [playing, data]);

  const frame = data?.frames[Math.min(index, Math.max(0, (data?.frames.length ?? 1) - 1))];
  const markers = useMemo<SphereMarker[]>(() => frame ? BODIES.map(body => ({
    id: body.id,
    name: body.name,
    ...point(frame, body.id),
    color: body.color,
    kind: body.id === "sun" ? "sun" as const : body.id === "moon" ? "moon" as const : undefined,
  })) : [], [frame]);
  const trails = useMemo(() => data ? BODIES.map(body => ({
    id: `annual-${body.id}`,
    color: body.color,
    points: data.frames.map(item => point(item, body.id)),
    faint: body.id !== selected,
  })) : [], [data, selected]);
  const changeDate = (value: string) => {
    if (!value) return;
    setDate(value);
    setIndex(annualIndex(value));
  };
  const step = (delta: number) => {
    const next = Math.max(0, Math.min((data?.frames.length ?? 1) - 1, index + delta));
    setIndex(next);
    const nextDate = data?.frames[next]?.localTime.slice(0, 10);
    if (nextDate) setDate(nextDate);
  };

  return <main className="mx-auto max-h-[calc(100vh-170px)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 p-4 pb-20 text-slate-100 shadow-2xl sm:p-6">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold tracking-[.24em] text-cyan-300">ANNUAL MOTION · CELESTIAL GLOBE</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("周年视运动（地心坐标）")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("按日期和观测地点查看太阳与行星在天球上的周年视运动。")}</p></div>
      <div className="flex flex-wrap gap-2">{CITIES.map(item => <button key={item.id} type="button" className={`${control} ${city === item.id ? "border-cyan-300/70 text-cyan-100" : ""}`} onClick={() => setCity(item.id)}>{t(item.name)}</button>)}</div>
    </header>
    <section className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="text-xs text-slate-300">{t("日期")}<input type="date" value={date} onChange={event => changeDate(event.target.value)} className="ml-2 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-300">{t("每日采样时刻")}<select value={hour} onChange={event => setHour(Number(event.target.value))} className="ml-2 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white">{Array.from({ length: 24 }, (_, value) => <option key={value} value={value}>{String(value).padStart(2, "0")}:00</option>)}</select></label><div className="flex items-center gap-2"><button type="button" className={control} disabled={!data || index === 0} onClick={() => step(-1)}>{t("前一日")}</button><button type="button" className={control} disabled={!data} onClick={() => setPlaying(value => !value)}>{t(playing ? "暂停" : "播放")}</button><button type="button" className={control} disabled={!data || index >= (data?.frames.length ?? 1) - 1} onClick={() => step(1)}>{t("后一日")}</button></div></div>
      <input type="range" min="0" max={Math.max(0, (data?.frames.length ?? 1) - 1)} value={index} disabled={!data} aria-label={t("全年日期滑块")} onChange={event => { const next = Number(event.target.value); setIndex(next); setPlaying(false); const nextDate = data?.frames[next]?.localTime.slice(0, 10); if (nextDate) setDate(nextDate); }} className="mt-4 w-full accent-cyan-300" />
      <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{year}-01-01</span><span>{data?.city.name ? t(data.city.name) : "—"} · {frame?.localTime ?? (loading ? t("查询中…") : t(error))}</span><span>{year}-12-31</span></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,.7fr)]">
      <CelestialSphere title={t("周年视运动（地心坐标）")} subtitle={t("球面总览")} note={t("彩色轨迹表示各天体在每日同一北京时间的年内位置；坐标来自所选地点的地平坐标。")} markers={markers} selected={selected} onSelect={id => setSelected(id as BodyId)} trails={trails} starFrame={frame ? { matrix: frame.matrix, date: frame.localTime.slice(0, 10) } : undefined} t={t} />
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs tracking-[.2em] text-cyan-300">{t("当前天体")}</p><h2 className="mt-2 text-xl font-semibold">{t(BODIES.find(body => body.id === selected)?.name ?? "太阳")}</h2><h3 className="mt-2 text-sm text-slate-300">{frame?.localTime.replace("T", "  ") ?? "—"}</h3><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-400">{t("方位角")}</dt><dd>{frame ? `${frame.bodies[selected].azimuth.toFixed(1)}°` : "—"}</dd></div><div className="flex justify-between"><dt className="text-slate-400">{t("高度角")}</dt><dd>{frame ? `${frame.bodies[selected].altitude.toFixed(1)}°` : "—"}</dd></div><div className="flex justify-between"><dt className="text-slate-400">{t("观测地点")}</dt><dd>{data?.city.name ? t(data.city.name) : "—"}</dd></div></dl>{error && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}<p className="mt-6 text-xs leading-5 text-slate-400">{t("可拖动球面转向；滑块按日浏览全年同一时刻的行星位置。")}</p></aside>
    </div>
  </main>;
}
