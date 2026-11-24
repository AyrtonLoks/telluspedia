import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { POST as createStudy } from "../src/app/api/studies/route";
import { GET as getStudy } from "../src/app/api/studies/[slug]/route";
import { POST as forkStudy } from "../src/app/api/studies/[slug]/fork/route";
import { prisma } from "../src/lib/prisma";
import { studyCreationRetryAfter } from "../src/lib/study-rate-limit";
import { getMemoryStudy, saveMemoryStudy, type StudyRecord } from "../src/lib/studies-store";

const url = "http://localhost/api/studies";

function trustTestProxy(t: TestContext) {
  const previous = process.env.STUDIES_TRUST_PROXY;
  process.env.STUDIES_TRUST_PROXY = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.STUDIES_TRUST_PROXY;
    else process.env.STUDIES_TRUST_PROXY = previous;
  });
}

function mockStudyMethod<Args extends unknown[], Result>(
  t: TestContext,
  name: "create" | "findUnique",
  implementation: (...args: Args) => Result,
) {
  const delegate = prisma.study;
  const previous = delegate[name];
  const mock = t.mock.fn(implementation);
  Reflect.set(delegate, name, mock);
  t.after(() => { Reflect.set(delegate, name, previous); });
  return mock;
}

function post(body: string, ip: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body,
  });
}

test("creates a validated snapshot and normalizes observatory layers for historical eras", async (t) => {
  setNodeEnv(t, "production");
  trustTestProxy(t);
  const create = mockStudyMethod(t, "create", async ({ data }: { data: StudyRecord }) => data);

  const response = await createStudy(post(JSON.stringify({
    id: "user-chosen-id",
    title: "Primeira Guerra Mundial",
    timelineStartYear: 1914,
    timelineEndYear: 1918,
    selectedCountryIsos: ["BRA", "PRU"],
    activeCategories: ["WAR_MILITARY"],
    historicalEra: "WW1_1914",
    activeObservatoryLayers: ["NASA_FIRMS"],
    cameraLat: -90,
    cameraLng: 180,
    cameraAltitude: 1.5,
  }), "192.0.2.1"));

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.match(data.id, /^estudo-[A-Za-z0-9_-]{8}$/);
  assert.deepEqual(data.selectedCountryIsos, ["BRA", "PRU"]);
  assert.deepEqual(data.activeObservatoryLayers, []);
  assert.equal(data.cameraLat, -90);
  assert.equal(data.timelineEndYear, 1918);
  assert.equal(create.mock.callCount(), 1);
  assert.equal(getMemoryStudy(data.id), undefined);
});

test("invalid JSON, fields and body sizes fail before persistence", async (t) => {
  trustTestProxy(t);
  const create = mockStudyMethod(t, "create", async () => {
    throw new Error("Unexpected persistence call");
  });

  const malformed = await createStudy(post("{", "192.0.2.2"));
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Invalid JSON" });

  const invalid = await createStudy(post(JSON.stringify({
    title: "t".repeat(201),
    description: "d".repeat(2001),
    markdownNotes: "m".repeat(50001),
    selectedCountryIsos: ["XYZ", 2],
    activeCategories: Array(51).fill("ECONOMY"),
    historicalEra: "unknown",
    focusedCelestialBody: "unknown",
    cameraAltitude: 0,
    timelineStartYear: "1914",
  }), "192.0.2.2"));
  assert.equal(invalid.status, 400);
  const errors = await invalid.json();
  assert.equal(errors.error, "Invalid study");
  for (const field of [
    "title", "description", "markdownNotes", "selectedCountryIsos.0",
    "activeCategories", "historicalEra", "focusedCelestialBody", "cameraAltitude", "timelineStartYear",
  ]) {
    assert(errors.issues.some((issue: { field: string }) => issue.field === field), field);
  }

  const inverted = await createStudy(post('{"timelineStartYear":2024,"timelineEndYear":1900}', "192.0.2.2"));
  assert.equal(inverted.status, 400);
  const oversized = await createStudy(post(JSON.stringify({ ignored: "x".repeat(400_000) }), "192.0.2.2"));
  assert.equal(oversized.status, 413);
  assert.equal(create.mock.callCount(), 0);
});

test("restores and forks legacy studies without editing the original", async (t) => {
  setNodeEnv(t, "development");
  trustTestProxy(t);
  mockStudyMethod(t, "findUnique", async () => null);
  mockStudyMethod(t, "create", async ({ data }: { data: StudyRecord }) => data);

  const original: StudyRecord = {
    id: "legacy-t07",
    title: "x".repeat(200),
    markdownNotes: "x".repeat(50003),
    timelineStartYear: 0,
    timelineEndYear: 1918,
    selectedCountryIsos: ["PRU", "XYZ"],
    activeCategories: [],
    historicalEra: "WW1_1914",
    activeObservatoryLayers: ["ISS_SATELLITES"],
    cameraLat: 999,
    cameraLng: 0,
    cameraAltitude: 2.5,
    createdAt: "2024-01-01T00:00:00.000Z",
  };
  saveMemoryStudy(original);
  const context = { params: Promise.resolve({ slug: original.id }) };
  const restored = await getStudy(new NextRequest(url), context);
  assert.equal(restored.status, 200);
  const snapshot = await restored.json();
  assert.equal(snapshot.timelineStartYear, 0);
  assert.deepEqual(snapshot.selectedCountryIsos, ["PRU"]);
  assert.deepEqual(snapshot.activeObservatoryLayers, []);
  assert.equal(snapshot.cameraLat, 0);
  assert.equal(snapshot.markdownNotes.length, 50003);

  const response = await forkStudy(post("{}", "192.0.2.3"), context);
  assert.equal(response.status, 200);
  const fork = await response.json();
  assert.match(fork.id, /^fork-/);
  assert.equal(fork.parentId, original.id);
  assert.equal(fork.title.length, 200);
  assert.equal(fork.markdownNotes.length, 50000);
  assert.deepEqual(fork.activeObservatoryLayers, []);
  assert.equal(getMemoryStudy(original.id)?.cameraLat, 999);
  assert.deepEqual(getMemoryStudy(original.id)?.activeObservatoryLayers, ["ISS_SATELLITES"]);
});

test("creation and fork share a per-IP quota behind a trusted proxy", async (t) => {
  trustTestProxy(t);
  const now = t.mock.method(Date, "now", () => 120_001);
  mockStudyMethod(t, "findUnique", async () => null);
  mockStudyMethod(t, "create", async ({ data }: { data: StudyRecord }) => data);

  for (let count = 0; count < 10; count++) {
    assert.equal((await createStudy(post("{}", "192.0.2.4"))).status, 200);
  }
  const context = { params: Promise.resolve({ slug: "not-found" }) };
  const limited = await forkStudy(post("{}", "192.0.2.4"), context);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  assert.equal((await forkStudy(post("{}", "192.0.2.5"), context)).status, 404);

  now.mock.mockImplementation(() => 180_000);
  assert.equal((await createStudy(post("{}", "192.0.2.4"))).status, 200);
});


test("the shared quota ignores forwarded addresses without proxy trust", (t) => {
  const previous = process.env.STUDIES_TRUST_PROXY;
  delete process.env.STUDIES_TRUST_PROXY;
  t.after(() => {
    if (previous !== undefined) process.env.STUDIES_TRUST_PROXY = previous;
  });

  for (let index = 1; index <= 10; index++) {
    const headers = new Headers({ "x-real-ip": `192.0.2.${index}` });
    assert.equal(studyCreationRetryAfter(headers, 240_001), 0);
  }
  assert.equal(studyCreationRetryAfter(new Headers({ "x-real-ip": "192.0.2.50" }), 240_001), 60);
});

function setNodeEnv(t: TestContext, env: "production" | "development") {
  const previous = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", env);
  t.after(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous);
  });
}

function loggedOperation(args: unknown[]): string | undefined {
  const first = args[0];
  if (typeof first === "string") {
    const trimmed = first.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as { meta?: { operation?: string } };
      return parsed.meta?.operation;
    }
    const metaMatch = trimmed.match(/(\{.*"operation".*\})$/);
    if (metaMatch) {
      const parsed = JSON.parse(metaMatch[1]) as { operation?: string };
      return parsed.operation;
    }
  }
  const second = args[1] as { operation?: string } | undefined;
  return second?.operation;
}

test("production reports database failures across creation, reading and fork", async (t) => {
  setNodeEnv(t, "production");
  trustTestProxy(t);
  const log = t.mock.method(console, "error", () => undefined);
  const warn = t.mock.method(console, "warn", () => undefined);
  const dbError = new Error("Private database diagnostic");
  const create = mockStudyMethod(t, "create", async (_input: { data: StudyRecord }) => { throw dbError; });
  const read = mockStudyMethod(t, "findUnique", async () => { throw dbError; });
  const memoryId = "guerra-fria-br-de-k9x2";
  const context = { params: Promise.resolve({ slug: memoryId }) };

  const responses = [
    await createStudy(post("{}", "192.0.2.6")),
    await getStudy(new NextRequest(url), context),
    await forkStudy(post("{}", "192.0.2.6"), context),
  ];
  for (const response of responses) {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Study-Persistence"), null);
    assert.deepEqual(await response.json(), {
      error: "O banco de dados de estudos está indisponível. Tente novamente em instantes.",
    });
  }

  assert.equal(create.mock.callCount(), 1, "Fork cannot use a memory source in production");
  assert.equal(read.mock.callCount(), 2);
  assert.equal(warn.mock.callCount(), 0);
  assert.deepEqual(
    log.mock.calls.map(({ arguments: args }) => loggedOperation(args)),
    ["create", "read", "fork.read"],
  );
  const createInput = create.mock.calls[0].arguments[0];
  assert.equal(getMemoryStudy(createInput.data.id), undefined);
});

test("production distinguishes missing studies from a failed fork write", async (t) => {
  setNodeEnv(t, "production");
  trustTestProxy(t);
  const log = t.mock.method(console, "error", () => undefined);
  const find = mockStudyMethod(t, "findUnique", async (): Promise<StudyRecord | null> => null);
  const id = "guerra-fria-br-de-k9x2";
  const context = { params: Promise.resolve({ slug: id }) };

  assert.equal((await getStudy(new NextRequest(url), context)).status, 404);
  assert.equal((await forkStudy(post("{}", "192.0.2.7"), context)).status, 404);

  find.mock.mockImplementation(async () => getMemoryStudy(id) ?? null);
  const create = mockStudyMethod(t, "create", async () => { throw new Error("Fork write failed"); });
  assert.equal((await forkStudy(post("{}", "192.0.2.7"), context)).status, 503);
  assert.equal(create.mock.callCount(), 1);
  assert.equal(loggedOperation(log.mock.calls[0].arguments), "fork.create");
});

test("development marks temporary studies and reports when memory storage is used", async (t) => {
  setNodeEnv(t, "development");
  trustTestProxy(t);
  const log = t.mock.method(console, "error", () => undefined);
  const warn = t.mock.method(console, "warn", () => undefined);
  mockStudyMethod(t, "create", async () => { throw new Error("Database offline"); });
  mockStudyMethod(t, "findUnique", async () => { throw new Error("Database offline"); });

  const created = await createStudy(post('{"title":"Estudo temporário"}', "192.0.2.8"));
  assert.equal(created.status, 200);
  assert.equal(created.headers.get("X-Study-Persistence"), "memory");
  const original = await created.json();

  const context = { params: Promise.resolve({ slug: original.id }) };
  const restored = await getStudy(new NextRequest(url), context);
  assert.equal(restored.headers.get("X-Study-Persistence"), "memory");
  assert.equal((await restored.json()).title, original.title);

  const response = await forkStudy(post("{}", "192.0.2.8"), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Study-Persistence"), "memory");
  assert.equal((await response.json()).parentId, original.id);
  assert.deepEqual(
    warn.mock.calls.map(({ arguments: args }) => loggedOperation(args)),
    ["create", "read", "fork.read", "fork.create"],
  );
  assert.equal(log.mock.callCount(), 4);
});
