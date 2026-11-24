/**
 * T47 — Observabilidade estruturada: logs JSON sanitizados nas APIs, telemetria em memória
 * dos provedores T05 (`providerMetrics`) e `/api/health?detail=1` sem I/O externo extra.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { NextRequest } from "next/server";
import { GET as healthGET } from "../src/app/api/health/route";
import { runHealthChecks } from "../src/lib/health-check";
import { createObservatorySource, SourceUnavailableError } from "../src/lib/observatory-source";
import { prisma } from "../src/lib/prisma";
import { normalizeProviderKey, providerMetrics } from "../src/lib/provider-metrics";
import {
  formatServerLog,
  redactSensitiveText,
  safeErrorLabel,
  serverLogger,
} from "../src/lib/server-logger";

describe("T47 · Logger estruturado e sanitização de segredos/PII", () => {
  test("emite JSON compacto com campos padronizados e remove credenciais, tokens e e-mails", (t) => {
    const line = formatServerLog(
      {
        level: "warn",
        route: "/api/observatory/firms",
        provider: "NASA FIRMS",
        mode: "fallback",
        durationMs: 142.6,
        status: 502,
        cache: "miss",
        message: "Falha em https://firms.example/csv?map_key=SECRET123&token=abc999 para admin@telluspedia.org",
        error: new Error(
          "FATAL postgresql://tellus:superpass@db.internal:5432/tellus Authorization: Bearer eyJhbGciOiJIUzI1NiJ9"
        ),
        meta: {
          operation: "fetch",
          apiKey: "should-never-appear",
          email: "user@example.com",
          clientIp: "203.0.113.10",
          retries: 1,
        },
      },
      { json: true, now: new Date("2026-11-24T15:00:00.000Z") }
    );

    assert.equal(line.includes("\n"), false, "log JSON deve ocupar uma única linha");
    const parsed = JSON.parse(line) as Record<string, unknown>;
    assert.equal(parsed.timestamp, "2026-11-24T15:00:00.000Z");
    assert.equal(parsed.level, "warn");
    assert.equal(parsed.route, "/api/observatory/firms");
    assert.equal(parsed.provider, "NASA FIRMS");
    assert.equal(parsed.mode, "fallback");
    assert.equal(parsed.durationMs, 143);
    assert.equal(parsed.status, 502);
    assert.equal(parsed.cache, "miss");

    // Nenhum segredo ou PII pode aparecer em qualquer campo
    assert.doesNotMatch(line, /SECRET123|abc999|superpass|eyJhbGciOiJIUzI1NiJ9|admin@telluspedia|user@example|should-never-appear|203\.0\.113\.10/);
    assert.match(String(parsed.message), /map_key=\[REDACTED\]/);
    assert.match(String(parsed.message), /\[REDACTED_EMAIL\]/);
    assert.match(String(parsed.reason), /postgresql:\/\/\[REDACTED\]/);
    assert.match(String(parsed.reason), /Bearer \[REDACTED\]/);
    assert.deepEqual(parsed.meta, {
      operation: "fetch",
      apiKey: "[REDACTED]",
      email: "[REDACTED]",
      clientIp: "[REDACTED]",
      retries: 1,
    });

    // Verifica despacho nos canais corretos de console (compatível com mocks de testes)
    const infoMock = t.mock.method(console, "info", () => undefined);
    const warnMock = t.mock.method(console, "warn", () => undefined);
    const errorMock = t.mock.method(console, "error", () => undefined);
    serverLogger.info({ route: "/api/health", message: "ok" }, { json: true });
    serverLogger.warn({ route: "/api/weather", message: "fallback" }, { json: true });
    serverLogger.error({ route: "/api/studies", message: "db error" }, { json: true });
    assert.equal(infoMock.mock.callCount(), 1);
    assert.equal(warnMock.mock.callCount(), 1);
    assert.equal(errorMock.mock.callCount(), 1);
  });

  test("redactSensitiveText e safeErrorLabel sanitizam strings de Redis e credenciais Basic", () => {
    const clean = redactSensitiveText("redis://:mysecret@cache.local:6379 Basic dXNlcjpwYXNz");
    assert.doesNotMatch(clean, /mysecret|dXNlcjpwYXNz/);
    assert.match(clean, /redis:\/\/\[REDACTED\]/);
    assert.match(clean, /Basic \[REDACTED\]/);

    const err = Object.assign(new Error("connect ECONNREFUSED postgres://u:p@h/db"), { code: "ECONNREFUSED" });
    const label = safeErrorLabel(err);
    assert.match(label, /^Error:ECONNREFUSED/);
    assert.doesNotMatch(label, /u:p/);
  });
});

describe("T47 · Telemetria em memória dos provedores T05 e /api/health?detail=1", () => {
  test("createObservatorySource atualiza providerMetrics em live, cache hit, stale e fallback", async (t) => {
    providerMetrics.reset();
    t.after(() => providerMetrics.reset());
    t.mock.method(console, "warn", () => undefined);

    assert.equal(normalizeProviderKey("firms-1d-nominal"), "firms");
    assert.equal(normalizeProviderKey("traffic/aircraft"), "traffic");

    let shouldFail = false;
    const src = createObservatorySource({
      name: "eonet",
      liveProvider: "NASA EONET v3",
      liveTtlMs: 60_000,
      fallbackTtlMs: 10_000,
      lastGoodMaxAgeMs: 120_000,
      fetchLive: async () => {
        if (shouldFail) throw new SourceUnavailableError("HTTP 503 com token=SECRET_TOKEN");
        return [{ id: 1 }];
      },
      fallback: () => [],
    });

    const t0 = Date.UTC(2026, 10, 24, 15, 0, 0);
    // 1) Live miss
    const r1 = await src.get(t0);
    assert.equal(r1.envelope.meta.source, "live");
    assert.equal(r1.cacheHit, false);

    // 2) Cache hit dentro do TTL
    const r2 = await src.get(t0 + 5_000);
    assert.equal(r2.cacheHit, true);

    // 3) Upstream falha após TTL → stale (mantém lastSuccessAt da leitura t0)
    shouldFail = true;
    const r3 = await src.get(t0 + 70_000);
    assert.equal(r3.envelope.meta.stale, true);

    const summary = providerMetrics.snapshot();
    const eonet = summary.items.find((item) => item.id === "eonet");
    assert.ok(eonet, "provedor eonet deve constar no resumo");
    assert.equal(eonet.mode, "stale");
    assert.equal(eonet.requests, 3);
    assert.equal(eonet.cacheHits, 1);
    assert.equal(eonet.cacheMisses, 2);
    assert.equal(eonet.cacheHitRate, Number((1 / 3).toFixed(4)));
    assert.equal(eonet.failures, 1);
    assert.equal(eonet.lastSuccessAt, new Date(t0).toISOString());
    assert.equal(eonet.lastUpdatedAt, new Date(t0 + 70_000).toISOString());
    assert.ok(eonet.lastLatencyMs !== null && eonet.lastLatencyMs >= 0);
    assert.ok(eonet.avgLatencyMs !== null && eonet.avgLatencyMs >= 0);
    assert.doesNotMatch(eonet.lastError ?? "", /SECRET_TOKEN/);
  });

  test("GET /api/health mantém contrato enxuto e GET /api/health?detail=1 expõe provedores sem I/O externo", async (t) => {
    providerMetrics.reset();
    t.after(() => providerMetrics.reset());

    providerMetrics.record({
      id: "iss",
      provider: "wheretheiss.at",
      mode: "live",
      cacheHit: false,
      durationMs: 85,
      timestampMs: Date.UTC(2026, 10, 24, 15, 10, 0),
    });
    providerMetrics.record({
      id: "iss",
      provider: "wheretheiss.at",
      mode: "live",
      cacheHit: true,
      timestampMs: Date.UTC(2026, 10, 24, 15, 10, 5),
    });

    // Verifica via runHealthChecks que includeProviders não dispara fetch extra
    let fetchCalls = 0;
    const detailed = await runHealthChecks({
      queryDatabase: async () => [{ "?column?": 1 }],
      dataPipelineUrl: "http://127.0.0.1:8000",
      fetchImpl: async () => {
        fetchCalls += 1;
        return new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
      includeProviders: true,
    });
    assert.equal(fetchCalls, 1, "detail=1 não pode disparar chamadas HTTP aos provedores externos");
    assert.equal(detailed.status, "ok");
    assert.ok(detailed.providers);
    assert.equal(detailed.providers.activeProviders, 1);
    assert.equal(detailed.providers.countsByMode.live, 1);
    const iss = detailed.providers.items.find((item) => item.id === "iss");
    assert.ok(iss);
    assert.equal(iss.mode, "live");
    assert.equal(iss.avgLatencyMs, 85);
    assert.equal(iss.cacheHitRate, 0.5);

    // Verifica rota HTTP: sem ?detail=1 mantém contrato original; com ?detail=1 inclui `providers`
    const previousQueryRaw = prisma.$queryRaw;
    const previousFetch = globalThis.fetch;
    t.after(() => {
      Reflect.set(prisma, "$queryRaw", previousQueryRaw);
      globalThis.fetch = previousFetch;
    });

    let routeFetchCalls = 0;
    Reflect.set(prisma, "$queryRaw", async () => [{ "?column?": 1 }]);
    globalThis.fetch = (async () => {
      routeFetchCalls += 1;
      return new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const plainRes = await healthGET(new NextRequest("http://localhost:3000/api/health"));
    assert.equal(plainRes.status, 200);
    assert.equal(plainRes.headers.get("Cache-Control"), "no-store");
    const plainJson = (await plainRes.json()) as Record<string, unknown>;
    assert.equal("providers" in plainJson, false, "contrato padrão não deve inflar resposta com providers");

    const detailRes = await healthGET(new NextRequest("http://localhost:3000/api/health?detail=1"));
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.headers.get("Cache-Control"), "no-store");
    const detailJson = (await detailRes.json()) as {
      status: string;
      providers?: { activeProviders: number; items: Array<{ id: string }> };
    };
    assert.equal(detailJson.status, "ok");
    assert.equal(detailJson.providers?.activeProviders, 1);
    assert.ok(detailJson.providers?.items.some((item) => item.id === "iss"));
    assert.equal(routeFetchCalls, 2, "apenas 1 fetch de dataPipeline por chamada de /api/health");
  });
});
