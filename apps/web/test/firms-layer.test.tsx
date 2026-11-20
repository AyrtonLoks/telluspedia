import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import { FirmsLayerControls } from "../src/components/observatory/FirmsLayerControls";
import { buildFirmsGeometry, firmsLayerOpacities, visibleFirmsBbox } from "../src/components/globe/NasaFirmsLayer";
import { FirmsCountrySummary } from "../src/components/observatory/FirmsCountrySummary";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { useGlobeStore } from "../src/stores/globeStore";
import { inFirmsBbox } from "../src/lib/firms-aggregate";
import { FIRMS_FRP_STOPS, firmsMapUrl, formatAcqTime, frpColor, frpSize } from "../src/lib/firms-display";
import { useTimelineStore } from "../src/stores/timelineStore";
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

describe("D05: escala visual", () => {
  test("cor por FRP vai do amarelo ao magenta e é monotônica no vermelho", () => {
    assert.deepEqual(frpColor(0), [...FIRMS_FRP_STOPS[0].rgb]);
    assert.deepEqual(frpColor(10_000), [...FIRMS_FRP_STOPS[FIRMS_FRP_STOPS.length - 1].rgb]);
    let prevG = 2;
    for (const frp of [0, 5, 20, 50, 80, 150, 300]) {
      const g = frpColor(frp)[1];
      assert.ok(g <= prevG + 1e-9, `verde deve cair com o FRP (${frp})`);
      prevG = g;
    }
  });

  test("tamanho cresce com o FRP e satura", () => {
    assert.equal(frpSize(0), 1);
    assert.ok(frpSize(100) > frpSize(10));
    assert.equal(frpSize(1e6), 3.2);
  });

  test("transição foco ↔ heatmap pela distância da câmera", () => {
    const near = firmsLayerOpacities(1.6, true);
    const mid = firmsLayerOpacities(2.5);
    const far = firmsLayerOpacities(4.5);
    assert.equal(near.points, 1);
    assert.equal(near.cells, 0);
    assert.ok(mid.points > 0.8 && mid.cells > 0.3, "no zoom padrão os dois se somam");
    assert.equal(far.points, 0);
    assert.equal(far.cells, 1);
  });

  test("de perto, sem o detalhe carregado, as manchas não somem; com detalhe, saem de cena", () => {
    assert.equal(firmsLayerOpacities(1.8, false).cells, 0.35);
    assert.equal(firmsLayerOpacities(1.8, true).cells, 0);
    assert.equal(firmsLayerOpacities(1.8, true).points, 1);
  });

  test("recorte visível: horizonte pela distância, arredondado, com antimeridiano e polos", () => {
    const b = visibleFirmsBbox({ lat: -12.3, lng: -52.1 }, 1.6);
    // horizonte a d = 1,6: acos(1/1,6) ≈ 51,3° → 55°; centro arredondado para -10°
    assert.deepEqual([b.minLat, b.maxLat], [-65, 45]);
    assert.ok(inFirmsBbox(-12.3, -52.1, b), "o ponto sob a câmera está no recorte");
    assert.ok(!inFirmsBbox(-12.3, 120, b), "o lado oposto do globo fica de fora");
    const again = visibleFirmsBbox({ lat: -11.9, lng: -51.2 }, 1.61);
    assert.deepEqual(again, b, "movimentos pequenos não mudam o recorte (sem nova busca)");
    const wrap = visibleFirmsBbox({ lat: 0, lng: 178 }, 1.2);
    assert.ok(wrap.minLng > wrap.maxLng, "atravessa o antimeridiano");
    const pole = visibleFirmsBbox({ lat: 80, lng: 0 }, 2.5);
    assert.deepEqual([pole.minLng, pole.maxLng], [-180, 180]);
  });

  test("geometria tem posição, cor, tamanho e fase por foco (sem quadrados de PointsMaterial)", () => {
    const geo = buildFirmsGeometry([HOT, { ...HOT, lat: 10, lng: 20 }], () => [1, 0.5, 0], () => 0.01);
    assert.equal(geo.getAttribute("position").count, 2);
    assert.equal(geo.getAttribute("aColor").itemSize, 3);
    assert.equal(geo.getAttribute("aSize").count, 2);
    const phase = geo.getAttribute("aPhase").getX(0);
    assert.ok(phase >= 0 && phase < 1);
    geo.dispose();
  });

  test("link da fonte primária e hora formatada", () => {
    assert.equal(formatAcqTime("548"), "05:48");
    const url = firmsMapUrl(-9.5, -55.5, "2026-11-19");
    assert.match(url, /^https:\/\/firms\.modaps\.eosdis\.nasa\.gov\/map\/#d:2026-11-19\.\.2026-11-19;@-55\.500,-9\.500,9z$/);
  });
});

describe("D05: store e UI", () => {
  const realFetch = globalThis.fetch;
  let urls: string[] = [];

  beforeEach(() => {
    urls = [];
    useTimelineStore.setState({ selectedYear: null, selectedMilestoneId: null, geologicalMa: null });
    useObservatoryStore.setState({ firmsWindow: { days: 1, confidence: "nominal" }, selectedEntity: null });
    globalThis.fetch = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({
          data: [HOT],
          meta: { source: "live", provider: "NASA FIRMS (VIIRS NOAA-21 NRT)", fetchedAt: "2026-11-20T00:00:00Z", stale: false },
          cells: [{ lat: -9.5, lng: -55.5, count: 12, frpSum: 300, frpMax: 48.9, latestDate: "2026-11-19" }],
          total: 4321,
          window: { days: 5, confidence: "all" },
        }),
        { status: 200 }
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    useObservatoryStore.setState({ firmsWindow: { days: 1, confidence: "nominal" }, selectedEntity: null });
  });

  test("loadLayerData envia janela/confiança e guarda células e total", async () => {
    await useObservatoryStore.getState().loadLayerData("NASA_FIRMS");
    assert.equal(urls[0], "/api/observatory/firms?days=1&confidence=nominal");
    const s = useObservatoryStore.getState();
    assert.equal(s.firmsTotal, 4321);
    assert.equal(s.firmsCells[0].count, 12);
    assert.equal(s.firmsHotspots[0].id, "f1");
  });

  test("setFirmsWindow recarrega com os novos parâmetros e não refaz se nada mudou", async () => {
    useObservatoryStore.getState().setFirmsWindow({ days: 5, confidence: "all" });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(urls.at(-1), "/api/observatory/firms?days=5&confidence=all");
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
    const none = renderToStaticMarkup(<FirmsCountrySummary iso="ISL" />);
    assert.match(none, /Nenhum foco detectado/);
  });

  test("painel do Observatório fica ao lado do Inspector quando há país selecionado", () => {
    useObservatoryStore.setState({ isPanelOpen: true });
    useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
    assert.match(renderToStaticMarkup(<ObservatoryPanel />), /data-beside-inspector="false"/);
    useGlobeStore.setState({ selectedIso: "BRA" });
    const html = renderToStaticMarkup(<ObservatoryPanel />);
    assert.match(html, /data-beside-inspector="true"/);
    assert.match(html, /lg:right-\[26\.5rem\]/);
    useGlobeStore.setState({ selectedIso: null });
    useObservatoryStore.setState({ isPanelOpen: false });
  });

  test("detalhe da área visível: URL com bbox e resposta atrasada descartada", async () => {
    const pending: Array<(v: Response) => void> = [];
    globalThis.fetch = ((input: string | URL | Request) => {
      urls.push(String(input));
      return new Promise<Response>((resolve) => pending.push(resolve));
    }) as typeof fetch;
    const body = (id: string) =>
      new Response(JSON.stringify({ data: [{ ...HOT, id }], meta: { source: "live", provider: "x", fetchedAt: "", stale: false }, total: 1 }));

    const a = useObservatoryStore.getState().loadFirmsDetail({ minLng: -60, minLat: -20, maxLng: -40, maxLat: 0 });
    const b = useObservatoryStore.getState().loadFirmsDetail({ minLng: 100, minLat: -10, maxLng: 120, maxLat: 5 });
    assert.equal(urls[0], "/api/observatory/firms?days=1&confidence=nominal&bbox=-60,-20,-40,0");
    pending[1](body("novo"));
    await b;
    pending[0](body("antigo"));
    await a;
    assert.equal(useObservatoryStore.getState().firmsDetail?.hotspots[0].id, "novo");
    useObservatoryStore.getState().clearFirmsDetail();
    assert.equal(useObservatoryStore.getState().firmsDetail, null);
  });

  test("controles: janelas 24 h/48 h/5 dias, filtro de confiança e legenda", () => {
    useObservatoryStore.setState({ firmsWindow: { days: 2, confidence: "nominal" } });
    const html = renderToStaticMarkup(<FirmsLayerControls />);
    assert.match(html, />24 h</);
    assert.match(html, /aria-pressed="true"[^>]*>48 h</);
    assert.match(html, />5 dias</);
    assert.match(html, /aria-pressed="false"[^>]*>.*Incluir focos de baixa confiança/);
    assert.match(html, /300\+ MW/);
  });
});
