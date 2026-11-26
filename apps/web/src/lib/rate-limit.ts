import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { incrementRedisFixedWindow } from "@/lib/redis-client";
import { serverLogger } from "@/lib/server-logger";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_CLIENTS = 4096;
const REDIS_TTL_BUFFER_MS = 5_000;
const REDIS_FAILURE_COOLDOWN_MS = 30_000;

export type RateLimitOverflowStrategy = "evict" | "reject";

export interface RateLimitBucketConfig {
  /** Identificador lógico do bucket (usado em logs e estado interno). */
  name: string;
  /** Máximo de requisições permitidas por cliente em uma janela fixa. */
  limit: number;
  /** Duração da janela fixa em milissegundos. */
  windowMs: number;
  /** Prefixo da chave no Redis (`<prefix>:<client>:<window>`). */
  redisPrefix: string;
  /** Teto rígido de chaves simultâneas no fallback em memória. */
  maxClients: number;
  /** Estratégia ao atingir `maxClients`: `"evict"` (LRU) ou `"reject"` (fail-closed). */
  overflowStrategy: RateLimitOverflowStrategy;
}

export interface RateLimitOptions {
  redisUrl?: string;
  timeoutMs?: number;
  bypassCooldown?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Timestamp Unix (em segundos) do fim da janela atual. */
  resetAt: number;
  /** Segundos até a próxima janela (0 quando permitido; >= 1 quando bloqueado). */
  retryAfter: number;
  /** Backend efetivamente consultado nesta decisão. */
  store: "redis" | "memory";
}

function observatoryReadBucket(route: string): RateLimitBucketConfig {
  return {
    name: `observatory:${route}`,
    limit: 120,
    windowMs: DEFAULT_WINDOW_MS,
    redisPrefix: `telluspedia:ratelimit:observatory:${route}`,
    maxClients: DEFAULT_MAX_CLIENTS,
    overflowStrategy: "evict",
  };
}

/**
 * Perfis de rate-limit unificados (T43):
 * - Escrita de estudos (`studies`): cota estrita e fail-closed (10 req/min).
 * - Proxy binário NASA GIBS (`observatory:gibs-image`) e clima (`weather`): 60 req/min.
 * - Leituras JSON cacheadas do Observatório: 120 req/min isoladas por camada.
 * - Efemérides analíticas locais (`observatory:cosmos`): 600 req/min para suportar scrub contínuo.
 */
export const RATE_LIMIT_BUCKETS = {
  studies: {
    name: "studies",
    limit: 10,
    windowMs: DEFAULT_WINDOW_MS,
    redisPrefix: "telluspedia:ratelimit:studies",
    maxClients: DEFAULT_MAX_CLIENTS,
    overflowStrategy: "reject",
  },
  weather: {
    name: "weather",
    limit: 60,
    windowMs: DEFAULT_WINDOW_MS,
    redisPrefix: "telluspedia:ratelimit:weather",
    maxClients: DEFAULT_MAX_CLIENTS,
    overflowStrategy: "evict",
  },
  "observatory:firms": observatoryReadBucket("firms"),
  "observatory:eonet": observatoryReadBucket("eonet"),
  "observatory:gibs": observatoryReadBucket("gibs"),
  "observatory:gibs-image": {
    name: "observatory:gibs-image",
    limit: 60,
    windowMs: DEFAULT_WINDOW_MS,
    redisPrefix: "telluspedia:ratelimit:observatory:gibs-image",
    maxClients: DEFAULT_MAX_CLIENTS,
    overflowStrategy: "evict",
  },
  "observatory:iss": observatoryReadBucket("iss"),
  "observatory:satellites": observatoryReadBucket("satellites"),
  "observatory:traffic": observatoryReadBucket("traffic"),
  "observatory:ais": observatoryReadBucket("ais"),
  "observatory:winds": observatoryReadBucket("winds"),
  "observatory:currents": observatoryReadBucket("currents"),
  "observatory:inpe-fires": observatoryReadBucket("inpe-fires"),
  "observatory:inpe-deforestation": observatoryReadBucket("inpe-deforestation"),
  "observatory:species": observatoryReadBucket("species"),
  "observatory:earthquakes": observatoryReadBucket("earthquakes"),
  "observatory:cosmos": {
    name: "observatory:cosmos",
    limit: 600,
    windowMs: DEFAULT_WINDOW_MS,
    redisPrefix: "telluspedia:ratelimit:observatory:cosmos",
    maxClients: DEFAULT_MAX_CLIENTS,
    overflowStrategy: "evict",
  },
} as const satisfies Record<string, RateLimitBucketConfig>;

export type RateLimitBucketName = keyof typeof RATE_LIMIT_BUCKETS;

interface BucketRuntimeState {
  window: number;
  counts: Map<string, number>;
}

interface GlobalRateLimitState {
  buckets: Map<string, BucketRuntimeState>;
  redisUnavailableUntil: number;
}

const GLOBAL_STATE_KEY = Symbol.for("telluspedia.rateLimitState");

function getGlobalState(): GlobalRateLimitState {
  const scope = globalThis as Record<symbol, GlobalRateLimitState | undefined>;
  let state = scope[GLOBAL_STATE_KEY];
  if (!state) {
    state = {
      buckets: new Map(),
      redisUnavailableUntil: 0,
    };
    scope[GLOBAL_STATE_KEY] = state;
  }
  return state;
}

function getBucketState(name: string): BucketRuntimeState {
  const globalState = getGlobalState();
  let state = globalState.buckets.get(name);
  if (!state) {
    state = { window: -1, counts: new Map() };
    globalState.buckets.set(name, state);
  }
  return state;
}

function isTrustedProxy(): boolean {
  return process.env.TRUST_PROXY === "true" || process.env.STUDIES_TRUST_PROXY === "true";
}

export function resolveRateLimitClientKey(headers?: Headers | null): string {
  // Enable only behind a trusted ingress that overwrites x-real-ip on every request.
  if (!headers || !isTrustedProxy()) return "shared";
  const forwardedIp = headers.get("x-real-ip")?.trim();
  return forwardedIp && isIP(forwardedIp) ? forwardedIp : "shared";
}

function secondsUntilNextWindow(window: number, windowMs: number, now: number): number {
  return Math.max(1, Math.ceil(((window + 1) * windowMs - now) / 1000));
}

function safeErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${error.name}:${code}` : error.name;
  }
  return "UnknownError";
}

export function resetRateLimitState(bucketName?: string): void {
  const globalState = getGlobalState();
  if (bucketName) {
    globalState.buckets.delete(bucketName);
  } else {
    globalState.buckets.clear();
  }
  globalState.redisUnavailableUntil = 0;
}

export function getRateLimitBucketSize(bucketName: string): number {
  return getGlobalState().buckets.get(bucketName)?.counts.size ?? 0;
}

export function checkRateLimitMemory(
  config: RateLimitBucketConfig,
  headers?: Headers | null,
  now = Date.now()
): RateLimitResult {
  const bucketState = getBucketState(config.name);
  const window = Math.floor(now / config.windowMs);
  if (window !== bucketState.window) {
    bucketState.counts.clear();
    bucketState.window = window;
  }

  const resetAt = Math.ceil(((window + 1) * config.windowMs) / 1000);
  const clientKey = resolveRateLimitClientKey(headers);
  const existing = bucketState.counts.get(clientKey);

  if (existing !== undefined) {
    // Atualiza recência LRU (move para o final da ordem de inserção do Map).
    bucketState.counts.delete(clientKey);
    if (existing >= config.limit) {
      bucketState.counts.set(clientKey, existing);
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt,
        retryAfter: secondsUntilNextWindow(window, config.windowMs, now),
        store: "memory",
      };
    }
    const next = existing + 1;
    bucketState.counts.set(clientKey, next);
    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - next),
      resetAt,
      retryAfter: 0,
      store: "memory",
    };
  }

  if (bucketState.counts.size >= config.maxClients) {
    if (config.overflowStrategy === "reject") {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt,
        retryAfter: secondsUntilNextWindow(window, config.windowMs, now),
        store: "memory",
      };
    }
    const oldestKey = bucketState.counts.keys().next().value;
    if (oldestKey !== undefined) {
      bucketState.counts.delete(oldestKey);
    }
  }

  bucketState.counts.set(clientKey, 1);
  return {
    allowed: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - 1),
    resetAt,
    retryAfter: 0,
    store: "memory",
  };
}

export async function checkRateLimitWithConfig(
  config: RateLimitBucketConfig,
  headers?: Headers | null,
  now = Date.now(),
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const redisUrl = (options.redisUrl ?? process.env.REDIS_URL)?.trim();
  if (!redisUrl) {
    return checkRateLimitMemory(config, headers, now);
  }

  const globalState = getGlobalState();
  if (!options.bypassCooldown && now < globalState.redisUnavailableUntil) {
    return checkRateLimitMemory(config, headers, now);
  }

  const window = Math.floor(now / config.windowMs);
  const clientKey = resolveRateLimitClientKey(headers);
  const redisKey = `${config.redisPrefix}:${clientKey}:${window}`;
  const remainingMs = Math.max(1000, (window + 1) * config.windowMs - now);
  const resetAt = Math.ceil(((window + 1) * config.windowMs) / 1000);

  try {
    const count = await incrementRedisFixedWindow(
      redisUrl,
      redisKey,
      remainingMs + REDIS_TTL_BUFFER_MS,
      options.timeoutMs
    );
    globalState.redisUnavailableUntil = 0;

    if (count > config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt,
        retryAfter: secondsUntilNextWindow(window, config.windowMs, now),
        store: "redis",
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - count),
      resetAt,
      retryAfter: 0,
      store: "redis",
    };
  } catch (error) {
    globalState.redisUnavailableUntil = now + REDIS_FAILURE_COOLDOWN_MS;
    serverLogger.warn({
      route: `/rate-limit/${config.name}`,
      provider: "redis",
      mode: "fallback",
      reason: safeErrorLabel(error),
      message: "Redis unavailable; falling back to in-memory limiter",
    });
    return checkRateLimitMemory(config, headers, now);
  }
}

export function checkRateLimitSync(
  bucket: RateLimitBucketName,
  headers?: Headers | null,
  now = Date.now()
): RateLimitResult {
  return checkRateLimitMemory(RATE_LIMIT_BUCKETS[bucket], headers, now);
}

export function checkRateLimit(
  bucket: RateLimitBucketName,
  headers?: Headers | null,
  now = Date.now(),
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  return checkRateLimitWithConfig(RATE_LIMIT_BUCKETS[bucket], headers, now, options);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(Math.max(1, result.retryAfter));
    headers["Cache-Control"] = "no-store";
  }
  return headers;
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  message = "Too many requests"
): NextResponse {
  return NextResponse.json(
    { error: message, retryAfter: Math.max(1, result.retryAfter) },
    { status: 429, headers: rateLimitHeaders(result) }
  );
}

export async function enforceRateLimit(
  bucket: RateLimitBucketName,
  request?: Request | null,
  options: RateLimitOptions = {}
): Promise<
  | { blocked: NextResponse; headers?: undefined; result: RateLimitResult }
  | { blocked: null; headers: Record<string, string>; result: RateLimitResult }
> {
  const result = await checkRateLimit(bucket, request?.headers, Date.now(), options);
  if (!result.allowed) {
    return {
      blocked: rateLimitExceededResponse(result),
      result,
    };
  }
  return {
    blocked: null,
    headers: rateLimitHeaders(result),
    result,
  };
}
