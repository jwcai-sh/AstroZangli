import { buildEarthStarfield } from "@/features/earth/starfield";

const STARS = buildEarthStarfield();

export default function EarthStarfield() {
  return (
    <div className="fixed inset-0 starfield-bg pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 opacity-80">
        {STARS.map((star, index) => (
          <div
            key={index}
            className={`absolute rounded-full star ${star.sizeClass} ${star.toneClass}`}
            style={{ left: `${star.left}%`, top: `${star.top}%`, opacity: star.opacity }}
          />
        ))}
      </div>
    </div>
  );
}
