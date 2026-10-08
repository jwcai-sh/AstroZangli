export interface EarthStar {
  left: number;
  top: number;
  opacity: number;
  sizeClass: "star--sm" | "star--md" | "star--lg";
  toneClass: "star--cold" | "star--neutral" | "star--warm";
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildEarthStarfield(count = 180): EarthStar[] {
  return Array.from({ length: count }, (_, index) => {
    const sizeClass = index % 11 === 0 ? "star--lg" : index % 3 === 0 ? "star--md" : "star--sm";
    const toneClass = index % 7 === 0 ? "star--warm" : index % 5 === 0 ? "star--cold" : "star--neutral";

    return {
      left: roundPercent((8.19 + index * 37.31) % 100),
      top: roundPercent((20.27 + index * 53.47) % 100),
      opacity: roundPercent(0.65 + ((index * 13 + 17) % 31) / 100),
      sizeClass,
      toneClass,
    };
  });
}
