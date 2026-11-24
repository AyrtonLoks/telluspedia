/**
 * T43 — Rate-limiting unificado (Redis + fallback LRU limitado) nas 12 rotas
 * `/api/observatory/*` e `/api/weather` + guarda de tamanho/timeout no proxy NASA GIBS.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { afterEach, beforeEach, describe, test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import {
  RATE_LIMIT_BUCKETS,
  checkRateLimit,
  checkRateLimitMemory,
  checkRateLimitWithConfig,
  enforceRateLimit,
  getRateLimitBucketSize,
  rateLimitHeaders,
  resetRateLimitState,
  type RateLimitBucketConfig,
} from "../src/lib/rate-limit";
import { parseRespValue } from "../src/lib/redis-client";
import { parseGibsRequest } from "../src/lib/gibs";
import {
  GIBS_TIMEOUT_MS,
  MAX_GIBS_IMAGE_BYTES,
  __resetGibsCache,
  fetchGibsImage,
  gibsEnvelope,
} from "../src/lib/gibs-source";
import { SourceUnavailableError } from "../src/lib/observatory-source";
import { GET as weatherGET } from "../src/app/api/weather/route";
import { GET as gibsImageGET } from "../src/app/api/observatory/gibs/image/route";
import { GET as cosmosGET } from "../src/app/api/observatory/cosmos/route";
import { GET as eonetGET } from "../src/app/api/observatory/eonet/route";
import { GET as windsGET } from "../src/app/api/observatory/winds/route";
import { eonetSource } from "../src/lib/observatory-sources";
import { windsSource } from "../src/lib/winds-source";

const webRoot = path.join(__dirname, "..");

function withEnv(t: TestContext, overrides: Record<string, string | undefined>) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

async function startMockRedisServer(): Promise<{
  port: number;
  counts: Map<string, number>;
  close: () => Promise<void>;
}> {
  const counts = new Map<string, number>();
  const server = net.createServer((socket) => {
    let buffer: Buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
      let offset = 0;
      while (offset < buffer.length) {
        const parsed = parseRespValue(buffer, offset);
        if (!parsed) break;
        offset = parsed.nextOffset;
        if (!Array.isArray(parsed.value)) {
          socket.write("-ERR expected array\r\n");
          continue;
        }
        const args = parsed.value.map((item) => String(item ?? ""));
        const cmd = args[0]?.toUpperCase();
        if (cmd === "INCR") {
          const key = args[1] ?? "";
          const next = (counts.get(key) ?? 0) + 1;
          counts.set(key, next);
          socket.write(`:${next}\r\n`);
        } else if (cmd === "PEXPIRE") {
          socket.write(":1\r\n");
        } else {
          socket.write("+OK\r\n");
        }
      }
      if (offset > 0) buffer = buffer.subarray(offset);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    // Security guideline: test servers strictly bind to 127.0.0.1.
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address === "object");

  return {
    port: address.port,
    counts,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

describe("T43: motor unificado de rate-limit (Redis + fallback LRU limitado)", () => {
  beforeEach(() => resetRateLimitState());
  afterEach(() => resetRateLimitState());

  test("emite cabeçalhos X-RateLimit-* coerentes e bloqueia com Retry-After + no-store", (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const config: RateLimitBucketConfig = {
      name: "test:headers",
      limit: 3,
      windowMs: 60_000,
      redisPrefix: "telluspedia:ratelimit:test:headers",
      maxClients: 16,
      overflowStrategy: "evict",
    };
    const headers = new Headers({ "x-real-ip": "203.0.113.10" });
    const now = 120_001;

    const r1 = checkRateLimitMemory(config, headers, now);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);
    assert.deepEqual(rateLimitHeaders(r1), {
      "X-RateLimit-Limit": "3",
      "X-RateLimit-Remaining": "2",
      "X-RateLimit-Reset": "180",
    });

    assert.equal(checkRateLimitMemory(config, headers, now).remaining, 1);
    assert.equal(checkRateLimitMemory(config, headers, now).remaining, 0);

    const blocked = checkRateLimitMemory(config, headers, now);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfter, 60);
    assert.deepEqual(rateLimitHeaders(blocked), {
      "X-RateLimit-Limit": "3",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "180",
      "Retry-After": "60",
      "Cache-Control": "no-store",
    });

    // Próxima janela restaura a cota.
    const nextWindow = checkRateLimitMemory(config, headers, now + 60_000);
    assert.equal(nextWindow.allowed, true);
    assert.equal(nextWindow.remaining, 2);
  });

  test("isola buckets distintos entre si (ex.: weather não bloqueia observatory nem studies)", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const headers = new Headers({ "x-real-ip": "203.0.113.20" });
    const now = 240_001;

    for (let i = 0; i < RATE_LIMIT_BUCKETS.weather.limit; i++) {
      const res = await checkRateLimit("weather", headers, now);
      assert.equal(res.allowed, true);
    }
    const weatherBlocked = await checkRateLimit("weather", headers, now);
    assert.equal(weatherBlocked.allowed, false);

    // Outros buckets do mesmo IP seguem com cota intacta.
    const firmsAllowed = await checkRateLimit("observatory:firms", headers, now);
    assert.equal(firmsAllowed.allowed, true);
    assert.equal(firmsAllowed.remaining, RATE_LIMIT_BUCKETS["observatory:firms"].limit - 1);

    const gibsImageAllowed = await checkRateLimit("observatory:gibs-image", headers, now);
    assert.equal(gibsImageAllowed.allowed, true);
    assert.equal(gibsImageAllowed.remaining, RATE_LIMIT_BUCKETS["observatory:gibs-image"].limit - 1);

    const studiesAllowed = await checkRateLimit("studies", headers, now);
    assert.equal(studiesAllowed.allowed, true);
    assert.equal(studiesAllowed.remaining, RATE_LIMIT_BUCKETS.studies.limit - 1);
  });

  test("fallback em memória respeita teto rígido de chaves (evicção LRU e modo fail-closed)", (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const lruConfig: RateLimitBucketConfig = {
      name: "test:lru",
      limit: 2,
      windowMs: 60_000,
      redisPrefix: "telluspedia:ratelimit:test:lru",
      maxClients: 3,
      overflowStrategy: "evict",
    };
    const now = 300_001;

    // Preenche 3 clientes: A, B, C
    checkRateLimitMemory(lruConfig, new Headers({ "x-real-ip": "198.51.100.1" }), now);
    checkRateLimitMemory(lruConfig, new Headers({ "x-real-ip": "198.51.100.2" }), now);
    checkRateLimitMemory(lruConfig, new Headers({ "x-real-ip": "198.51.100.3" }), now);
    assert.equal(getRateLimitBucketSize(lruConfig.name), 3);

    // Toca A novamente (atinge limite 2 e vira o mais recente; B passa a ser o menos recente).
    const secondA = checkRateLimitMemory(lruConfig, new Headers({ "x-real-ip": "198.51.100.1" }), now);
    assert.equal(secondA.allowed, true);
    assert.equal(secondA.remaining, 0);

    // Insere 200 IPs novos: tamanho nunca ultrapassa maxClients (3).
    for (let i = 10; i < 210; i++) {
      checkRateLimitMemory(lruConfig, new Headers({ "x-real-ip": `198.51.100.${i}` }), now);
      assert.ok(getRateLimitBucketSize(lruConfig.name) <= 3);
    }
    assert.equal(getRateLimitBucketSize(lruConfig.name), 3);

    // Modo fail-closed (`reject`) também nunca excede maxClients e bloqueia novos clientes.
    const strictConfig: RateLimitBucketConfig = {
      ...lruConfig,
      name: "test:strict",
      maxClients: 2,
      overflowStrategy: "reject",
    };
    assert.equal(checkRateLimitMemory(strictConfig, new Headers({ "x-real-ip": "198.51.100.1" }), now).allowed, true);
    assert.equal(checkRateLimitMemory(strictConfig, new Headers({ "x-real-ip": "198.51.100.2" }), now).allowed, true);
    const overflow = checkRateLimitMemory(strictConfig, new Headers({ "x-real-ip": "198.51.100.3" }), now);
    assert.equal(overflow.allowed, false);
    assert.equal(overflow.retryAfter, 60);
    assert.equal(getRateLimitBucketSize(strictConfig.name), 2);
  });

  test("usa Redis quando REDIS_URL está ativo e cai para memória com cooldown sem vazar segredos", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const mockRedis = await startMockRedisServer();
    t.after(async () => {
      await mockRedis.close();
    });

    const config: RateLimitBucketConfig = {
      name: "test:redis",
      limit: 2,
      windowMs: 60_000,
      redisPrefix: "telluspedia:ratelimit:test:redis",
      maxClients: 16,
      overflowStrategy: "evict",
    };
    const headers = new Headers({ "x-real-ip": "203.0.113.55" });
    const redisUrl = `redis://127.0.0.1:${mockRedis.port}/0`;
    const now = 360_001;

    const r1 = await checkRateLimitWithConfig(config, headers, now, { redisUrl, bypassCooldown: true });
    assert.equal(r1.allowed, true);
    assert.equal(r1.store, "redis");
    assert.equal(r1.remaining, 1);

    const r2 = await checkRateLimitWithConfig(config, headers, now, { redisUrl, bypassCooldown: true });
    assert.equal(r2.allowed, true);
    assert.equal(r2.store, "redis");
    assert.equal(r2.remaining, 0);

    const r3 = await checkRateLimitWithConfig(config, headers, now, { redisUrl, bypassCooldown: true });
    assert.equal(r3.allowed, false);
    assert.equal(r3.store, "redis");
    assert.equal(r3.retryAfter, 60);
    assert.equal(mockRedis.counts.get("telluspedia:ratelimit:test:redis:203.0.113.55:6"), 3);

    // Simula Redis fora do ar → fallback para memória com circuit breaker (1 único warn sem senha).
    const probe = net.createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", () => resolve()));
    const closedAddr = probe.address();
    assert(closedAddr && typeof closedAddr === "object");
    const closedPort = closedAddr.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    const warn = t.mock.method(console, "warn", () => undefined);
    const secret = "SUPER_SECRET_REDIS_KEY_T43";
    const brokenUrl = `redis://:${secret}@127.0.0.1:${closedPort}/0`;

    const fb1 = await checkRateLimitWithConfig(config, headers, now, { redisUrl: brokenUrl, timeoutMs: 300 });
    const fb2 = await checkRateLimitWithConfig(config, headers, now, { redisUrl: brokenUrl, timeoutMs: 300 });
    const fb3 = await checkRateLimitWithConfig(config, headers, now, { redisUrl: brokenUrl, timeoutMs: 300 });

    assert.equal(fb1.allowed, true);
    assert.equal(fb1.store, "memory");
    assert.equal(fb2.allowed, true);
    assert.equal(fb3.allowed, false);
    assert.equal(warn.mock.callCount(), 1);
    assert.doesNotMatch(JSON.stringify(warn.mock.calls[0].arguments), new RegExp(secret));
  });
});

describe("T43: cobertura das 12 rotas /api/observatory/* e /api/weather", () => {
  beforeEach(() => {
    resetRateLimitState();
    __resetGibsCache();
  });
  afterEach(() => {
    resetRateLimitState();
    __resetGibsCache();
  });

  test("todas as 12 rotas alvo declaram enforceRateLimit com o bucket correspondente", () => {
    const expected: Record<string, string> = {
      "src/app/api/weather/route.ts": "weather",
      "src/app/api/observatory/firms/route.ts": "observatory:firms",
      "src/app/api/observatory/eonet/route.ts": "observatory:eonet",
      "src/app/api/observatory/gibs/route.ts": "observatory:gibs",
      "src/app/api/observatory/gibs/image/route.ts": "observatory:gibs-image",
      "src/app/api/observatory/iss/route.ts": "observatory:iss",
      "src/app/api/observatory/satellites/route.ts": "observatory:satellites",
      "src/app/api/observatory/traffic/route.ts": "observatory:traffic",
      "src/app/api/observatory/ais/route.ts": "observatory:ais",
      "src/app/api/observatory/winds/route.ts": "observatory:winds",
      "src/app/api/observatory/currents/route.ts": "observatory:currents",
      "src/app/api/observatory/cosmos/route.ts": "observatory:cosmos",
    };

    assert.equal(Object.keys(expected).length, 12);
    for (const [relPath, bucket] of Object.entries(expected)) {
      const source = fs.readFileSync(path.join(webRoot, relPath), "utf-8");
      assert.match(source, new RegExp(`enforceRateLimit\\(\\s*"${bucket}"`), `${relPath} deve usar ${bucket}`);
    }
  });

  test("GET /api/weather retorna 429 com Retry-After e Cache-Control: no-store ao atingir limite", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const now = 420_001;
    t.mock.method(Date, "now", () => now);

    const ip = "203.0.113.71";
    for (let i = 0; i < RATE_LIMIT_BUCKETS.weather.limit; i++) {
      // Coordenada inválida falha antes de tocar rede, mas conta no rate-limit.
      const res = await weatherGET(
        new NextRequest("http://localhost/api/weather?lat=abc&lng=0", { headers: { "x-real-ip": ip } })
      );
      assert.equal(res.status, 400);
      assert.equal(res.headers.get("X-RateLimit-Limit"), String(RATE_LIMIT_BUCKETS.weather.limit));
    }

    const blocked = await weatherGET(
      new NextRequest("http://localhost/api/weather?lat=0&lng=0", { headers: { "x-real-ip": ip } })
    );
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("Retry-After"), "60");
    assert.equal(blocked.headers.get("Cache-Control"), "no-store");
    assert.equal(blocked.headers.get("X-RateLimit-Remaining"), "0");

    // Outro IP não é afetado.
    const other = await weatherGET(
      new NextRequest("http://localhost/api/weather?lat=abc&lng=0", { headers: { "x-real-ip": "203.0.113.72" } })
    );
    assert.equal(other.status, 400);
  });

  test("GET /api/observatory/gibs/image retorna 429 após cota e inclui X-Content-Type-Options: nosniff", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const now = 480_001;
    t.mock.method(Date, "now", () => now);
    t.mock.method(globalThis, "fetch", async () =>
      new Response(new Uint8Array(120_000), { status: 200, headers: { "content-type": "image/png" } })
    );

    const ip = "203.0.113.81";
    const first = await gibsImageGET(
      new Request("http://localhost/api/observatory/gibs/image?product=ndvi&month=2024-07", {
        headers: { "x-real-ip": ip },
      })
    );
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(first.headers.get("X-RateLimit-Limit"), String(RATE_LIMIT_BUCKETS["observatory:gibs-image"].limit));

    for (let i = 1; i < RATE_LIMIT_BUCKETS["observatory:gibs-image"].limit; i++) {
      const res = await gibsImageGET(
        new Request("http://localhost/api/observatory/gibs/image?product=ndvi&month=2024-07", {
          headers: { "x-real-ip": ip },
        })
      );
      assert.equal(res.status, 200);
    }

    const blocked = await gibsImageGET(
      new Request("http://localhost/api/observatory/gibs/image?product=ndvi&month=2024-07", {
        headers: { "x-real-ip": ip },
      })
    );
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("Retry-After"), "60");
    assert.equal(blocked.headers.get("Cache-Control"), "no-store");
  });

  test("GET /api/observatory/winds e /eonet aplicam buckets independentes de 120 req/min", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const now = 540_001;
    t.mock.method(Date, "now", () => now);
    t.mock.method(console, "warn", () => undefined);
    t.mock.method(globalThis, "fetch", async () => {
      throw new Error("offline test");
    });
    windsSource.reset();
    eonetSource.reset();

    const ip = "203.0.113.91";
    for (let i = 0; i < RATE_LIMIT_BUCKETS["observatory:winds"].limit; i++) {
      const res = await windsGET(new Request("http://localhost/api/observatory/winds", { headers: { "x-real-ip": ip } }));
      assert.equal(res.status, 200);
    }

    const blockedWinds = await windsGET(
      new Request("http://localhost/api/observatory/winds", { headers: { "x-real-ip": ip } })
    );
    assert.equal(blockedWinds.status, 429);
    assert.equal(blockedWinds.headers.get("Retry-After"), "60");
    assert.equal(blockedWinds.headers.get("X-RateLimit-Limit"), "120");

    // EONET do mesmo IP segue liberado (isolamento por bucket).
    const okEonet = await eonetGET(
      new Request("http://localhost/api/observatory/eonet", { headers: { "x-real-ip": ip } })
    );
    assert.equal(okEonet.status, 200);
    assert.equal(okEonet.headers.get("X-RateLimit-Remaining"), "119");
  });

  test("GET /api/observatory/cosmos permite 600 req/min e bloqueia excesso com 429", async (t) => {
    withEnv(t, { TRUST_PROXY: "true", REDIS_URL: undefined });
    const now = 600_001;
    t.mock.method(Date, "now", () => now);

    const ip = "203.0.113.99";
    for (let i = 0; i < RATE_LIMIT_BUCKETS["observatory:cosmos"].limit; i++) {
      const res = await cosmosGET(
        new Request("http://localhost/api/observatory/cosmos?year=2024&body=MARS", {
          headers: { "x-real-ip": ip },
        })
      );
      assert.equal(res.status, 200);
    }

    const blocked = await cosmosGET(
      new Request("http://localhost/api/observatory/cosmos?year=2024&body=MARS", {
        headers: { "x-real-ip": ip },
      })
    );
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("Retry-After"), "60");
    assert.equal(blocked.headers.get("X-RateLimit-Limit"), "600");
  });

  test("enforceRateLimit funciona sem argumento request (compatibilidade com chamadas diretas)", async (t) => {
    withEnv(t, { TRUST_PROXY: undefined, STUDIES_TRUST_PROXY: undefined, REDIS_URL: undefined });
    const allowed = await enforceRateLimit("observatory:iss");
    assert.equal(allowed.blocked, null);
    assert.equal(allowed.headers["X-RateLimit-Limit"], "120");
  });
});

describe("T43: guarda de tamanho máximo e timeout no proxy binário NASA GIBS", () => {
  const NOW = new Date("2026-11-21T12:00:00Z");

  beforeEach(() => {
    __resetGibsCache();
    resetRateLimitState();
  });
  afterEach(() => {
    __resetGibsCache();
    resetRateLimitState();
  });

  function gibsReq(product: string, month: string) {
    const parsed = parseGibsRequest({ product, month }, NOW);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.value;
  }

  test("rejeita resposta cujo Content-Length excede MAX_GIBS_IMAGE_BYTES sem baixar o corpo", async () => {
    let cancelled = false;
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull() {
          reads++;
          return new Promise(() => undefined);
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 }
    );
    const fetchImpl = (async () =>
      new Response(stream, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(MAX_GIBS_IMAGE_BYTES + 1),
        },
      })) as typeof fetch;

    await assert.rejects(
      fetchGibsImage(gibsReq("ndvi", "2024-07"), fetchImpl, () => NOW.getTime()),
      (err: unknown) => err instanceof SourceUnavailableError && /excedeu o limite de tamanho/i.test(err.message)
    );
    assert.equal(reads, 0);
    assert.equal(cancelled, true);
  });

  test("interrompe leitura de stream chunked sem Content-Length ao ultrapassar MAX_GIBS_IMAGE_BYTES", async () => {
    let cancelled = false;
    let chunksEmitted = 0;
    const chunkSize = 1024 * 1024; // 1 MiB por chunk
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          chunksEmitted++;
          controller.enqueue(new Uint8Array(chunkSize));
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 }
    );
    const fetchImpl = (async () =>
      new Response(stream, {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as typeof fetch;

    const env = await gibsEnvelope(gibsReq("lst", "2024-07"), fetchImpl, () => NOW.getTime());
    assert.equal(env.meta.source, "fallback");
    assert.match(env.meta.reason ?? "", /excedeu o limite de tamanho/i);
    assert.equal(cancelled, true);
    assert.ok(chunksEmitted <= 6, `Esperava corte imediato após 5 MiB, recebeu ${chunksEmitted} chunks`);
  });

  test("converte TimeoutError durante leitura do stream em SourceUnavailableError legível", async () => {
    assert.ok(GIBS_TIMEOUT_MS > 0 && GIBS_TIMEOUT_MS <= 15_000);
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        const err = new Error("aborted");
        err.name = "TimeoutError";
        return Promise.reject(err);
      },
    });
    const fetchImpl = (async () =>
      new Response(stream, {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as typeof fetch;

    await assert.rejects(
      fetchGibsImage(gibsReq("snow", "2024-01"), fetchImpl, () => NOW.getTime()),
      (err: unknown) => err instanceof SourceUnavailableError && /Tempo limite excedido/i.test(err.message)
    );
  });
});
