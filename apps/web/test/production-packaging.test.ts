/**
 * T34 — Empacotamento de produção: Dockerfile standalone, /api/health,
 * rate-limit com suporte opcional a Redis e CI reforçado.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { describe, test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { GET as healthGET } from "../src/app/api/health/route";
import { runHealthChecks } from "../src/lib/health-check";
import { prisma } from "../src/lib/prisma";
import { encodeRespCommand, parseRedisUrl, parseRespValue } from "../src/lib/redis-client";
import {
  resetStudyRateLimitState,
  studyCreationRetryAfterAsync,
} from "../src/lib/study-rate-limit";
import nextConfigFactory from "../next.config.mjs";

const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "..", "..");

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf-8");
}

interface MockRedisServer {
  port: number;
  commands: string[][];
  counts: Map<string, number>;
  ttls: Map<string, number>;
  close: () => Promise<void>;
}

async function startMockRedisServer(options: { password?: string } = {}): Promise<MockRedisServer> {
  const commands: string[][] = [];
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();

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
          socket.write("-ERR expected array command\r\n");
          continue;
        }

        const args = parsed.value.map((item) => String(item ?? ""));
        commands.push(args);
        const cmd = args[0]?.toUpperCase();

        if (cmd === "AUTH") {
          const suppliedPassword = args.length === 3 ? args[2] : args[1];
          if (options.password && suppliedPassword !== options.password) {
            socket.write("-WRONGPASS invalid credentials\r\n");
          } else {
            socket.write("+OK\r\n");
          }
        } else if (cmd === "SELECT") {
          socket.write("+OK\r\n");
        } else if (cmd === "INCR") {
          const key = args[1] ?? "";
          const next = (counts.get(key) ?? 0) + 1;
          counts.set(key, next);
          socket.write(`:${next}\r\n`);
        } else if (cmd === "PEXPIRE") {
          const key = args[1] ?? "";
          const ms = Number.parseInt(args[2] ?? "0", 10);
          ttls.set(key, ms);
          socket.write(":1\r\n");
        } else {
          socket.write("-ERR unknown command\r\n");
        }
      }

      if (offset > 0) {
        buffer = buffer.subarray(offset);
      }
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
    commands,
    counts,
    ttls,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

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

describe("T34: GET /api/health", () => {
  test("retorna 200 e status ok quando PostgreSQL e data-pipeline respondem saudáveis", async () => {
    const report = await runHealthChecks({
      queryDatabase: async () => [{ "?column?": 1 }],
      dataPipelineUrl: "http://127.0.0.1:8000",
      fetchImpl: async () =>
        new Response(JSON.stringify({ status: "healthy", service: "telluspedia-data-pipeline" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      now: () => new Date("2026-11-21T12:00:00.000Z"),
      uptimeSeconds: () => 42,
    });

    assert.equal(report.status, "ok");
    assert.equal(report.service, "telluspedia-web");
    assert.equal(report.timestamp, "2026-11-21T12:00:00.000Z");
    assert.equal(report.uptimeSeconds, 42);
    assert.equal(report.checks.database.status, "ok");
    assert.equal(report.checks.dataPipeline.status, "ok");
    assert.ok(report.checks.database.latencyMs >= 0);
    assert.ok(report.checks.dataPipeline.latencyMs >= 0);
  });

  test("retorna degraded quando banco ou data-pipeline falham sem vazar segredos", async (t) => {
    const warn = t.mock.method(console, "warn", () => undefined);

    const dbDown = await runHealthChecks({
      queryDatabase: async () => {
        throw new Error("FATAL: password authentication failed for postgresql://secret");
      },
      dataPipelineUrl: "http://127.0.0.1:8000",
      fetchImpl: async () =>
        new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    assert.equal(dbDown.status, "degraded");
    assert.equal(dbDown.checks.database.status, "error");
    assert.equal(dbDown.checks.dataPipeline.status, "ok");
    assert.doesNotMatch(JSON.stringify(dbDown), /password|postgresql|secret/i);

    const pipelineBadProtocol = await runHealthChecks({
      queryDatabase: async () => [1],
      dataPipelineUrl: "file:///etc/passwd",
      fetchImpl: async () => {
        throw new Error("Should not fetch non-HTTP protocol");
      },
    });
    assert.equal(pipelineBadProtocol.status, "degraded");
    assert.equal(pipelineBadProtocol.checks.database.status, "ok");
    assert.equal(pipelineBadProtocol.checks.dataPipeline.status, "error");

    const pipelineUnhealthy = await runHealthChecks({
      queryDatabase: async () => [1],
      dataPipelineUrl: "http://127.0.0.1:8000",
      fetchImpl: async () =>
        new Response(JSON.stringify({ status: "unhealthy" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    assert.equal(pipelineUnhealthy.status, "degraded");
    assert.equal(pipelineUnhealthy.checks.dataPipeline.status, "error");

    assert.ok(warn.mock.callCount() >= 2);
  });

  test("rota HTTP /api/health aplica Cache-Control: no-store e status 200/503 coerentes", async (t) => {
    const previousQueryRaw = prisma.$queryRaw;
    const previousFetch = globalThis.fetch;
    t.after(() => {
      Reflect.set(prisma, "$queryRaw", previousQueryRaw);
      globalThis.fetch = previousFetch;
    });

    Reflect.set(prisma, "$queryRaw", async () => [{ "?column?": 1 }]);
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    const okRes = await healthGET(new NextRequest("http://localhost:3000/api/health"));
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get("Cache-Control"), "no-store");
    const okJson = await okRes.json();
    assert.equal(okJson.status, "ok");

    const warn = t.mock.method(console, "warn", () => undefined);
    Reflect.set(prisma, "$queryRaw", async () => {
      throw new Error("Connection refused");
    });
    const degradedRes = await healthGET(new NextRequest("http://localhost:3000/api/health"));
    assert.equal(degradedRes.status, 503);
    assert.equal(degradedRes.headers.get("Cache-Control"), "no-store");
    const degradedJson = await degradedRes.json();
    assert.equal(degradedJson.status, "degraded");
    assert.equal(degradedJson.checks.database.status, "error");
    assert.ok(warn.mock.callCount() >= 1);
  });
});

describe("T34: Redis RESP2 e rate-limit distribuído em study-rate-limit", () => {
  test("parseRedisUrl valida redis://, rediss://, credenciais e banco", () => {
    assert.deepEqual(parseRedisUrl("redis://redis:6379/2"), {
      host: "redis",
      port: 6379,
      tls: false,
      username: undefined,
      password: undefined,
      db: 2,
    });
    assert.deepEqual(parseRedisUrl("rediss://app:s%40cret@cache.internal:6380/0"), {
      host: "cache.internal",
      port: 6380,
      tls: true,
      username: "app",
      password: "s@cret",
      db: 0,
    });
    assert.equal(parseRedisUrl("http://localhost:6379"), null);
    assert.equal(parseRedisUrl("redis://localhost:6379/notanumber"), null);
    assert.equal(parseRedisUrl(""), null);

    const encoded = encodeRespCommand(["INCR", "k"]).toString("utf8");
    assert.equal(encoded, "*2\r\n$4\r\nINCR\r\n$1\r\nk\r\n");
  });

  test("aplica cota de 10 criações por janela no Redis com AUTH + SELECT + PEXPIRE", async (t) => {
    resetStudyRateLimitState();
    withEnv(t, { STUDIES_TRUST_PROXY: "true" });

    const mockRedis = await startMockRedisServer({ password: "super-secret-password" });
    t.after(async () => {
      await mockRedis.close();
      resetStudyRateLimitState();
    });

    const redisUrl = `redis://:super-secret-password@127.0.0.1:${mockRedis.port}/3`;
    const headers = new Headers({ "x-real-ip": "198.51.100.10" });
    const now = 600_001;

    for (let i = 0; i < 10; i++) {
      const retry = await studyCreationRetryAfterAsync(headers, now, {
        redisUrl,
        bypassCooldown: true,
      });
      assert.equal(retry, 0, `request ${i + 1} should succeed`);
    }

    const blocked = await studyCreationRetryAfterAsync(headers, now, {
      redisUrl,
      bypassCooldown: true,
    });
    assert.equal(blocked, 60);

    // Próxima janela (60s depois) volta a permitir.
    const nextWindow = await studyCreationRetryAfterAsync(headers, now + 60_000, {
      redisUrl,
      bypassCooldown: true,
    });
    assert.equal(nextWindow, 0);

    assert.ok(mockRedis.commands.some((cmd) => cmd[0] === "AUTH" && cmd[1] === "super-secret-password"));
    assert.ok(mockRedis.commands.some((cmd) => cmd[0] === "SELECT" && cmd[1] === "3"));
    const key = "telluspedia:ratelimit:studies:198.51.100.10:10";
    assert.equal(mockRedis.counts.get(key), 11);
    assert.ok((mockRedis.ttls.get(key) ?? 0) >= 60_000);
  });

  test("faz fallback gracioso para memória quando Redis está indisponível sem vazar senha nos logs", async (t) => {
    resetStudyRateLimitState();
    withEnv(t, { STUDIES_TRUST_PROXY: "true" });
    const warn = t.mock.method(console, "warn", () => undefined);

    // Porta fechada em 127.0.0.1 obtida de forma determinística
    const probe = net.createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", () => resolve()));
    const address = probe.address();
    assert(address && typeof address === "object");
    const closedPort = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    const secretToken = "TOP_SECRET_REDIS_PASS_999";
    const redisUrl = `redis://:${secretToken}@127.0.0.1:${closedPort}/0`;
    const headers = new Headers({ "x-real-ip": "198.51.100.22" });

    for (let i = 0; i < 10; i++) {
      const retry = await studyCreationRetryAfterAsync(headers, 720_001, {
        redisUrl,
        timeoutMs: 300,
      });
      assert.equal(retry, 0);
    }
    const blocked = await studyCreationRetryAfterAsync(headers, 720_001, {
      redisUrl,
      timeoutMs: 300,
    });
    assert.equal(blocked, 60);

    // Circuit breaker evita reconectar a cada requisição durante a janela de cooldown.
    assert.equal(warn.mock.callCount(), 1);
    assert.doesNotMatch(JSON.stringify(warn.mock.calls[0].arguments), new RegExp(secretToken));
    resetStudyRateLimitState();
  });
});

describe("T34: Dockerfile standalone, docker-compose e CI reforçado", () => {
  test("next.config ativa output standalone apenas quando NEXT_OUTPUT_STANDALONE=true", (t) => {
    withEnv(t, { NEXT_OUTPUT_STANDALONE: "true" });
    const standaloneCfg = (nextConfigFactory as (phase: string) => { output?: string })("phase-production-build");
    assert.equal(standaloneCfg.output, "standalone");

    withEnv(t, { NEXT_OUTPUT_STANDALONE: undefined });
    const defaultCfg = (nextConfigFactory as (phase: string) => { output?: string })("phase-production-build");
    assert.equal(defaultCfg.output, undefined);
  });

  test("apps/web/Dockerfile segue multi-stage standalone, usuário não-root e healthcheck", () => {
    const dockerfile = readRepoFile("apps/web/Dockerfile");
    assert.match(dockerfile, /AS deps/);
    assert.match(dockerfile, /AS builder/);
    assert.match(dockerfile, /AS runner/);
    assert.match(dockerfile, /NEXT_OUTPUT_STANDALONE=true/);
    assert.match(dockerfile, /COPY patches \.\/patches/);
    assert.match(dockerfile, /USER nextjs/);
    assert.match(dockerfile, /HEALTHCHECK[\s\S]*\/api\/health/);
    assert.match(dockerfile, /CMD \["node", "apps\/web\/server\.js"\]/);
  });

  test("docker-compose.yml define serviço web opcional no profile prod com healthchecks", () => {
    const compose = readRepoFile("docker-compose.yml");
    assert.match(compose, /profiles:\s*\["prod"\]/);
    assert.match(compose, /dockerfile:\s*apps\/web\/Dockerfile/);
    assert.match(compose, /redis-cli.*ping/);
    assert.match(compose, /DATA_PIPELINE_URL:\s*"http:\/\/data-pipeline:8000"/);
  });

  test("CI executa pnpm audit --prod --audit-level=high e valida migrations + seed em PostGIS", () => {
    const ci = readRepoFile(".github/workflows/ci.yml");
    assert.match(ci, /pnpm audit --prod --audit-level=high/);
    assert.match(ci, /postgis\/postgis:16-3\.4/);
    assert.match(ci, /prisma migrate deploy/);
    assert.match(ci, /prisma migrate status/);
    assert.match(ci, /pnpm db:seed/);
  });
});
