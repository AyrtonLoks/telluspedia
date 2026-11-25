/* Só servidor: integração GBIF Occurrence Search API v1 sob contrato T05 (D32 / RN13.7). */
import { createObservatorySource, SourceUnavailableError } from "./observatory-source";
import { getSpeciesById } from "./species-catalog";
import type {
  SpeciesCatalogEntry,
  SpeciesOccurrencePoint,
  SpeciesOccurrencesPayload,
} from "./species-types";

const GBIF_OCCURRENCE_API = "https://api.gbif.org/v1/occurrence/search";
const GBIF_TIMEOUT_MS = 9_000;
const GBIF_FETCH_LIMIT = 150;
const GBIF_MAX_POINTS = 100;
const GBIF_CACHE_TTL_MS = 30 * 60 * 1000;

interface GbifRawOccurrence {
  key?: unknown;
  decimalLatitude?: unknown;
  decimalLongitude?: unknown;
  year?: unknown;
  countryCode?: unknown;
  locality?: unknown;
  stateProvince?: unknown;
  basisOfRecord?: unknown;
}

interface GbifRawResponse {
  count?: unknown;
  results?: unknown;
}

export function buildGbifSearchUrl(taxonKey: number, countryIso2: string | null): string {
  const params = new URLSearchParams({
    taxon_key: String(taxonKey),
    has_coordinate: "true",
    has_geospatial_issue: "false",
  });
  if (countryIso2) params.set("country", countryIso2);
  return `https://www.gbif.org/occurrence/map?${params.toString()}`;
}

/**
 * Normaliza a resposta da API pública GBIF Occurrence Search v1, descartando coordenadas inválidas
 * e aplicando deduplicação espacial leve (~0,1°) para espalhar os registros visualmente no globo.
 */
export function parseGbifOccurrencesResponse(
  raw: unknown,
  species: SpeciesCatalogEntry,
  countryIso2: string | null = null
): SpeciesOccurrencesPayload {
  const gbifSearchUrl = buildGbifSearchUrl(species.gbifTaxonKey, countryIso2);
  if (!raw || typeof raw !== "object") {
    return {
      speciesId: species.id,
      taxonKey: species.gbifTaxonKey,
      scientificName: species.scientificName,
      totalGbifCount: 0,
      sampledCount: 0,
      countryFilter: countryIso2,
      points: [],
      gbifSearchUrl,
    };
  }

  const body = raw as GbifRawResponse;
  const rawCount = typeof body.count === "number" && Number.isFinite(body.count) ? Math.max(0, Math.round(body.count)) : 0;
  const results = Array.isArray(body.results) ? (body.results as GbifRawOccurrence[]) : [];

  const seenCells = new Set<string>();
  const points: SpeciesOccurrencePoint[] = [];

  for (let i = 0; i < results.length && points.length < GBIF_MAX_POINTS; i++) {
    const rec = results[i];
    const lat = typeof rec?.decimalLatitude === "number" ? rec.decimalLatitude : Number(rec?.decimalLatitude);
    const lng = typeof rec?.decimalLongitude === "number" ? rec.decimalLongitude : Number(rec?.decimalLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      continue;
    }

    // Deduplicação em célula de 0,15° para evitar pilhas de dezenas de pontos idênticos no mesmo parque
    const cellKey = `${Math.round(lat * 6.5)}:${Math.round(lng * 6.5)}`;
    if (seenCells.has(cellKey)) continue;
    seenCells.add(cellKey);

    const keyNum = typeof rec.key === "number" || typeof rec.key === "string" ? String(rec.key) : `${species.id}-${i}`;
    const yearRaw = typeof rec.year === "number" && Number.isInteger(rec.year) && rec.year >= 1700 && rec.year <= 2100 ? rec.year : null;
    const countryCode =
      typeof rec.countryCode === "string" && /^[A-Z]{2}$/.test(rec.countryCode)
        ? rec.countryCode
        : null;
    const localityRaw =
      (typeof rec.locality === "string" && rec.locality.trim()) ||
      (typeof rec.stateProvince === "string" && rec.stateProvince.trim()) ||
      null;
    const locality = localityRaw ? localityRaw.slice(0, 96) : null;
    const basisOfRecord =
      typeof rec.basisOfRecord === "string" && rec.basisOfRecord.trim()
        ? rec.basisOfRecord.trim().slice(0, 40)
        : "HUMAN_OBSERVATION";

    points.push({
      id: keyNum,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      year: yearRaw,
      countryCode,
      locality,
      basisOfRecord,
      gbifUrl: /^\d+$/.test(keyNum)
        ? `https://www.gbif.org/occurrence/${keyNum}`
        : species.gbifUrl,
    });
  }

  return {
    speciesId: species.id,
    taxonKey: species.gbifTaxonKey,
    scientificName: species.scientificName,
    totalGbifCount: rawCount || points.length,
    sampledCount: points.length,
    countryFilter: countryIso2,
    points,
    gbifSearchUrl,
  };
}

export async function fetchGbifOccurrencesLive(
  species: SpeciesCatalogEntry,
  countryIso2: string | null = null,
  fetchImpl: typeof fetch = fetch
): Promise<SpeciesOccurrencesPayload> {
  const params = new URLSearchParams({
    taxonKey: String(species.gbifTaxonKey),
    hasCoordinate: "true",
    hasGeospatialIssue: "false",
    limit: String(GBIF_FETCH_LIMIT),
  });
  if (countryIso2) {
    params.set("country", countryIso2);
  }

  try {
    const res = await fetchImpl(`${GBIF_OCCURRENCE_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(GBIF_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new SourceUnavailableError(`GBIF Occurrence API respondeu HTTP ${res.status}`);
    }
    const json: unknown = await res.json();
    return parseGbifOccurrencesResponse(json, species, countryIso2);
  } catch (err) {
    if (err instanceof SourceUnavailableError) throw err;
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new SourceUnavailableError("Tempo limite excedido ao consultar a GBIF Occurrence API");
    }
    throw new SourceUnavailableError("Falha de rede ao consultar a GBIF Occurrence API");
  }
}

export function createGbifSpeciesSource(
  species: SpeciesCatalogEntry,
  countryIso2: string | null = null,
  fetchImpl: typeof fetch = fetch
) {
  const cacheSuffix = countryIso2 ? `${species.id}:${countryIso2}` : species.id;
  return createObservatorySource<SpeciesOccurrencesPayload>({
    name: `species:${cacheSuffix}`,
    liveProvider: "GBIF Occurrence API v1 (CC0 / CC BY 4.0)",
    liveTtlMs: GBIF_CACHE_TTL_MS,
    fetchLive: () => fetchGbifOccurrencesLive(species, countryIso2, fetchImpl),
    // T03: fallback honesto sem pontos fabricados quando o GBIF está inacessível.
    fallback: () => ({
      speciesId: species.id,
      taxonKey: species.gbifTaxonKey,
      scientificName: species.scientificName,
      totalGbifCount: 0,
      sampledCount: 0,
      countryFilter: countryIso2,
      points: [],
      gbifSearchUrl: buildGbifSearchUrl(species.gbifTaxonKey, countryIso2),
    }),
    fallbackProvider: "GBIF temporariamente indisponível (exibindo apenas catálogo curado IUCN)",
  });
}

const sourcePool = new Map<string, ReturnType<typeof createGbifSpeciesSource>>();

export async function getSpeciesOccurrencesEnvelope(
  speciesId: string,
  countryIso2: string | null = null
) {
  const species = getSpeciesById(speciesId);
  if (!species) return null;
  const normalizedCountry =
    countryIso2 && /^[A-Z]{2}$/.test(countryIso2.toUpperCase())
      ? countryIso2.toUpperCase()
      : null;
  const poolKey = `${species.id}:${normalizedCountry ?? "ALL"}`;
  let source = sourcePool.get(poolKey);
  if (!source) {
    source = createGbifSpeciesSource(species, normalizedCountry);
    sourcePool.set(poolKey, source);
  }
  return source.get();
}
