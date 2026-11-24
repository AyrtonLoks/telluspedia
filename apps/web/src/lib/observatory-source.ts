/**
 * Procedência dos dados do Observatório (T05 / RN02).
 *
 * Toda rota de /api/observatory/* responde com um envelope `{ data, meta }`, onde
 * `meta.source` diz de onde o dado veio de fato:
 *   - "live":     obtido agora (ou recentemente) do provedor externo;
 *   - "computed": calculado analiticamente no servidor (ex.: efemérides);
 *   - "fallback": dataset local de referência/simulado, usado quando o provedor
 *                 está indisponível ou não configurado. NUNCA deve ser exibido como "ao vivo".
 */

import { providerMetrics, type ProviderTelemetryMode } from "./provider-metrics";
import { serverLogger } from "./server-logger";

export type ObservatoryDataSource = "live" | "computed" | "fallback";

export interface ObservatoryMeta {
  source: ObservatoryDataSource;
  /** Provedor do dado efetivamente entregue (ex.: "NASA EONET v3" ou "TellusPedia (dataset local)"). */
  provider: string;
  /** Momento (ISO 8601) em que o dado foi obtido do provedor ou gerado. */
  fetchedAt: string;
  /** true quando é o último dado "live" válido, servido porque o provedor falhou agora. */
  stale: boolean;
  /** Motivo do fallback/stale, em português, para exibição em tooltip. */
  reason?: string;
}

export interface ObservatoryEnvelope<T> {
  data: T;
  meta: ObservatoryMeta;
}

/** Erro que indica que o provedor externo não pôde fornecer dados (motivo exibível). */
export class SourceUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SourceUnavailableError";
  }
}

export const FALLBACK_TTL_MS = 60 * 1000;
export const LAST_GOOD_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const LOCAL_DATASET_PROVIDER = "TellusPedia (dataset local)";

export interface LiveFetchContext {
  /** Sobrescreve o provedor exibido para esta leitura (ex.: qual satélite respondeu). */
  setProvider(provider: string): void;
}

export interface ObservatorySourceOptions<T> {
  /** Nome curto usado nos logs do servidor (ex.: "eonet"). */
  name: string;
  /** Provedor quando o dado é live (ex.: "NASA EONET v3"). */
  liveProvider: string;
  liveTtlMs: number;
  fallbackTtlMs?: number;
  lastGoodMaxAgeMs?: number;
  /** Busca no provedor externo. Deve lançar (de preferência SourceUnavailableError) se não houver dado utilizável. */
  fetchLive: (ctx: LiveFetchContext) => Promise<T>;
  /** Dados usados quando não há live nem último dado bom. */
  fallback: () => T;
  fallbackProvider?: string;
  /** Use "computed" quando o fallback for um cálculo analítico, e não um dataset estático. */
  fallbackSource?: Exclude<ObservatoryDataSource, "live">;
}

export interface ObservatorySourceResult<T> {
  envelope: ObservatoryEnvelope<T>;
  cacheHit: boolean;
  /** TTL (s) recomendado para o header Cache-Control desta resposta. */
  maxAgeSeconds: number;
}

interface CacheEntry<T> {
  envelope: ObservatoryEnvelope<T>;
  expiresAt: number;
}

function describeError(err: unknown): string {
  if (err instanceof SourceUnavailableError) return err.message;
  if (err instanceof Error && err.name === "AbortError") return "Tempo limite excedido ao contatar o provedor";
  if (err instanceof Error && err.name === "TimeoutError") return "Tempo limite excedido ao contatar o provedor";
  return "Provedor indisponível";
}

export function createObservatorySource<T>(opts: ObservatorySourceOptions<T>) {
  const fallbackTtlMs = opts.fallbackTtlMs ?? FALLBACK_TTL_MS;
  const lastGoodMaxAgeMs = opts.lastGoodMaxAgeMs ?? LAST_GOOD_MAX_AGE_MS;

  let cache: CacheEntry<T> | null = null;
  let lastGood: { data: T; fetchedAt: number; provider: string } | null = null;

  function resolveTelemetryMode(meta: ObservatoryMeta): Exclude<ProviderTelemetryMode, "idle"> {
    if (meta.stale) return "stale";
    return meta.source;
  }

  async function get(now: number = Date.now()): Promise<ObservatorySourceResult<T>> {
    if (cache && now < cache.expiresAt) {
      providerMetrics.record({
        id: opts.name,
        provider: cache.envelope.meta.provider,
        mode: resolveTelemetryMode(cache.envelope.meta),
        cacheHit: true,
        timestampMs: now,
        reason: cache.envelope.meta.reason,
      });
      return {
        envelope: cache.envelope,
        cacheHit: true,
        maxAgeSeconds: Math.max(1, Math.round((cache.expiresAt - now) / 1000)),
      };
    }

    let envelope: ObservatoryEnvelope<T>;
    let ttlMs: number;
    const startedAt = performance.now();

    try {
      let provider = opts.liveProvider;
      const data = await opts.fetchLive({ setProvider: (p) => (provider = p) });
      lastGood = { data, fetchedAt: now, provider };
      envelope = {
        data,
        meta: { source: "live", provider, fetchedAt: new Date(now).toISOString(), stale: false },
      };
      ttlMs = opts.liveTtlMs;
    } catch (err) {
      const reason = describeError(err);
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

      if (lastGood && now - lastGood.fetchedAt <= lastGoodMaxAgeMs) {
        envelope = {
          data: lastGood.data,
          meta: {
            source: "live",
            provider: lastGood.provider,
            fetchedAt: new Date(lastGood.fetchedAt).toISOString(),
            stale: true,
            reason: `${reason}. Exibindo a última leitura válida.`,
          },
        };
      } else {
        envelope = {
          data: opts.fallback(),
          meta: {
            source: opts.fallbackSource ?? "fallback",
            provider: opts.fallbackProvider ?? LOCAL_DATASET_PROVIDER,
            fetchedAt: new Date(now).toISOString(),
            stale: false,
            reason,
          },
        };
      }

      serverLogger.warn({
        route: `/api/observatory/${opts.name}`,
        provider: opts.liveProvider,
        mode: resolveTelemetryMode(envelope.meta),
        durationMs,
        cache: "miss",
        reason,
        message: "Provedor indisponível",
      });

      // Falhas não ficam cacheadas pelo TTL inteiro: tenta o provedor de novo logo.
      ttlMs = Math.min(fallbackTtlMs, opts.liveTtlMs);
    }

    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    providerMetrics.record({
      id: opts.name,
      provider: envelope.meta.provider,
      mode: resolveTelemetryMode(envelope.meta),
      cacheHit: false,
      durationMs,
      timestampMs: now,
      reason: envelope.meta.reason,
    });

    cache = { envelope, expiresAt: now + ttlMs };
    return { envelope, cacheHit: false, maxAgeSeconds: Math.max(1, Math.round(ttlMs / 1000)) };
  }

  function reset() {
    cache = null;
    lastGood = null;
  }

  return { get, reset };
}

/** Headers HTTP padronizados para as rotas do Observatório. */
export function observatoryHeaders(result: Pick<ObservatorySourceResult<unknown>, "cacheHit" | "maxAgeSeconds">) {
  const maxAge = result.maxAgeSeconds;
  return {
    "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    "X-Cache": result.cacheHit ? "HIT" : "MISS",
  };
}

/** Meta usada no cliente antes de a rota responder (dados locais iniciais do store). */
export function initialLocalMeta(): ObservatoryMeta {
  return {
    source: "fallback",
    provider: LOCAL_DATASET_PROVIDER,
    fetchedAt: new Date(0).toISOString(),
    stale: false,
    reason: "Dados ainda não carregados do servidor",
  };
}

export function isObservatoryEnvelope(value: unknown): value is ObservatoryEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const meta = (value as { meta?: unknown }).meta as Partial<ObservatoryMeta> | undefined;
  return (
    "data" in (value as object) &&
    !!meta &&
    (meta.source === "live" || meta.source === "computed" || meta.source === "fallback") &&
    typeof meta.provider === "string" &&
    typeof meta.fetchedAt === "string"
  );
}
