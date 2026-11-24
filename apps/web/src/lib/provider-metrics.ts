/**
 * Telemetria leve em memória dos provedores T05 e externos (T47).
 *
 * Mantém último estado (`live` | `stale` | `fallback` | `computed` | `idle`), timestamp de
 * último sucesso, latência média/última e taxa de acerto de cache por provedor sem disparar
 * I/O externo durante consultas em `GET /api/health?detail=1`.
 */

import { redactSensitiveText } from "./server-logger";

export type ProviderTelemetryMode = "live" | "stale" | "fallback" | "computed" | "idle";

export interface ProviderObservation {
  /** Identificador do provedor (ex.: "eonet", "firms-1d-nominal", "traffic/aircraft", "gibs", "weather"). */
  id: string;
  /** Nome legível do provedor efetivamente entregue. */
  provider: string;
  /** Estado T05 observado nesta resposta. */
  mode: Exclude<ProviderTelemetryMode, "idle">;
  /** Se a resposta veio de cache em memória. */
  cacheHit: boolean;
  /** Latência medida em ms (apenas em cache miss / chamada upstream). */
  durationMs?: number;
  /** Timestamp da observação em ms (Date.now()). */
  timestampMs?: number;
  /** Motivo de falha quando `mode` é `stale` ou `fallback`. */
  reason?: string;
}

export interface ProviderMetricSnapshot {
  id: string;
  provider: string;
  mode: ProviderTelemetryMode;
  lastUpdatedAt: string | null;
  lastSuccessAt: string | null;
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number | null;
  requests: number;
  failures: number;
  lastError: string | null;
}

export interface ProviderMetricsSummary {
  totalProviders: number;
  activeProviders: number;
  countsByMode: Record<ProviderTelemetryMode, number>;
  items: ProviderMetricSnapshot[];
}

interface ProviderMetricState {
  id: string;
  provider: string;
  mode: ProviderTelemetryMode;
  lastUpdatedMs: number | null;
  lastSuccessMs: number | null;
  lastLatencyMs: number | null;
  totalLatencyMs: number;
  latencySamples: number;
  cacheHits: number;
  cacheMisses: number;
  requests: number;
  failures: number;
  lastError: string | null;
}

const MAX_TRACKED_PROVIDERS = 32;

const KNOWN_PROVIDER_DEFAULTS: ReadonlyArray<{ id: string; provider: string }> = [
  { id: "ais", provider: "AIS Stream" },
  { id: "currents", provider: "Open-Meteo Marine (Copernicus / NOAA)" },
  { id: "eonet", provider: "NASA EONET v3" },
  { id: "firms", provider: "NASA FIRMS" },
  { id: "gibs", provider: "NASA GIBS" },
  { id: "iss", provider: "wheretheiss.at" },
  { id: "satellites", provider: "CelesTrak (TLE) + SGP4" },
  { id: "traffic", provider: "OpenSky Network" },
  { id: "weather", provider: "Open-Meteo / Data Pipeline" },
  { id: "winds", provider: "NOAA GFS (Open-Meteo)" },
];

const GLOBAL_STORE_KEY = "__telluspediaProviderMetrics__";

function getRegistry(): Map<string, ProviderMetricState> {
  const g = globalThis as Record<string, unknown>;
  let map = g[GLOBAL_STORE_KEY] as Map<string, ProviderMetricState> | undefined;
  if (!map) {
    map = new Map<string, ProviderMetricState>();
    g[GLOBAL_STORE_KEY] = map;
  }
  return map;
}

/**
 * Normaliza chaves dinâmicas de fontes (ex.: `firms-1d-nominal` → `firms`,
 * `traffic/aircraft` → `traffic`) para manter cardinalidade fixa em memória.
 */
export function normalizeProviderKey(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return "unknown";
  if (cleaned.startsWith("firms")) return "firms";
  if (cleaned.startsWith("traffic")) return "traffic";
  if (cleaned.startsWith("gibs")) return "gibs";
  return cleaned.replace(/[^a-z0-9._-]+/g, "-").slice(0, 48) || "unknown";
}

function createInitialState(id: string, provider: string): ProviderMetricState {
  return {
    id,
    provider,
    mode: "idle",
    lastUpdatedMs: null,
    lastSuccessMs: null,
    lastLatencyMs: null,
    totalLatencyMs: 0,
    latencySamples: 0,
    cacheHits: 0,
    cacheMisses: 0,
    requests: 0,
    failures: 0,
    lastError: null,
  };
}

function toSnapshot(state: ProviderMetricState): ProviderMetricSnapshot {
  const totalCacheOps = state.cacheHits + state.cacheMisses;
  return {
    id: state.id,
    provider: state.provider,
    mode: state.mode,
    lastUpdatedAt: state.lastUpdatedMs !== null ? new Date(state.lastUpdatedMs).toISOString() : null,
    lastSuccessAt: state.lastSuccessMs !== null ? new Date(state.lastSuccessMs).toISOString() : null,
    lastLatencyMs: state.lastLatencyMs,
    avgLatencyMs:
      state.latencySamples > 0 ? Math.round(state.totalLatencyMs / state.latencySamples) : null,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
    cacheHitRate: totalCacheOps > 0 ? Number((state.cacheHits / totalCacheOps).toFixed(4)) : null,
    requests: state.requests,
    failures: state.failures,
    lastError: state.lastError,
  };
}

export function recordProviderObservation(observation: ProviderObservation): ProviderMetricSnapshot {
  const registry = getRegistry();
  const key = normalizeProviderKey(observation.id);
  const nowMs = observation.timestampMs ?? Date.now();
  let state = registry.get(key);

  if (!state) {
    if (registry.size >= MAX_TRACKED_PROVIDERS) {
      const oldestKey = registry.keys().next().value;
      if (oldestKey) registry.delete(oldestKey);
    }
    state = createInitialState(key, observation.provider);
    registry.set(key, state);
  }

  state.provider = redactSensitiveText(observation.provider);
  state.mode = observation.mode;
  state.lastUpdatedMs = nowMs;
  state.requests += 1;

  if (observation.cacheHit) {
    state.cacheHits += 1;
  } else {
    state.cacheMisses += 1;
    if (typeof observation.durationMs === "number" && Number.isFinite(observation.durationMs)) {
      const latency = Math.max(0, Math.round(observation.durationMs));
      state.lastLatencyMs = latency;
      state.totalLatencyMs += latency;
      state.latencySamples += 1;
    }
  }

  if (observation.mode === "live" || observation.mode === "computed") {
    if (!observation.cacheHit || state.lastSuccessMs === null) {
      state.lastSuccessMs = nowMs;
    }
    state.lastError = null;
  } else {
    if (!observation.cacheHit) {
      state.failures += 1;
    }
    state.lastError = observation.reason ? redactSensitiveText(observation.reason) : state.lastError;
  }

  return toSnapshot(state);
}

export function getProviderMetricsSummary(): ProviderMetricsSummary {
  const registry = getRegistry();
  const merged = new Map<string, ProviderMetricSnapshot>();

  for (const known of KNOWN_PROVIDER_DEFAULTS) {
    const existing = registry.get(known.id);
    merged.set(known.id, toSnapshot(existing ?? createInitialState(known.id, known.provider)));
  }

  for (const [key, state] of registry.entries()) {
    if (!merged.has(key)) {
      merged.set(key, toSnapshot(state));
    }
  }

  const items = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
  const countsByMode: Record<ProviderTelemetryMode, number> = {
    live: 0,
    stale: 0,
    fallback: 0,
    computed: 0,
    idle: 0,
  };

  let activeProviders = 0;
  for (const item of items) {
    countsByMode[item.mode] += 1;
    if (item.requests > 0) activeProviders += 1;
  }

  return {
    totalProviders: items.length,
    activeProviders,
    countsByMode,
    items,
  };
}

export function resetProviderMetrics(): void {
  getRegistry().clear();
}

export const providerMetrics = {
  record: recordProviderObservation,
  snapshot: getProviderMetricsSummary,
  reset: resetProviderMetrics,
};
