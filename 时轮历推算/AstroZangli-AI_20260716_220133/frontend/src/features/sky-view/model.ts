export type SkyMode = "daily" | "annual";
export type BodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type Vector = [number, number, number];
export type StarRow = [number, number, number, number, number, number, string, number, number];
export interface Catalog {
  epoch: string;
  stars: StarRow[];
  constellations: { id: string; name: string; lines: number[][] }[];
}
export interface BodyPosition { altitude: number; azimuth: number; distanceAu: number }
export interface SkyFrame {
  localTime: string;
  gast: number;
  matrix: number[];
  moonIllumination: number;
  bodies: Record<BodyId, BodyPosition>;
}
export interface SkyData {
  city: { id: string; name: string; latitude: number; longitude: number; elevation: number };
  mode: SkyMode;
  timezone: string;
  frames: SkyFrame[];
  source: string;
}
export interface CameraView { azimuth: number; altitude: number; fov: number }
export interface SkyLayers { lines: boolean; names: boolean; grid: boolean; ground: boolean; daylightStars: boolean; trails: boolean }
export const CITIES = [
  { id: "lhasa", name: "拉萨", note: "西藏 · 拉萨" },
  { id: "riwoche", name: "类乌齐", note: "西藏 · 类乌齐县城" },
  { id: "shanghai", name: "上海", note: "上海" },
  { id: "beijing", name: "北京", note: "北京" },
] as const;
export const BODIES: { id: BodyId; name: string; color: string; symbol: string }[] = [
  { id: "sun", name: "太阳", color: "#ffd17b", symbol: "☉" },
  { id: "moon", name: "月亮", color: "#e0ecff", symbol: "☽" },
  { id: "mercury", name: "水星", color: "#b5c2d4", symbol: "☿" },
  { id: "venus", name: "金星", color: "#ffe4b6", symbol: "♀" },
  { id: "mars", name: "火星", color: "#f79579", symbol: "♂" },
  { id: "jupiter", name: "木星", color: "#e9cca5", symbol: "♃" },
  { id: "saturn", name: "土星", color: "#ebcf85", symbol: "♄" },
];
export const CONSTELLATION_NAMES: Record<string, string> = Object.fromEntries(
  "And:仙女 Ant:唧筒 Aps:天燕 Aqr:宝瓶 Aql:天鹰 Ara:天坛 Ari:白羊 Aur:御夫 Boo:牧夫 Cae:雕具 Cam:鹿豹 Cnc:巨蟹 CVn:猎犬 CMa:大犬 CMi:小犬 Cap:摩羯 Car:船底 Cas:仙后 Cen:半人马 Cep:仙王 Cet:鲸鱼 Cha:蝘蜓 Cir:圆规 Col:天鸽 Com:后发 CrA:南冕 CrB:北冕 Crv:乌鸦 Crt:巨爵 Cru:南十字 Cyg:天鹅 Del:海豚 Dor:剑鱼 Dra:天龙 Equ:小马 Eri:波江 For:天炉 Gem:双子 Gru:天鹤 Her:武仙 Hor:时钟 Hya:长蛇 Hyi:水蛇 Ind:印第安 Lac:蝎虎 Leo:狮子 LMi:小狮 Lep:天兔 Lib:天秤 Lup:豺 Lyn:天猫 Lyr:天琴 Men:山案 Mic:显微镜 Mon:麒麟 Mus:苍蝇 Nor:矩尺 Oct:南极 Oph:蛇夫 Ori:猎户 Pav:孔雀 Peg:飞马 Per:英仙 Phe:凤凰 Pic:绘架 Psc:双鱼 PsA:南鱼 Pup:船尾 Pyx:罗盘 Ret:网 Sge:天箭 Sgr:人马 Sco:天蝎 Scl:玉夫 Sct:盾 Ser:巨蛇 Sex:六分仪 Tau:金牛 Tel:望远镜 Tri:三角 TrA:南三角 Tuc:杜鹃 UMa:大熊 UMi:小熊 Vel:船帆 Vir:室女 Vol:飞鱼 Vul:狐狸".split(" ").map((pair) => pair.split(":")),
);
const STAR_NAMES: Record<number, string> = {
  11767: "北极星", 32349: "天狼星", 30438: "老人星", 69673: "大角星", 91262: "织女星",
  24608: "五车二", 24436: "参宿七", 37279: "南河三", 27989: "参宿四", 7588: "水委一",
  68702: "马腹一", 97649: "牛郎星", 60718: "十字架二", 21421: "毕宿五", 65474: "角宿一",
  80763: "心宿二", 37826: "北河三", 102098: "天津四", 113368: "北落师门", 49669: "轩辕十四",
  36850: "北河二", 54061: "天枢", 53910: "天璇", 58001: "天玑", 59774: "天权",
  62956: "玉衡", 65378: "开阳", 67301: "摇光", 25336: "参宿五", 26311: "参宿二",
  26727: "参宿一", 25930: "参宿三", 25428: "五车五", 17702: "昴宿六",
};
export const DEG = Math.PI / 180;
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
export const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function horizontalVector(azimuth: number, altitude: number): Vector {
  const az = azimuth * DEG, alt = altitude * DEG;
  return [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
}
export function equatorialToHorizontal(vector: Vector, lst: number, latitude: number): Vector {
  const s = Math.sin(lst * DEG), c = Math.cos(lst * DEG);
  const p = latitude * DEG;
  const meridian = c * vector[0] + s * vector[1];
  return [-s * vector[0] + c * vector[1], -Math.sin(p) * meridian + Math.cos(p) * vector[2], Math.cos(p) * meridian + Math.sin(p) * vector[2]];
}
export function catalogVector(star: StarRow, matrix: number[], years: number): Vector {
  const dec = star[3] * DEG;
  // HYG proper motion is mu_alpha*cos(delta), mu_delta, in mas/year.
  const ra = (star[2] + star[7] * years / (3600000 * Math.max(0.000001, Math.cos(dec)))) * DEG;
  const d = dec + star[8] * years * DEG / 3600000;
  const v = [Math.cos(d) * Math.cos(ra), Math.cos(d) * Math.sin(ra), Math.sin(d)];
  return [0, 1, 2].map((row) => matrix[row * 3] * v[0] + matrix[row * 3 + 1] * v[1] + matrix[row * 3 + 2] * v[2]) as Vector;
}
export function projector(camera: CameraView, width: number, height: number) {
  const az = camera.azimuth * DEG, alt = camera.altitude * DEG;
  const forward = horizontalVector(camera.azimuth, camera.altitude);
  const right: Vector = [Math.cos(az), -Math.sin(az), 0];
  const up: Vector = [-Math.sin(az) * Math.sin(alt), -Math.cos(az) * Math.sin(alt), Math.cos(alt)];
  const focal = height / (2 * Math.tan(camera.fov * DEG / 2));
  return (v: Vector) => {
    const depth = dot(v, forward);
    if (depth < 0.04) return null;
    return { x: width / 2 + focal * dot(v, right) / depth, y: height / 2 - focal * dot(v, up) / depth, depth };
  };
}
export function starName(star: StarRow) { return STAR_NAMES[star[1]] || star[6] || (star[1] ? `HIP ${star[1]}` : `HYG ${star[0]}`); }
export function starColor(bv: number) { return bv < 0 ? "#b5d5ff" : bv < 0.4 ? "#d8e8ff" : bv < 0.85 ? "#fff1d6" : bv < 1.4 ? "#ffd6a4" : "#ffb68d"; }
export function beijingNow() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16); }
export function annualIndex(date: string) { return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / 86400000); }
export function headingName(az: number) { return ["北", "东北", "东", "东南", "南", "西南", "西", "西北"][Math.round(wrap(az) / 45) % 8]; }
