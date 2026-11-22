import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WIND_GRID_POINT_COUNT, buildClimatologyWindField } from "../src/lib/winds-data";
import {
  OCEAN_LAYER_RADIUS,
  WIND_LAYER_RADIUS,
  splitParticleCountForBoth,
  windParticleCountForPreset,
} from "../src/components/globe/WindParticlesLayer";
import {
  buildClimatologyCurrentsGrid,
  buildOpenMeteoMarineUrl,
  currentScaleLabels,
  formatCurrentSpeed,
  isValidOceanCurrentGrid,
  oceanSpeedDirectionToUV,
  parseOpenMeteoMarineResponse,
  sampleOceanCurrentGrid,
} from "../src/lib/currents-data";
import { createCurrentsSource } from "../src/lib/currents-source";
import { WindLayerControls } from "../src/components/observatory/WindLayerControls";
import { useObservatoryStore } from "../src/stores/observatoryStore";

describe("D27b · Correntes Oceânicas Superficiais (Open-Meteo Marine + motor GPU)", () => {
  test("1. oceanSpeedDirectionToUV respeita convenção oceanográfica (direção para onde flui)", () => {
    const north = oceanSpeedDirectionToUV(0.8, 0);
    assert.ok(Math.abs(north.u) < 0.01 && north.v > 0.79, "0° flui para o Norte (v > 0)");

    const east = oceanSpeedDirectionToUV(0.6, 90);
    assert.ok(east.u > 0.59 && Math.abs(east.v) < 0.01, "90° flui para o Leste (u > 0)");

    const west = oceanSpeedDirectionToUV(0.5, 270);
    assert.ok(west.u < -0.49 && Math.abs(west.v) < 0.01, "270° flui para o Oeste (u < 0)");

    assert.deepEqual(oceanSpeedDirectionToUV(Number.NaN, 90), { u: 0, v: 0 });
    assert.deepEqual(oceanSpeedDirectionToUV(-1, 90), { u: 0, v: 0 });
  });

  test("2. buildClimatologyCurrentsGrid modela giros reais, mascara terra e envolve ±180°", () => {
    const grid = buildClimatologyCurrentsGrid("2026-11-22T06:00:00Z");
    assert.ok(isValidOceanCurrentGrid(grid));
    assert.equal(grid.u.length, WIND_GRID_POINT_COUNT);
    assert.ok(grid.oceanCells >= 70 && grid.oceanCells < WIND_GRID_POINT_COUNT, "deve distinguir oceano e continentes");

    const sample = { u: 0, v: 0, speed: 0, inOcean: false };

    // Corrente do Golfo (Atlântico NW): flui para Nordeste (u > 0, v > 0)
    sampleOceanCurrentGrid(grid, 36, -67.5, sample);
    assert.equal(sample.inOcean, true);
    assert.ok(sample.u > 0.3 && sample.v > 0.2, `esperava Corrente do Golfo NE, obteve u=${sample.u}, v=${sample.v}`);

    // Corrente Circumpolar Antártica (~54°S): flui para Leste (u > 0)
    sampleOceanCurrentGrid(grid, -54, 0, sample);
    assert.equal(sample.inOcean, true);
    assert.ok(sample.u > 0.3, `esperava ACC para Leste, obteve u=${sample.u}`);

    // Interior continental (Sibéria / Eurásia): mascarado como terra
    sampleOceanCurrentGrid(grid, 54, 67.5, sample);
    assert.equal(sample.inOcean, false);
    assert.equal(sample.speed, 0);

    // Continuidade através do antimeridiano ±180° no Pacífico Sul
    const eastEdge = { u: 0, v: 0, speed: 0, inOcean: false };
    const westEdge = { u: 0, v: 0, speed: 0, inOcean: false };
    sampleOceanCurrentGrid(grid, -36, 179.9, eastEdge);
    sampleOceanCurrentGrid(grid, -36, -179.9, westEdge);
    assert.equal(eastEdge.inOcean, true);
    assert.equal(westEdge.inOcean, true);
    assert.ok(Math.abs(eastEdge.u - westEdge.u) < 0.05);
  });

  test("3. parseOpenMeteoMarineResponse e createCurrentsSource cumprem T05 (conversão km/h→m/s, máscara null, cache, stale, fallback)", async () => {
    const url = buildOpenMeteoMarineUrl();
    assert.match(url, /^https:\/\/marine-api\.open-meteo\.com\/v1\/marine\?/);
    assert.match(url, /ocean_current_velocity/);
    assert.match(url, /ocean_current_direction/);

    // 100 pontos oceânicos (1,8 km/h = 0,5 m/s para Leste) + 44 pontos de terra (null)
    const mockItems = Array.from({ length: WIND_GRID_POINT_COUNT }, (_, i) => ({
      current_units: { ocean_current_velocity: "km/h" },
      current:
        i < 100
          ? { time: "2026-11-22T06:00", ocean_current_velocity: 1.8, ocean_current_direction: 90 }
          : { time: "2026-11-22T06:00", ocean_current_velocity: null, ocean_current_direction: null },
    }));

    const parsed = parseOpenMeteoMarineResponse(mockItems, "2026-11-22T06:00:00Z");
    assert.ok(parsed && isValidOceanCurrentGrid(parsed));
    assert.equal(parsed.oceanCells, 100);
    assert.equal(parsed.mask[0], 1);
    assert.equal(parsed.mask[120], 0);
    assert.ok(Math.abs(parsed.u[0] - 0.5) < 0.01, "1,8 km/h para 90° deve virar u = +0,5 m/s");

    // Grade com poucos pontos oceânicos deve ser rejeitada
    const tooFewOcean = mockItems.map((it, i) =>
      i < 20 ? it : { current: { ocean_current_velocity: null, ocean_current_direction: null } }
    );
    assert.equal(parseOpenMeteoMarineResponse(tooFewOcean, "2026-11-22T06:00:00Z"), null);

    let calls = 0;
    let shouldFail = false;
    const source = createCurrentsSource(async () => {
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
    assert.equal(liveRes.cacheHit, false);
    assert.equal(calls, 1);

    const cachedRes = await source.get(t0 + 120_000);
    assert.equal(cachedRes.cacheHit, true);
    assert.equal(calls, 1);

    const offlineSource = createCurrentsSource(async () => {
      throw new Error("offline");
    });
    const fbRes = await offlineSource.get(t0);
    assert.equal(fbRes.envelope.meta.source, "fallback");
    assert.ok(isValidOceanCurrentGrid(fbRes.envelope.data));

    shouldFail = true;
    const staleRes = await source.get(t0 + 61 * 60_000);
    assert.equal(staleRes.envelope.meta.source, "live");
    assert.equal(staleRes.envelope.meta.stale, true);
  });

  test("4. WindLayerControls renderiza seletor Ventos ↔ Correntes, unidades m/s e nós, legenda oceânica e nota de fallback", () => {
    const currents = buildClimatologyCurrentsGrid("2026-11-22T06:00:00Z");
    useObservatoryStore.setState({
      flowMode: "currents",
      currents,
      currentUnit: "ms",
      currentsMeta: {
        source: "fallback",
        provider: "TellusPedia (giros oceânicos de referência)",
        fetchedAt: "2026-11-22T06:00:00Z",
        stale: false,
        reason: "Teste offline",
      },
    });

    const htmlMs = renderToStaticMarkup(<WindLayerControls />);
    assert.match(htmlMs, /data-testid="flow-mode-currents"[^>]*aria-pressed="true"/);
    assert.match(htmlMs, /data-testid="currents-unit-ms"[^>]*aria-pressed="true"/);
    assert.match(htmlMs, /m\/s/);
    assert.match(htmlMs, /nós/);
    assert.match(htmlMs, /currents-fallback-note/);

    useObservatoryStore.setState({ currentUnit: "knots" });
    const htmlKnots = renderToStaticMarkup(<WindLayerControls />);
    assert.match(htmlKnots, /data-testid="currents-unit-knots"[^>]*aria-pressed="true"/);
    assert.equal(currentScaleLabels("ms").length, 5);
    assert.match(formatCurrentSpeed(0.5, "ms"), /0,50 m\/s/);
    assert.match(formatCurrentSpeed(0.5, "knots"), /1,0 nós/);

    // Restaura modo padrão para não interferir em outros testes
    useObservatoryStore.setState({ flowMode: "winds" });
  });

  test("5. Modo Ambos exibe controles/legendas simultâneos, camadas em raios distintos e orçamento dividido T39", () => {
    const winds = buildClimatologyWindField("2026-11-22T06:00:00Z");
    const currents = buildClimatologyCurrentsGrid("2026-11-22T06:00:00Z");
    useObservatoryStore.setState({
      flowMode: "both",
      winds,
      currents,
      windAltitude: "surface",
      windUnit: "kmh",
      currentUnit: "ms",
    });

    const htmlBoth = renderToStaticMarkup(<WindLayerControls />);
    assert.match(htmlBoth, /data-testid="flow-mode-both"[^>]*aria-pressed="true"/);
    assert.match(htmlBoth, /data-testid="winds-altitude-surface"/);
    assert.match(htmlBoth, /data-testid="winds-unit-kmh"/);
    assert.match(htmlBoth, /data-testid="currents-unit-ms"/);
    assert.match(htmlBoth, /Ventos atmosféricos:/);
    assert.match(htmlBoth, /Superfície oceânica:/);

    // Correntes rentes ao mar abaixo dos ventos atmosféricos + orçamento particionado por preset T39
    assert.ok(OCEAN_LAYER_RADIUS < WIND_LAYER_RADIUS);
    assert.ok(splitParticleCountForBoth("high") < windParticleCountForPreset("high"));
    assert.ok(splitParticleCountForBoth("low") < splitParticleCountForBoth("high"));

    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/WindParticlesLayer.tsx"),
      "utf-8"
    );
    assert.match(src, /uPaletteMode/, "alternância Ventos ↔ Correntes deve usar uniform de paleta");
    assert.match(src, /getContemporarySpatialIndex/, "deve mascarar continentes via índice espacial Natural Earth");
    assert.match(src, /sampleOceanCurrentGrid/, "deve amostrar grade oceânica mascarada");

    // Restaura modo padrão
    useObservatoryStore.setState({ flowMode: "winds" });
  });
});
