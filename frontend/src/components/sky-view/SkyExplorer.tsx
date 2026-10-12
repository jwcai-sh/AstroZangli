"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BODIES, CITIES, annualIndex, beijingNow, clamp, headingName, horizontalVector, wrap, DEG,
  type BodyId, type CameraView, type Catalog, type SkyData, type SkyLayers, type SkyMode,
} from "@/features/sky-view/model";
import SkyCanvas, { type StarSelection } from "./SkyCanvas";
import styles from "./sky-view.module.css";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

const LegacyDaily = dynamic(() => import("@/components/seven-stars/page"), { ssr: false });
const LegacyAnnual = dynamic(() => import("@/components/annual-motion/page"), { ssr: false });
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type PermissionDevice = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
let catalogPromise: Promise<Catalog> | null = null;
function getCatalog() {
  if (!catalogPromise) catalogPromise = fetch("/sky-data/bright-sky.json").then((response) => {
    if (!response.ok) throw new Error("亮星目录加载失败");
    return response.json() as Promise<Catalog>;
  }).catch((error) => { catalogPromise = null; throw error; });
  return catalogPromise;
}

export default function SkyExplorer({ mode }: { mode: SkyMode }) {
  const locale = useLocale();
  const t = useCallback((text: string) => appText(locale, text), [locale]);
  const [view, setView] = useState<"sky" | "legacy">("sky");
  const [city, setCity] = useState("lhasa");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState(12);
  const [index, setIndex] = useState(mode === "annual" ? 0 : 120);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [data, setData] = useState<SkyData | null>(null);
  const [dataKey, setDataKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<BodyId>(mode === "annual" ? "sun" : "moon");
  const [star, setStar] = useState<StarSelection | null>(null);
  const [camera, setCamera] = useState<CameraView>({ azimuth: 180, altitude: 26, fov: 65 });
  const [layers, setLayers] = useState<SkyLayers>({ lines: true, names: true, grid: false, ground: true, daylightStars: mode === "annual", trails: true });
  const [message, setMessage] = useState("");
  const [sensor, setSensor] = useState(false);
  const sensorCleanup = useRef<(() => void) | null>(null);
  const initiallyFramed = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const requestDate = mode === "annual" && date ? `${date.slice(0, 4)}-01-01` : date;
  const requestKey = `${city}/${mode}/${requestDate}/${hour}`;
  const isReady = !loading && data !== null && dataKey === requestKey;
  const frame = isReady ? data.frames[Math.min(index, data.frames.length - 1)] : undefined;
  const displayDate = mode === "annual" && date
    ? new Date(Date.UTC(Number(date.slice(0, 4)), 0, 1 + index)).toISOString().slice(0, 10)
    : date;

  useEffect(() => {
    const today = beijingNow().slice(0, 10);
    setDate(today);
    if (mode === "annual") setIndex(annualIndex(today));
  }, [mode]);

  useEffect(() => {
    if (!requestDate || view !== "sky") return;
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(""); setPlaying(false); setData(null);
    const params = new URLSearchParams({ city, mode, date: requestDate, hour: String(hour) });
    Promise.all([
      getCatalog(),
      fetch(`/api/astronomy/sky-view?${params}`, { signal: controller.signal }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || "星历数据加载失败");
        return result.data as SkyData;
      }),
    ]).then(([nextCatalog, nextData]) => {
      if (!active) return;
      setCatalog(nextCatalog); setData(nextData); setDataKey(requestKey);
      setIndex((current) => Math.min(current, nextData.frames.length - 1));
      if (mode === "annual" && !initiallyFramed.current) {
        const sum = nextData.frames.reduce((v, f) => {
          const point = horizontalVector(f.bodies.sun.azimuth, f.bodies.sun.altitude);
          return v.map((n, i) => n + point[i]);
        }, [0, 0, 0]);
        const altitude = Math.asin(sum[2] / Math.hypot(...sum)) / DEG;
        if (altitude > 0) setCamera({ azimuth: wrap(Math.atan2(sum[0], sum[1]) / DEG), altitude: clamp(altitude, 0, 85), fov: 65 });
        initiallyFramed.current = true;
      }
    }).catch((reason: Error) => {
      if (active && reason.name !== "AbortError") setError(reason.message || "星空加载失败，请重试");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [city, mode, requestDate, requestKey, hour, retry, view]);

  useEffect(() => {
    if (!playing || !data || view !== "sky") return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % data.frames.length), mode === "annual" ? 220 : 180);
    return () => window.clearInterval(timer);
  }, [playing, data, mode, view]);
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const stopSensor = useCallback(() => { sensorCleanup.current?.(); sensorCleanup.current = null; setSensor(false); }, []);
  useEffect(() => () => { sensorCleanup.current?.(); }, []);

  async function startSensor() {
    if (sensor) { stopSensor(); return; }
    if (!window.isSecureContext) { setMessage(t("手机指向需要 HTTPS。当前可拖动星空查看。")); return; }
    if (!("DeviceOrientationEvent" in window)) { setMessage(t("此设备不支持方向传感器，可拖动星空查看。")); return; }
    try {
      const device = window.DeviceOrientationEvent as PermissionDevice;
      if (device.requestPermission && await device.requestPermission() !== "granted") {
        setMessage(t("未获得方向权限，可继续拖动星空查看。")); return;
      }
      let received = false;
      const handler = (event: CompassEvent) => {
        if (event.beta === null || event.gamma === null) return;
        const iosHeading = event.webkitCompassHeading;
        if (iosHeading === undefined && (!event.absolute || event.alpha === null)) return;
        if (event.webkitCompassAccuracy !== undefined && (event.webkitCompassAccuracy < 0 || event.webkitCompassAccuracy > 40)) return;
        received = true;
        const a = (iosHeading !== undefined ? 360 - iosHeading : event.alpha!) * DEG;
        const b = event.beta * DEG, g = event.gamma * DEG;
        const east = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
        const north = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
        const up = -Math.cos(b) * Math.cos(g);
        setCamera((current) => ({ ...current, azimuth: wrap(Math.atan2(east, north) / DEG), altitude: clamp(Math.asin(clamp(up, -1, 1)) / DEG, -80, 85) }));
      };
      window.addEventListener("deviceorientationabsolute", handler as EventListener);
      window.addEventListener("deviceorientation", handler);
      const timer = window.setTimeout(() => {
        if (!received) { stopSensor(); setMessage(t("未收到可用的罗盘方向，请在支持传感器的手机浏览器中打开。")); }
      }, 3000);
      sensorCleanup.current = () => {
        window.clearTimeout(timer);
        window.removeEventListener("deviceorientationabsolute", handler as EventListener);
        window.removeEventListener("deviceorientation", handler);
      };
      setPlaying(false); setSensor(true); setMessage(t("手机背面朝向天空；罗盘为近似指向，远离磁性物体。"));
    } catch { setMessage(t("方向权限未开启，可继续拖动星空查看。")); }
  }

  function selectBody(body: BodyId) {
    if (!frame) return;
    stopSensor(); setSelected(body); setStar(null);
    const position = frame.bodies[body];
    setCamera((current) => ({ ...current, azimuth: position.azimuth, altitude: clamp(position.altitude, -80, 85) }));
    if (position.altitude < 0) {
      setLayers((current) => ({ ...current, ground: false }));
      setMessage(t("在地平线下，已打开地下透视。"));
    } else setMessage("");
  }
  function updateDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "2050-12-31") return;
    setDate(value); setPlaying(false); setStar(null);
    if (mode === "annual") setIndex(annualIndex(value));
  }
  function now() {
    const time = beijingNow(); setDate(time.slice(0, 10)); setPlaying(false);
    if (mode === "annual") { setHour(Number(time.slice(11, 13))); setIndex(annualIndex(time.slice(0, 10))); }
    else setIndex(Math.floor((Number(time.slice(11, 13)) * 60 + Number(time.slice(14, 16))) / 10));
  }
  const currentBody = frame?.bodies[selected];
  const bodyName = t(BODIES.find((item) => item.id === selected)!.name);

  return <section className={styles.explorer} aria-label={t(mode === "daily" ? "七星观测星空" : "周年观测星空")}
    onTouchStart={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}>
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>{t("藏历星图 · 观测天空")}</span><h1>{t(mode === "daily" ? "此地，此刻的星空" : "在同一时刻，看见一年的变化")}</h1></div>
      <div className={styles.viewSwitch} aria-label={t("视图模式")}>
        <button aria-pressed={view === "sky"} onClick={() => setView("sky")}>{t("观测星空")}</button>
        <button aria-pressed={view === "legacy"} onClick={() => { stopSensor(); setPlaying(false); setView("legacy"); }}>{t("原轨迹天球")}</button>
      </div>
    </div>
    {view === "legacy" ? (mode === "annual" ? <LegacyAnnual /> : <LegacyDaily />) : <>
      <div className={styles.toolbar}>
        <div className={styles.cities} aria-label={t("观测地点")}>{CITIES.map((item) => <button key={item.id} aria-pressed={city === item.id} onClick={() => { setCity(item.id); setStar(null); setMessage(""); }}>{t(item.name)}</button>)}</div>
        <div className={styles.dateControls}>
          <label><span className={styles.srOnly}>{t("观测日期")}</span><input aria-label={t("观测日期")} type="date" min="1900-01-01" max="2050-12-31" value={displayDate} onChange={(event) => updateDate(event.target.value)} /></label>
          {mode === "annual" && <label className={styles.hourLabel}>{t("每日")} <select aria-label={t("每日采样时刻")} value={hour} onChange={(event) => setHour(Number(event.target.value))}>{Array.from({ length: 24 }, (_, n) => <option key={n} value={n}>{String(n).padStart(2, "0")}:00</option>)}</select></label>}
          <button onClick={now}>{t("现在")}</button><span className={styles.timezone}>{t("北京时间 UTC+8")}</span>
        </div>
      </div>
      <div className={styles.scene} ref={sceneRef}>
        {catalog && data && frame && !loading ? <SkyCanvas catalog={catalog} data={data} frame={frame} camera={camera} layers={layers} selected={selected} onCamera={setCamera} onStar={(value) => { setStar(value); setPlaying(false); }} onInteract={stopSensor} t={t} /> : <div className={styles.loading} role={error ? "alert" : "status"}>
          <span className={styles.loadingOrb}>✦</span><p>{error ? t(error) : t("正在铺开这片星空…")}</p>{error && <button onClick={() => setRetry((value) => value + 1)}>{t("重新加载")}</button>}
        </div>}
        <div className={styles.sceneHeader}>
          <div><span className={styles.locationDot} />{t(CITIES.find((item) => item.id === city)!.note)}<small>{isReady ? `${data.city.latitude.toFixed(2)}° N · ${data.city.longitude.toFixed(2)}° E` : t("城市观测点")}</small></div>
          <div className={styles.timeReadout}>{frame?.localTime.replace("T", "  ") || "—"}<small>{t(mode === "annual" ? "全年逐日 · 固定北京时间" : "当日星空 · 每 10 分钟一帧")}</small></div>
        </div>
        <div className={styles.layerTools} aria-label={t("星空图层")}>
          {([
            ["lines", "星座连线"], ["names", "名称"], ["grid", "坐标网"], ["ground", "地面"], ["trails", mode === "annual" ? "太阳年轨迹" : "天体日轨迹"], ["daylightStars", "白昼显星"],
          ] as [keyof SkyLayers, string][]).map(([key, label]) => <button key={key} aria-pressed={layers[key]} onClick={() => setLayers((current) => ({ ...current, [key]: !current[key] }))}><span>{layers[key] ? "◉" : "○"}</span>{t(label)}</button>)}
        </div>
        <div className={styles.cameraTools}>
          <button aria-label={t("放大星空")} onClick={() => setCamera((current) => ({ ...current, fov: clamp(current.fov - 10, 25, 100) }))}>＋</button>
          <button aria-label={t("缩小星空")} onClick={() => setCamera((current) => ({ ...current, fov: clamp(current.fov + 10, 25, 100) }))}>−</button>
          <button aria-label={t("复位朝南视角")} title={t("复位朝南")} onClick={() => { stopSensor(); setCamera({ azimuth: 180, altitude: 26, fov: 65 }); setLayers((current) => ({ ...current, ground: true })); setMessage(""); }}>↺</button>
          <button aria-label={t("展开星空全屏")} title={t("全屏")} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else sceneRef.current?.requestFullscreen?.().catch(() => setMessage(t("此浏览器暂不支持全屏。"))); }}>⛶</button>
        </div>
        <div className={styles.crosshair} aria-hidden="true" />
        {star && <div className={styles.starCard}><button aria-label={t("关闭恒星信息")} onClick={() => setStar(null)}>×</button><strong>{star.name}</strong><span>{t("视星等")} {star.magnitude.toFixed(2)}</span><span>{t("高度")} {star.altitude.toFixed(1)}° · {t("方位")} {star.azimuth.toFixed(1)}°</span></div>}
        <div className={styles.sceneFooter}>
          <span className={styles.gestureHint}>{t("拖动看四周 · 滚轮 / 双指缩放")}</span>
          <output aria-label={t("当前视角")}>{t(headingName(camera.azimuth))} {Math.round(wrap(camera.azimuth))}° <i /> {t("仰角")} {Math.round(camera.altitude)}° <i /> {t("视场")} {Math.round(camera.fov)}°</output>
          <button aria-pressed={sensor} onClick={() => void startSensor()}>{t(sensor ? "停止指向" : "手机指向")}</button>
        </div>
      </div>
      {message && <p className={styles.message} role="status">{message}<button aria-label="关闭提示" onClick={() => setMessage("")}>×</button></p>}
      <div className={styles.timeline}>
        <button className={styles.play} disabled={!isReady} aria-label={t(playing ? "暂停播放" : "播放星空")} onClick={() => { stopSensor(); setStar(null); setPlaying(!playing); }}>{playing ? "Ⅱ" : "▶"}</button>
        <button className={styles.step} aria-label={t("上一帧")} disabled={!isReady} onClick={() => { setPlaying(false); setIndex((value) => Math.max(0, value - 1)); }}>‹</button>
        <div className={styles.scrubber}>
          <input aria-label={t(mode === "annual" ? "全年日期" : "当日时刻")} type="range" min={0} max={(data?.frames.length || (mode === "annual" ? 365 : 144)) - 1} value={index} disabled={!isReady} onChange={(event) => { setPlaying(false); setStar(null); setIndex(Number(event.target.value)); }} />
          <div>{(mode === "annual" ? ["1月", "4月", "7月", "10月", "12月末"] : ["00:00", "06:00", "12:00", "18:00", "23:50"]).map((label) => <span key={label}>{t(label)}</span>)}</div>
        </div>
        <button className={styles.step} aria-label={t("下一帧")} disabled={!isReady} onClick={() => { setPlaying(false); setIndex((value) => Math.min((data?.frames.length || 1) - 1, value + 1)); }}>›</button>
        <div className={styles.timelineNote}>{t(mode === "annual" ? "每天同一时刻" : "时光流转")}<small>{t(mode === "annual" ? "比较季节与太阳高度" : "1 帧 = 10 分钟")}</small></div>
      </div>
      <div className={styles.bodyList} aria-label={t("选择七曜并定位")}>{BODIES.map((body) => {
        const altitude = frame?.bodies[body.id].altitude;
        return <button key={body.id} disabled={!frame || loading} aria-pressed={selected === body.id} onClick={() => selectBody(body.id)} style={{ "--body-color": body.color } as React.CSSProperties}>
          <span className={styles.bodySymbol}>{body.symbol}</span><span>{t(body.name)}<small>{altitude === undefined ? "—" : `${t(altitude >= 0 ? "地平线上" : "地平线下")} ${Math.abs(altitude).toFixed(1)}°`}</small></span><span className={styles.bodyArrow}>↗</span>
        </button>;
      })}</div>
      <div className={styles.caption}>
        <span>{currentBody && <><b>{bodyName}</b> · {t("方位")} {currentBody.azimuth.toFixed(1)}° · {t("高度")} {currentBody.altitude.toFixed(1)}°　</>}{t(mode === "annual" ? "虚线：太阳在每日所选时刻的位置。" : "虚线：所选天体在当天的运动轨迹。")}</span>
        <details><summary>{t("数据与显示说明")}</summary><p>{t(`恒星来自 HYG 4.1，包含 ${catalog?.stars.length.toLocaleString() || "8,920"} 颗亮星及连线成员；按岁差、章动与自行作近似位置换算。星座采用 Stellarium 西方星座连线，配中文名称，不代表中国传统星官。七曜由本地 Skyfield／DE421 计算观测点的视位置；木星、土星使用系统质心，未计大气折射、地形与实际天气。天体大小及月面亮度为示意，地面是理想地平面。`)}</p><p>{t("四地均用北京时间；类乌齐为县城桑多镇附近约略坐标。周年页的虚线表示全年每天同一时刻的太阳位置，并非一天的太阳轨迹。开启“白昼显星”可教学演示白昼中的星座，不代表肉眼可见。")}</p><p>{t("手机指向需要 HTTPS 与方向权限，仅提供近似罗盘指向；本版不叠加相机画面。")} <a href="/sky-data/README.md" target="_blank" rel="noreferrer">{t("查看星表来源与许可 ↗")}</a></p></details>
      </div>
    </>}
  </section>;
}
