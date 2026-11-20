export const AIS_POLL_MS = 20_000;
export const AIS_POSITION_TTL_MS = 5 * 60_000;
export const AIS_MAX_VESSELS = 600;

export const AIS_REGIONS = [
  { id: "route-malacca", name: "Estreito de Malaca", south: 0.8, west: 97.5, north: 6.5, east: 105.0 },
  { id: "route-suez", name: "Canal de Suez", south: 28.7, west: 31.5, north: 31.8, east: 33.8 },
  { id: "route-english-channel", name: "Canal da Mancha", south: 48.1, west: -6.4, north: 51.4, east: 2.8 },
  { id: "route-santos", name: "Santos", south: -25.0, west: -47.0, north: -23.6, east: -45.2 },
  { id: "route-panama", name: "Canal do Panamá", south: 7.8, west: -80.4, north: 9.8, east: -78.8 },
  { id: "route-cape-good-hope", name: "Cabo da Boa Esperança", south: -35.8, west: 16.8, north: -33.2, east: 21.0 },
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
  return Object.fromEntries(AIS_REGIONS.map(({ id }) => [id, 0])) as AisSnapshot["corridorCounts"];
}

export const AIS_MOVING_MIN_KNOTS = 1;

export function vesselIsMoving(vessel: Pick<VesselPosition, "speedKnots">) {
  return vessel.speedKnots != null && vessel.speedKnots >= AIS_MOVING_MIN_KNOTS;
}

export function vesselSpeedLabel(speed: number | null) {
  return speed == null ? "Sem leitura de velocidade" : `${speed.toLocaleString("pt-BR")} ${speed === 1 ? "nó" : "nós"}`;
}

export interface VesselGroup {
  vessels: AisVessel[];
  lat: number;
  lng: number;
  title?: string;
}

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
