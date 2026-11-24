/* Só servidor: fontes T05 de dados oficiais do INPE (BDQueimadas & TerraBrasilis DETER/PRODES). */
import { createObservatorySource, SourceUnavailableError } from "./observatory-source";
import {
  INPE_BDQUEIMADAS_PORTAL_URL,
  buildTerraBrasilisPayload,
  createEmptyBiomeSummaries,
  parseInpeBdQueimadasCsv,
  parseTerraBrasilisDeterGeoJson,
} from "./inpe-data";
import type {
  DeterAlertPoint,
  InpeBdQueimadasPayload,
  ProdesBiomeId,
  TerraBrasilisPayload,
} from "./inpe-types";

const INPE_CSV_BASE = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario";
const INPE_WFS_BASE = "https://terrabrasilis.dpi.inpe.br/geoserver";
const BDQUEIMADAS_TIMEOUT_MS = 10_000;
const TERRABRASILIS_TIMEOUT_MS = 8_000;
const DETER_WINDOW_DAYS = 30;
const DETER_MAX_FEATURES = 200;

function formatYmdCompact(date: Date): { compact: string; iso: string } {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return { compact: `${y}${m}${d}`, iso: `${y}-${m}-${d}` };
}

/**
 * Tenta baixar o CSV diário oficial do INPE BDQueimadas (hoje ou ontem em UTC; América do Sul
 * com fallback para o recorte Brasil).
 */
export async function fetchInpeBdQueimadasLive(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date()
): Promise<InpeBdQueimadasPayload> {
  const today = formatYmdCompact(now);
  const yesterday = formatYmdCompact(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const candidates: Array<{ url: string; scope: "America_Sul" | "Brasil"; iso: string }> = [
    { url: `${INPE_CSV_BASE}/America_Sul/focos_diario_${today.compact}.csv`, scope: "America_Sul", iso: today.iso },
    { url: `${INPE_CSV_BASE}/Brasil/focos_diario_br_${today.compact}.csv`, scope: "Brasil", iso: today.iso },
    { url: `${INPE_CSV_BASE}/America_Sul/focos_diario_${yesterday.compact}.csv`, scope: "America_Sul", iso: yesterday.iso },
    { url: `${INPE_CSV_BASE}/Brasil/focos_diario_br_${yesterday.compact}.csv`, scope: "Brasil", iso: yesterday.iso },
  ];

  let lastReason = "Servidor INPE BDQueimadas indisponível";

  for (const candidate of candidates) {
    try {
      const res = await fetchImpl(candidate.url, {
        signal: AbortSignal.timeout(BDQUEIMADAS_TIMEOUT_MS),
        headers: { Accept: "text/csv,text/plain,*/*" },
      });
      if (!res.ok) {
        lastReason = `INPE BDQueimadas respondeu HTTP ${res.status}`;
        continue;
      }
      const csv = await res.text();
      const parsed = parseInpeBdQueimadasCsv(csv, {
        referenceDate: candidate.iso,
        scope: candidate.scope,
        sourceUrl: INPE_BDQUEIMADAS_PORTAL_URL,
      });
      if (parsed.total > 0) {
        return parsed;
      }
      lastReason = "CSV diário do INPE BDQueimadas ainda sem focos publicados para a data";
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        lastReason = "Tempo limite excedido ao consultar o INPE BDQueimadas";
      } else {
        lastReason = "Falha de rede ao consultar o INPE BDQueimadas";
      }
    }
  }

  throw new SourceUnavailableError(lastReason);
}

/**
 * Consulta alertas recentes (últimos 30 dias) via WFS GeoServer do INPE TerraBrasilis DETER
 * para Amazônia Legal e Cerrado.
 */
export async function fetchTerraBrasilisDeterLive(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date()
): Promise<TerraBrasilisPayload> {
  const since = formatYmdCompact(new Date(now.getTime() - DETER_WINDOW_DAYS * 24 * 60 * 60 * 1000)).iso;
  const targets: Array<{ biome: ProdesBiomeId; url: string }> = [
    {
      biome: "amazonia",
      url:
        `${INPE_WFS_BASE}/deter-amz/wfs?service=WFS&version=1.1.0&request=GetFeature` +
        `&typeName=deter-amz:deter_amz&maxFeatures=${DETER_MAX_FEATURES}` +
        `&CQL_FILTER=${encodeURIComponent(`view_date>='${since}'`)}&outputFormat=application/json`,
    },
    {
      biome: "cerrado",
      url:
        `${INPE_WFS_BASE}/deter-cerrado-nb/wfs?service=WFS&version=1.1.0&request=GetFeature` +
        `&typeName=deter-cerrado-nb:deter_cerrado&maxFeatures=${DETER_MAX_FEATURES}` +
        `&CQL_FILTER=${encodeURIComponent(`view_date>='${since}'`)}&outputFormat=application/json`,
    },
  ];

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const res = await fetchImpl(target.url, {
        signal: AbortSignal.timeout(TERRABRASILIS_TIMEOUT_MS),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      return parseTerraBrasilisDeterGeoJson(json, target.biome);
    })
  );

  const alerts: DeterAlertPoint[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") alerts.push(...r.value);
  }

  if (alerts.length === 0) {
    throw new SourceUnavailableError(
      "WFS do INPE TerraBrasilis DETER indisponível ou sem alertas retornados na janela; exibindo série oficial PRODES (2015–2025)"
    );
  }

  return buildTerraBrasilisPayload(alerts, DETER_WINDOW_DAYS);
}

export function createInpeBdQueimadasSource(fetchImpl: typeof fetch = fetch) {
  return createObservatorySource<InpeBdQueimadasPayload>({
    name: "inpe-fires",
    liveProvider: "INPE BDQueimadas (Programa Queimadas)",
    liveTtlMs: 15 * 60 * 1000,
    fetchLive: () => fetchInpeBdQueimadasLive(fetchImpl),
    // T03: fallback honesto sem focos fabricados quando o servidor INPE oscila.
    fallback: () => ({
      hotspots: [],
      total: 0,
      referenceDate: formatYmdCompact(new Date()).iso,
      byBiome: createEmptyBiomeSummaries(),
      satellites: [],
      scope: "America_Sul",
      sourceUrl: INPE_BDQUEIMADAS_PORTAL_URL,
    }),
    fallbackProvider: "INPE BDQueimadas (temporariamente indisponível)",
  });
}

export function createInpeTerraBrasilisSource(fetchImpl: typeof fetch = fetch) {
  return createObservatorySource<TerraBrasilisPayload>({
    name: "inpe-deforestation",
    liveProvider: "INPE TerraBrasilis (DETER + PRODES)",
    liveTtlMs: 60 * 60 * 1000,
    fetchLive: () => fetchTerraBrasilisDeterLive(fetchImpl),
    // T03: quando o WFS DETER oscila, entrega apenas a série anual oficial PRODES (2015–2025) sem alertas fabricados.
    fallback: () => buildTerraBrasilisPayload([], DETER_WINDOW_DAYS),
    fallbackProvider: "INPE / MCTI · PRODES Oficial (2015–2025 · DETER WFS indisponível)",
  });
}

export const inpeBdQueimadasSource = createInpeBdQueimadasSource();
export const inpeTerraBrasilisSource = createInpeTerraBrasilisSource();
