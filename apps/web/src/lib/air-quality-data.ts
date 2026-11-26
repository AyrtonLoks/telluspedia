import {
  classifyEuropeanAqiBand,
  classifyUsAqiBand,
  type AirQualityReading,
  type AirQualityStation,
  type AirQualityStationsPayload,
  type AqiHealthBand,
} from "./air-quality-types";

export const OPEN_METEO_AIR_QUALITY_ENDPOINT =
  "https://air-quality-api.open-meteo.com/v1/air-quality";

export const OPEN_METEO_AQI_DOCS_URL = "https://open-meteo.com/en/docs/air-quality-api";

export const AQI_BAND_COLORS_HEX: Readonly<Record<AqiHealthBand, string>> = {
  good: "#22c55e",
  moderate: "#eab308",
  sensitive: "#f97316",
  unhealthy: "#ef4444",
  very_unhealthy: "#a855f7",
  hazardous: "#be123c",
};

export interface CapitalAqiSeed {
  id: string;
  cityPt: string;
  cityEn: string;
  countryIso: string;
  lat: number;
  lng: number;
  refPm25: number;
  refUsAqi: number;
  refEuAqi: number;
}

/**
 * Rede global de 28 capitais e megacidades representativas em todos os continentes habitados
 * consultadas em lote único na Open-Meteo Air Quality API (CAMS Global).
 */
export const GLOBAL_AQI_CAPITALS: readonly CapitalAqiSeed[] = [
  { id: "aqi-bra-bsb", cityPt: "Brasília", cityEn: "Brasilia", countryIso: "BRA", lat: -15.79, lng: -47.88, refPm25: 8.4, refUsAqi: 35, refEuAqi: 18 },
  { id: "aqi-bra-sao", cityPt: "São Paulo", cityEn: "Sao Paulo", countryIso: "BRA", lat: -23.55, lng: -46.63, refPm25: 15.2, refUsAqi: 58, refEuAqi: 32 },
  { id: "aqi-arg-bue", cityPt: "Buenos Aires", cityEn: "Buenos Aires", countryIso: "ARG", lat: -34.6, lng: -58.38, refPm25: 9.8, refUsAqi: 41, refEuAqi: 21 },
  { id: "aqi-chl-scl", cityPt: "Santiago", cityEn: "Santiago", countryIso: "CHL", lat: -33.45, lng: -70.67, refPm25: 22.5, refUsAqi: 73, refEuAqi: 44 },
  { id: "aqi-col-bog", cityPt: "Bogotá", cityEn: "Bogota", countryIso: "COL", lat: 4.71, lng: -74.07, refPm25: 14.6, refUsAqi: 56, refEuAqi: 30 },
  { id: "aqi-mex-mex", cityPt: "Cidade do México", cityEn: "Mexico City", countryIso: "MEX", lat: 19.43, lng: -99.13, refPm25: 21.8, refUsAqi: 71, refEuAqi: 43 },
  { id: "aqi-usa-nyc", cityPt: "Nova York", cityEn: "New York", countryIso: "USA", lat: 40.71, lng: -74.01, refPm25: 9.1, refUsAqi: 38, refEuAqi: 19 },
  { id: "aqi-usa-lax", cityPt: "Los Angeles", cityEn: "Los Angeles", countryIso: "USA", lat: 34.05, lng: -118.24, refPm25: 13.8, refUsAqi: 54, refEuAqi: 29 },
  { id: "aqi-can-tor", cityPt: "Toronto", cityEn: "Toronto", countryIso: "CAN", lat: 43.65, lng: -79.38, refPm25: 7.2, refUsAqi: 30, refEuAqi: 16 },
  { id: "aqi-prt-lis", cityPt: "Lisboa", cityEn: "Lisbon", countryIso: "PRT", lat: 38.72, lng: -9.14, refPm25: 7.9, refUsAqi: 33, refEuAqi: 17 },
  { id: "aqi-gbr-lon", cityPt: "Londres", cityEn: "London", countryIso: "GBR", lat: 51.51, lng: -0.13, refPm25: 9.5, refUsAqi: 40, refEuAqi: 20 },
  { id: "aqi-fra-par", cityPt: "Paris", cityEn: "Paris", countryIso: "FRA", lat: 48.86, lng: 2.35, refPm25: 10.4, refUsAqi: 43, refEuAqi: 22 },
  { id: "aqi-deu-ber", cityPt: "Berlim", cityEn: "Berlin", countryIso: "DEU", lat: 52.52, lng: 13.4, refPm25: 10.1, refUsAqi: 42, refEuAqi: 21 },
  { id: "aqi-ita-rom", cityPt: "Roma", cityEn: "Rome", countryIso: "ITA", lat: 41.9, lng: 12.5, refPm25: 12.7, refUsAqi: 52, refEuAqi: 27 },
  { id: "aqi-tur-ist", cityPt: "Istambul", cityEn: "Istanbul", countryIso: "TUR", lat: 41.01, lng: 28.98, refPm25: 18.4, refUsAqi: 64, refEuAqi: 37 },
  { id: "aqi-egy-cai", cityPt: "Cairo", cityEn: "Cairo", countryIso: "EGY", lat: 30.04, lng: 31.24, refPm25: 38.6, refUsAqi: 109, refEuAqi: 64 },
  { id: "aqi-nga-los", cityPt: "Lagos", cityEn: "Lagos", countryIso: "NGA", lat: 6.52, lng: 3.38, refPm25: 31.2, refUsAqi: 91, refEuAqi: 55 },
  { id: "aqi-ken-nbo", cityPt: "Nairóbi", cityEn: "Nairobi", countryIso: "KEN", lat: -1.29, lng: 36.82, refPm25: 14.0, refUsAqi: 55, refEuAqi: 29 },
  { id: "aqi-zaf-jnb", cityPt: "Joanesburgo", cityEn: "Johannesburg", countryIso: "ZAF", lat: -26.2, lng: 28.05, refPm25: 19.5, refUsAqi: 67, refEuAqi: 39 },
  { id: "aqi-sau-ruh", cityPt: "Riade", cityEn: "Riyadh", countryIso: "SAU", lat: 24.71, lng: 46.68, refPm25: 36.0, refUsAqi: 102, refEuAqi: 61 },
  { id: "aqi-ind-del", cityPt: "Nova Délhi", cityEn: "New Delhi", countryIso: "IND", lat: 28.61, lng: 77.21, refPm25: 68.4, refUsAqi: 158, refEuAqi: 86 },
  { id: "aqi-ind-bom", cityPt: "Mumbai", cityEn: "Mumbai", countryIso: "IND", lat: 19.08, lng: 72.88, refPm25: 34.2, refUsAqi: 98, refEuAqi: 58 },
  { id: "aqi-chn-pek", cityPt: "Pequim", cityEn: "Beijing", countryIso: "CHN", lat: 39.9, lng: 116.41, refPm25: 33.5, refUsAqi: 96, refEuAqi: 57 },
  { id: "aqi-kor-sel", cityPt: "Seul", cityEn: "Seoul", countryIso: "KOR", lat: 37.57, lng: 126.98, refPm25: 20.4, refUsAqi: 68, refEuAqi: 41 },
  { id: "aqi-jpn-tyo", cityPt: "Tóquio", cityEn: "Tokyo", countryIso: "JPN", lat: 35.68, lng: 139.65, refPm25: 10.6, refUsAqi: 44, refEuAqi: 22 },
  { id: "aqi-sgp-sin", cityPt: "Singapura", cityEn: "Singapore", countryIso: "SGP", lat: 1.35, lng: 103.82, refPm25: 13.1, refUsAqi: 53, refEuAqi: 28 },
  { id: "aqi-idn-jkt", cityPt: "Jacarta", cityEn: "Jakarta", countryIso: "IDN", lat: -6.21, lng: 106.85, refPm25: 37.4, refUsAqi: 106, refEuAqi: 62 },
  { id: "aqi-aus-syd", cityPt: "Sydney", cityEn: "Sydney", countryIso: "AUS", lat: -33.87, lng: 151.21, refPm25: 6.5, refUsAqi: 27, refEuAqi: 14 },
];

const AQI_CURRENT_FIELDS =
  "pm2_5,pm10,us_aqi,european_aqi,nitrogen_dioxide,ozone";

function finiteNum(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? Number(raw.toFixed(1)) : null;
}

export function buildOpenMeteoPointAqiUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: AQI_CURRENT_FIELDS,
    timeformat: "unixtime",
  });
  return `${OPEN_METEO_AIR_QUALITY_ENDPOINT}?${params.toString()}`;
}

export function buildOpenMeteoStationsBatchUrl(): string {
  const params = new URLSearchParams({
    latitude: GLOBAL_AQI_CAPITALS.map((s) => s.lat.toFixed(2)).join(","),
    longitude: GLOBAL_AQI_CAPITALS.map((s) => s.lng.toFixed(2)).join(","),
    current: AQI_CURRENT_FIELDS,
    timeformat: "unixtime",
  });
  return `${OPEN_METEO_AIR_QUALITY_ENDPOINT}?${params.toString()}`;
}

export function parseOpenMeteoSingleAqi(raw: unknown): AirQualityReading {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Envelope inválido da Open-Meteo Air Quality API");
  }
  const current = (raw as { current?: Record<string, unknown> }).current;
  if (!current || typeof current !== "object") {
    throw new Error("Bloco current ausente na Open-Meteo Air Quality API");
  }

  const pm25 = finiteNum(current.pm2_5);
  const pm10 = finiteNum(current.pm10);
  const usAqi = finiteNum(current.us_aqi);
  const europeanAqi = finiteNum(current.european_aqi);
  const nitrogenDioxide = finiteNum(current.nitrogen_dioxide);
  const ozone = finiteNum(current.ozone);

  if (pm25 === null && usAqi === null && europeanAqi === null) {
    throw new Error("Sem medições válidas de PM2.5/AQI retornadas pelo provedor");
  }

  const timeSec = typeof current.time === "number" && Number.isFinite(current.time)
    ? current.time
    : null;

  return {
    pm25,
    pm10,
    usAqi: usAqi !== null ? Math.round(usAqi) : null,
    europeanAqi: europeanAqi !== null ? Math.round(europeanAqi) : null,
    nitrogenDioxide,
    ozone,
    observedAt: timeSec !== null ? new Date(timeSec * 1000).toISOString() : null,
  };
}

export function parseOpenMeteoStationsBatch(raw: unknown): AirQualityStationsPayload {
  const list = Array.isArray(raw) ? raw : null;
  if (!list || list.length !== GLOBAL_AQI_CAPITALS.length) {
    throw new Error("Lote de estações incompatível na Open-Meteo Air Quality API");
  }

  const stations: AirQualityStation[] = [];
  for (let i = 0; i < GLOBAL_AQI_CAPITALS.length; i++) {
    const seed = GLOBAL_AQI_CAPITALS[i]!;
    const reading = parseOpenMeteoSingleAqi(list[i]);
    stations.push({
      id: seed.id,
      cityPt: seed.cityPt,
      cityEn: seed.cityEn,
      countryIso: seed.countryIso,
      lat: seed.lat,
      lng: seed.lng,
      ...reading,
      bandUs: classifyUsAqiBand(reading.usAqi),
      bandEu: classifyEuropeanAqiBand(reading.europeanAqi),
    });
  }

  const sortedByUs = [...stations].sort((a, b) => (b.usAqi ?? 0) - (a.usAqi ?? 0));
  return {
    stations,
    totalCount: stations.length,
    worstUsAqiStationId: sortedByUs[0]?.id ?? null,
  };
}

export function buildFallbackAirQualityStations(): AirQualityStationsPayload {
  const nowIso = new Date().toISOString();
  const stations: AirQualityStation[] = GLOBAL_AQI_CAPITALS.map((seed) => ({
    id: seed.id,
    cityPt: seed.cityPt,
    cityEn: seed.cityEn,
    countryIso: seed.countryIso,
    lat: seed.lat,
    lng: seed.lng,
    pm25: seed.refPm25,
    pm10: Number((seed.refPm25 * 1.65).toFixed(1)),
    usAqi: seed.refUsAqi,
    europeanAqi: seed.refEuAqi,
    nitrogenDioxide: null,
    ozone: null,
    observedAt: nowIso,
    bandUs: classifyUsAqiBand(seed.refUsAqi),
    bandEu: classifyEuropeanAqiBand(seed.refEuAqi),
  }));

  const sortedByUs = [...stations].sort((a, b) => (b.usAqi ?? 0) - (a.usAqi ?? 0));
  return {
    stations,
    totalCount: stations.length,
    worstUsAqiStationId: sortedByUs[0]?.id ?? null,
  };
}
