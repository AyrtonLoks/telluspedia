import { isIP } from "node:net";
import { incrementRedisFixedWindow } from "@/lib/redis-client";

const WINDOW_MS = 60_000;
const MAX_CREATIONS = 10;
const MAX_CLIENTS = 4096;
const REDIS_TTL_BUFFER_MS = 5_000;
const REDIS_FAILURE_COOLDOWN_MS = 30_000;
const REDIS_KEY_PREFIX = "telluspedia:ratelimit:studies";

interface StudyRateLimit {
  window: number;
  counts: Map<string, number>;
  redisUnavailableUntil: number;
}

export interface StudyRateLimitOptions {
  redisUrl?: string;
  timeoutMs?: number;
  bypassCooldown?: boolean;
}

const processScope = globalThis as typeof globalThis & { studyRateLimit?: StudyRateLimit };
const state = (processScope.studyRateLimit ??= {
  window: -1,
  counts: new Map(),
  redisUnavailableUntil: 0,
});

function resolveClientKey(headers: Headers): string {
  // Enable only behind an ingress that overwrites x-real-ip on every request.
  const forwardedIp =
    process.env.STUDIES_TRUST_PROXY === "true" ? headers.get("x-real-ip")?.trim() : undefined;
  return forwardedIp && isIP(forwardedIp) ? forwardedIp : "shared";
}

function secondsUntilNextWindow(window: number, now: number): number {
  return Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - now) / 1000));
}

function safeErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${error.name}:${code}` : error.name;
  }
  return "UnknownError";
}

export function resetStudyRateLimitState(): void {
  state.window = -1;
  state.counts.clear();
  state.redisUnavailableUntil = 0;
}

export function studyCreationRetryAfter(headers: Headers, now = Date.now()): number {
  const window = Math.floor(now / WINDOW_MS);
  if (window !== state.window) {
    state.counts.clear();
    state.window = window;
  }

  const key = resolveClientKey(headers);
  const count = state.counts.get(key);
  if ((count ?? 0) >= MAX_CREATIONS || (count === undefined && state.counts.size >= MAX_CLIENTS)) {
    return secondsUntilNextWindow(window, now);
  }

  state.counts.set(key, (count ?? 0) + 1);
  return 0;
}

export async function studyCreationRetryAfterAsync(
  headers: Headers,
  now = Date.now(),
  options: StudyRateLimitOptions = {}
): Promise<number> {
  const redisUrl = (options.redisUrl ?? process.env.REDIS_URL)?.trim();
  if (!redisUrl) {
    return studyCreationRetryAfter(headers, now);
  }

  if (!options.bypassCooldown && now < state.redisUnavailableUntil) {
    return studyCreationRetryAfter(headers, now);
  }

  const window = Math.floor(now / WINDOW_MS);
  const key = resolveClientKey(headers);
  const redisKey = `${REDIS_KEY_PREFIX}:${key}:${window}`;
  const remainingMs = Math.max(1000, (window + 1) * WINDOW_MS - now);

  try {
    const count = await incrementRedisFixedWindow(
      redisUrl,
      redisKey,
      remainingMs + REDIS_TTL_BUFFER_MS,
      options.timeoutMs
    );
    state.redisUnavailableUntil = 0;
    if (count > MAX_CREATIONS) {
      return secondsUntilNextWindow(window, now);
    }
    return 0;
  } catch (error) {
    state.redisUnavailableUntil = now + REDIS_FAILURE_COOLDOWN_MS;
    console.warn("[studies] Redis rate-limit unavailable; falling back to in-memory limiter", {
      reason: safeErrorLabel(error),
    });
    return studyCreationRetryAfter(headers, now);
  }
}
