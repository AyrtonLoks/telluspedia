import {
  buildFallbackAirQualityStations,
  buildOpenMeteoPointAqiUrl,
  buildOpenMeteoStationsBatchUrl,
  parseOpenMeteoSingleAqi,
  parseOpenMeteoStationsBatch,
} from "./air-quality-data";
import type { AirQualityReading, AirQualityStationsPayload } from "./air-quality-types";
import { createObservatorySource, SourceUnavailableError } from "./observatory-source";

const AQI_TIMEOUT_MS = 5500;
export const AQI_LIVE_TTL_MS = 15 * 60 * 1000;
const MAX_POINT_AQI_CACHE = 256;

export function createAirQualityStationsSource(fetchImpl: typeof fetch = fetch) {
  return createObservatorySource<AirQualityStationsPayload>({
    name: "air-quality",
    liveProvider: "Open-Meteo Air Quality API (CAMS)",
    liveTtlMs: AQI_LIVE_TTL_MS,
    fallbackProvider: "TellusPedia (referência climatológica CAMS / OMS)",
    fallback: () => buildFallbackAirQualityStations(),
    fetchLive: async () => {
      const url = buildOpenMeteoStationsBatchUrl();
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(AQI_TIMEOUT_MS) });
      if (!res.ok) {
        throw new SourceUnavailableError(`Open-Meteo Air Quality respondeu HTTP ${res.status}`);
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new SourceUnavailableError("JSON inválido retornado pela Open-Meteo Air Quality API");
      }
      try {
        return parseOpenMeteoStationsBatch(json);
      } catch (err) {
        throw new SourceUnavailableError(
          err instanceof Error ? err.message : "Lote inválido da Open-Meteo Air Quality API"
        );
      }
    },
  });
}

export function createAirQualityPointSource(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch
) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  return createObservatorySource<AirQualityReading | null>({
    name: `air-quality-point-${key}`,
    liveProvider: "Open-Meteo Air Quality API (CAMS)",
    liveTtlMs: AQI_LIVE_TTL_MS,
    // T03 / D40: para coordenadas arbitrárias de país, degradar para null quando offline (nunca inventar leitura local).
    fallbackProvider: "Open-Meteo Air Quality API (indisponível)",
    fallback: () => null,
    fetchLive: async () => {
      const url = buildOpenMeteoPointAqiUrl(lat, lng);
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(AQI_TIMEOUT_MS) });
      if (!res.ok) {
        throw new SourceUnavailableError(`Open-Meteo Air Quality respondeu HTTP ${res.status}`);
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new SourceUnavailableError("JSON inválido na consulta pontual de AQI");
      }
      try {
        return parseOpenMeteoSingleAqi(json);
      } catch (err) {
        throw new SourceUnavailableError(
          err instanceof Error ? err.message : "Sem leitura pontual de AQI disponível"
        );
      }
    },
  });
}

let stationsSource: ReturnType<typeof createAirQualityStationsSource> | null = null;
const pointSources = new Map<string, ReturnType<typeof createAirQualityPointSource>>();

export function getAirQualityStationsSource() {
  return (stationsSource ??= createAirQualityStationsSource());
}

export function getAirQualityPointSource(lat: number, lng: number) {
  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));
  const key = `${roundedLat}:${roundedLng}`;

  const existing = pointSources.get(key);
  if (existing) {
    pointSources.delete(key);
    pointSources.set(key, existing);
    return existing;
  }

  if (pointSources.size >= MAX_POINT_AQI_CACHE) {
    const oldest = pointSources.keys().next().value;
    if (oldest !== undefined) {
      pointSources.get(oldest)?.reset();
      pointSources.delete(oldest);
    }
  }

  const created = createAirQualityPointSource(roundedLat, roundedLng);
  pointSources.set(key, created);
  return created;
}

export function resetAirQualitySources(): void {
  stationsSource?.reset();
  stationsSource = null;
  for (const src of pointSources.values()) src.reset();
  pointSources.clear();
}
