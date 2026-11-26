import { WORLD_COUNTRIES_CATALOG } from "./country-data";
import {
  buildFallbackCountryNewsPayload,
  buildGdeltCountryQuery,
  buildGdeltFeedUrl,
  parseGdeltDocResponse,
} from "./gdelt-data";
import type { CountryNewsPayload } from "./gdelt-types";
import { createObservatorySource, SourceUnavailableError } from "./observatory-source";

const GDELT_TIMEOUT_MS = 5500;
/** Cache SWR em memória de 30 minutos por país conforme especificação D38 (`RN13.8`). */
export const GDELT_LIVE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHED_COUNTRY_SOURCES = 200;

export function createCountryNewsSource(
  isoCode: string,
  fetchImpl: typeof fetch = fetch
) {
  const upperIso = isoCode.trim().toUpperCase();
  const entry = WORLD_COUNTRIES_CATALOG[upperIso];
  const countryName = entry?.nameCommon ?? upperIso;
  const query = buildGdeltCountryQuery(
    upperIso,
    countryName,
    entry?.iso2 ?? null,
    entry?.nameNaturalEarth ?? null
  );

  return createObservatorySource<CountryNewsPayload>({
    name: `gdelt-${upperIso.toLowerCase()}`,
    liveProvider: "GDELT 2.0 Doc API",
    liveTtlMs: GDELT_LIVE_TTL_MS,
    fallbackProvider: "GDELT 2.0 Doc API (indisponível no momento)",
    fallback: () => buildFallbackCountryNewsPayload(upperIso, countryName, query),
    fetchLive: async () => {
      const url = buildGdeltFeedUrl(query, 10);
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(GDELT_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new SourceUnavailableError(`GDELT 2.0 Doc API respondeu HTTP ${res.status}`);
      }

      const text = await res.text();
      if (!text.trim()) {
        return buildFallbackCountryNewsPayload(upperIso, countryName, query);
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new SourceUnavailableError("Resposta não-JSON retornada pela GDELT 2.0 Doc API");
      }

      try {
        return parseGdeltDocResponse(json, upperIso, countryName, query, 8);
      } catch (err) {
        throw new SourceUnavailableError(
          err instanceof Error ? err.message : "Envelope inválido da GDELT 2.0 Doc API"
        );
      }
    },
  });
}

const countryNewsSources = new Map<string, ReturnType<typeof createCountryNewsSource>>();

export function getCountryNewsSource(isoCode: string) {
  const key = isoCode.trim().toUpperCase();
  const existing = countryNewsSources.get(key);
  if (existing) {
    countryNewsSources.delete(key);
    countryNewsSources.set(key, existing);
    return existing;
  }

  if (countryNewsSources.size >= MAX_CACHED_COUNTRY_SOURCES) {
    const oldestKey = countryNewsSources.keys().next().value;
    if (oldestKey !== undefined) {
      countryNewsSources.get(oldestKey)?.reset();
      countryNewsSources.delete(oldestKey);
    }
  }

  const created = createCountryNewsSource(key);
  countryNewsSources.set(key, created);
  return created;
}

export function resetCountryNewsSources(): void {
  for (const src of countryNewsSources.values()) {
    src.reset();
  }
  countryNewsSources.clear();
}
