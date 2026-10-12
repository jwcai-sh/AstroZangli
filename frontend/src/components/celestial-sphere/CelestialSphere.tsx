"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { catalogVector, clamp, CONSTELLATION_NAMES, DEG, dot, horizontalVector, projector, starColor, starName, wrap, type Catalog, type Vector } from "@/features/sky-view/model";
import styles from "./celestial-sphere.module.css";

export type SpherePoint = { longitude: number; latitude: number };
export type SphereMarker = SpherePoint & { id: string; name: string; color: string; kind?: "sun" | "moon" | "virtual" };
export type SphereTrail = { id: string; color: string; points: SpherePoint[]; dashed?: boolean; faint?: boolean };
type Props = {
  title: string; subtitle: string; note: string; markers: SphereMarker[]; selected: string;
  onSelect: (id: string) => void; trails?: SphereTrail[];
  focusToken?: number;
  mansion?: { index: number; color: string }; traditional?: boolean;
  starFrame?: { matrix: number[]; date: string }; t: (text: string) => string;
};
type View = { longitude: number; latitude: number; fov: number };
type Projected = { x: number; y: number; depth: number };
const NO_TRAILS: SphereTrail[] = [];
const ZODIAC_ICONS: Record<string, string> = {
  Ari: "aries", Tau: "taurus", Gem: "gemini", Cnc: "cancer", Leo: "leo", Vir: "virgo",
  Lib: "libra", Sco: "scorpio", Sgr: "sagittarius", Cap: "capricorn", Aqr: "aquarius", Psc: "pisces",
};
const vectorAt = (point: SpherePoint): Vector => horizontalVector(90 - point.longitude, point.latitude);
const arc = (start: number, extent: number, latitude = 0) => {
  const count = Math.max(2, Math.ceil(Math.abs(extent) / 2) + 1);
  return Array.from({ length: count }, (_, i) => vectorAt({ longitude: start + extent * i / (count - 1), latitude }));
};
// Share the same HYG / Stellarium catalogue as the observation page; no new assets or random star positions.
let catalogPromise: Promise<Catalog> | undefined;
function loadCatalog() {
  return catalogPromise ??= fetch("/sky-data/bright-sky.json").then(response => {
    if (!response.ok) throw new Error("星表读取失败");
    return response.json() as Promise<Catalog>;
  }).catch(error => { catalogPromise = undefined; throw error; });
}

export default function CelestialSphere({ title, subtitle, note, markers, selected, onSelect, trails = NO_TRAILS, mansion, traditional = false, starFrame, t, focusToken = 0 }: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = markers.find(marker => marker.id === selected) ?? markers[0];
  const [mode, setMode] = useState<"sky" | "globe">("sky");
  const [view, setView] = useState<View>(() => ({ longitude: active?.longitude ?? 0, latitude: 12, fov: 75 }));
  const [following, setFollowing] = useState(true);
  const [layers, setLayers] = useState({ names: true, lines: true, grid: traditional, trails: true });
  const [size, setSize] = useState({ width: 800, height: 540 });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [starInfo, setStarInfo] = useState<{ name: string; magnitude: number } | null>(null);
  const [message, setMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [iconsReady, setIconsReady] = useState(0);
  const icons = useRef<Record<string, HTMLImageElement>>({});
  const gestures = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const distanceMoved = useRef(0);
  const picks = useRef<{ x: number; y: number; id?: string; name: string; magnitude?: number }[]>([]);
  const activeLongitude = active?.longitude ?? 0, activeLatitude = active?.latitude ?? 0;

  useEffect(() => {
    if (following) setView(previous => ({ ...previous, longitude: activeLongitude, latitude: mode === "globe" ? 28 : clamp(activeLatitude + 8, -75, 75) }));
  }, [activeLongitude, activeLatitude, following, mode, selected]);
  useEffect(() => { setFollowing(true); setStarInfo(null); }, [selected, focusToken]);
  useEffect(() => {
    if (traditional) return;
    let cancelled = false;
    const images = Object.entries(ZODIAC_ICONS).map(([id, file]) => {
      const image = new Image();
      image.onload = () => { if (!cancelled) setIconsReady(count => count + 1); };
      image.src = `/pho/${file}.png`; icons.current[id] = image; return image;
    });
    return () => { cancelled = true; images.forEach(image => { image.onload = null; }); };
  }, [traditional]);
  useEffect(() => {
    if (traditional) return;
    let cancelled = false;
    loadCatalog().then(data => { if (!cancelled) { setCatalog(data); setCatalogError(false); } }).catch(() => { if (!cancelled) setCatalogError(true); });
    return () => { cancelled = true; };
  }, [traditional, retry]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(canvas);
    const wheel = (event: WheelEvent) => { event.preventDefault(); setView(previous => ({ ...previous, fov: clamp(previous.fov + event.deltaY * .04, 35, 105) })); };
    const changed = () => setFullscreen(document.fullscreenElement === sceneRef.current);
    canvas.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("fullscreenchange", changed);
    return () => { observer.disconnect(); canvas.removeEventListener("wheel", wheel); document.removeEventListener("fullscreenchange", changed); };
  }, []);

  const stars = useMemo(() => {
    if (!catalog || !starFrame || traditional) return [];
    const years = (Date.parse(starFrame.date + "T00:00:00Z") - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
    return catalog.stars.map(star => ({ vector: catalogVector(star, starFrame.matrix, years), magnitude: star[4], color: starColor(star[5]), name: starName(star), hip: star[1] }));
  }, [catalog, starFrame, traditional]);
  const constellations = useMemo(() => {
    if (!catalog || !stars.length) return [];
    const byHip = new Map(stars.filter(star => star.hip).map(star => [star.hip, star.vector]));
    return catalog.constellations.map(constellation => {
      const members = [...new Set(constellation.lines.flat())].map(hip => byHip.get(hip)).filter((v): v is Vector => !!v);
      const sum = members.reduce<Vector>((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
      const length = Math.hypot(...sum) || 1;
      return { id: constellation.id, name: `${CONSTELLATION_NAMES[constellation.id] || constellation.name}座`, center: sum.map(n => n / length) as Vector,
        lines: constellation.lines.flatMap(path => path.slice(1).flatMap((hip, i) => {
          const a = byHip.get(path[i]), b = byHip.get(hip);
          if (!a || !b) return [];
          return [Array.from({ length: 13 }, (_, j) => {
            const v = a.map((n, k) => n + (b[k] - n) * j / 12) as Vector;
            const magnitude = Math.hypot(...v);
            return v.map(n => n / magnitude) as Vector;
          })];
        })) };
    });
  }, [catalog, stars]);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.width < 1 || size.height < 1) return;
    const { width: w, height: h } = size, globe = mode === "globe";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.scale(dpr, dpr);
    const background = ctx.createLinearGradient(0, 0, w * .3, h);
    background.addColorStop(0, "#020611"); background.addColorStop(.6, "#091426"); background.addColorStop(1, "#10232d");
    ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
    const haze = ctx.createRadialGradient(w * .64, h * .58, 0, w * .64, h * .58, w * .7);
    haze.addColorStop(0, "#26486120"); haze.addColorStop(1, "#26486100"); ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
    const radius = Math.min(w * .38, h * .35) * 75 / view.fov;
    const forward = vectorAt(view);
    const right: Vector = [-Math.sin(view.longitude * DEG), Math.cos(view.longitude * DEG), 0];
    const up: Vector = [-Math.cos(view.longitude * DEG) * Math.sin(view.latitude * DEG), -Math.sin(view.longitude * DEG) * Math.sin(view.latitude * DEG), Math.cos(view.latitude * DEG)];
    const perspective = projector({ azimuth: 90 - view.longitude, altitude: view.latitude, fov: view.fov }, w, h);
    const project = (v: Vector): Projected | null => globe ? { x: w / 2 + radius * dot(v, right), y: h * .53 - radius * dot(v, up), depth: dot(v, forward) } : perspective(v);
    const visible = (p: Projected | null, margin = 20): p is Projected => !!p && p.x > -margin && p.x < w + margin && p.y > -margin && p.y < h + margin;
    const stroke = (vectors: Vector[], color: string, width = 1, dashed = false, opacity = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dashed ? [4, 6] : []);
      let previous: Projected | null = null;
      for (const v of vectors) {
        const point = project(v);
        if (!visible(point, Math.max(w, h))) { previous = null; continue; }
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < w * .6) {
          ctx.globalAlpha = opacity * (globe && (point.depth + previous.depth) < 0 ? .22 : 1);
          ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y); ctx.stroke();
        }
        previous = point;
      }
      ctx.globalAlpha = 1; ctx.setLineDash([]);
    };
    const text = (value: string, x: number, y: number, color: string, fontSize = 11, align: CanvasTextAlign = "center") => {
      ctx.font = `500 ${fontSize}px system-ui`; ctx.textAlign = align;
      ctx.lineWidth = 3; ctx.strokeStyle = "#020611cc"; ctx.strokeText(value, x, y); ctx.fillStyle = color; ctx.fillText(value, x, y);
    };
    const occupied: { x: number; y: number; w: number }[] = [];
    const label = (value: string, p: Projected, color: string, fontSize = 11) => {
      ctx.font = `500 ${fontSize}px system-ui`; const width = ctx.measureText(value).width + 8;
      if (p.x - width / 2 < 12 || p.x + width / 2 > w - 12 || p.y < 90 || p.y > h - 65) return false;
      if (p.x < 112 && p.y < 305 || p.x > w - 52 && p.y < 300) return false;
      if (occupied.some(box => Math.abs(p.x - box.x) < (width + box.w) / 2 && Math.abs(p.y - box.y) < 18)) return false;
      occupied.push({ x: p.x, y: p.y, w: width }); text(value, p.x, p.y, color, fontSize); return true;
    };
    if (globe) {
      const shell = ctx.createRadialGradient(w / 2, h * .53, radius * .6, w / 2, h * .53, radius);
      shell.addColorStop(0, "#152b400a"); shell.addColorStop(1, "#7bb3ce20"); ctx.fillStyle = shell;
      ctx.beginPath(); ctx.arc(w / 2, h * .53, radius, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#759eae40"; ctx.lineWidth = 1; ctx.stroke();
    }
    const nextPicks: typeof picks.current = [];
    for (const star of stars) {
      const p = project(star.vector);
      if (!visible(p, 5) || globe && p.depth < 0) continue;
      const r = clamp(2.25 - star.magnitude * .29, .35, 3) * (globe ? .7 : Math.sqrt(75 / view.fov));
      ctx.globalAlpha = clamp(1.1 - star.magnitude * .12, .22, 1);
      if (star.magnitude < 2) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        glow.addColorStop(0, star.color + "70"); glow.addColorStop(1, star.color + "00"); ctx.fillStyle = glow; ctx.fillRect(p.x - r * 5, p.y - r * 5, r * 10, r * 10);
      }
      ctx.fillStyle = star.color; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (star.magnitude < 3) nextPicks.push({ ...p, name: star.name, magnitude: star.magnitude });
    }
    ctx.globalAlpha = 1;
    if (layers.grid) {
      for (let lat = -60; lat <= 60; lat += 30) if (lat) stroke(arc(0, 360, lat), "#8cbbc440", .65, true);
      for (let lon = 0; lon < 360; lon += 30) stroke(Array.from({ length: 91 }, (_, i) => vectorAt({ longitude: lon, latitude: -90 + i * 2 })), "#8cbbc440", .65, true);
    }
    if (layers.lines) for (const constellation of constellations) for (const line of constellation.lines) stroke(line, "#8ac4cf", .8, false, .3);
    stroke(arc(0, 360), "#c6ae7c", 1, false, .7);
    const divisions = traditional ? 27 : 12;
    for (let i = 0; i < divisions; i++) {
      const longitude = i * 360 / divisions;
      stroke([vectorAt({ longitude, latitude: -1 }), vectorAt({ longitude, latitude: 1 })], "#d0bf97", 1);
      const p = project(vectorAt({ longitude: traditional ? longitude + 180 / 27 : longitude, latitude: -5 }));
      if (visible(p) && (!globe || p.depth > 0) && layers.names) label(traditional ? `${t("宿")} ${i}` : `${longitude}°`, p, "#bead8c", 10);
    }
    if (mansion) stroke(arc(mansion.index * 360 / 27, 360 / 27), mansion.color, 5, false, .7);
    if (layers.trails) for (const trail of trails) stroke(trail.points.map(vectorAt), trail.color, trail.faint ? .8 : 1.7, trail.dashed, trail.faint ? .18 : .8);
    // Draw markers before secondary labels so labels never obscure the selected body.
    for (const marker of [...markers].sort((a, b) => Number(a.id === selected) - Number(b.id === selected))) {
      const p = project(vectorAt(marker)); if (!visible(p)) continue;
      const isSelected = marker.id === selected;
      const r = marker.kind === "sun" ? 9 : marker.kind === "moon" ? 7 : marker.kind === "virtual" ? 5 : 3.8;
      ctx.globalAlpha = globe && p.depth < 0 ? .35 : 1;
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
      halo.addColorStop(0, marker.color + "90"); halo.addColorStop(.3, marker.color + "25"); halo.addColorStop(1, marker.color + "00");
      ctx.fillStyle = halo; ctx.fillRect(p.x - r * 6, p.y - r * 6, r * 12, r * 12);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      const disk = ctx.createRadialGradient(p.x - r * .3, p.y - r * .3, 0, p.x, p.y, r);
      disk.addColorStop(0, "#ffffff"); disk.addColorStop(1, marker.color);
      ctx.fillStyle = marker.kind === "virtual" ? "#0b1323" : disk; ctx.fill(); ctx.strokeStyle = marker.color; ctx.lineWidth = 1; ctx.stroke();
      if (isSelected) { ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, r + 11, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      ctx.globalAlpha = 1;
      nextPicks.push({ ...p, id: marker.id, name: marker.name });
    }
    if (layers.names) for (const marker of [...markers].sort((a, b) => Number(b.id === selected) - Number(a.id === selected))) {
      const p = project(vectorAt(marker)); if (!visible(p)) continue;
      for (const dy of [-28, -48, 30, 50]) if (label(t(marker.name), { ...p, y: p.y + dy }, marker.color, marker.id === selected ? 14 : 12)) break;
    }
    if (layers.names && layers.lines) for (const constellation of constellations) {
      const p = project(constellation.center);
      if (visible(p) && (!globe || p.depth > 0)) {
        const icon = !globe && icons.current[constellation.id];
        if (icon && icon.complete && icon.naturalWidth) {
          if (label(constellation.name, { ...p, y: p.y + 25 }, "#d4e3e9", 12) && !occupied.some(box => Math.abs(p.x - box.x) < (box.w + 32) / 2 && Math.abs(p.y - 8 - box.y) < 24)) {
            ctx.globalAlpha = .65; ctx.drawImage(icon, p.x - 15, p.y - 25, 30, 30); ctx.globalAlpha = 1;
            occupied.push({ x: p.x, y: p.y - 8, w: 32 });
          }
        } else label(constellation.name, p, "#8fb8c7", 12);
      }
    }
    if (layers.names && !globe) for (const star of stars.filter(s => s.magnitude < 1.8)) {
      const p = project(star.vector); if (visible(p)) label(star.name, { ...p, y: p.y + 18 }, "#bacbd6", 10);
    }
    if (globe) {
      const earth = ctx.createRadialGradient(w / 2 - 4, h * .53 - 5, 1, w / 2, h * .53, 14);
      earth.addColorStop(0, "#92d9e9"); earth.addColorStop(.45, "#367ea0"); earth.addColorStop(1, "#10253e");
      ctx.fillStyle = earth; ctx.beginPath(); ctx.arc(w / 2, h * .53, 14, 0, Math.PI * 2); ctx.fill();
      text(t("地心"), w / 2, h * .53 + 33, "#b0cbd6", 10);
    }
    picks.current = nextPicks;
  }, [view, mode, layers, size, stars, constellations, markers, selected, trails, mansion, traditional, t, iconsReady]);

  const focus = () => { setFollowing(true); setStarInfo(null); setView({ longitude: activeLongitude, latitude: mode === "globe" ? 28 : clamp(activeLatitude + 8, -75, 75), fov: 75 }); };
  const zoom = (amount: number) => setView(previous => ({ ...previous, fov: clamp(previous.fov + amount, 35, 105) }));
  const release = (id: number) => gestures.current.delete(id);
  const fullScreen = async () => {
    try {
      if (document.fullscreenElement === sceneRef.current) await document.exitFullscreen();
      else if (sceneRef.current?.requestFullscreen) await sceneRef.current.requestFullscreen();
      else setMessage(t("当前浏览器不支持全屏"));
    } catch { setMessage(t("当前浏览器不支持全屏")); }
  };
  return <div className={styles.wrapper} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
    <div className={styles.scene} ref={sceneRef}>
      <canvas ref={canvasRef} role="application" tabIndex={0} aria-label={t("交互天球：拖动转向，滚轮或双指缩放，点击天体选择")}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); gestures.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (gestures.current.size === 1) { moved.current = false; distanceMoved.current = 0; } else moved.current = true; }}
        onPointerMove={e => {
          const old = gestures.current.get(e.pointerId); if (!old) return;
          const dx = e.clientX - old.x, dy = e.clientY - old.y;
          distanceMoved.current += Math.hypot(dx, dy); if (distanceMoved.current > 4) moved.current = true;
          const other = [...gestures.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
          setFollowing(false);
          setView(previous => other ? { ...previous, fov: clamp(previous.fov * Math.hypot(old.x - other.x, old.y - other.y) / Math.max(1, Math.hypot(e.clientX - other.x, e.clientY - other.y)), 35, 105) } : { ...previous, longitude: wrap(previous.longitude + dx * previous.fov / size.height * (mode === "globe" ? -1 : 1)), latitude: clamp(previous.latitude + dy * previous.fov / size.height, -80, 80) });
          gestures.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }}
        onPointerUp={e => {
          if (!moved.current && gestures.current.size === 1) {
            const bounds = e.currentTarget.getBoundingClientRect();
            const nearby = picks.current.map(p => ({ ...p, distance: Math.hypot(p.x - e.clientX + bounds.left, p.y - e.clientY + bounds.top) })).filter(p => p.distance < 20).sort((a, b) => Number(!!b.id) - Number(!!a.id) || a.distance - b.distance)[0];
            if (nearby?.id) { onSelect(nearby.id); setFollowing(true); setStarInfo(null); }
            else if (nearby?.magnitude !== undefined) setStarInfo({ name: nearby.name, magnitude: nearby.magnitude });
          }
          release(e.pointerId);
        }} onPointerCancel={e => release(e.pointerId)} onLostPointerCapture={e => release(e.pointerId)}
        onKeyDown={e => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "Home"].includes(e.key)) return;
          e.preventDefault(); if (e.key === "Home") { focus(); return; } if (e.key === "+" || e.key === "-") { zoom(e.key === "+" ? -10 : 10); return; }
          setFollowing(false); setView(previous => ({ ...previous, longitude: wrap(previous.longitude + (e.key === "ArrowLeft" ? 5 : e.key === "ArrowRight" ? -5 : 0) * (mode === "globe" ? -1 : 1)), latitude: clamp(previous.latitude + (e.key === "ArrowUp" ? 5 : e.key === "ArrowDown" ? -5 : 0), -80, 80) }));
        }} />
      <div className={styles.header}><div><span className={styles.dot} />{t(title)}<small>{subtitle}</small></div><div className={styles.readout} style={{ color: active?.color }}>{active ? t(active.name) : ""}<small>{active ? `${active.longitude.toFixed(2)}°` : ""}</small></div></div>
      <div className={styles.layers} aria-label={t("天球图层")}>
        {([...(traditional ? [] : ["lines" as const]), "names", "grid", "trails"] as const).map(key => <button key={key} aria-pressed={layers[key]} onClick={() => setLayers(previous => ({ ...previous, [key]: !previous[key] }))}><span>{layers[key] ? "◉" : "○"}</span>{t({ lines: "星座连线", names: "名称", grid: "坐标网", trails: "轨迹" }[key])}</button>)}
      </div>
      <div className={styles.camera}><button onClick={() => zoom(-10)} aria-label={t("放大天球")}>＋</button><button onClick={() => zoom(10)} aria-label={t("缩小天球")}>−</button><button onClick={focus} aria-label={t("复位并跟随所选天体")}>⌖</button><button onClick={fullScreen} aria-label={t(fullscreen ? "退出天球全屏" : "全屏天球")}>{fullscreen ? "⊡" : "⛶"}</button></div>
      <div className={styles.crosshair} />
      {starInfo && <div className={styles.starCard}><button onClick={() => setStarInfo(null)} aria-label={t("关闭恒星信息")}>×</button><strong>{starInfo.name}</strong><span>{t("视星等")} {starInfo.magnitude.toFixed(2)}</span></div>}
      <div className={styles.footer}><div className={styles.switch} aria-label={t("天球视角")}>{(["sky", "globe"] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setFollowing(true); setView(previous => ({ ...previous, fov: 75 })); }}>{t(value === "sky" ? "沉浸视角" : "球面总览")}</button>)}</div><output aria-label={t("天球当前视角")}>{t(traditional ? "宿环角" : "黄经")} {wrap(view.longitude).toFixed(0)}°<i />{t(mode === "sky" ? "视场" : "缩放")}{mode === "sky" ? ` ${view.fov.toFixed(0)}°` : ` ${(75 / view.fov).toFixed(1)}×`}</output></div>
    </div>
    <div className={styles.caption}><span>{t(note)}</span><span>{t("拖动转向 · 双指缩放 · 点击选择")}</span></div>
    {!traditional && (catalogError || !starFrame) && <p role="status" className={styles.message}>{t("恒星背景暂不可用，天体位置仍正常显示。")}{catalogError && <button onClick={() => setRetry(value => value + 1)}>{t("重试")}</button>}</p>}
    {message && <p role="status" className={styles.message}>{message}</p>}
  </div>;
}
