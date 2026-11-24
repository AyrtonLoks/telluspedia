import type { AisVessel, VesselGroup } from "./ais-data";
import type { ObservatoryMeta } from "./observatory-source";

/** Camadas que a busca ⌘K, a URL compartilhável e os estudos conhecem. */
export type ObservatoryLayerId =
  | "NASA_FIRMS"
  | "NASA_EONET"
  | "ISS_SATELLITES"
  | "FLIGHTS_OPENSKY"
  | "MARITIME_ROUTES";

/**
 * Todas as camadas do Observatório. A NASA GIBS (D25) ainda fica fora da busca, da URL e dos estudos
 * (arquivos de outros grupos): quando entrar neles, junte-a a `ObservatoryLayerId`.
 */
export type ObservatoryLayer =
  | ObservatoryLayerId
  | "NASA_GIBS"
  | "GLOBAL_WINDS"
  | "MARINE_DEBRIS"
  | "INPE_DEFORESTATION";

export interface FirmsHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number; // Kelvin (ex: 320 - 450)
  frp: number; // Fire Radiative Power (MW)
  confidence: "low" | "nominal" | "high";
  satellite: "MODIS" | "VIIRS";
  acqDate: string;
  /** Hora da aquisição em UTC, formato HHMM (ex.: "0142"). */
  acqTime?: string;
  /** "D" = passagem diurna, "N" = noturna. */
  daynight?: "D" | "N";
}

export const EONET_CATEGORIES = {
  severeStorms: "Tempestades severas",
  volcanoes: "Vulcões",
  floods: "Enchentes",
  seaLakeIce: "Gelo em mares e lagos",
  drought: "Secas",
  wildfires: "Incêndios",
  dustHaze: "Poeira e névoa",
  earthquakes: "Terremotos",
  landslides: "Deslizamentos",
  manmade: "Eventos de origem humana",
  snow: "Neve",
  tempExtremes: "Temperaturas extremas",
  waterColor: "Alterações na cor da água",
  other: "Outros eventos",
} as const;

export type EonetCategory = keyof typeof EONET_CATEGORIES;
export type EonetCategoryFilter = EonetCategory | "all";

type EonetCoordinates = [lng: number, lat: number, ...extra: number[]];
export type EonetObservation = {
  date: string;
  magnitudeValue?: number;
  magnitudeUnit?: string;
  magnitudeDescription?: string;
} & (
  | { type: "Point"; coordinates: EonetCoordinates }
  | { type: "Polygon"; coordinates: EonetCoordinates[][] }
);

export function observationLocation(observation: EonetObservation) {
  if (observation.type === "Point") {
    const [lng, lat] = observation.coordinates;
    return { lng, lat };
  }
  const [exterior] = observation.coordinates;
  return sphericalCentroid(exterior.slice(0, -1));
}

/**
 * Centroide esférico de pontos (média dos vetores unitários), o mesmo que o `geoCentroid` do
 * d3-geo faz para um MultiPoint, sem levar o d3-geo ao carregamento inicial (T35).
 */
function sphericalCentroid(points: number[][]): { lng: number; lat: number } {
  let x = 0, y = 0, z = 0;
  for (const [lng, lat] of points) {
    const λ = (lng * Math.PI) / 180, φ = (lat * Math.PI) / 180;
    x += Math.cos(φ) * Math.cos(λ);
    y += Math.cos(φ) * Math.sin(λ);
    z += Math.sin(φ);
  }
  const deg = 180 / Math.PI;
  return { lng: Math.atan2(y, x) * deg, lat: Math.atan2(z, Math.hypot(x, y)) * deg };
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "UTC",
});

export function formatEonetDate(date: string) {
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) ? `${dateFormat.format(timestamp)} UTC` : "Data indisponível";
}

export interface EonetEvent {
  id: string;
  title: string;
  category: EonetCategory;
  lat: number;
  lng: number;
  date: string;
  magnitudeValue?: number;
  magnitudeUnit?: string;
  magnitudeDescription?: string;
  geometry?: EonetObservation[];
  sources: { id: string; url: string }[];
}

export interface IssTelemetryData {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: "daylight" | "eclipsed";
  timestamp: number;
  orbitInclinationDeg: number;
  groundTrack: { lat: number; lng: number }[];
  /** Época do TLE usado na propagação (ISO). */
  tleEpoch?: string;
}

/** Satélite (exceto a ISS) no instante do clique — posição por SGP4 (D04). */
export interface SatelliteSnapshot {
  name: string;
  noradId: number;
  category: "station" | "visual";
  lat: number;
  lng: number;
  altKm: number;
  velocityKmh: number;
  tleEpoch: string;
  timestamp: number;
}

export interface AircraftState {
  icao24: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lng: number;
  altitudeMeters: number;
  velocityMs: number;
  headingDeg: number;
  /** Horário da última posição recebida, em milissegundos UTC. */
  positionTimestamp?: number;
}

export interface MaritimeRoute {
  id: string;
  name: string;
  category: "CANAL" | "STRAIT" | "OCEAN_CORRIDOR";
  chokePoint?: string;
  coordinates: [number, number][]; // [lat, lng][]
  dailyTonnageTeuApprox?: number;
}

export type ObservatoryEntity =
  | { type: "FIRMS"; data: FirmsHotspot }
  | { type: "ISS"; data: IssTelemetryData }
  | { type: "SATELLITE"; data: SatelliteSnapshot }
  | { type: "EONET"; data: EonetEvent; observationIndex?: number }
  | { type: "EONET_CLUSTER"; data: { lat: number; lng: number; events: EonetEvent[] } }
  | { type: "AIRCRAFT"; data: AircraftState; estimatedPosition?: { lat: number; lng: number }; meta?: ObservatoryMeta }
  | { type: "MARITIME"; data: MaritimeRoute }
  | { type: "VESSEL"; data: AisVessel; meta: ObservatoryMeta; group?: VesselGroup }
  | { type: "VESSEL_GROUP"; data: VesselGroup; meta: ObservatoryMeta };


/**
 * Validação de anacronismo temporal (RN09, RN10, RN11).
 * Detecta se a data/era ativa na Linha do Tempo precede a era dos satélites (1957 com o Sputnik)
 * ou se é uma era geológica (Pangeia, Gondwana, etc.), exigindo a supressão de telemetria moderna.
 */
export function isContemporaryEpoch(
  year: number | null,
  geologicalMa: number | null
): boolean {
  if (geologicalMa !== null && geologicalMa !== undefined && geologicalMa > 0) {
    return false;
  }
  if (year !== null && year !== undefined && year < 1957) {
    return false;
  }
  return true;
}
