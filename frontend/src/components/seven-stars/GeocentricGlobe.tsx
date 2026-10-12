"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type BodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
type Position = { longitude: number; latitude: number; distanceAu: number; dailyMotion: number };
type MotionDay = { date: string; bodies: Record<BodyId, Position> };

const BODIES: { id: BodyId; label: string; glyph: string; color: string; radius: number }[] = [
  { id: "moon", label: "月亮", glyph: "☾", color: "#dde7f9", radius: 2.15 },
  { id: "sun", label: "太阳", glyph: "☉", color: "#ffc66b", radius: 2.38 },
  { id: "mercury", label: "水星", glyph: "☿", color: "#9fd4ea", radius: 2.61 },
  { id: "venus", label: "金星", glyph: "♀", color: "#f9dcaa", radius: 2.84 },
  { id: "mars", label: "火星", glyph: "♂", color: "#f2947b", radius: 3.07 },
  { id: "jupiter", label: "木星", glyph: "♃", color: "#d6abec", radius: 3.30 },
  { id: "saturn", label: "土星", glyph: "♄", color: "#b4c8a0", radius: 3.53 },
];
function positionAt(position: Position, radius: number): THREE.Vector3 {
  const longitude = THREE.MathUtils.degToRad(position.longitude);
  const latitude = THREE.MathUtils.degToRad(position.latitude);
  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.cos(latitude) * Math.sin(longitude),
    radius * Math.sin(latitude),
  );
}

function disposeGroup(group: THREE.Group) {
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
      if ("geometry" in object) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (material instanceof THREE.SpriteMaterial && material.map) material.map.dispose();
        material.dispose();
      });
    }
  });
  group.clear();
}

function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d")!;
  context.font = 'bold 34px "Noto Sans CJK SC", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.fillStyle = color;
  context.fillText(text, 128, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarField(): THREE.Points {
  const count = 1000;
  const vertices = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 12 + Math.random() * 24;
    const theta = Math.random() * Math.PI * 2;
    const z = Math.random() * 2 - 1;
    const planar = Math.sqrt(1 - z * z);
    vertices[index * 3] = radius * planar * Math.cos(theta);
    vertices[index * 3 + 1] = radius * planar * Math.sin(theta);
    vertices[index * 3 + 2] = radius * z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd9e7ff, size: 0.055, transparent: true, opacity: 0.72, sizeAttenuation: true }));
}

function createGlobe(t: (value: string) => string, scene: THREE.Scene) {
  scene.add(createStarField());

  const globeRadius = 3.78;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius, 36, 24),
    new THREE.MeshBasicMaterial({ color: 0x9bb5d6, wireframe: true, transparent: true, opacity: 0.16 }),
  );
  scene.add(shell);

  // The ecliptic is the reference plane: longitude and latitude are measured from it.
  const ecliptic = new THREE.Mesh(
    new THREE.CircleGeometry(globeRadius, 96),
    new THREE.MeshBasicMaterial({ color: 0x2e78c8, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(ecliptic);
  const eclipticEdge = new THREE.Mesh(
    new THREE.TorusGeometry(globeRadius, 0.012, 6, 128),
    new THREE.MeshBasicMaterial({ color: 0x75baff, transparent: true, opacity: 0.65 }),
  );
  scene.add(eclipticEdge);

  // Latitude circles and longitude meridians make the celestial sphere readable as a 3D globe.
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x849cbd, transparent: true, opacity: 0.2 });
  for (const latitude of [-60, -30, 30, 60]) {
    const lat = THREE.MathUtils.degToRad(latitude);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(globeRadius * Math.cos(lat), 0.006, 4, 128),
      new THREE.MeshBasicMaterial({ color: 0x849cbd, transparent: true, opacity: 0.18 }),
    );
    ring.position.z = globeRadius * Math.sin(lat);
    scene.add(ring);
  }
  for (let longitude = 0; longitude < 180; longitude += 30) {
    const points: THREE.Vector3[] = [];
    const angle = THREE.MathUtils.degToRad(longitude);
    for (let step = 0; step <= 64; step += 1) {
      const latitude = -Math.PI / 2 + Math.PI * step / 64;
      points.push(new THREE.Vector3(
        globeRadius * Math.cos(latitude) * Math.cos(angle),
        globeRadius * Math.cos(latitude) * Math.sin(angle),
        globeRadius * Math.sin(latitude),
      ));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial.clone()));
  }

  // Zodiac longitude ticks and labels are positioned in the ecliptic plane.
  for (let sign = 0; sign < 12; sign += 1) {
    const longitude = THREE.MathUtils.degToRad(sign * 30);
    const tick = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(globeRadius * Math.cos(longitude), globeRadius * Math.sin(longitude), 0),
        new THREE.Vector3((globeRadius + 0.12) * Math.cos(longitude), (globeRadius + 0.12) * Math.sin(longitude), 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xb1c7e5, transparent: true, opacity: 0.75 }),
    );
    scene.add(tick);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(t(["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"][sign]), "#adc5e7"), transparent: true, depthWrite: false }));
    const labelAngle = longitude + THREE.MathUtils.degToRad(15);
    label.position.set((globeRadius + 0.42) * Math.cos(labelAngle), (globeRadius + 0.42) * Math.sin(labelAngle), 0);
    label.scale.set(0.42, 0.2, 1);
    scene.add(label);
  }

  const axes = new THREE.AxesHelper(4.1);
  axes.material.transparent = true;
  axes.material.opacity = 0.62;
  scene.add(axes);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0x5cb7ee }),
  );
  scene.add(earth);
  const earthHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0x398dcc, transparent: true, opacity: 0.12, side: THREE.BackSide }),
  );
  scene.add(earthHalo);
}

export default function GeocentricGlobe({
  days,
  index,
  selectedBody,
  onSelect,
  t,
}: {
  days: MotionDay[];
  index: number;
  selectedBody: BodyId;
  onSelect: (id: BodyId) => void;
  t: (value: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const annualPathsRef = useRef<THREE.Group | null>(null);
  const dailyMarkersRef = useRef<THREE.Group | null>(null);
  const bodyMeshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a14);
    createGlobe(t, scene);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(8.8, -9.8, 7.1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 5.5;
    controls.maxDistance = 18;
    controls.target.set(0, 0, 0);

    const annualPaths = new THREE.Group();
    const dailyMarkers = new THREE.Group();
    scene.add(annualPaths, dailyMarkers);
    sceneRef.current = scene;
    annualPathsRef.current = annualPaths;
    dailyMarkersRef.current = dailyMarkers;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const body = raycaster.intersectObjects(bodyMeshesRef.current)[0]?.object.userData.body as BodyId | undefined;
      if (body) onSelect(body);
      pointerStart = null;
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      disposeGroup(annualPaths);
      disposeGroup(dailyMarkers);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          if ("geometry" in object) object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (material instanceof THREE.SpriteMaterial && material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      annualPathsRef.current = null;
      dailyMarkersRef.current = null;
      bodyMeshesRef.current = [];
    };
    // The translation callback is stable for the mounted locale view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = annualPathsRef.current;
    if (!group || days.length === 0) return;
    disposeGroup(group);
    for (const body of BODIES) {
      const points = days.map(day => positionAt(day.bodies[body.id], body.radius));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: body.id === selectedBody ? 0.38 : 0.13 });
      group.add(new THREE.Line(geometry, material));
    }
  }, [days, selectedBody]);

  useEffect(() => {
    const group = dailyMarkersRef.current;
    const scene = sceneRef.current;
    const day = days[index];
    if (!group || !scene || !day) return;
    disposeGroup(group);
    const markers: THREE.Mesh[] = [];
    const trailStart = Math.max(0, index - 20);

    for (const body of BODIES) {
      const color = new THREE.Color(body.color);
      const trailPoints = days.slice(trailStart, index + 1).map(sample => positionAt(sample.bodies[body.id], body.radius));
      if (trailPoints.length > 1) {
        group.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(trailPoints),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: body.id === selectedBody ? 0.95 : 0.5 }),
        ));
      }

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(body.id === selectedBody ? 0.105 : 0.075, 20, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      marker.position.copy(positionAt(day.bodies[body.id], body.radius));
      marker.userData.body = body.id;
      group.add(marker);
      markers.push(marker);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(body.id === selectedBody ? 0.21 : 0.15, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: body.id === selectedBody ? 0.18 : 0.1, depthWrite: false }),
      );
      glow.position.copy(marker.position);
      group.add(glow);

      const labelTexture = makeLabelTexture(`${body.glyph} ${t(body.label)}`, body.color);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false, opacity: body.id === selectedBody ? 1 : 0.72 }));
      label.position.copy(marker.position).add(new THREE.Vector3(0, 0, 0.24));
      label.scale.set(0.76, 0.29, 1);
      group.add(label);
    }
    bodyMeshesRef.current = markers;
    // The current day's group is replaced whenever the date or selected body changes.
  }, [days, index, selectedBody, t]);

  return <div ref={containerRef} className="h-[min(62vh,680px)] min-h-[390px] w-full touch-none" aria-label={t("可拖动旋转的地心七曜三维天球")}/>;
}
