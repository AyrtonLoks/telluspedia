import { prisma } from "@/lib/prisma";
import { providerMetrics, type ProviderMetricsSummary } from "@/lib/provider-metrics";
import { safeErrorLabel, serverLogger } from "@/lib/server-logger";

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
  /** Telemetria leve em memória dos provedores T05 (presente quando `?detail=1`). */
  providers?: ProviderMetricsSummary;
}

export interface HealthCheckDeps {
  queryDatabase?: () => Promise<unknown>;
  fetchImpl?: typeof fetch;
  dataPipelineUrl?: string;
  timeoutMs?: number;
  now?: () => Date;
  uptimeSeconds?: () => number;
  includeProviders?: boolean;
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
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    serverLogger.warn({
      route: "/api/health",
      provider: "postgresql",
      durationMs: latencyMs,
      status: 503,
      reason: safeErrorLabel(error),
      message: "Database check failed",
    });
    return { status: "error", latencyMs };
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
    serverLogger.warn({
      route: "/api/health",
      provider: "data-pipeline",
      durationMs: 0,
      status: 503,
      reason: "Invalid DATA_PIPELINE_URL protocol or syntax",
      message: "Data pipeline check skipped",
    });
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
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    serverLogger.warn({
      route: "/api/health",
      provider: "data-pipeline",
      durationMs: latencyMs,
      status: 503,
      reason: safeErrorLabel(error),
      message: "Data pipeline check failed",
    });
    return { status: "error", latencyMs };
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

  const report: HealthReport = {
    status,
    service: "telluspedia-web",
    timestamp: now().toISOString(),
    uptimeSeconds: Math.max(0, uptimeSeconds()),
    checks: {
      database,
      dataPipeline,
    },
  };

  if (deps.includeProviders) {
    report.providers = providerMetrics.snapshot();
  }

  return report;
}
