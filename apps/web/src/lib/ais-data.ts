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
