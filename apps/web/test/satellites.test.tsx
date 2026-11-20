import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ISS_NORAD_ID,
  REFERENCE_ISS_TLE,
  altitudeToSceneRadius,
  greatCircleKm,
  groundTrack,
  isEclipsed,
  mergeSatelliteGroups,
  orbitRing,
  parseTleText,
  propagateState,
  referenceIssTelemetry,
  tleChecksumOk,
  tleEpochToIso,
  toSatrec,
} from "../src/lib/satellites";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import { setFromLatLng } from "../src/components/globe/IssOrbitLayer";
import { resetObservatorySources } from "../src/lib/observatory-sources";
import { GET as satellitesGET } from "../src/app/api/observatory/satellites/route";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { SatelliteLayerControls } from "../src/components/observatory/SatelliteLayerControls";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import * as THREE from "three";

const root = path.resolve(__dirname, "..");
const STATIONS = fs.readFileSync(path.join(root, "test/fixtures/tle-stations-sample.txt"), "utf-8");
const VISUAL = fs.readFileSync(path.join(root, "test/fixtures/tle-visual-sample.txt"), "utf-8");
const EPOCH_MS = Date.parse(tleEpochToIso(REFERENCE_ISS_TLE.line1)!);

describe("D04: TLEs", () => {
  test("lê o formato de 3 linhas do CelesTrak com checksum e época", () => {
    const sats = parseTleText(STATIONS, "station");
    assert.ok(sats.length >= 2);
    const iss = sats.find((s) => s.noradId === ISS_NORAD_ID)!;
    assert.equal(iss.name, "ISS (ZARYA)");
    assert.match(iss.epoch, /^2026-11-20T/);
    assert.ok(tleChecksumOk(iss.line1) && tleChecksumOk(iss.line2));
  });

  test("checksum inválido descarta a entrada sem derrubar as demais", () => {
    const broken = STATIONS.replace(/(1 25544U[^\n]*)(\d)\s*\n/, (_m, l, d) => `${l}${(Number(d) + 1) % 10}\n`);
    const sats = parseTleText(broken, "station");
    assert.ok(!sats.some((s) => s.noradId === ISS_NORAD_ID));
    assert.ok(sats.length >= 1);
  });

  test("grupos são unidos sem duplicar (a ISS está em stations e visual)", () => {
    const merged = mergeSatelliteGroups(parseTleText(STATIONS, "station"), parseTleText(VISUAL, "visual"));
    assert.equal(merged.filter((s) => s.noradId === ISS_NORAD_ID).length, 1);
    assert.equal(merged.find((s) => s.noradId === ISS_NORAD_ID)!.category, "station");
  });
});

describe("D04: SGP4", () => {
  const rec = toSatrec(REFERENCE_ISS_TLE)!;

  test("posição real da ISS: altitude e velocidade de LEO, latitude limitada pela inclinação", () => {
    const s = propagateState(rec, new Date(EPOCH_MS))!;
    assert.ok(s.altKm > 370 && s.altKm < 460, `${s.altKm}`);
    assert.ok(s.velocityKmh > 27400 && s.velocityKmh < 27800, `${s.velocityKmh}`);
    assert.ok(Math.abs(s.lat) <= 52);
  });

  test("anel orbital é fechado (um período no referencial inercial) — não é o ground track", () => {
    const ring = orbitRing(rec, new Date(EPOCH_MS), 180);
    assert.equal(ring.length, 180);
    const gap = greatCircleKm(ring[0], ring[ring.length - 1]);
    const step = greatCircleKm(ring[0], ring[1]);
    assert.ok(Math.abs(gap - step) < step * 0.2, `fechamento ${gap.toFixed(0)} km vs passo ${step.toFixed(0)} km`);
    const track = groundTrack(rec, new Date(EPOCH_MS), 46, 46, 1);
    assert.ok(greatCircleKm(track[0], track[track.length - 1]) > 1000, "o ground track não fecha (a Terra gira por baixo)");
  });

  test("altitude em escala real do globo e conversão sem alocação idêntica à parametrização do globo", () => {
    assert.ok(Math.abs(altitudeToSceneRadius(420) - 1.0659) < 0.0001);
    const a = latLngToVector3(-15.8, -47.9, 1.066);
    const b = setFromLatLng(new THREE.Vector3(), -15.8, -47.9, 1.066);
    assert.ok(a.distanceTo(b) < 1e-12);
  });

  test("eclipse: lado diurno nunca está na sombra; ponto oposto ao Sol em baixa altitude está", () => {
    const date = new Date(EPOCH_MS);
    const s = propagateState(rec, date)!;
    assert.equal(typeof isEclipsed(s, date), "boolean");
    assert.equal(isEclipsed({ lat: 0, lng: 0, altKm: 0, velocityKmh: 0 }, new Date(Date.UTC(2026, 2, 20, 12))), false, "meio-dia em Greenwich no equinócio");
    assert.equal(isEclipsed({ lat: 0, lng: 180, altKm: 420, velocityKmh: 0 }, new Date(Date.UTC(2026, 2, 20, 12))), true, "meia-noite no antimeridiano");
  });

  test("TLE de referência velho demais não derruba o app (degrada para a posição da época)", () => {
    const far = referenceIssTelemetry(EPOCH_MS + 5 * 365 * 86_400_000);
    assert.ok(Number.isFinite(far.latitude));
    assert.equal(far.timestamp, EPOCH_MS + 5 * 365 * 86_400_000);
  });
});

describe("D04: rota /api/observatory/satellites", () => {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  let urls: string[] = [];

  beforeEach(() => {
    resetObservatorySources();
    console.warn = () => {};
    urls = [];
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  });

  test("ao vivo: grupos stations + visual do CelesTrak, sem duplicatas", async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const u = String(input);
      urls.push(u);
      return new Response(u.includes("GROUP=stations") ? STATIONS : VISUAL);
    }) as typeof fetch;
    const body = await (await satellitesGET()).json();
    assert.equal(body.meta.source, "live");
    assert.match(body.meta.provider, /CelesTrak/);
    assert.equal(urls.length, 2);
    assert.equal(body.data.filter((s: { noradId: number }) => s.noradId === ISS_NORAD_ID).length, 1);
  });

  test("sem a ISS ou com a rede fora → fallback com o TLE de referência, rotulado como impreciso", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const body = await (await satellitesGET()).json();
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.provider, /impreciso/);
    assert.equal(body.data[0].noradId, ISS_NORAD_ID);
  });
});

describe("D04: store e UI", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    useObservatoryStore.setState({ satellites: [], satelliteCategories: ["station", "visual"], selectedEntity: null });
  });

  test("carregar a camada traz os TLEs e a telemetria da ISS sai do SGP4 (época do TLE no HUD)", async () => {
    const tles = mergeSatelliteGroups(parseTleText(STATIONS, "station"), parseTleText(VISUAL, "visual"));
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: tles, meta: { source: "live", provider: "CelesTrak (TLE) + SGP4", fetchedAt: "", stale: false } }))) as typeof fetch;
    await useObservatoryStore.getState().loadLayerData("ISS_SATELLITES");
    const s = useObservatoryStore.getState();
    assert.ok(s.satellites.length >= 2);
    s.refreshIssTelemetry(EPOCH_MS);
    const t = useObservatoryStore.getState().issTelemetry!;
    assert.equal(t.tleEpoch, tles.find((x) => x.noradId === ISS_NORAD_ID)!.epoch);
    const direct = propagateState(toSatrec(tles.find((x) => x.noradId === ISS_NORAD_ID)!)!, new Date(EPOCH_MS))!;
    assert.ok(Math.abs(t.latitude - direct.lat) < 1e-3 && Math.abs(t.longitude - direct.lng) < 1e-3, "HUD e modelo usam a mesma posição");

    useObservatoryStore.getState().setSelectedEntity({ type: "ISS", data: t });
    const html = renderToStaticMarkup(<ObservatoryTelemetryHUD />);
    assert.match(html, /calculada por SGP4 a partir do TLE do CelesTrak/);
  });

  test("filtro por categoria e contagem (sem contar a ISS)", () => {
    const tles = mergeSatelliteGroups(parseTleText(STATIONS, "station"), parseTleText(VISUAL, "visual"));
    useObservatoryStore.setState({ satellites: tles, satelliteCategories: ["station"] });
    const html = renderToStaticMarkup(<SatelliteLayerControls />);
    assert.match(html, /aria-pressed="true"[^>]*>.*Estações espaciais/);
    assert.match(html, /aria-pressed="false"[^>]*>.*Visíveis a olho nu/);
    useObservatoryStore.getState().toggleSatelliteCategory("visual");
    assert.deepEqual(useObservatoryStore.getState().satelliteCategories, ["station", "visual"]);
  });

  test("card de outro satélite: nome, NORAD, altitude e época do TLE", () => {
    useObservatoryStore.getState().setSelectedEntity({
      type: "SATELLITE",
      data: { name: "CSS (TIANHE)", noradId: 48274, category: "station", lat: 10, lng: 20, altKm: 381.4, velocityKmh: 27700, tleEpoch: "2026-11-20T00:00:00.000Z", timestamp: EPOCH_MS },
    });
    const html = renderToStaticMarkup(<ObservatoryTelemetryHUD />);
    assert.match(html, /CSS \(TIANHE\)/);
    assert.match(html, /NORAD ID: 48274/);
    assert.match(html, />381 km</);
  });
});

describe("D04: invariantes no código", () => {
  const read = (f: string) => fs.readFileSync(path.join(root, f), "utf-8");
  test("camada da ISS sem o raio inventado 1.18 e sem o modelo antigo", () => {
    const layer = read("src/components/globe/IssOrbitLayer.tsx");
    assert.doesNotMatch(layer, /1\.18/);
    assert.doesNotMatch(layer, /calculateIssPosition/);
    assert.match(layer, /altitudeToSceneRadius/);
    assert.doesNotMatch(read("src/lib/observatory-data.ts"), /1700000000000/, "época arbitrária removida");
  });
});
