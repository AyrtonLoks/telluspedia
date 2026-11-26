import {
  createObservatorySource,
  SourceUnavailableError,
} from "./observatory-source";
import {
  buildFallbackSeismicPayload,
  buildUsgsFeedUrl,
  parseUsgsGeoJson,
} from "./seismic-data";
import {
  DEFAULT_SEISMIC_MIN_MAGNITUDE,
  DEFAULT_SEISMIC_WINDOW,
  type SeismicMinMagnitude,
  type SeismicPayload,
  type SeismicWindow,
} from "./seismic-types";

const USGS_TIMEOUT_MS = 6500;
const USGS_LIVE_TTL_MS = 5 * 60 * 1000;

export function createSeismicSource(
  window: SeismicWindow,
  minMagnitude: SeismicMinMagnitude,
  fetchImpl: typeof fetch = fetch
) {
  return createObservatorySource<SeismicPayload>({
    name: `earthquakes-${window}-m${minMagnitude}`,
    liveProvider: "USGS Earthquake Hazards Program (GeoJSON)",
    liveTtlMs: USGS_LIVE_TTL_MS,
    fallbackProvider: "TellusPedia (referência sísmica PB2002 / USGS)",
    fallback: () => buildFallbackSeismicPayload(window, minMagnitude),
    fetchLive: async () => {
      const url = buildUsgsFeedUrl(window, minMagnitude);
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(USGS_TIMEOUT_MS) });
      if (!res.ok) {
        throw new SourceUnavailableError(`USGS GeoJSON respondeu HTTP ${res.status}`);
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new SourceUnavailableError("Resposta JSON inválida do feed USGS");
      }
      try {
        return parseUsgsGeoJson(json, window, minMagnitude);
      } catch (err) {
        throw new SourceUnavailableError(
          err instanceof Error ? err.message : "Envelope GeoJSON inválido da USGS"
        );
      }
    },
  });
}

const seismicSources = new Map<string, ReturnType<typeof createSeismicSource>>();

export function getSeismicSource(
  window: SeismicWindow = DEFAULT_SEISMIC_WINDOW,
  minMagnitude: SeismicMinMagnitude = DEFAULT_SEISMIC_MIN_MAGNITUDE
) {
  const key = `${window}:${minMagnitude}`;
  let source = seismicSources.get(key);
  if (!source) {
    source = createSeismicSource(window, minMagnitude);
    seismicSources.set(key, source);
  }
  return source;
}

export function resetSeismicSources(): void {
  for (const src of seismicSources.values()) src.reset();
  seismicSources.clear();
}
