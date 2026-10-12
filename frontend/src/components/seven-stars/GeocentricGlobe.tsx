"use client";

import { useMemo } from "react";
import CelestialSphere, { type SphereMarker, type SphereTrail } from "@/components/celestial-sphere/CelestialSphere";
import { BODIES, type BodyId } from "@/features/sky-view/model";

type Position = { longitude: number; latitude: number; distanceAu: number; dailyMotion: number };
type MotionDay = { date: string; starMatrix?: number[]; bodies: Record<BodyId, Position> };

export default function GeocentricGlobe({ days, index, selectedBody, onSelect, t, focusToken }: {
  days: MotionDay[]; index: number; selectedBody: BodyId;
  focusToken: number;
  onSelect: (id: BodyId) => void; t: (value: string) => string;
}) {
  const day = days[Math.min(index, days.length - 1)];
  const markers = useMemo<SphereMarker[]>(() => day ? BODIES.map(body => ({
    ...day.bodies[body.id], id: body.id, name: body.name, color: body.color,
    kind: body.id === "sun" || body.id === "moon" ? body.id : undefined,
  })) : [], [day]);
  const annualTrails = useMemo<SphereTrail[]>(() => BODIES.map(body => ({
    id: `${body.id}-annual`, color: body.color, points: days.map(sample => sample.bodies[body.id]), faint: true,
  })), [days]);
  const trails = useMemo<SphereTrail[]>(() => [
    ...annualTrails.filter(trail => trail.id === `${selectedBody}-annual`),
    { id: selectedBody, color: BODIES.find(body => body.id === selectedBody)!.color,
      points: days.slice(Math.max(0, index - 20), index + 1).map(sample => sample.bodies[selectedBody]) },
  ], [days, index, selectedBody, annualTrails]);
  const starFrame = useMemo(() => day?.starMatrix ? { matrix: day.starMatrix, date: day.date } : undefined, [day]);
  return <CelestialSphere title="地心 · 七曜天球" subtitle={`${day?.date ?? ""} · 00:00 UTC`}
    note="天体投影到同一天球 · 高亮轨迹为所选天体最近20日运动"
    markers={markers} selected={selectedBody} onSelect={id => onSelect(id as BodyId)} trails={trails} starFrame={starFrame} t={t} focusToken={focusToken} />;
}
