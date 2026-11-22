import {
  createObservatorySource,
  SourceUnavailableError,
} from "./observatory-source";
import {
  buildClimatologyCurrentsGrid,
  buildOpenMeteoMarineUrl,
  parseOpenMeteoMarineResponse,
} from "./currents-data";
import type { OceanCurrentGrid } from "./winds-types";

export const CURRENTS_LIVE_TTL_MS = 60 * 60 * 1000; // 60 min (correntes oceânicas variam em escala sinótica/diária)
export const CURRENTS_FETCH_TIMEOUT_MS = 9_000;

export function createCurrentsSource(fetcher: typeof fetch = fetch) {
  return createObservatorySource<OceanCurrentGrid>({
    name: "currents",
    liveProvider: "Open-Meteo Marine (Copernicus / NOAA)",
    liveTtlMs: CURRENTS_LIVE_TTL_MS,
    fallbackProvider: "TellusPedia (giros oceânicos de referência)",
    fallbackSource: "fallback",
    fetchLive: async () => {
      const url = buildOpenMeteoMarineUrl();
      let response: Response;
      try {
        response = await fetcher(url, {
          signal: AbortSignal.timeout(CURRENTS_FETCH_TIMEOUT_MS),
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
          throw new SourceUnavailableError("Tempo limite excedido ao consultar Open-Meteo Marine");
        }
        throw new SourceUnavailableError("Falha de rede ao consultar Open-Meteo Marine");
      }

      if (!response.ok) {
        throw new SourceUnavailableError(`Open-Meteo Marine respondeu HTTP ${response.status}`);
      }

      const raw: unknown = await response.json();
      const parsed = parseOpenMeteoMarineResponse(raw, new Date().toISOString());
      if (!parsed) {
        throw new SourceUnavailableError("Grade oceânica Open-Meteo Marine incompleta ou inválida");
      }
      return parsed;
    },
    fallback: () => buildClimatologyCurrentsGrid(),
  });
}

export const currentsSource = createCurrentsSource();
