/**
 * Amostra AIS de demonstração (fallback quando o servidor não responde): fora de `ais-data.ts`
 * para não entrar no carregamento inicial (T35).
 */
import { AIS_REGIONS, emptyAisCounts, type AisRegionId, type AisSnapshot, type AisVessel } from "./ais-data";

const DEMO_POSITIONS: Record<AisRegionId, [number, number, number][]> = {
  "route-malacca": [[5.66, 98.22, 120], [4.3, 99.64, 125], [3.43, 100.31, 306], [2.59, 101.28, 115], [1.18, 103.63, 68]],
  "route-suez": [[31.49, 32.32, 15], [31.06, 32.34, 170], [30.31, 32.41, 340], [29.82, 32.55, 165], [29.42, 32.68, 160]],
  "route-english-channel": [[49.09, -4.97, 49], [49.72, -3.23, 67], [50.05, -1.65, 79], [50.36, -0.68, 248], [50.81, 0.92, 65]],
  "route-santos": [[-24.08, -46.25, 146], [-24.32, -46.07, 151], [-24.5, -45.87, 329], [-24.7, -45.74, 152], [-23.99, -46.3, 60]],
  "route-panama": [[9.44, -79.94, 156], [9.25, -79.91, 198], [8.87, -79.56, 168], [8.5, -79.33, 145], [8.27, -79.33, 136]],
  "route-cape-good-hope": [[-34.43, 18.23, 170], [-34.61, 18.24, 262], [-34.88, 18.59, 161], [-35.13, 19.38, 87], [-35.18, 20.61, 84]],
};

const DEMO_KINDS = ["cargo", "tanker", "container", "passenger", "fishing"] as const;

export function simulatedAisSnapshot(): AisSnapshot {
  const corridorCounts = emptyAisCounts();
  const vessels = AIS_REGIONS.flatMap(({ id, name }) => {
    corridorCounts[id] = DEMO_POSITIONS[id].length;
    return DEMO_POSITIONS[id].map(([lat, lng, courseDeg], index): AisVessel => ({
      id: `demo-${id}-${index}`,
      mmsi: null,
      region: id,
      name: `Embarcação de demonstração ${index + 1}`,
      kind: DEMO_KINDS[index],
      destination: name,
      lat,
      lng,
      courseDeg,
      headingDeg: courseDeg,
      speedKnots: [12, 0.4, 17, 20, null][index],
      observedAt: 0,
    }));
  });
  return { vessels, corridorCounts };
}
