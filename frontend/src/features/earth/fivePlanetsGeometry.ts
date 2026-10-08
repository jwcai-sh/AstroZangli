// Display geometry for traditional planetary positions. Each planet has its
// own fifth-place radix; all points are projected onto the 27-mansion ring.
export const FIVE_PLANETS = [
  { name: "火曜", color: "#f97373", unit: 229 },
  { name: "木曜", color: "#d6a5ff", unit: 361 },
  { name: "土曜", color: "#f4c871", unit: 5383 },
  { name: "水曜", color: "#74d7ee", unit: 8797 },
  { name: "金曜", color: "#a2dfa7", unit: 749 },
] as const;

export type PlanetSection = {
  name: string;
  columns: Array<{ label: string; values: Array<number | null> }>;
};

export type PlanetPosition = {
  name: typeof FIVE_PLANETS[number]["name"];
  color: string;
  values: number[];
  mansion: number;
  mansionIndex: number;
  angle: number;
};

export function buildFivePlanetPositions(sections: PlanetSection[]): PlanetPosition[] {
  const finalSection = sections.find(section => section.name === "疾行定数");
  if (!finalSection) return [];
  return FIVE_PLANETS.flatMap(planet => {
    const values = finalSection.columns.find(column => column.label === planet.name)?.values;
    if (!values || values.length !== 6 || values.some(value => value === null || !Number.isFinite(value))) return [];
    const parts = values as number[];
    const [mansion, arc, minute, breath, subunit, tiny] = parts;
    const full = mansion + arc / 60 + minute / 3600 + breath / 21600
      + subunit / (21600 * planet.unit)
      + tiny / (21600 * planet.unit * 149209);
    const wrapped = ((full % 27) + 27) % 27;
    return [{ name: planet.name, color: planet.color, values: parts, mansion: wrapped,
      mansionIndex: Math.floor(wrapped), angle: wrapped * 360 / 27 }];
  });
}
