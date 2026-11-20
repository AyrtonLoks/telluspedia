import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/weather/route";

function request(query: string) {
  return GET(new NextRequest(`http://localhost/api/weather?${query}`));
}

test("weather rejects malformed or out-of-range coordinates before fetching", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Unexpected upstream call");
  });

  for (const query of [
    "lat=abc&lng=1",
    "lat=1%26x%3D1&lng=2",
    "lat=91&lng=0",
    "lat=0&lng=-181",
    "lat=NaN&lng=0",
    "lat=1e999&lng=0",
    "lat=0x1&lng=2",
    "lat=0",
    "lat=%20&lng=0",
  ]) {
    const response = await request(query);
    assert.equal(response.status, 400, query);
  }

  assert.equal(fetchMock.mock.callCount(), 0);
});

test("weather forwards valid coordinates and preserves zeros from the pipeline", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    assert.equal(url.pathname, "/api/v1/weather");
    assert.deepEqual([...url.searchParams], [["lat", "-90"], ["lng", "180"]]);
    return Response.json({
      current: { temperature: 0, weather_code: 0, relative_humidity: null, reference_time: 1795186800 },
      cached: true,
    });
  });

  const response = await request("lat=-9e1&lng=180");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    temperature: 0,
    apparent_temperature: null,
    relative_humidity: null,
    precipitation: null,
    weather_code: 0,
    wind_speed: null,
    reference_time: 1795186800,
    cached: true,
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("weather falls back to Open-Meteo and keeps partial observations", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    if (url.pathname === "/api/v1/weather") return new Response(null, { status: 503 });
    assert.equal(url.hostname, "api.open-meteo.com");
    assert.equal(url.searchParams.get("latitude"), "0");
    assert.equal(url.searchParams.get("longitude"), "-47.88");
    assert(url.searchParams.get("current")?.includes("temperature_2m"));
    assert.equal(url.searchParams.get("timeformat"), "unixtime");
    return Response.json({
      current: { temperature_2m: null, precipitation: 0, wind_speed_10m: 12, time: 1795186800 },
    });
  });

  const response = await request("lat=0&lng=-47.88");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    temperature: null,
    apparent_temperature: null,
    relative_humidity: null,
    precipitation: 0,
    weather_code: null,
    wind_speed: 12,
    reference_time: 1795186800,
  });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("weather returns a generic 502 when neither provider responds", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Internal upstream failure");
  });

  const response = await request("lat=0&lng=0");
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Weather fetch failed" });
  assert.equal(fetchMock.mock.callCount(), 2);
});
