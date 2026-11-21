import { prisma } from "@/lib/prisma";

const DEFAULT_CHECK_TIMEOUT_MS = 2500;
const DEFAULT_DATA_PIPELINE_URL = "http://localhost:8000";

export interface HealthDependencyStatus {
  status: "ok" | "error";
  latencyMs: number;
}

export interface HealthReport {
  status: "ok" | "degraded";
  service: "telluspedia-web";
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: HealthDependencyStatus;
    dataPipeline: HealthDependencyStatus;
  };
}

export interface HealthCheckDeps {
  queryDatabase?: () => Promise<unknown>;
  fetchImpl?: typeof fetch;
  dataPipelineUrl?: string;
  timeoutMs?: number;
  now?: () => Date;
  uptimeSeconds?: () => number;
}

function safeErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${error.name}:${code}` : error.name;
  }
  return "UnknownError";
}

function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Health check timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();

    operation().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function resolvePipelineHealthUrl(rawBaseUrl: string): URL | null {
  try {
    const parsed = new URL(rawBaseUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return new URL("/health", parsed);
  } catch {
    return null;
  }
}

async function checkDatabase(
  queryDatabase: () => Promise<unknown>,
  timeoutMs: number
): Promise<HealthDependencyStatus> {
  const startedAt = performance.now();
  try {
    await withTimeout(queryDatabase, timeoutMs);
    return { status: "ok", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
  } catch (error) {
    console.warn("[health] Database check failed", { reason: safeErrorLabel(error) });
    return { status: "error", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
  }
}

async function checkDataPipeline(
  rawBaseUrl: string,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<HealthDependencyStatus> {
  const startedAt = performance.now();
  const targetUrl = resolvePipelineHealthUrl(rawBaseUrl);
  if (!targetUrl) {
    console.warn("[health] Invalid DATA_PIPELINE_URL protocol or syntax");
    return { status: "error", latencyMs: 0 };
  }

  try {
    const response = await fetchImpl(targetUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return { status: "error", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { status?: unknown } | null;
      if (
        payload &&
        typeof payload === "object" &&
        "status" in payload &&
        payload.status !== "healthy" &&
        payload.status !== "ok"
      ) {
        return { status: "error", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
      }
    }

    return { status: "ok", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
  } catch (error) {
    console.warn("[health] Data pipeline check failed", { reason: safeErrorLabel(error) });
    return { status: "error", latencyMs: Math.max(0, Math.round(performance.now() - startedAt)) };
  }
}

export async function runHealthChecks(deps: HealthCheckDeps = {}): Promise<HealthReport> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS;
  const queryDatabase = deps.queryDatabase ?? (() => prisma.$queryRaw`SELECT 1`);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const dataPipelineUrl = deps.dataPipelineUrl ?? process.env.DATA_PIPELINE_URL ?? DEFAULT_DATA_PIPELINE_URL;
  const now = deps.now ?? (() => new Date());
  const uptimeSeconds = deps.uptimeSeconds ?? (() => Math.floor(process.uptime()));

  const [database, dataPipeline] = await Promise.all([
    checkDatabase(queryDatabase, timeoutMs),
    checkDataPipeline(dataPipelineUrl, fetchImpl, timeoutMs),
  ]);

  const status = database.status === "ok" && dataPipeline.status === "ok" ? "ok" : "degraded";

  return {
    status,
    service: "telluspedia-web",
    timestamp: now().toISOString(),
    uptimeSeconds: Math.max(0, uptimeSeconds()),
    checks: {
      database,
      dataPipeline,
    },
  };
}
