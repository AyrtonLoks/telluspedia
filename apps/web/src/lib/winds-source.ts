import {
  createObservatorySource,
  SourceUnavailableError,
} from "./observatory-source";
import {
  buildClimatologyWindField,
  buildOpenMeteoGfsUrl,
  parseOpenMeteoGfsResponse,
} from "./winds-data";
import type { WindFieldPayload } from "./winds-types";

export const WINDS_LIVE_TTL_MS = 30 * 60 * 1000; // 30 min (rodadas NOAA GFS a cada 6 h / previsão horária)
export const WINDS_FETCH_TIMEOUT_MS = 9_000;

export function createWindsSource(fetcher: typeof fetch = fetch) {
  return createObservatorySource<WindFieldPayload>({
    name: "winds",
    liveProvider: "NOAA GFS (Open-Meteo)",
    liveTtlMs: WINDS_LIVE_TTL_MS,
    fallbackProvider: "TellusPedia (climatologia de referência)",
    fallbackSource: "fallback",
    fetchLive: async () => {
      const url = buildOpenMeteoGfsUrl();
      let response: Response;
      try {
        response = await fetcher(url, {
          signal: AbortSignal.timeout(WINDS_FETCH_TIMEOUT_MS),
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
          throw new SourceUnavailableError("Tempo limite excedido ao consultar NOAA GFS");
        }
        throw new SourceUnavailableError("Falha de rede ao consultar NOAA GFS");
      }

      if (!response.ok) {
        throw new SourceUnavailableError(`NOAA GFS respondeu HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();
      const parsed = parseOpenMeteoGfsResponse(raw, new Date().toISOString());
      if (!parsed) {
        throw new SourceUnavailableError("Grade vetorial NOAA GFS incompleta ou inválida");
      }
      return parsed;
    },
    fallback: () => buildClimatologyWindField(),
  });
}

export const windsSource = createWindsSource();
