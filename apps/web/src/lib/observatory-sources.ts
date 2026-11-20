/**
 * Fontes de dados do Observatório (servidor). Cada fonte tenta o provedor externo e,
 * se falhar, devolve o último dado válido (stale) ou o dataset local rotulado como fallback.
 * As rotas em app/api/observatory/* apenas serializam o resultado.
 */
import {
  FALLBACK_AIRCRAFT_FLEET,
  FALLBACK_EONET_EVENTS,
  FALLBACK_FIRMS_HOTSPOTS,
  FALLBACK_MARITIME_ROUTES,
  calculateIssPosition,
  type AircraftState,
  type EonetEvent,
  type IssTelemetryData,
  type MaritimeRoute,
} from "./observatory-data";
import {
  LOCAL_DATASET_PROVIDER,
  SourceUnavailableError,
  createObservatorySource,
  type ObservatoryEnvelope,
} from "./observatory-source";
import { fetchOpenSkyFleet, resetOpenSky } from "./opensky";
import { AIRCRAFT_POLL_MS } from "./aircraft-config";
import { normalizeEonetEvents } from "./eonet-data";
import { parseFirmsCsv } from "./firms-csv";
import { createCountryLookup } from "./firms-country";
import {
  ISS_NORAD_ID,
  REFERENCE_ISS_TLE,
  mergeSatelliteGroups,
  parseTleText,
  tleEpochToIso,
  type SatelliteCategory,
  type SatelliteTle,
} from "./satellites";
import {
  buildFirmsPayload,
  type FirmsConfidenceFilter,
  type FirmsPayload,
  type FirmsWindowDays,
} from "./firms-aggregate";

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new SourceUnavailableError(`Provedor respondeu HTTP ${res.status}`);
  return res;
}

// ---------------------------------------------------------------------------
// NASA EONET — eventos naturais severos
// ---------------------------------------------------------------------------
export const eonetSource = createObservatorySource<EonetEvent[]>({
  name: "eonet",
  liveProvider: "NASA EONET v3",
  liveTtlMs: 15 * 60 * 1000,
  fallback: () => FALLBACK_EONET_EVENTS,
  fetchLive: async () => {
    const res = await fetchWithTimeout("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100", 3500);
    const events = normalizeEonetEvents(await res.json());
    if (!events.length) throw new SourceUnavailableError("Provedor não retornou eventos com coordenadas");
    return events;
  },
});

// ---------------------------------------------------------------------------
// NASA FIRMS — focos de calor (parse por nome de coluna em lib/firms-csv.ts)
// ---------------------------------------------------------------------------

/**
 * Satélites consultados em ordem; vale o primeiro que tiver focos. Satélites saem do ar
 * (o VIIRS S-NPP NRT parou de publicar em 2026-11-02 e a API passou a responder só o
 * cabeçalho), então a rota não pode depender de um só. NOAA-21/NOAA-20 (VIIRS 375 m)
 * vêm antes do MODIS (1 km). Não somamos satélites: o mesmo foco apareceria duplicado.
 * Disponibilidade atual: https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/<KEY>/ALL
 */
export const FIRMS_DATASETS = [
  { id: "VIIRS_NOAA21_NRT", label: "VIIRS NOAA-21" },
  { id: "VIIRS_NOAA20_NRT", label: "VIIRS NOAA-20" },
  { id: "VIIRS_SNPP_NRT", label: "VIIRS S-NPP" },
  { id: "MODIS_NRT", label: "MODIS Terra/Aqua" },
] as const;

let cachedCountryLookup: ((lat: number, lng: number) => string | null) | null = null;
/** Índice de países construído uma vez por processo (contagem de focos por país). */
function countryLookup() {
  return (cachedCountryLookup ??= createCountryLookup());
}

function createFirmsSource(days: FirmsWindowDays, confidence: FirmsConfidenceFilter) {
  return createObservatorySource<FirmsPayload>({
    name: `firms-${days}d-${confidence}`,
    liveProvider: "NASA FIRMS",
    liveTtlMs: 15 * 60 * 1000,
    fallback: () => buildFirmsPayload(FALLBACK_FIRMS_HOTSPOTS, days, confidence, { countryOf: countryLookup() }),
    fetchLive: async ({ setProvider }) => {
      const apiKey = process.env.NASA_FIRMS_MAP_KEY;
      if (!apiKey) throw new SourceUnavailableError("Chave NASA_FIRMS_MAP_KEY não configurada no servidor");

      for (const dataset of FIRMS_DATASETS) {
        const res = await fetchWithTimeout(
          `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${dataset.id}/world/${days}`,
          // 24 h ≈ 2,5 MB; 5 dias ≈ 16 MB (~190 mil linhas).
          days === 1 ? 8000 : 20000
        );
        const csv = await res.text();
        // Chave inválida ou limite excedido: a API responde 200 com uma mensagem em texto, não CSV.
        // Vale para todos os satélites, então não adianta tentar os demais.
        if (!/^\s*latitude,/i.test(csv)) {
          throw new SourceUnavailableError(
            `Resposta inesperada do FIRMS (verifique NASA_FIRMS_MAP_KEY): ${csv.trim().slice(0, 80)}`
          );
        }
        // Todas as linhas: a grade agrega a janela inteira; o corte de focos individuais vem depois.
        const parsed = parseFirmsCsv(csv, { limit: Number.POSITIVE_INFINITY });
        if (parsed.length > 0) {
          setProvider(`NASA FIRMS (${dataset.label} NRT)`);
          return buildFirmsPayload(parsed, days, confidence, { countryOf: countryLookup() });
        }
      }
      throw new SourceUnavailableError(
        `Nenhum satélite retornou focos ${days === 1 ? "nas últimas 24 h" : `nos últimos ${days} dias`} (consultados: ${FIRMS_DATASETS.map((d) => d.label).join(", ")})`
      );
    },
  });
}

const firmsSources = new Map<string, ReturnType<typeof createFirmsSource>>();

/** Fonte do FIRMS por janela (1/2/5 dias) e filtro de confiança; cada combinação tem cache próprio. */
export function getFirmsSource(days: FirmsWindowDays = 1, confidence: FirmsConfidenceFilter = "nominal") {
  const key = `${days}:${confidence}`;
  let source = firmsSources.get(key);
  if (!source) {
    source = createFirmsSource(days, confidence);
    firmsSources.set(key, source);
  }
  return source;
}

/** Fonte padrão (24 h, sem focos de baixa confiança). */
export const firmsSource = getFirmsSource(1, "nominal");

// ---------------------------------------------------------------------------
// Satélites — TLEs do CelesTrak (D04). A posição é propagada com SGP4 no cliente (lib/satellites.ts).
// Grupos: "stations" (ISS, Tiangong…) e "visual" (~150 objetos mais brilhantes).
// ---------------------------------------------------------------------------
const CELESTRAK_GROUPS: { group: string; category: SatelliteCategory }[] = [
  { group: "stations", category: "station" },
  { group: "visual", category: "visual" },
];

function referenceSatellites(): SatelliteTle[] {
  const epoch = tleEpochToIso(REFERENCE_ISS_TLE.line1) ?? new Date(0).toISOString();
  return [{ ...REFERENCE_ISS_TLE, noradId: ISS_NORAD_ID, category: "station", epoch }];
}

export const satellitesSource = createObservatorySource<SatelliteTle[]>({
  name: "satellites",
  liveProvider: "CelesTrak (TLE) + SGP4",
  // TLEs mudam poucas vezes por dia; o CelesTrak pede para não consultar a cada poucos minutos.
  liveTtlMs: 4 * 60 * 60 * 1000,
  fallbackProvider: "TellusPedia (TLE de referência da ISS, 2026-11-20 — impreciso)",
  fallback: referenceSatellites,
  fetchLive: async () => {
    const groups = await Promise.all(
      CELESTRAK_GROUPS.map(async ({ group, category }) => {
        const res = await fetchWithTimeout(
          `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
          10000
        );
        return parseTleText(await res.text(), category);
      })
    );
    const merged = mergeSatelliteGroups(...groups);
    if (!merged.some((s) => s.noradId === ISS_NORAD_ID)) {
      throw new SourceUnavailableError("CelesTrak não retornou o TLE da ISS");
    }
    return merged;
  },
});

// ---------------------------------------------------------------------------
// ISS — telemetria (wheretheiss.at); sem provedor, usa o modelo orbital aproximado local
// ---------------------------------------------------------------------------
export const issSource = createObservatorySource<IssTelemetryData>({
  name: "iss",
  liveProvider: "wheretheiss.at",
  liveTtlMs: 15 * 1000,
  fallbackTtlMs: 15 * 1000,
  fallbackProvider: "TellusPedia (modelo orbital aproximado)",
  fallback: () => calculateIssPosition(Date.now()),
  fetchLive: async () => {
    const now = Date.now();
    const res = await fetchWithTimeout("https://api.wheretheiss.at/v1/satellites/25544", 2000);
    const live = await res.json();
    if (
      typeof live?.latitude !== "number" ||
      typeof live?.longitude !== "number" ||
      typeof live?.altitude !== "number" ||
      typeof live?.velocity !== "number"
    ) {
      throw new SourceUnavailableError("Resposta do provedor sem posição válida");
    }
    return {
      ...calculateIssPosition(now),
      latitude: Number(live.latitude.toFixed(4)),
      longitude: Number(live.longitude.toFixed(4)),
      altitudeKm: Number(live.altitude.toFixed(1)),
      velocityKmh: Number(live.velocity.toFixed(0)),
      visibility: live.visibility === "daylight" ? "daylight" : "eclipsed",
      timestamp: live.timestamp ? live.timestamp * 1000 : now,
    };
  },
});

// ---------------------------------------------------------------------------
// Tráfego aéreo — amostra global autenticada do OpenSky
// ---------------------------------------------------------------------------
export const aircraftSource = createObservatorySource<AircraftState[]>({
  name: "traffic/aircraft",
  liveProvider: "OpenSky Network",
  liveTtlMs: AIRCRAFT_POLL_MS,
  fallback: () => FALLBACK_AIRCRAFT_FLEET,
  fetchLive: fetchOpenSkyFleet,
});

// ---------------------------------------------------------------------------
// Rotas marítimas — referência estática (não há feed AIS; ver tarefa D08)
// ---------------------------------------------------------------------------
export function maritimeRoutesEnvelope(now: number = Date.now()): ObservatoryEnvelope<MaritimeRoute[]> {
  return {
    data: FALLBACK_MARITIME_ROUTES,
    meta: {
      source: "fallback",
      provider: LOCAL_DATASET_PROVIDER,
      fetchedAt: new Date(now).toISOString(),
      stale: false,
      reason: "Rotas de referência estáticas: ainda não há feed AIS de embarcações",
    },
  };
}

export interface TrafficPayload {
  aircraft: ObservatoryEnvelope<AircraftState[]>;
  maritimeRoutes: ObservatoryEnvelope<MaritimeRoute[]>;
}

export function resetObservatorySources() {
  eonetSource.reset();
  for (const source of firmsSources.values()) source.reset();
  issSource.reset();
  satellitesSource.reset();
  aircraftSource.reset();
  resetOpenSky();
}
