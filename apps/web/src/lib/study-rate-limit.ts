import { isIP } from "node:net";

const WINDOW_MS = 60_000;
const MAX_CREATIONS = 10;
const MAX_CLIENTS = 4096;

interface StudyRateLimit {
  window: number;
  counts: Map<string, number>;
}

const processScope = globalThis as typeof globalThis & { studyRateLimit?: StudyRateLimit };
const state = processScope.studyRateLimit ??= { window: -1, counts: new Map() };

export function studyCreationRetryAfter(headers: Headers, now = Date.now()): number {
  const window = Math.floor(now / WINDOW_MS);
  if (window !== state.window) {
    state.counts.clear();
    state.window = window;
  }

  // Enable only behind an ingress that overwrites x-real-ip on every request.
  const forwardedIp = process.env.STUDIES_TRUST_PROXY === "true" ? headers.get("x-real-ip")?.trim() : undefined;
  const key = forwardedIp && isIP(forwardedIp) ? forwardedIp : "shared";
  const count = state.counts.get(key);
  if ((count ?? 0) >= MAX_CREATIONS || (count === undefined && state.counts.size >= MAX_CLIENTS)) {
    return Math.ceil(((window + 1) * WINDOW_MS - now) / 1000);
  }

  state.counts.set(key, (count ?? 0) + 1);
  return 0;
}
