"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BODIES, CONSTELLATION_NAMES, DEG, catalogVector, clamp, equatorialToHorizontal,
  horizontalVector, projector, starColor, starName, wrap,
  type BodyId, type CameraView, type Catalog, type SkyData, type SkyFrame, type SkyLayers, type Vector,
} from "@/features/sky-view/model";

export interface StarSelection { name: string; magnitude: number; altitude: number; azimuth: number }
interface Props {
  catalog: Catalog; data: SkyData; frame: SkyFrame; camera: CameraView;
  layers: SkyLayers; selected: BodyId;
  onCamera: (camera: CameraView) => void;
  onStar: (star: StarSelection) => void;
  onInteract: () => void;
}

export default function SkyCanvas({ catalog, data, frame, camera, layers, selected, onCamera, onStar, onInteract }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 800, height: 540 });
  const cameraRef = useRef(camera);
  const actions = useRef({ onCamera, onStar, onInteract });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const picks = useRef<(StarSelection & { x: number; y: number })[]>([]);
  useEffect(() => { cameraRef.current = camera; actions.current = { onCamera, onStar, onInteract }; }, [camera, onCamera, onStar, onInteract]);

  const stars = useMemo(() => {
    const years = (Date.parse(`${frame.localTime}+08:00`) - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
    const lst = frame.gast + data.city.longitude;
    return catalog.stars.map((star) => ({
      star, vector: equatorialToHorizontal(catalogVector(star, frame.matrix, years), lst, data.city.latitude),
      name: starName(star), color: starColor(star[5]),
    }));
  }, [catalog, frame, data.city]);
  const byHip = useMemo(() => new Map(stars.filter((item) => item.star[1]).map((item) => [item.star[1], item])), [stars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(canvas);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      actions.current.onInteract();
      actions.current.onCamera({ ...cameraRef.current, fov: clamp(cameraRef.current.fov + event.deltaY * 0.035, 25, 100) });
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); canvas.removeEventListener("wheel", wheel); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size.width || !size.height) return;
    const { width: w, height: h } = size;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const project = projector(camera, w, h);
    const sunAlt = frame.bodies.sun.altitude;
    const daytime = clamp((sunAlt + 10) / 22, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (daytime > 0 && !layers.daylightStars) {
      sky.addColorStop(0, `rgb(${Math.round(5 + daytime * 12)},${Math.round(14 + daytime * 50)},${Math.round(29 + daytime * 83)})`);
      sky.addColorStop(1, `rgb(${Math.round(26 + daytime * 49)},${Math.round(32 + daytime * 81)},${Math.round(46 + daytime * 100)})`);
    } else {
      sky.addColorStop(0, "#020611"); sky.addColorStop(0.65, "#091426"); sky.addColorStop(1, "#172936");
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const visible = (v: Vector) => !layers.ground || v[2] >= 0;
    const onScreen = (p: { x: number; y: number } | null, margin = 40) => p && p.x > -margin && p.x < w + margin && p.y > -margin && p.y < h + margin;
    const line = (vectors: Vector[], color: string, width = 1, dash: number[] = []) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.beginPath();
      let previous: { x: number; y: number } | null = null;
      for (const vector of vectors) {
        const point = visible(vector) ? project(vector) : null;
        if (!point || !onScreen(point, Math.max(w, h))) { previous = null; continue; }
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < w * 0.5) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
        previous = point;
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    const text = (label: string, x: number, y: number, color: string, font = "12px system-ui", align: CanvasTextAlign = "left") => {
      ctx.font = font; ctx.textAlign = align;
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(2,6,17,0.75)"; ctx.strokeText(label, x, y);
      ctx.fillStyle = color; ctx.fillText(label, x, y);
    };

    if (layers.grid) {
      for (let alt = 0; alt < 90; alt += 15) line(Array.from({ length: 181 }, (_, n) => horizontalVector(n * 2, alt)), "rgba(150,193,216,0.15)", 0.7, [2, 6]);
      for (let az = 0; az < 360; az += 30) line(Array.from({ length: 91 }, (_, n) => horizontalVector(az, n)), "rgba(150,193,216,0.15)", 0.7, [2, 6]);
    }

    const starOpacity = layers.daylightStars ? 1 : 1 - daytime * 0.995;
    // Real catalogue stars only: decorative random particles are deliberately absent.
    const nextPicks: typeof picks.current = [];
    for (const item of stars) {
      if (!visible(item.vector)) continue;
      const p = project(item.vector);
      if (!p || !onScreen(p, 5)) continue;
      const magnitude = item.star[4];
      const radius = clamp(2.4 - magnitude * 0.3, 0.4, 3.2) * Math.sqrt(65 / camera.fov);
      const opacity = clamp(1.12 - magnitude * 0.11, 0.25, 1) * starOpacity;
      if (opacity < 0.018) continue;
      ctx.globalAlpha = opacity;
      if (magnitude < 2.3) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5);
        glow.addColorStop(0, item.color + "8c"); glow.addColorStop(1, item.color + "00");
        ctx.fillStyle = glow; ctx.fillRect(p.x - radius * 5, p.y - radius * 5, radius * 10, radius * 10);
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = item.color; ctx.fill();
      if (magnitude < 4.5) nextPicks.push({ name: item.name, magnitude, altitude: Math.asin(item.vector[2]) / DEG, azimuth: wrap(Math.atan2(item.vector[0], item.vector[1]) / DEG), x: p.x, y: p.y });
    }
    ctx.globalAlpha = 1;
    picks.current = nextPicks;

    const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
    const placeLabel = (label: string, x: number, y: number, color: string, big = false) => {
      const width = label.length * (big ? 14 : 10) + 10;
      const box = { x: x - width / 2, y: y - 14, w: width, h: 22 };
      if (box.x < 8 || box.x + width > w - 8 || y < 80 || y > h - 45) return;
      if (labelBoxes.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) return;
      labelBoxes.push(box);
      text(label, x, y, color, big ? "500 14px system-ui" : "11px system-ui", "center");
    };

    if (layers.lines) {
      for (const constellation of catalog.constellations) {
        const members = new Set<number>();
        for (const path of constellation.lines) {
          for (const hip of path) members.add(hip);
          for (let n = 1; n < path.length; n++) {
            const a = byHip.get(path[n - 1])?.vector, b = byHip.get(path[n])?.vector;
            if (!a || !b) continue;
            line(Array.from({ length: 13 }, (_, i) => {
              const v = a.map((value, k) => value + (b[k] - value) * i / 12) as Vector;
              const length = Math.hypot(...v); return v.map((value) => value / length) as Vector;
            }), `rgba(132,190,207,${0.36 * Math.max(0.2, starOpacity)})`, 0.9);
          }
        }
        if (layers.names) {
          const vectors = [...members].map((hip) => byHip.get(hip)?.vector).filter((v): v is Vector => Boolean(v));
          const sum = vectors.reduce<Vector>((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
          const length = Math.hypot(...sum);
          if (!length) continue;
          const center = sum.map((value) => value / length) as Vector;
          const p = visible(center) ? project(center) : null;
          if (p && onScreen(p)) placeLabel(`${CONSTELLATION_NAMES[constellation.id] || constellation.name}座`, p.x, p.y, "#8fb8c7", true);
        }
      }
    }
    if (layers.names && starOpacity > 0.1) {
      for (const item of stars.filter((s) => s.star[4] < 2.1 || s.star[1] === 11767).sort((a, b) => a.star[4] - b.star[4])) {
        if (!visible(item.vector)) continue;
        const p = project(item.vector);
        if (p && onScreen(p)) placeLabel(item.name, p.x, p.y + 19, "#dce7ed");
      }
    }

    if (layers.trails) {
      const body = data.mode === "annual" ? "sun" : selected;
      const color = BODIES.find((b) => b.id === body)!.color;
      line(data.frames.map((f) => horizontalVector(f.bodies[body].azimuth, f.bodies[body].altitude)), color + "90", 1.3, [4, 5]);
      data.frames.forEach((f, index) => {
        const isLabel = data.mode === "annual" ? f.localTime.slice(8, 10) === "01" : index % 18 === 0;
        if (!isLabel) return;
        const v = horizontalVector(f.bodies[body].azimuth, f.bodies[body].altitude);
        const p = visible(v) ? project(v) : null;
        if (p && onScreen(p)) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          text(data.mode === "annual" ? `${Number(f.localTime.slice(5, 7))}月` : f.localTime.slice(11), p.x + 7, p.y - 6, color, "10px system-ui");
        }
      });
    }

    if (layers.ground) {
      const focal = h / (2 * Math.tan(camera.fov * DEG / 2));
      const horizonY = h / 2 + focal * Math.tan(camera.altitude * DEG);
      if (horizonY < h) {
        const glow = ctx.createLinearGradient(0, Math.max(0, horizonY - 70), 0, Math.max(1, horizonY + 15));
        glow.addColorStop(0, "#83a5ab00"); glow.addColorStop(1, "#83a5ab18");
        ctx.fillStyle = glow; ctx.fillRect(0, Math.max(0, horizonY - 70), w, 85);
        const ground = ctx.createLinearGradient(0, Math.max(0, horizonY), 0, h);
        ground.addColorStop(0, "#102022"); ground.addColorStop(1, "#040b11");
        ctx.fillStyle = ground; ctx.fillRect(0, Math.max(0, horizonY), w, h);
        ctx.strokeStyle = "#93b4b54d"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(w, horizonY); ctx.stroke();
      }
    } else line(Array.from({ length: 361 }, (_, n) => horizontalVector(n, 0)), "#a3b9b580", 1, [5, 6]);

    for (const body of BODIES) {
      const position = frame.bodies[body.id];
      const vector = horizontalVector(position.azimuth, position.altitude);
      const p = visible(vector) ? project(vector) : null;
      if (!p || !onScreen(p, 15)) continue;
      const radius = body.id === "sun" ? 9 : body.id === "moon" ? 8 : body.id === "venus" ? 4 : 3;
      const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius * 5);
      glow.addColorStop(0, body.color + "70"); glow.addColorStop(1, body.color + "00");
      ctx.fillStyle = glow; ctx.fillRect(p.x - radius * 5, p.y - radius * 5, radius * 10, radius * 10);
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = body.color; ctx.fill();
      if (body.id === "moon") {
        // Phase diagram with a curved terminator; orientation is illustrative.
        ctx.fillStyle = "#121e33"; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body.color; ctx.beginPath();
        for (let n = 0; n <= 32; n++) {
          const y = -radius + radius * 2 * n / 32;
          const x = Math.sqrt(Math.max(0, radius * radius - y * y));
          if (n === 0) ctx.moveTo(p.x + x, p.y + y); else ctx.lineTo(p.x + x, p.y + y);
        }
        for (let n = 32; n >= 0; n--) {
          const y = -radius + radius * 2 * n / 32;
          const x = (1 - 2 * frame.moonIllumination) * Math.sqrt(Math.max(0, radius * radius - y * y));
          ctx.lineTo(p.x + x, p.y + y);
        }
        ctx.closePath(); ctx.fill();
      }
      if (body.id === selected) {
        ctx.strokeStyle = body.color + "aa"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(p.x, p.y, radius + 9, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (layers.names) text(body.name, p.x + radius + 9, p.y + 4, body.color, "500 13px system-ui");
    }
    ["北", "东北", "东", "东南", "南", "西南", "西", "西北"].forEach((label, i) => {
      const p = project(horizontalVector(i * 45, 0));
      if (p && onScreen(p, 0)) text(label, p.x, clamp(p.y + 22, 22, h - 18), "#d3bd8d", "600 13px system-ui", "center");
    });
  }, [stars, byHip, catalog, data, frame, camera, layers, selected, size]);

  const release = (id: number) => { pointers.current.delete(id); };
  return <canvas ref={canvasRef} role="application" aria-label="观测星空：拖动转向，滚轮或双指缩放，方向键转向，点击亮星查看信息" tabIndex={0}
    style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = false; onInteract(); }}
    onPointerMove={(e) => {
      const previous = pointers.current.get(e.pointerId); if (!previous) return;
      const dx = e.clientX - previous.x, dy = e.clientY - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const oldDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
        const distance = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        onCamera({ ...camera, fov: clamp(camera.fov * oldDistance / Math.max(1, distance), 25, 100) });
      } else onCamera({ ...camera, azimuth: wrap(camera.azimuth - dx * camera.fov / size.height), altitude: clamp(camera.altitude + dy * camera.fov / size.height, -80, 85) });
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }}
    onPointerUp={(e) => {
      if (!moved.current && pointers.current.size === 1) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const nearest = picks.current.map((p) => ({ ...p, distance: Math.hypot(p.x - x, p.y - y) })).sort((a, b) => a.distance - b.distance)[0];
        if (nearest && nearest.distance < 18) onStar(nearest);
      }
      release(e.pointerId);
    }}
    onPointerCancel={(e) => release(e.pointerId)} onLostPointerCapture={(e) => release(e.pointerId)}
    onKeyDown={(e) => {
      const key = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-"].includes(key)) return;
      e.preventDefault(); onInteract();
      onCamera({ azimuth: wrap(camera.azimuth + (key === "ArrowRight" ? 5 : key === "ArrowLeft" ? -5 : 0)), altitude: clamp(camera.altitude + (key === "ArrowUp" ? 5 : key === "ArrowDown" ? -5 : 0), -80, 85), fov: clamp(camera.fov + (key === "+" ? -5 : key === "-" ? 5 : 0), 25, 100) });
    }} />;
}
