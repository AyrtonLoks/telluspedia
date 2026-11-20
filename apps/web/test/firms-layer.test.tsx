import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import { FirmsLayerControls } from "../src/components/observatory/FirmsLayerControls";
import { FirmsCountrySummary } from "../src/components/observatory/FirmsCountrySummary";
import { buildFirePickIndex, buildFirmsGeometry, firePickCandidates, fireWorldSize } from "../src/components/globe/NasaFirmsLayer";
import { EarthShader } from "../src/components/globe/EarthShaderMaterial";
import { FIRMS_FRP_STOPS, firmsMapUrl, formatAcqTime, frpColor, frpSize } from "../src/lib/firms-display";
import { FIRMS_SCHEMA, encodeFirmsColumns } from "../src/lib/firms-aggregate";
import type { FirmsHotspot } from "../src/lib/observatory-data";

const HOT: FirmsHotspot = {
  id: "f1",
  lat: -9.5,
  lng: -55.5,
  brightness: 367,
  frp: 48.9,
  confidence: "high",
  satellite: "VIIRS",
  acqDate: "2026-11-19",
  acqTime: "0548",
  daynight: "D",
};

describe("D05: representação visual", () => {
  test("escala de cor sem amarelo-claro (cor das luzes urbanas) e monotônica", () => {
    for (const stop of FIRMS_FRP_STOPS) {
      const [r, g, b] = stop.rgb;
      assert.ok(!(r > 0.9 && g > 0.7 && b < 0.6), `parada ${stop.hex} parece luz urbana`);
    }
    assert.deepEqual(frpColor(0), [...FIRMS_FRP_STOPS[0].rgb]);
    let prevG = 2;
    for (const frp of [0, 5, 20, 50, 80, 150, 300, 1000]) {
      const g = frpColor(frp)[1];
      assert.ok(g <= prevG + 1e-9, `verde deve cair com o FRP (${frp})`);
      prevG = g;
    }
  });

  test("tamanho do marcador cresce com o FRP e satura", () => {
    assert.ok(fireWorldSize(100) > fireWorldSize(5));
    assert.equal(frpSize(1e6), 3.2);
  });

  test("um vértice por foco, com cor e tamanho (cada ponto = um foco)", () => {
    const fires = [HOT, { ...HOT, id: "f2", lat: 10, lng: 20 }];
    const geo = buildFirmsGeometry(fires, () => [1, 0.4, 0.1], () => 0.01);
    assert.equal(geo.getAttribute("position").count, fires.length);
    assert.equal(geo.getAttribute("aColor").itemSize, 3);
    assert.equal(geo.getAttribute("aSize").count, fires.length);
    geo.dispose();
  });

  test("índice de picking: acha focos vizinhos, ignora distantes e cruza o antimeridiano", () => {
    const idx = buildFirePickIndex([
      { lat: -22.9, lng: -47.06 },
      { lat: -22.95, lng: -47.1 },
      { lat: 10, lng: 20 },
      { lat: 0.1, lng: 179.9 },
    ]);
    const near = firePickCandidates(idx, -22.92, -47.08, 0.003);
    assert.ok(near.includes(0) && near.includes(1));
    assert.ok(!near.includes(2));
    assert.ok(firePickCandidates(idx, 0.1, -179.9, 0.003).includes(3), "célula do outro lado do antimeridiano");
  });

  test("picking com 170 mil focos (5 dias) é barato por consulta", () => {
    const n = 170_000;
    const items = Array.from({ length: n }, (_, i) => ({ lat: ((i * 7919) % 18000) / 100 - 90, lng: ((i * 104729) % 36000) / 100 - 180 }));
    const t0 = performance.now();
    const idx = buildFirePickIndex(items);
    const build = performance.now() - t0;
    const t1 = performance.now();
    for (let k = 0; k < 200; k++) firePickCandidates(idx, -20 + k * 0.1, -50 + k * 0.1, 0.004);
    const perQuery = (performance.now() - t1) / 200;
    assert.ok(perQuery < 1, `consulta deveria levar < 1 ms, levou ${perQuery.toFixed(3)} ms`);
    assert.ok(build < 2000, `índice deveria montar em < 2 s, levou ${build.toFixed(0)} ms`);
  });

  test("shader do globo tem controle de intensidade das luzes urbanas", () => {
    assert.equal(EarthShader.uniforms.uCityLights.value, 1);
    assert.match(EarthShader.fragmentShader, /nightColor \* 1\.05 \* uCityLights/);
  });

  test("link da fonte primária e hora formatada", () => {
    assert.equal(formatAcqTime("548"), "05:48");
    assert.match(firmsMapUrl(-9.5, -55.5, "2026-11-19"), /^https:\/\/firms\.modaps\.eosdis\.nasa\.gov\/map\/#d:2026-11-19\.\.2026-11-19;@-55\.500,-9\.500,9z$/);
  });
});

describe("D05: store e UI", () => {
  const realFetch = globalThis.fetch;
  let urls: string[] = [];
  let respond: () => Response;

  const envelope = (extra: Record<string, unknown> = {}) =>
    new Response(
      JSON.stringify({
        data: encodeFirmsColumns([HOT]),
        meta: { source: "live", provider: "NASA FIRMS (VIIRS NOAA-21 NRT)", fetchedAt: "2026-11-20T00:00:00Z", stale: false },
        total: 1,
        byCountry: { BRA: { count: 1, frpSum: 48.9, frpMax: 48.9 } },
        window: { days: 1, confidence: "nominal" },
        schema: FIRMS_SCHEMA,
        ...extra,
      }),
      { status: 200 }
    );

  beforeEach(() => {
    urls = [];
    respond = () => envelope();
    useTimelineStore.setState({ selectedYear: null, selectedMilestoneId: null });
    useObservatoryStore.setState({ firmsWindow: { days: 1, confidence: "nominal" }, selectedEntity: null, firmsByCountry: null });
    useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
    globalThis.fetch = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return respond();
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    useObservatoryStore.setState({ firmsWindow: { days: 1, confidence: "nominal" }, selectedEntity: null, isPanelOpen: false });
    useGlobeStore.setState({ selectedIso: null });
  });

  test("loadLayerData pede o schema atual (fura o cache HTTP antigo) e decodifica todos os focos", async () => {
    await useObservatoryStore.getState().loadLayerData("NASA_FIRMS");
    assert.equal(urls[0], `/api/observatory/firms?days=1&confidence=nominal&schema=${FIRMS_SCHEMA}`);
    const s = useObservatoryStore.getState();
    assert.equal(s.firmsHotspots.length, 1);
    assert.equal(s.firmsHotspots[0].frp, 48.9);
    assert.equal(s.firmsByCountry?.BRA.count, 1);
  });

  test("resposta sem byCountry (ex.: formato antigo) → contagem indisponível, nunca 'nenhum foco'", async () => {
    respond = () => envelope({ byCountry: undefined });
    await useObservatoryStore.getState().loadLayerData("NASA_FIRMS");
    assert.equal(useObservatoryStore.getState().firmsByCountry, null);
    const html = renderToStaticMarkup(<FirmsCountrySummary iso="BRA" />);
    assert.match(html, /Contagem por país indisponível/);
    assert.doesNotMatch(html, /Nenhum foco/);
  });

  test("resumo do país: todos os focos da janela no território, FRP somado e maior foco", () => {
    useObservatoryStore.setState({
      firmsByCountry: { BRA: { count: 3412, frpSum: 98765.4, frpMax: 410.2 } },
      firmsWindow: { days: 2, confidence: "nominal" },
    });
    const html = renderToStaticMarkup(<FirmsCountrySummary iso="BRA" />);
    assert.match(html, /Brasil · nas últimas 48 h/);
    assert.match(html, />3\.412</);
    assert.match(html, />98\.765</);
    assert.match(html, />410,2</);
    assert.match(renderToStaticMarkup(<FirmsCountrySummary iso="ISL" />), /Nenhum foco detectado/);
  });

  test("setFirmsWindow recarrega com os novos parâmetros e não refaz se nada mudou", async () => {
    useObservatoryStore.getState().setFirmsWindow({ days: 5, confidence: "all" });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(urls.at(-1), `/api/observatory/firms?days=5&confidence=all&schema=${FIRMS_SCHEMA}`);
    const n = urls.length;
    useObservatoryStore.getState().setFirmsWindow({ days: 5 });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(urls.length, n);
  });

  test("card do foco: data/hora UTC, satélite, FRP, confiança e link da fonte (RN02)", () => {
    useObservatoryStore.getState().setSelectedEntity({ type: "FIRMS", data: HOT });
    const html = renderToStaticMarkup(<ObservatoryTelemetryHUD />);
    assert.match(html, /Foco de Calor \(FIRMS\)/);
    assert.match(html, /2026-11-19 · 05:48 UTC/);
    assert.match(html, /VIIRS · passagem diurna/);
    assert.match(html, /48,9 MW/);
    assert.match(html, />Alta</);
    assert.match(html, /href="https:\/\/firms\.modaps\.eosdis\.nasa\.gov\/map\//);
  });

  test("controles: janelas 24 h/48 h/5 dias, filtro de confiança e legenda explicativa", () => {
    useObservatoryStore.setState({ firmsWindow: { days: 2, confidence: "nominal" } });
    const html = renderToStaticMarkup(<FirmsLayerControls />);
    assert.match(html, />24 h</);
    assert.match(html, /aria-pressed="true"[^>]*>48 h</);
    assert.match(html, />5 dias</);
    assert.match(html, /Incluir focos de baixa confiança/);
    assert.match(html, /Cada marcador é um foco de calor detectado por satélite/);
    assert.match(html, /luzes das cidades/);
  });
});
