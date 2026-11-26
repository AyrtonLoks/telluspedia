import type { ObservatoryEnvelope } from "./observatory-source";

export type AqiScaleMode = "us_aqi" | "european_aqi";

export const AQI_SCALE_MODES: readonly AqiScaleMode[] = ["us_aqi", "european_aqi"] as const;
export const DEFAULT_AQI_SCALE_MODE: AqiScaleMode = "us_aqi";

export function isAqiScaleMode(v: string | null | undefined): v is AqiScaleMode {
  if (!v) return false;
  return (AQI_SCALE_MODES as readonly string[]).includes(v);
}

export type AqiHealthBand =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export interface AirQualityReading {
  pm25: number | null;
  pm10: number | null;
  usAqi: number | null;
  europeanAqi: number | null;
  nitrogenDioxide: number | null;
  ozone: number | null;
  observedAt: string | null;
}

export interface AirQualityStation extends AirQualityReading {
  id: string;
  cityPt: string;
  cityEn: string;
  countryIso: string;
  lat: number;
  lng: number;
  bandUs: AqiHealthBand;
  bandEu: AqiHealthBand;
}

export interface AirQualityStationsPayload {
  stations: AirQualityStation[];
  totalCount: number;
  worstUsAqiStationId: string | null;
}

export type AirQualityStationsEnvelope = ObservatoryEnvelope<AirQualityStationsPayload>;
export type AirQualityPointEnvelope = ObservatoryEnvelope<AirQualityReading | null>;

export function classifyUsAqiBand(usAqi: number | null | undefined): AqiHealthBand {
  const v = typeof usAqi === "number" && Number.isFinite(usAqi) ? usAqi : 0;
  if (v <= 50) return "good";
  if (v <= 100) return "moderate";
  if (v <= 150) return "sensitive";
  if (v <= 200) return "unhealthy";
  if (v <= 300) return "very_unhealthy";
  return "hazardous";
}

export function classifyEuropeanAqiBand(euAqi: number | null | undefined): AqiHealthBand {
  const v = typeof euAqi === "number" && Number.isFinite(euAqi) ? euAqi : 0;
  if (v <= 20) return "good";
  if (v <= 40) return "moderate";
  if (v <= 60) return "sensitive";
  if (v <= 80) return "unhealthy";
  if (v <= 100) return "very_unhealthy";
  return "hazardous";
}
