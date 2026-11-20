export const AIS_POLL_MS = 20_000;
export const AIS_POSITION_TTL_MS = 5 * 60_000;
export const AIS_MAX_VESSELS = 600;

export const AIS_REGIONS = [
  { id: "route-malacca", name: "Estreito de Malaca", south: 0.8, west: 97.5, north: 6.5, east: 105.0 },
  { id: "route-suez", name: "Canal de Suez", south: 28.7, west: 31.5, north: 31.8, east: 33.8 },
  { id: "route-english-channel", name: "Canal da Mancha", south: 48.1, west: -6.4, north: 51.4, east: 2.8 },
] as const;

export type AisRegionId = (typeof AIS_REGIONS)[number]["id"];
export type VesselKind = "cargo" | "tanker" | "container" | "passenger" | "fishing" | "other" | "unknown";

export const VESSEL_LABEL: Record<VesselKind, string> = {
  cargo: "Cargueiro",
  tanker: "Navio-tanque",
  container: "Porta-contêineres",
  passenger: "Navio de passageiros",
  fishing: "Embarcação pesqueira",
  other: "Outra embarcação",
  unknown: "Tipo não informado",
};

export interface VesselPosition {
  lat: number;
  lng: number;
  speedKnots: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  observedAt: number;
}

export interface AisVessel extends VesselPosition {
  id: string;
  mmsi: string | null;
  region: AisRegionId;
  name?: string;
  kind: VesselKind;
  destination?: string;
  flag?: string;
}

export interface AisSnapshot {
  vessels: AisVessel[];
  corridorCounts: Record<AisRegionId, number>;
}

export function aisRegion(lat: number, lng: number) {
  return AIS_REGIONS.find(({ south, west, north, east }) =>
    lat >= south && lat <= north && lng >= west && lng <= east
  );
}

export function emptyAisCounts(): AisSnapshot["corridorCounts"] {
  return { "route-malacca": 0, "route-suez": 0, "route-english-channel": 0 };
}

const DEMO_POSITIONS: Record<AisRegionId, [number, number, number][]> = {
  "route-malacca": [[5.66, 98.22, 120], [4.3, 99.64, 125], [3.43, 100.31, 306], [2.59, 101.28, 115], [1.18, 103.63, 68]],
  "route-suez": [[31.49, 32.32, 15], [31.06, 32.34, 170], [30.31, 32.41, 340], [29.82, 32.55, 165], [29.42, 32.68, 160]],
  "route-english-channel": [[49.09, -4.97, 49], [49.72, -3.23, 67], [50.05, -1.65, 79], [50.36, -0.68, 248], [50.81, 0.92, 65]],
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
      speedKnots: [12, 10, 17, 20, 6][index],
      observedAt: 0,
    }));
  });
  return { vessels, corridorCounts };
}
