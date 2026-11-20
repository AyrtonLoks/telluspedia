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
