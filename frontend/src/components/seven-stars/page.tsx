// "use client";

// import React, { useEffect, useRef, useState } from 'react';
// import Link from "next/link";
// import BottomNav from "@/components/Footer/BottomNav";
// import EarthNav from "@/components/EarthNav/EarthNav";
// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

// const AstronomyVisualization: React.FC = () => {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const containerRef = useRef<HTMLDivElement>(null);
//     const [latitude, setLatitude] = useState('31.23');
//     const [longitude, setLongitude] = useState('121.47');
//     const [date, setDate] = useState('');
//     const [time, setTime] = useState('');
//     const [result, setResult] = useState('');

//     // Three.js相关引用
//     const sceneRef = useRef<THREE.Scene | null>(null);
//     const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
//     const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
//     const labelRendererRef = useRef<CSS2DRenderer | null>(null);
//     const controlsRef = useRef<OrbitControls | null>(null);
//     const celestialObjectsRef = useRef<any[]>([]);
//     const labelsRef = useRef<any[]>([]);
//     const animationIdRef = useRef<number>();

//     // 初始化Three.js场景
//     const initThree = () => {
//         if (!canvasRef.current) return;

//         // 创建场景
//         const scene = new THREE.Scene();
//         scene.background = new THREE.Color(0x000000);
//         sceneRef.current = scene;

//         // 添加星空效果
//         const starsGeometry = new THREE.BufferGeometry();
//         const starsCount = 2000;
//         const positions = new Float32Array(starsCount * 3);

//         for (let i = 0; i < starsCount * 3; i += 3) {
//             positions[i] = (Math.random() - 0.5) * 100;
//             positions[i + 1] = (Math.random() - 0.5) * 100;
//             positions[i + 2] = (Math.random() - 0.5) * 100;
//         }

//         starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//         const starsMaterial = new THREE.PointsMaterial({
//             color: 0xffffff,
//             size: 0.13,
//             transparent: true,
//             sizeAttenuation: true,
//             opacity: 0.8,
//         });

//         const starField = new THREE.Points(starsGeometry, starsMaterial);
//         scene.add(starField);
//         celestialObjectsRef.current.push(starField);

//         // 创建相机
//         const camera = new THREE.PerspectiveCamera(
//             75,
//             window.innerWidth / window.innerHeight,
//             0.1,
//             1000
//         );
//         cameraRef.current = camera;

//         // 创建WebGL渲染器
//         const renderer = new THREE.WebGLRenderer({
//             canvas: canvasRef.current,
//             antialias: true,
//         });
//         renderer.setSize(window.innerWidth, window.innerHeight);
//         rendererRef.current = renderer;

//         // 创建CSS2D渲染器
//         const labelRenderer = new CSS2DRenderer();
//         labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         labelRenderer.domElement.style.position = 'absolute';
//         labelRenderer.domElement.style.top = '0';
//         labelRenderer.domElement.style.pointerEvents = 'none';

//         if (containerRef.current) {
//             containerRef.current.appendChild(labelRenderer.domElement);
//         }

//         labelRendererRef.current = labelRenderer;

//         // 基础天球
//         const celestialSphere = new THREE.Mesh(
//             new THREE.SphereGeometry(2, 30, 30),
//             new THREE.MeshBasicMaterial({
//                 wireframe: true,
//                 transparent: true,
//                 opacity: 0.1,
//             })
//         );
//         scene.add(celestialSphere);

//         // 赤道平面
//         const equatorialPlane = new THREE.Mesh(
//             new THREE.CircleGeometry(2, 30),
//             new THREE.MeshBasicMaterial({
//                 color: 0x4169e1,
//                 transparent: true,
//                 opacity: 0.2,
//                 side: THREE.DoubleSide,
//             })
//         );
//         equatorialPlane.rotation.x = Math.PI / 2;
//         scene.add(equatorialPlane);

//         // 赤道圆圈
//         const equatorLine = new THREE.Mesh(
//             new THREE.TorusGeometry(2, 0.003, 16, 100),
//             new THREE.MeshBasicMaterial({ color: 0xffffff })
//         );
//         equatorLine.rotation.x = Math.PI / 2;
//         scene.add(equatorLine);

//         // 坐标轴
//         const axesHelper = new THREE.AxesHelper(2.4);
//         scene.add(axesHelper);

//         // 方位标签
//         const orientationLabels = ['东', '北', '西', '南'];
//         for (let i = 0; i < 4; i++) {
//             const angle = (i * Math.PI * 2) / 4;
//             const x = 2 * Math.cos(angle);
//             const z = 2 * Math.sin(angle);
//             const y = 0;

//             const labelDiv = document.createElement('div');
//             labelDiv.className = 'orientation-label';
//             labelDiv.textContent = orientationLabels[i];
//             labelDiv.style.color = '#ffffff';
//             labelDiv.style.fontSize = '14px';
//             labelDiv.style.fontWeight = 'bold';
//             labelDiv.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';

//             const label = new CSS2DObject(labelDiv);
//             label.position.set(x * 1.1, y, z * 1.1);
//             scene.add(label);
//             labelsRef.current.push(label);
//         }

//         // 初始化控制器
//         const controls = new OrbitControls(camera, renderer.domElement);
//         camera.position.set(4, 4, 4);
//         controls.update();
//         controlsRef.current = controls;
//     };

//     // 更新可视化
//     const updateVisualization = (data: any, planetsData: any) => {
//         if (!sceneRef.current) return;

//         const scene = sceneRef.current;

//         // 保存星空对象
//         const starField = celestialObjectsRef.current.find(
//             (obj) => obj instanceof THREE.Points
//         );

//         // 清除旧对象
//         celestialObjectsRef.current.forEach((obj) => {
//             if (!(obj instanceof THREE.Points)) {
//                 scene.remove(obj);
//             }
//         });

//         celestialObjectsRef.current = starField ? [starField] : [];

//         // 清除旧标签
//         labelsRef.current.forEach((label) => scene.remove(label));
//         labelsRef.current = [];

//         const sunDeclination = parseFloat(data.sun_declination.replace('°', ''));
//         const moonDeclination = parseFloat(data.moon_declination.replace('°', ''));
//         const latitudeValue = parseFloat(latitude);

//         // 创建太阳和月亮轨迹
//         createCelestialBodyTrajectory('sun', sunDeclination, latitudeValue, 0xffff00, data);
//         createCelestialBodyTrajectory('moon', moonDeclination, latitudeValue, 0xc0c0c0, data);

//         // 创建行星轨迹
//         if (planetsData) {
//             const planetConfigs = {
//                 '水星': { color: 0x498bff, englishName: 'mercury' },
//                 '金星': { color: 0xcec2a8, englishName: 'venus' },
//                 '火星': { color: 0xb92123, englishName: 'mars' },
//                 '木星': { color: 0x60b633, englishName: 'jupiter' },
//                 '土星': { color: 0xf4d727, englishName: 'saturn' },
//             };

//             Object.entries(planetConfigs).forEach(([chineseName, config]) => {
//                 if (planetsData[chineseName]) {
//                     const declination = parseFloat(planetsData[chineseName].declination.replace('°', ''));
//                     createCelestialBodyTrajectory(
//                         config.englishName,
//                         declination,
//                         latitudeValue,
//                         config.color,
//                         data,
//                         true
//                     );
//                 }
//             });
//         }

//         // 更新结果显示
//         setResult(`
//       <p>日出时间: ${data.sunrise}</p>
//       <p>日落时间: ${data.sunset}</p>
//       <p>月出时间: ${data.moonrise}</p>
//       <p>月落时间: ${data.moonset}</p>
//       <p>日照时长: ${data.daylight_duration}</p>
//       <p>太阳赤纬角: ${data.sun_declination}</p>
//       <p>月亮赤纬角: ${data.moon_declination}</p>
//       <hr>
//     `);
//     };

//     // 创建天体轨迹
//     const createCelestialBodyTrajectory = (
//         bodyType: string,
//         declination: number,
//         latitude: number,
//         color: number,
//         data: any,
//         isPlanet: boolean = false
//     ) => {
//         if (!sceneRef.current) return;

//         const scene = sceneRef.current;
//         const radius = 2;
//         const timePoints = 86400;
//         const points = [];

//         const delta = (declination * Math.PI) / 180;
//         const latitudeRad = (latitude * Math.PI) / 180;

//         // 生成轨迹点
//         for (let i = 0; i < timePoints; i++) {
//             const t = (i / (timePoints - 1)) * Math.PI * 2;
//             const d = radius * Math.sin(delta);
//             const circleRadius = Math.sqrt(radius * radius - d * d);
//             const x = circleRadius * Math.cos(t);
//             const y = circleRadius * Math.sin(t);
//             const z = d;

//             // 计算旋转
//             const zAxis = new THREE.Vector3(0, 0, 1);
//             const northPoleDir = new THREE.Vector3(
//                 0,
//                 Math.sin(latitudeRad),
//                 Math.cos(latitudeRad)
//             ).normalize();

//             const rotationAxis = new THREE.Vector3();
//             rotationAxis.crossVectors(zAxis, northPoleDir).normalize();
//             const rotationAngle = Math.acos(zAxis.dot(northPoleDir));

//             const rotationMatrix = new THREE.Matrix4();
//             rotationMatrix.makeRotationAxis(rotationAxis, rotationAngle);

//             const point = new THREE.Vector3(x, y, z);
//             point.applyMatrix4(rotationMatrix);
//             points.push(point);
//         }

//         // 创建轨迹管道
//         const curve = new THREE.CatmullRomCurve3(points);
//         const pathGeometry = new THREE.TubeGeometry(curve, 50, 0.01, 20, false);
//         const pathMaterial = new THREE.MeshBasicMaterial({ color });
//         const path = new THREE.Mesh(pathGeometry, pathMaterial);
//         path.userData = { type: bodyType };
//         path.visible = !isPlanet; // 行星默认不可见
//         scene.add(path);
//         celestialObjectsRef.current.push(path);

//         // 添加时间标记和交点
//         createTimeMarkers(bodyType, points, data, color, declination > 0);
//     };

//     // 创建时间标记
//     const createTimeMarkers = (
//         bodyType: string,
//         points: THREE.Vector3[],
//         data: any,
//         color: number,
//         isDeclinationPositive: boolean
//     ) => {
//         if (!sceneRef.current) return;

//         const scene = sceneRef.current;

//         // 时间转换函数
//         const timeToSeconds = (timeStr: string) => {
//             const [h, m] = timeStr.split(':').map(Number);
//             return h * 3600 + m * 60;
//         };

//         // 查找与赤道平面的交点
//         const findIntersections = () => {
//             const intersections: THREE.Vector3[] = [];
//             const indices: number[] = [];

//             for (let i = 0; i < points.length - 1; i++) {
//                 const point = points[i];
//                 const nextPoint = points[i + 1];

//                 if (point.y * nextPoint.y <= 0) {
//                     const t = -point.y / (nextPoint.y - point.y);
//                     const intersectX = point.x + t * (nextPoint.x - point.x);
//                     const intersectZ = point.z + t * (nextPoint.z - point.z);

//                     intersections.push(new THREE.Vector3(intersectX, 0, intersectZ));
//                     indices.push(i);
//                 }
//             }
//             return { points: intersections, indices };
//         };

//         const { points: intersectionPoints, indices: intersectionIndices } = findIntersections();

//         // 创建交点标记
//         intersectionPoints.forEach((point, index) => {
//             const marker = new THREE.Mesh(
//                 new THREE.SphereGeometry(0.03),
//                 new THREE.MeshBasicMaterial({
//                     color: bodyType === 'sun' ? 0xff0000 : 0x008b8b
//                 })
//             );
//             marker.position.copy(point);
//             scene.add(marker);
//             celestialObjectsRef.current.push(marker);

//             // 添加标签
//             const labelDiv = document.createElement('div');
//             labelDiv.className = bodyType === 'sun' ? 'intersection-label' : 'moon-intersection-label';
//             const label = new CSS2DObject(labelDiv);
//             label.position.copy(point);
//             scene.add(label);
//             labelsRef.current.push(label);
//         });

//         // 获取升起时间
//         const riseTime = bodyType === 'sun' ? data.sunrise : data.moonrise;
//         const riseSec = timeToSeconds(riseTime);
//         const riseIndex = isDeclinationPositive ? intersectionIndices[1] : intersectionIndices[0];

//         // 创建整点时间标记
//         const riseHour = Math.ceil(riseSec / 3600);
//         const firstHourMarker = riseHour * 3600;
//         const timeDiff = firstHourMarker - riseSec;

//         const firstHourIndex = (riseIndex + Math.round((timeDiff / 86400) * points.length)) % points.length;

//         const markerColor = bodyType === 'sun' ? 0xffa500 : 0x20b2aa;
//         const markerGeometry = new THREE.SphereGeometry(0.03);
//         const markerMaterial = new THREE.MeshBasicMaterial({ color: markerColor });

//         for (let h = 0; h < 24; h++) {
//             const targetSec = firstHourMarker + h * 3600;
//             const markerIndex = (firstHourIndex + Math.round((h * points.length) / 24)) % points.length;
//             const position = points[markerIndex];

//             // 创建标记点
//             const marker = new THREE.Mesh(markerGeometry, markerMaterial);
//             marker.position.copy(position);
//             marker.userData = { type: bodyType };
//             scene.add(marker);
//             celestialObjectsRef.current.push(marker);

//             // 添加时间标签
//             const labelDiv = document.createElement('div');
//             labelDiv.className = bodyType === 'sun' ? 'time-marker' : 'moon-time-marker';
//             labelDiv.textContent = `${Math.floor(targetSec / 3600).toString().padStart(2, '0')}`;

//             const label = new CSS2DObject(labelDiv);
//             label.userData = { type: bodyType };

//             const direction = position.clone().normalize();
//             const labelPosition = position.clone().add(direction.multiplyScalar(0.15));
//             label.position.copy(labelPosition);

//             scene.add(label);
//             labelsRef.current.push(label);
//         }

//         // 添加当前时间标记
//         const [currentHour, currentMinute] = time.split(':').map(Number);
//         const currentSeconds = currentHour * 3600 + currentMinute * 60;
//         const pointsPerSecond = points.length / 86400;
//         const timeDiffFromRise = currentSeconds - riseSec;
//         const offsetPoints = Math.floor(timeDiffFromRise * pointsPerSecond);
//         const validIndex = (((riseIndex + offsetPoints) % points.length) + points.length) % points.length;

//         const currentMarker = new THREE.Mesh(
//             new THREE.SphereGeometry(0.08),
//             new THREE.MeshBasicMaterial({
//                 color: bodyType === 'sun' ? 0xff4500 : 0x87ceeb
//             })
//         );
//         currentMarker.position.copy(points[validIndex]);
//         currentMarker.userData = { type: bodyType };
//         scene.add(currentMarker);
//         celestialObjectsRef.current.push(currentMarker);

//         const currentLabel = document.createElement('div');
//         currentLabel.className = bodyType === 'sun' ? 'time-marker' : 'moon-time-marker';
//         currentLabel.style.color = bodyType === 'sun' ? '#ff4500' : '#87ceeb';
//         currentLabel.style.fontSize = '16px';
//         currentLabel.textContent = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

//         const timeLabel = new CSS2DObject(currentLabel);
//         const direction = currentMarker.position.clone().normalize();
//         const labelPosition = currentMarker.position.clone().add(direction.multiplyScalar(0.2));
//         timeLabel.position.copy(labelPosition);
//         timeLabel.userData = { type: bodyType };

//         scene.add(timeLabel);
//         labelsRef.current.push(timeLabel);
//     };

//     // 动画循环
//     const animate = () => {
//         if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !labelRendererRef.current) return;

//         controlsRef.current?.update();
//         rendererRef.current.render(sceneRef.current, cameraRef.current);
//         labelRendererRef.current.render(sceneRef.current, cameraRef.current);

//         animationIdRef.current = requestAnimationFrame(animate);
//     };

//     // 窗口大小调整
//     const handleResize = () => {
//         if (!cameraRef.current || !rendererRef.current || !labelRendererRef.current) return;

//         const container = containerRef.current;
//         if (!container) return;

//         const width = container.clientWidth;
//         const height = container.clientHeight;

//         cameraRef.current.aspect = width / height;
//         cameraRef.current.updateProjectionMatrix();
//         rendererRef.current.setSize(width, height);
//         labelRendererRef.current.setSize(width, height);
//     };

//     // 表单提交处理
//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();

//         // 验证中国范围内的经纬度
//         const minLatitude = 3.5;
//         const maxLatitude = 53.4;
//         const minLongitude = 73.3;
//         const maxLongitude = 135.1;

//         const lat = parseFloat(latitude);
//         const lng = parseFloat(longitude);

//         if (lat < minLatitude || lat > maxLatitude || lng < minLongitude || lng > maxLongitude) {
//             setResult('请输入中国范围内的经纬度');
//             return;
//         }

//         try {
//             // 获取日月数据
//             const sunMoonResponse = await fetch('/api/calculate', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ latitude: lat, longitude: lng, date, time }),
//             });
//             const sunMoonData = await sunMoonResponse.json();

//             // 获取行星数据
//             const planetsResponse = await fetch('/api/planets', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ latitude: lat, longitude: lng, date, time }),
//             });
//             const planetsData = await planetsResponse.json();

//             updateVisualization(sunMoonData, planetsData);
//         } catch (error) {
//             console.error('Error:', error);
//             setResult('获取数据时出错，请重试');
//         }
//     };

//     // 天体显示控制
//     const handleCelestialToggle = (celestialBody: string, isChecked: boolean) => {
//         // 控制天体对象显示
//         celestialObjectsRef.current.forEach((obj) => {
//             if (obj.userData && obj.userData.type === celestialBody) {
//                 obj.visible = isChecked;
//             }
//         });

//         // 控制标签显示
//         labelsRef.current.forEach((label) => {
//             if (label.userData && label.userData.type === celestialBody) {
//                 label.visible = isChecked;
//             }
//         });
//     };

//     // 组件挂载和卸载
//     useEffect(() => {
//         // 设置默认日期和时间
//         const today = new Date();
//         const year = today.getFullYear();
//         const month = String(today.getMonth() + 1).padStart(2, '0');
//         const day = String(today.getDate()).padStart(2, '0');
//         const hours = String(today.getHours()).padStart(2, '0');
//         const minutes = String(today.getMinutes()).padStart(2, '0');

//         setDate(`${year}-${month}-${day}`);
//         setTime(`${hours}:${minutes}`);

//         // 初始化Three.js
//         initThree();
//         window.addEventListener('resize', handleResize);
//         animate();

//         // 自动提交表单
//         const submitForm = async () => {
//             if (latitude && longitude && date && time) {
//                 await handleSubmit(new Event('submit') as any);
//             }
//         };

//         submitForm();

//         // 清理函数
//         return () => {
//             window.removeEventListener('resize', handleResize);
//             if (animationIdRef.current) {
//                 cancelAnimationFrame(animationIdRef.current);
//             }

//             // 清理Three.js资源
//             if (rendererRef.current) {
//                 rendererRef.current.dispose();
//             }

//             if (labelRendererRef.current) {
//                 labelRendererRef.current.domElement.remove();
//             }
//         };
//     }, []);

//     // 复选框事件处理
//     useEffect(() => {
//         const checkboxes = document.querySelectorAll('.celestial-checkbox');

//         const handleCheckboxChange = (e: Event) => {
//             const target = e.target as HTMLInputElement;
//             const celestialBody = target.dataset.celestial;
//             if (celestialBody) {
//                 handleCelestialToggle(celestialBody, target.checked);
//             }
//         };

//         checkboxes.forEach(checkbox => {
//             checkbox.addEventListener('change', handleCheckboxChange);
//         });

//         return () => {
//             checkboxes.forEach(checkbox => {
//                 checkbox.removeEventListener('change', handleCheckboxChange);
//             });
//         };
//     }, []);

//     return (
//         <div style={{
//             display: 'flex',
//             flexDirection: 'column',
//             minHeight: '100vh',
//             backgroundColor: '#1c023f',
//             color: 'white',
//             fontFamily: 'Arial, sans-serif',
//             margin: 0,
//             padding: 0,
//             overflowX: 'hidden'
//         }}>
//             <div
//                 style={{
//                     display: "grid",
//                     gridTemplateColumns: "minmax(240px, 280px) 1fr",
//                     minHeight: "100vh",
//                 }}
//             >
//                 {/* 输入面板 */}
//                 <div
//                     style={{
//                         background: "rgba(0, 0, 0, 0.6)",
//                         boxShadow: "1px 0 3px rgba(0, 0, 0, 0.3)",
//                         overflowY: "auto",
//                         position: "fixed" as const,
//                         top: "2vw",
//                         left: "2vw",
//                         borderRadius: "8px",
//                         zIndex: 1000,
//                         width: "20vw", // ← 自动根据屏幕宽度调整
//                         minWidth: "120px", // 保证小屏时不会太小
//                         maxWidth: "200px", // 大屏时不会太大
//                         border: "none",
//                         padding: "1vw", // 自适应内边距
//                         fontSize: "clamp(12px, 1vw, 16px)", // 字体随屏幕变化
//                     }}
//                 >
//                     <form
//                         onSubmit={handleSubmit}
//                         style={{ display: "flex", flexDirection: "column", gap: "0.8vw" }}
//                     >
//                         <div style={{ display: "flex", flexDirection: "column" }}>
//                             <label htmlFor="latitude" style={{ marginBottom: "0.3em" }}>
//                                 纬度
//                             </label>
//                             <input
//                                 type="number"
//                                 id="latitude"
//                                 step="0.01"
//                                 required
//                                 placeholder="例如：31.35"
//                                 value={latitude}
//                                 onChange={(e) => setLatitude(e.target.value)}
//                                 style={{
//                                     width: "100%",
//                                     padding: "0.5em",
//                                     borderRadius: "4px",
//                                     border: "1px solid #ccc",
//                                 }}
//                             />
//                         </div>

//                         <div style={{ display: "flex", flexDirection: "column" }}>
//                             <label htmlFor="longitude" style={{ marginBottom: "0.3em" }}>
//                                 经度
//                             </label>
//                             <input
//                                 type="number"
//                                 id="longitude"
//                                 step="0.01"
//                                 required
//                                 placeholder="例如：121.43"
//                                 value={longitude}
//                                 onChange={(e) => setLongitude(e.target.value)}
//                                 style={{
//                                     width: "100%",
//                                     padding: "0.5em",
//                                     borderRadius: "4px",
//                                     border: "1px solid #ccc",
//                                 }}
//                             />
//                         </div>

//                         <div style={{ display: "flex", flexDirection: "column" }}>
//                             <label htmlFor="date" style={{ marginBottom: "0.3em" }}>
//                                 日期
//                             </label>
//                             <input
//                                 type="date"
//                                 id="date"
//                                 required
//                                 value={date}
//                                 onChange={(e) => setDate(e.target.value)}
//                                 style={{
//                                     width: "100%",
//                                     padding: "0.5em",
//                                     borderRadius: "4px",
//                                     border: "1px solid #ccc",
//                                 }}
//                             />
//                         </div>

//                         <div style={{ display: "flex", flexDirection: "column" }}>
//                             <label htmlFor="time" style={{ marginBottom: "0.3em" }}>
//                                 时间
//                             </label>
//                             <input
//                                 type="time"
//                                 id="time"
//                                 required
//                                 value={time}
//                                 onChange={(e) => setTime(e.target.value)}
//                                 style={{
//                                     width: "100%",
//                                     padding: "0.5em",
//                                     borderRadius: "4px",
//                                     border: "1px solid #ccc",
//                                 }}
//                             />
//                         </div>

//                         <button
//                             type="submit"
//                             style={{
//                                 padding: "0.7em",
//                                 backgroundColor: "#6b55b4",
//                                 color: "white",
//                                 border: "none",
//                                 borderRadius: "2px",
//                                 cursor: "pointer",
//                                 transition: "background-color 0.3s",
//                             }}
//                         >
//                             查询并可视化
//                         </button>
//                     </form>
//                 </div>


//                 {/* 结果显示 */}
//                 <div id="result" style={{
//                     position: 'fixed' as const,
//                     top: '20px',
//                     right: '20px',
//                     width: '220px',
//                     padding: '10px',
//                     background: 'rgba(0, 0, 0, 0.3)',
//                     borderRadius: '10px',
//                     boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
//                     color: 'white',
//                     fontSize: '0.9rem'
//                 }} dangerouslySetInnerHTML={{ __html: result }} />

//                 {/* 可视化面板 */}
//                 <div ref={containerRef} className="visualization-panel" style={{
//                     position: 'relative' as const,
//                     background: '#000',
//                     overflow: 'hidden',
//                     gridColumn: '1 / -1'
//                 }}>
//                     <canvas ref={canvasRef} id="threeCanvas" />
//                     <div id="info" style={{
//                         position: 'absolute',
//                         top: '225px',
//                         right: '300px',
//                         color: 'yellow',
//                         fontFamily: 'monospace',
//                         fontSize: '14px',
//                         whiteSpace: 'pre' as const,
//                         textShadow: '1px 1px 1px black',
//                         background: 'rgba(0, 0, 0, 0.2)',
//                         padding: '0.1rem 0.1rem',
//                         borderRadius: '6px',
//                         zIndex: 1000
//                     }}></div>
//                 </div>

//                 {/* 天体轨迹控制 */}
//                 <div id="celestialControls" style={{
//                     position: 'fixed' as const,
//                     right: '8px',
//                     top: '15%',
//                     transform: 'translateY(-50%)',
//                     background: 'rgba(0, 0, 0, 0.7)',
//                     padding: '8px',
//                     borderRadius: '8px',
//                     display: 'flex',
//                     flexDirection: 'column' as const,
//                     gap: '8px',
//                     zIndex: 1000,
//                     border: '1px solid rgba(255, 255, 255, 0.1)'
//                 }}>
//                     <div className="control-title" style={{
//                         color: '#fff',
//                         fontWeight: 'bold',
//                         marginBottom: '5px',
//                         borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
//                         paddingBottom: '5px'
//                     }}></div>

//                     {[
//                         { id: 'sun', name: '太阳', color: '#ffff00' },
//                         { id: 'moon', name: '月亮', color: '#c0c0c0' },
//                         { id: 'mercury', name: '水星', color: '#498bff' },
//                         { id: 'venus', name: '金星', color: '#cec2a8' },
//                         { id: 'mars', name: '火星', color: '#ff5153' },
//                         { id: 'jupiter', name: '木星', color: '#60b633' },
//                         { id: 'saturn', name: '土星', color: '#f4d727' }
//                     ].map((body) => (
//                         <label
//                             key={body.id}
//                             data-celestial={body.id}
//                             style={{
//                                 color: body.color,
//                                 fontFamily: 'Arial, sans-serif',
//                                 fontSize: '12px',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 gap: '4px',
//                                 cursor: 'pointer'
//                             }}
//                         >
//                             <input
//                                 type="checkbox"
//                                 className="celestial-checkbox"
//                                 data-celestial={body.id}
//                                 defaultChecked={body.id === 'sun' || body.id === 'moon'}
//                             />
//                             {body.name}
//                         </label>
//                     ))}

//                 </div>
//             </div>
//             <style>{`
//         * {
//           box-sizing: border-box;
//         }

//         canvas {
//           display: block;
//         }

//         .label {
//           color: #ffffff;
//           font-family: sans-serif;
//           padding: 2px;
//           background: rgba(0, 0, 0, 0.6);
//         }

//         .button:hover {
//           background: #5b4aa3;
//         }

//         .footer svg {
//           color: white;
//           font-size: 24px;
//         }

//         .back-btn:hover,
//         .location-btn:hover,
//         .calendar-btn:hover,
//         .moon-btn:hover,
//         .data-btn:hover,
//         .index-btn:hover {
//           opacity: 0.8;
//         }

//         .time-marker {
//           font-size: 12px;
//           background: rgba(0, 0, 0, 0);
//           padding: 2px 5px;
//           border-radius: 3px;
//           transform: translateY(-10px);
//           white-space: nowrap;
//           color: #ffb347;
//           font-weight: bold;
//         }

//         .intersection-label {
//           color: #ff0000;
//           font-size: 14px;
//           font-weight: bold;
//         }

//         .marker-point {
//           border-radius: 50%;
//           width: 6px;
//           height: 6px;
//           background-color: #ffa500;
//         }

//         .intersection-point {
//           border-radius: 50%;
//           width: 8px;
//           height: 8px;
//           background-color: #ff0000;
//         }

//         .moon-time-marker {
//           font-size: 12px;
//           background: rgba(0, 0, 0, 0);
//           padding: 2px 5px;
//           border-radius: 3px;
//           transform: translateY(-10px);
//           white-space: nowrap;
//           color: #20b2aa !important;
//           font-weight: bold;
//         }

//         .moon-intersection-label {
//           color: #044343 !important;
//           font-size: 13px;
//           text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
//         }

//         .nav-button {
//           background: rgba(107, 85, 180, 0.2);
//           border: none;
//           border-radius: 20px;
//           padding: 10px;
//           cursor: pointer;
//           transition: all 0.3s ease;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           min-width: 80px;
//         }

//         .nav-button:hover {
//           background: rgba(255, 255, 255, 0.9);
//           transform: scale(1.1);
//         }

//         @media (max-width: 768px) {
//           .input-panel, #result {
//             width: calc(40%);
//             font-size: 0.9rem;
//           }

//           .input-panel h2 {
//             font-size: 1.2rem;
//             margin-bottom: 1rem;
//           }

//           .container {
//             grid-template-columns: 1fr;
//           }

//           .input-panel {
//             width: calc(50%);
//             max-height: 60vh;
//           }

//           .visualization-panel {
//             height: 100vh;
//           }
//         }
//       `}</style>
//         </div>

//     );
// };

// export default AstronomyVisualization;

// "use client";

// import { useEffect, useRef, useState } from "react";
// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
// import BottomNav from "@/components/Footer/BottomNav";

// export default function ZodiacPage() {
//     const containerRef = useRef<HTMLDivElement | null>(null);
//     const animRef = useRef<number | null>(null);
//     const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
//     const labelRendererRef = useRef<CSS2DRenderer | null>(null);
//     const controlsRef = useRef<OrbitControls | null>(null);
//     const [currentDate, setCurrentDate] = useState(new Date());

//     useEffect(() => {
//         if (!containerRef.current) return;
//         const container = containerRef.current;

//         // --- 如果页面已有旧的 canvas / labelRenderer DOM，先移除它们（避免重复附加） ---
//         const EXISTING_CANVAS_ID = "threejs-canvas";
//         const EXISTING_LABELS_ID = "threejs-labels";

//         const removeIfExist = (id: string) => {
//             const el = container.querySelector(`#${id}`);
//             if (el) el.remove();
//         };
//         removeIfExist(EXISTING_CANVAS_ID);
//         removeIfExist(EXISTING_LABELS_ID);

//         // --- Scene, Camera, Renderer ---
//         const scene = new THREE.Scene();
//         const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//         const renderer = new THREE.WebGLRenderer({ antialias: true });
//         renderer.setSize(window.innerWidth, window.innerHeight);
//         renderer.setClearColor(0x000000);
//         // 给 canvas 一个稳定 id（方便清理）
//         renderer.domElement.id = EXISTING_CANVAS_ID;
//         container.appendChild(renderer.domElement);
//         rendererRef.current = renderer;

//         // --- CSS2DRenderer for labels ---
//         const labelRenderer = new CSS2DRenderer();
//         labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         // append renderer + labelRenderer (顺序无关，label 在上)
//         renderer.domElement.id = EXISTING_CANVAS_ID;
//         container.appendChild(renderer.domElement);

//         labelRenderer.domElement.style.position = "absolute";
//         labelRenderer.domElement.style.top = "0";
//         labelRenderer.domElement.style.pointerEvents = "none"; // 让事件穿透到 canvas
//         labelRenderer.domElement.id = EXISTING_LABELS_ID;
//         container.appendChild(labelRenderer.domElement);

//         // bind controls to canvas
//         const controls = new OrbitControls(camera, renderer.domElement);
//         controls.enableDamping = true;
//         controls.dampingFactor = 0.05;


//         // --- Star field ---
//         const starsGeometry = new THREE.BufferGeometry();
//         const starsCount = 2000;
//         const positions = new Float32Array(starsCount * 3);
//         for (let i = 0; i < starsCount * 3; i++) {
//             positions[i] = (Math.random() - 0.5) * 100;
//         }
//         starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
//         const starField = new THREE.Points(
//             starsGeometry,
//             new THREE.PointsMaterial({ size: 0.1, transparent: true })
//         );
//         scene.add(starField);

//         // --- Load Textures ---
//         const textureLoader = new THREE.TextureLoader();
//         const sunTexture = textureLoader.load("/pho/sun1.png");
//         const earthTexture = textureLoader.load("/pho/earth.png");

//         const constellationImages = [
//             "libra.png", "scorpio.png", "sagittarius.png", "capricorn.png",
//             "aquarius.png", "pisces.png", "aries.png", "taurus.png",
//             "gemini.png", "cancer.png", "leo.png", "virgo.png"
//         ];
//         const loadedConstellationTextures = constellationImages.map(img => textureLoader.load(`/pho/${img}`));

//         // --- Solar System Group ---
//         const solarSystem = new THREE.Group();
//         scene.add(solarSystem);

//         // --- Sun ---
//         const sun = new THREE.Mesh(
//             new THREE.SphereGeometry(0.2, 32, 32),
//             new THREE.MeshBasicMaterial({ map: sunTexture, transparent: true })
//         );
//         solarSystem.add(sun);

//         // --- Earth ---
//         const earth = new THREE.Mesh(
//             new THREE.SphereGeometry(0.1, 32, 32),
//             new THREE.MeshBasicMaterial({ map: earthTexture, transparent: true })
//         );
//         solarSystem.add(earth);

//         // --- Earth-Sun line ---
//         const lineMaterial = new THREE.LineDashedMaterial({ dashSize: 0.2, gapSize: 0.1 });
//         const lineGeometry = new THREE.BufferGeometry();
//         const linePositions = new Float32Array(6);
//         lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
//         const earthSunLine = new THREE.Line(lineGeometry, lineMaterial);
//         earthSunLine.computeLineDistances();
//         solarSystem.add(earthSunLine);

//         // --- Orbit ---
//         const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x4169e1, transparent: true, opacity: 0.8 });
//         const orbit = new THREE.Mesh(new THREE.TorusGeometry(1, 0.007, 16, 200), orbitMaterial);
//         solarSystem.add(orbit);

//         // --- Zodiac Labels + Images ---
//         const zodiacNames = ["天秤宫", "天蝎宫", "射手宫", "摩羯宫", "水瓶宫", "双鱼宫", "白羊宫", "金牛宫", "双子宫", "巨蟹宫", "狮子宫", "处女宫"];
//         const zodiacPlanes: THREE.Mesh[] = [];

//         for (let i = 0; i < 12; i++) {
//             const angle = (i * Math.PI * 2) / 12;
//             const radius = 2.2;
//             const tex = loadedConstellationTextures[i];
//             const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
//             const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), mat);
//             plane.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
//             solarSystem.add(plane);
//             zodiacPlanes.push(plane);

//             // --- Text label (CSS2DObject) ---
//             const div = document.createElement("div");
//             div.className = "label";
//             div.textContent = zodiacNames[i];
//             div.style.color = "white";
//             div.style.fontSize = "14px";
//             div.style.fontWeight = "bold";
//             // pointerEvents none (不拦截鼠标)
//             div.style.pointerEvents = "none";
//             const label = new CSS2DObject(div);
//             label.position.set(Math.cos(angle) * (radius + 0.5), Math.sin(angle) * (radius + 0.5), 0);
//             solarSystem.add(label);
//         }

//         // 整体上移
//         solarSystem.position.y = 1.5;

//         // --- Julian Date & position calculations ---
//         const julianDate = (date: Date) => {
//             const year = date.getFullYear();
//             const month = date.getMonth() + 1;
//             const day = date.getDate();
//             const a = Math.floor((14 - month) / 12);
//             const y = year + 4800 - a;
//             const m = month + 12 * a - 3;
//             return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 + 0.5;
//         };

//         const calculatePositions = (date: Date) => {
//             const JD = julianDate(date);
//             const J2000 = 2451545.0;
//             const n = JD - J2000;
//             const L0 = (280.46646 + 0.98564736 * n) % 360;
//             const M = (357.52911 + 0.98560028 * n) % 360;
//             const M_rad = (M * Math.PI) / 180;
//             const C = (1.914602 - 0.004817 * (n / 36525) - 0.000014 * (n / 36525) ** 2) * Math.sin(M_rad) +
//                 (0.019993 - 0.000101 * (n / 36525)) * Math.sin(2 * M_rad) + 0.000289 * Math.sin(3 * M_rad);
//             const L_E = (L0 + C) % 360;
//             const L_S = (L_E + 180) % 360;
//             return {
//                 earthLongitude: L_E,
//                 sunLongitude: L_S,
//                 earthX: Math.cos(L_E * Math.PI / 180),
//                 earthY: Math.sin(L_E * Math.PI / 180)
//             };
//         };

//         const updateEarthAndLine = (date: Date) => {
//             const pos = calculatePositions(date);
//             earth.position.set(pos.earthX, pos.earthY, 0);

//             const sunDir = new THREE.Vector3(-pos.earthX, -pos.earthY, 0).normalize().multiplyScalar(3);
//             const arr = (earthSunLine.geometry.attributes.position.array as Float32Array);
//             arr[0] = pos.earthX; arr[1] = pos.earthY; arr[2] = 0;
//             arr[3] = sunDir.x; arr[4] = sunDir.y; arr[5] = 0;
//             earthSunLine.geometry.attributes.position.needsUpdate = true;
//             earthSunLine.computeLineDistances();

//             const info = document.getElementById("info");
//             if (info) {
//                 const zodiacIndex = Math.floor(pos.sunLongitude / 30) % 12;
//                 info.textContent = `观测日期: ${date.toLocaleDateString()}\n地球黄经: ${pos.earthLongitude.toFixed(2)}°\n太阳视黄经: ${pos.sunLongitude.toFixed(2)}°\n太阳位于: ${zodiacNames[zodiacIndex]}`;
//             }
//         };

//         // 把 update 方法挂到 window（谨慎用，仅为兼容你原逻辑）
//         // @ts-ignore
//         window.updateEarthAndLine = updateEarthAndLine;

//         camera.position.set(0, 0, 9);
//         camera.lookAt(0, 0, 0);
//         updateEarthAndLine(currentDate);

//         // --- Animation loop ---
//         const animate = () => {
//             animRef.current = requestAnimationFrame(animate);
//             controls.update();
//             zodiacPlanes.forEach(plane => plane.lookAt(camera.position));
//             renderer.render(scene, camera);
//             labelRenderer.render(scene, camera);
//         };
//         animate();

//         // --- Handle resize ---
//         const onResize = () => {
//             camera.aspect = window.innerWidth / window.innerHeight;
//             camera.updateProjectionMatrix();
//             renderer.setSize(window.innerWidth, window.innerHeight);
//             labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         };
//         window.addEventListener("resize", onResize);

//         // --- Cleanup on unmount ---
//         return () => {
//             window.removeEventListener("resize", onResize);

//             // cancel animation
//             if (animRef.current) {
//                 cancelAnimationFrame(animRef.current);
//                 animRef.current = null;
//             }

//             // dispose controls
//             try {
//                 controls.dispose();
//             } catch (e) { /* ignore */ }

//             // remove global attach
//             // @ts-ignore
//             if (window.updateEarthAndLine) delete window.updateEarthAndLine;

//             // remove appended DOM nodes if still present
//             removeIfExist(EXISTING_CANVAS_ID);
//             removeIfExist(EXISTING_LABELS_ID);

//             // dispose geometries / materials to avoid memory leaks
//             try {
//                 starField.geometry.dispose();
//                 // dispose textures/materials we created
//                 sun.geometry.dispose();
//                 (sun.material as THREE.Material).dispose();
//                 earth.geometry.dispose();
//                 (earth.material as THREE.Material).dispose();
//                 orbit.geometry.dispose();
//                 (orbit.material as THREE.Material).dispose();
//                 lineGeometry.dispose();
//                 (lineMaterial as THREE.Material).dispose();
//                 // dispose loaded constellation textures and materials
//                 loadedConstellationTextures.forEach((t) => { if (t) t.dispose && (t as any).dispose(); });
//             } catch (e) {
//                 // 某些对象可能已被 GC 或不同实现，忽略错误
//             }

//             // ensure renderer disposed
//             try {
//                 renderer.dispose();
//             } catch (e) { /* ignore */ }

//             rendererRef.current = null;
//             labelRendererRef.current = null;
//             controlsRef.current = null;
//         };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []); // 仅在挂载/卸载时运行

//     const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const val = e.target.value;
//         if (!val) return;
//         const newDate = new Date(val);
//         setCurrentDate(newDate);
//         const updateEvent = new CustomEvent("updateEarth", { detail: newDate });
//         window.dispatchEvent(updateEvent);
//     };

//     useEffect(() => {
//         const listener = (e: any) => {
//             const date: Date = e.detail;
//             // @ts-ignore
//             window.updateEarthAndLine && window.updateEarthAndLine(date);
//         };
//         window.addEventListener("updateEarth", listener);
//         return () => window.removeEventListener("updateEarth", listener);
//     }, []);

//     const formatDateInput = (date: Date) => {
//         const year = date.getFullYear();
//         const month = String(date.getMonth() + 1).padStart(2, "0");
//         const day = String(date.getDate()).padStart(2, "0");
//         const hours = String(date.getHours()).padStart(2, "0");
//         const minutes = String(date.getMinutes()).padStart(2, "0");
//         return `${year}-${month}-${day}T${hours}:${minutes}`;
//     };

//     return (
//         <div className="bg-black text-white min-h-screen flex flex-col">
//             <div className="relative z-10 flex flex-col h-screen">
//                 <div ref={containerRef} style={{ width: "100vw", height: "100vh", position: "relative" }}>
//                     <div id="info" style={{ position: "absolute", top: "10px", left: "10px", color: "yellow", fontFamily: "monospace", fontSize: "14px", whiteSpace: "pre", textShadow: "1px 1px 1px black" }} />
//                     <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", padding: "15px", borderRadius: "8px" }}>
//                         <label style={{ color: "white", fontSize: "14px" }} />
//                         <input type="datetime-local" value={formatDateInput(currentDate)} onChange={handleDateChange} style={{ padding: "5px", borderRadius: "10px", border: "1px solid #666", background: "rgba(255,255,255,0.9)" }} />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }
import React from "react";

const ZodiacEmbed: React.FC = () => {
    return (
        <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
            <iframe
                src="/js/moon.html"
                title="qixingguiji"
                style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                }}
            />
        </div>
    );
};

export default ZodiacEmbed;
