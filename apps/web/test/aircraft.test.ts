import assert from "node:assert/strict";
import { test } from "node:test";
import { MathUtils } from "three";
import { GET as traffic } from "../src/app/api/observatory/traffic/route";
import { advanceAircraft, aircraftHeading, sampleAircraftTrail, updateAircraft } from "../src/lib/aircraft-motion";
import { latLngToVector3, vector3ToLatLng } from "../src/lib/geo-spatial";
import { resetObservatorySources } from "../src/lib/observatory-sources";
import { normalizeOpenSkyFleet } from "../src/lib/opensky";

const now = Date.parse("2026-11-20T12:00:00Z");
const makeState = (id: string, lng: number, lat: number, time = now / 1000) => [
  id, " TEST ", "Test origin", time, time, lng, lat, 10_000, false,
  240, 90, 0, null, 10_200,
];

test("OpenSky samples distinct geographic regions and keeps the most recent measured position", () => {
  const west = makeState("a00001", -100, 50);
  const east = makeState("a00002", 143, -35);
  const crowded = makeState("a00003", -101, 51);
  const latest = makeState("a00001", -101, 51, now / 1000 + 1);
  const parked = makeState("a00004", 179, 80);
  parked[8] = true;
  const missingHeading = makeState("a00005", 23, 29);
  missingHeading[10] = null;

  const fleet = normalizeOpenSkyFleet({ states: [west, east, crowded, latest, parked, missingHeading] }, 2);
  assert.deepEqual(fleet.map(({ icao24 }) => icao24), ["a00001", "a00002"]);
  assert.equal(fleet[0].lng, -101);
  assert.equal(fleet[0].positionTimestamp, now + 1000);
  assert.equal(fleet[0].altitudeMeters, 10_200);
  assert.equal(fleet[0].callsign, "TEST");
  assert.equal(fleet[1].lat, -35);
});

test("Aircraft follows geographic heading, corrects the next observation gradually and caps extrapolation", () => {
  const [state] = normalizeOpenSkyFleet({ states: [makeState("a00001", 179.99, 31)] });
  const up = latLngToVector3(31, 179.99);
  const north = aircraftHeading(179.99, up, 0);
  const east = aircraftHeading(179.99, up, 90);
  assert.ok(north.y > 0.8);
  assert.ok(Math.abs(north.dot(up)) < 1e-9 && Math.abs(east.dot(up)) < 1e-9);
  assert.ok(Math.abs(east.dot(north)) < 1e-9);

  const track = updateAircraft(undefined, state, now);
  advanceAircraft(track, now + 60_000);
  const longitude = vector3ToLatLng(track.position).lng;
  assert.ok(longitude < -179.8 && longitude > -180, "crosses the antimeridian to the east");
  const before = track.position.clone();
  const corrected = updateAircraft(track, { ...state, lat: 31.1, lng: longitude, positionTimestamp: now + 60_000 }, now + 60_000);
  advanceAircraft(corrected, now + 60_000);
  assert.ok(corrected.position.distanceTo(before) < 1e-9, "the new report does not jump");
  advanceAircraft(corrected, now + 67_000);
  assert.ok(Math.abs(vector3ToLatLng(corrected.position).lat - 31.1) < 0.001);

  for (let i = 0; i < 15; i++) {
    advanceAircraft(track, now + 60_000 + i * 12_000);
    sampleAircraftTrail(track, now + 60_000 + i * 12_000);
  }
  assert.equal(track.trailCount, 6);
  const stopped = track.position.clone();
  advanceAircraft(track, now + 300_000);
  assert.ok(stopped.distanceTo(track.position) < 1e-10);
  assert.ok(MathUtils.degToRad(1) > stopped.angleTo(up));
});

test("Traffic route requests global authenticated states and refreshes an expired bearer token once", async () => {
  const realFetch = globalThis.fetch;
  const previousId = process.env.OPENSKY_CLIENT_ID;
  const previousSecret = process.env.OPENSKY_CLIENT_SECRET;
  const previousLimit = process.env.OPENSKY_AIRCRAFT_LIMIT;
  process.env.OPENSKY_CLIENT_ID = "fixture-id";
  process.env.OPENSKY_CLIENT_SECRET = "fixture-secret";
  process.env.OPENSKY_AIRCRAFT_LIMIT = "2";
  let tokenCalls = 0;
  let stateCalls = 0;
  resetObservatorySources();

  try {
    globalThis.fetch = async (input, request) => {
      const url = new URL(String(input));
      if (url.hostname === "auth.opensky-network.org") {
        assert.equal(request?.method, "POST");
        assert.equal((request?.body as URLSearchParams).get("grant_type"), "client_credentials");
        return Response.json({ access_token: `token-${++tokenCalls}`, expires_in: 1800 });
      }
      assert.equal(url.href, "https://opensky-network.org/api/states/all");
      assert.equal(new Headers(request?.headers).get("Authorization"), `Bearer token-${++stateCalls}`);
      if (stateCalls === 1) return new Response(null, { status: 401 });
      return Response.json({ states: [makeState("a00001", 144, -37), makeState("a00002", -46, -23)] });
    };
    const result = await (await traffic()).json();
    assert.equal(result.aircraft.meta.source, "live");
    assert.deepEqual(result.aircraft.data.map(({ lng }: { lng: number }) => lng), [144, -46]);
    assert.equal(result.maritimeRoutes.meta.source, "fallback");
    assert.equal(tokenCalls, 2);
    assert.equal(stateCalls, 2);
  } finally {
    globalThis.fetch = realFetch;
    resetObservatorySources();
    for (const [key, previous] of [
      ["OPENSKY_CLIENT_ID", previousId], ["OPENSKY_CLIENT_SECRET", previousSecret], ["OPENSKY_AIRCRAFT_LIMIT", previousLimit],
    ]) {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
});
