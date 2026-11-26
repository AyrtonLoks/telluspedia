export const SEISMIC_WINDOWS = ["24h", "7d", "30d"] as const;
export type SeismicWindow = (typeof SEISMIC_WINDOWS)[number];

export const SEISMIC_MIN_MAGNITUDES = ["2.5", "4.5", "6.0"] as const;
export type SeismicMinMagnitude = (typeof SEISMIC_MIN_MAGNITUDES)[number];

export type SeismicDepthBand = "shallow" | "intermediate" | "deep";

export const DEFAULT_SEISMIC_WINDOW: SeismicWindow = "24h";
export const DEFAULT_SEISMIC_MIN_MAGNITUDE: SeismicMinMagnitude = "4.5";
export const DEFAULT_SHOW_TECTONIC_PLATES = true;

export interface SeismicEvent {
  id: string;
  place: string;
  magnitude: number;
  magType: string;
  depthKm: number;
  depthBand: SeismicDepthBand;
  lat: number;
  lng: number;
  timestamp: number;
  tsunamiAlert: boolean;
  significance: number;
  usgsUrl: string;
}

export interface SeismicPayload {
  window: SeismicWindow;
  minMagnitude: SeismicMinMagnitude;
  totalCount: number;
  maxMagnitude: number | null;
  tsunamiCount: number;
  events: SeismicEvent[];
}

export type PlateBoundaryType = "convergent" | "divergent" | "transform";

export interface PlateBoundaryFeatureProperties {
  id: string;
  name: string;
  nameEn: string;
  boundaryType: PlateBoundaryType;
  plates: string;
}

export interface TectonicPlatesCollection {
  type: "FeatureCollection";
  metadata: {
    source: string;
    citation: string;
    url: string;
  };
  features: Array<{
    type: "Feature";
    properties: PlateBoundaryFeatureProperties;
    geometry: {
      type: "LineString";
      coordinates: Array<[number, number]>;
    };
  }>;
}

export function isSeismicWindow(value: unknown): value is SeismicWindow {
  return value === "24h" || value === "7d" || value === "30d";
}

export function isSeismicMinMagnitude(value: unknown): value is SeismicMinMagnitude {
  return value === "2.5" || value === "4.5" || value === "6.0";
}

export function classifySeismicDepth(depthKm: number): SeismicDepthBand {
  if (depthKm < 70) return "shallow";
  if (depthKm <= 300) return "intermediate";
  return "deep";
}

export function encodeSeismicView(
  window: SeismicWindow,
  minMag: SeismicMinMagnitude,
  showPlates: boolean
): string {
  return `${window},${minMag},${showPlates ? "1" : "0"}`;
}

export function readSeismicView(raw: string | null): {
  window: SeismicWindow;
  minMagnitude: SeismicMinMagnitude;
  showPlates: boolean;
} | null {
  if (!raw) return null;
  const [w, m, p] = raw.split(",");
  if (!isSeismicWindow(w) || !isSeismicMinMagnitude(m)) return null;
  return {
    window: w,
    minMagnitude: m,
    showPlates: p !== "0",
  };
}
