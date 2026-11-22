import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WIND_GRID_POINT_COUNT,
  buildClimatologyWindField,
  buildOpenMeteoGfsUrl,
  formatWindSpeed,
  isValidWindFieldPayload,
  parseOpenMeteoGfsResponse,
  sampleWindGrid,
  speedDirectionToUV,
  windScaleLabels,
} from "../src/lib/winds-data";
import { createWindsSource } from "../src/lib/winds-source";
import { WindLayerControls } from "../src/components/observatory/WindLayerControls";
import { windParticleCountForPreset } from "../src/components/globe/WindParticlesLayer";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { studyInput } from "../src/lib/study-schema";

describe("D27a · Camada de Ventos Globais (NOAA GFS + partículas GPU)", () => {
  test("1. speedDirectionToUV respeita convenção meteorológica (de onde o vento sopra)", () => {
    const fromNorth = speedDirectionToUV(10, 0);
    assert.ok(Math.abs(fromNorth.u) < 0.01 && fromNorth.v < -9.9, "vento do Norte sopra para o Sul (v < 0)");

    const fromEast = speedDirectionToUV(10, 90);
    assert.ok(fromEast.u < -9.9 && Math.abs(fromEast.v) < 0.01, "vento do Leste sopra para o Oeste (u < 0)");

    const fromWest = speedDirectionToUV(12, 270);
    assert.ok(fromWest.u > 11.9 && Math.abs(fromWest.v) < 0.01, "vento do Oeste sopra para o Leste (u > 0)");

    assert.deepEqual(speedDirectionToUV(Number.NaN, 180), { u: 0, v: 0 });
    assert.deepEqual(speedDirectionToUV(-5, 90), { u: 0, v: 0 });
  });

  test("2. buildClimatologyWindField produz grade 9×16 fisicamente coerente e interpolação contínua em ±180°", () => {
    const field = buildClimatologyWindField("2026-11-22T05:00:00Z");
    assert.ok(isValidWindFieldPayload(field));
    assert.equal(field.surface.u.length, WIND_GRID_POINT_COUNT);
    assert.equal(field.jet250.u.length, WIND_GRID_POINT_COUNT);

    // Corrente de jato (250 hPa) mais intensa que superfície (10 m)
    assert.ok(field.jet250.maxSpeedMs > field.surface.maxSpeedMs * 1.5);

    // Alísios tropicais sopram predominantemente para Oeste (u < 0) próximo ao Equador
    const out = { u: 0, v: 0, speed: 0 };
    sampleWindGrid(field.surface, 0, -30, out);
    assert.ok(out.u < 0, `esperava alísio para Oeste no Atlântico equatorial, obteve u=${out.u}`);

    // Ventos de Oeste no Oceano Austral (~50°S) sopram para Leste (u > 0)
    sampleWindGrid(field.surface, -50, 0, out);
    assert.ok(out.u > 5, `esperava ventos de oeste no Oceano Austral, obteve u=${out.u}`);

    // Continuidade através do antimeridiano ±180°
    const eastEdge = { u: 0, v: 0, speed: 0 };
    const westEdge = { u: 0, v: 0, speed: 0 };
    sampleWindGrid(field.surface, -36, 179.9, eastEdge);
    sampleWindGrid(field.surface, -36, -179.9, westEdge);
    assert.ok(Math.abs(eastEdge.u - westEdge.u) < 0.2, "interpolação deve ser contínua no antimeridiano");
    assert.ok(Math.abs(eastEdge.v - westEdge.v) < 0.2);
  });

  test("3. parseOpenMeteoGfsResponse e createWindsSource cumprem contrato T05 (live, cache, stale e fallback)", async () => {
    const url = buildOpenMeteoGfsUrl();
    assert.match(url, /^https:\/\/api\.open-meteo\.com\/v1\/gfs\?/);
    assert.match(url, /wind_speed_10m/);
    assert.match(url, /wind_speed_250hPa/);

    const mockItems = Array.from({ length: WIND_GRID_POINT_COUNT }, (_, i) => ({
      current: {
        time: "2026-11-22T05:00",
        wind_speed_10m: 5 + (i % 10),
        wind_direction_10m: 270,
      },
      hourly: {
        time: ["2026-11-22T05:00"],
        wind_speed_250hPa: [35 + (i % 15)],
        wind_direction_250hPa: [265],
      },
    }));

    const parsed = parseOpenMeteoGfsResponse(mockItems, "2026-11-22T05:00:00Z");
    assert.ok(parsed && isValidWindFieldPayload(parsed));
    assert.ok(parsed.surface.maxSpeedMs >= 13.9);
    assert.ok(parsed.jet250.maxSpeedMs >= 48.9);

    // Resposta incompleta deve ser rejeitada
    assert.equal(parseOpenMeteoGfsResponse(mockItems.slice(0, 10), "2026-11-22T05:00:00Z"), null);

    // Fonte live + cache + fallback rotulado (T05)
    let calls = 0;
    let shouldFail = false;
    const source = createWindsSource(async () => {
      calls++;
      if (shouldFail) return new Response("error", { status: 503 });
      return new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const t0 = 1_700_000_000_000;
    const liveRes = await source.get(t0);
    assert.equal(liveRes.envelope.meta.source, "live");
    assert.equal(liveRes.envelope.meta.stale, false);
    assert.equal(liveRes.cacheHit, false);
    assert.equal(calls, 1);

    const cachedRes = await source.get(t0 + 60_000);
    assert.equal(cachedRes.cacheHit, true);
    assert.equal(calls, 1);

    // Quando provedor falha sem lastGood → fallback climatológico rotulado
    const offlineSource = createWindsSource(async () => {
      throw new Error("network down");
    });
    const fbRes = await offlineSource.get(t0);
    assert.equal(fbRes.envelope.meta.source, "fallback");
    assert.ok(fbRes.envelope.meta.reason);
    assert.ok(isValidWindFieldPayload(fbRes.envelope.data));

    // Quando provedor falha após leitura live válida → serve lastGood marcado como stale
    shouldFail = true;
    const staleRes = await source.get(t0 + 31 * 60_000);
    assert.equal(staleRes.envelope.meta.source, "live");
    assert.equal(staleRes.envelope.meta.stale, true);
  });

  test("4. WindLayerControls renderiza seletor de altitude, unidade (km/h e nós), legenda e nota de fallback", () => {
    const field = buildClimatologyWindField("2026-11-22T05:00:00Z");
    useObservatoryStore.setState({
      winds: field,
      windAltitude: "surface",
      windUnit: "kmh",
      layerMeta: {
        ...useObservatoryStore.getState().layerMeta,
        GLOBAL_WINDS: {
          source: "fallback",
          provider: "TellusPedia (climatologia de referência)",
          fetchedAt: "2026-11-22T05:00:00Z",
          stale: false,
          reason: "Teste offline",
        },
      },
    });

    const htmlKmh = renderToStaticMarkup(<WindLayerControls />);
    assert.match(htmlKmh, /Superfície \(10 m\)/);
    assert.match(htmlKmh, /Jato \(250 hPa\)/);
    assert.match(htmlKmh, /km\/h/);
    assert.match(htmlKmh, /nós/);
    assert.match(htmlKmh, /winds-fallback-note/);

    useObservatoryStore.setState({ windAltitude: "jet250", windUnit: "knots" });
    const htmlKnots = renderToStaticMarkup(<WindLayerControls />);
    assert.match(htmlKnots, /data-testid="winds-altitude-jet250"[^>]*aria-pressed="true"/);
    assert.match(htmlKnots, /data-testid="winds-unit-knots"[^>]*aria-pressed="true"/);
    assert.equal(windScaleLabels("surface", "kmh").length, 5);
    assert.match(formatWindSpeed(10, "kmh"), /36 km\/h/);
    assert.match(formatWindSpeed(10, "knots"), /19 nós/);
  });

  test("5. WindParticlesLayer respeita T39, RN21 (dispose), RN22 (isThrottled) e schema de estudos aceita GLOBAL_WINDS", () => {
    assert.ok(windParticleCountForPreset("low") < windParticleCountForPreset("medium"));
    assert.ok(windParticleCountForPreset("medium") < windParticleCountForPreset("high"));
    assert.equal(windParticleCountForPreset("auto"), windParticleCountForPreset("high"));

    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/WindParticlesLayer.tsx"),
      "utf-8"
    );
    assert.match(src, /geometry\.dispose\(\)/, "deve descartar BufferGeometry (RN21)");
    assert.match(src, /material\.dispose\(\)/, "deve descartar ShaderMaterial (RN21)");
    assert.match(src, /isThrottled/, "deve pausar advecção quando isThrottled (RN22)");
    assert.match(src, /-\(radius \* sinPhi \* Math\.cos\(theta\)\)/, "projeção esférica não-espelhada (AGENTS.md §1)");

    const parsedStudy = studyInput.safeParse({
      title: "Estudo de Corrente de Jato",
      activeObservatoryLayers: ["GLOBAL_WINDS"],
    });
    assert.equal(parsedStudy.success, true);
  });
});
