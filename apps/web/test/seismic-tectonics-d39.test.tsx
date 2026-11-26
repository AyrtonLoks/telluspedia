import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import {
  classifySeismicDepth,
  encodeSeismicView,
  readSeismicView,
  type TectonicPlatesCollection,
} from "../src/lib/seismic-types";
import {
  buildFallbackSeismicPayload,
  buildUsgsFeedUrl,
  parseUsgsGeoJson,
  sanitizeUsgsEventUrl,
} from "../src/lib/seismic-data";
import { createSeismicSource, resetSeismicSources } from "../src/lib/seismic-source";
import { GET as getEarthquakesRoute } from "../src/app/api/observatory/earthquakes/route";
import {
  buildPlateBoundaryGeometries,
  magnitudeToMarkerScale,
} from "../src/components/globe/SeismicTectonicLayer";
import { SeismicLayerControls } from "../src/components/observatory/SeismicLayerControls";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { searchExplore } from "../src/lib/explore/search";
import { studyInput, sanitizeStudy } from "../src/lib/study-schema";
import { collectStudyPrimarySources } from "../src/lib/study-export";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";

const webRoot = path.resolve(__dirname, "..");

function assertNoDivInsideParagraph(html: string, context: string) {
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  for (const p of paragraphs) {
    const inner = p.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "");
    assert.equal(/<div\b/i.test(inner), false, `${context}: proibido <div> dentro de <p>`);
  }
}

const SAMPLE_USGS_GEOJSON = {
  type: "FeatureCollection",
  metadata: { generated: 1764100000000, title: "USGS Magnitude 4.5+ Earthquakes" },
  features: [
    {
      type: "Feature",
      id: "us7000test1",
      properties: {
        mag: 6.8,
        place: "45 km WSW of Valparaiso, Chile",
        time: 1764095000000,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test1",
        tsunami: 1,
        sig: 711,
        magType: "mww",
      },
      geometry: {
        type: "Point",
        coordinates: [-72.12, -33.24, 34.5],
      },
    },
    {
      type: "Feature",
      id: "us7000test2",
      properties: {
        mag: 5.1,
        place: "Fiji region",
        time: 1764090000000,
        url: "javascript:alert(1)",
        tsunami: 0,
        sig: 400,
        magType: "mb",
      },
      geometry: {
        type: "Point",
        coordinates: [-178.45, -18.1, 560.2],
      },
    },
    {
      type: "Feature",
      id: "us7000test3",
      properties: {
        mag: 4.6,
        place: "Hindu Kush region, Afghanistan",
        time: 1764085000000,
        url: "https://evil.example.com/phish",
        tsunami: 0,
        sig: 326,
        magType: "mb",
      },
      geometry: {
        type: "Point",
        coordinates: [70.82, 36.48, 192.0],
      },
    },
  ],
};

describe("D39 · Parte 1: Proxy USGS GeoJSON, contrato T05 e sanitização de segurança", () => {
  beforeEach(() => {
    resetSeismicSources();
  });

  test("1. parseUsgsGeoJson classifica profundidades (Wadati–Benioff), filtra magnitudes e sanitiza URLs externas", () => {
    assert.equal(classifySeismicDepth(12), "shallow");
    assert.equal(classifySeismicDepth(69.9), "shallow");
    assert.equal(classifySeismicDepth(70), "intermediate");
    assert.equal(classifySeismicDepth(300), "intermediate");
    assert.equal(classifySeismicDepth(300.1), "deep");

    // Segurança: apenas https://earthquake.usgs.gov é aceito
    assert.equal(
      sanitizeUsgsEventUrl("https://earthquake.usgs.gov/earthquakes/eventpage/us123", "us123"),
      "https://earthquake.usgs.gov/earthquakes/eventpage/us123"
    );
    assert.equal(
      sanitizeUsgsEventUrl("javascript:alert(1)", "us123"),
      "https://earthquake.usgs.gov/earthquakes/eventpage/us123/executive"
    );
    assert.equal(
      sanitizeUsgsEventUrl("http://earthquake.usgs.gov/insecure", "us123"),
      "https://earthquake.usgs.gov/earthquakes/eventpage/us123/executive"
    );
    assert.equal(
      sanitizeUsgsEventUrl("https://evil.example.org/earthquakes", "us123"),
      "https://earthquake.usgs.gov/earthquakes/eventpage/us123/executive"
    );

    assert.equal(
      buildUsgsFeedUrl("24h", "2.5"),
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    );
    assert.equal(
      buildUsgsFeedUrl("30d", "6.0"),
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson"
    );

    const m45 = parseUsgsGeoJson(SAMPLE_USGS_GEOJSON, "7d", "4.5");
    assert.equal(m45.totalCount, 3);
    assert.equal(m45.maxMagnitude, 6.8);
    assert.equal(m45.tsunamiCount, 1);
    assert.equal(m45.events[0]!.depthBand, "shallow");
    assert.equal(m45.events[1]!.depthBand, "deep");
    assert.equal(m45.events[2]!.depthBand, "intermediate");
    assert.match(m45.events[1]!.usgsUrl, /^https:\/\/earthquake\.usgs\.gov\//);
    assert.match(m45.events[2]!.usgsUrl, /^https:\/\/earthquake\.usgs\.gov\//);

    const m60 = parseUsgsGeoJson(SAMPLE_USGS_GEOJSON, "7d", "6.0");
    assert.equal(m60.totalCount, 1);
    assert.equal(m60.events[0]!.id, "us7000test1");

    // Janela quieta sem eventos M6.0+ é válida (totalCount = 0), mas JSON inválido dispara erro
    const emptyValid = parseUsgsGeoJson({ type: "FeatureCollection", features: [] }, "24h", "6.0");
    assert.equal(emptyValid.totalCount, 0);
    assert.throws(() => parseUsgsGeoJson({ invalid: true }, "24h", "4.5"));
  });

  test("2. createSeismicSource e GET /api/observatory/earthquakes cumprem T05 (live, cache, stale, fallback) e rate-limit T43", async () => {
    let shouldFail = false;
    const mockFetch: typeof fetch = async () => {
      if (shouldFail) {
        return new Response("Service Unavailable", { status: 503 });
      }
      return Response.json(SAMPLE_USGS_GEOJSON);
    };

    const src = createSeismicSource("7d", "4.5", mockFetch);
    const t0 = 1_764_100_000_000;

    // 1) Live
    const liveRes = await src.get(t0);
    assert.equal(liveRes.cacheHit, false);
    assert.equal(liveRes.envelope.meta.source, "live");
    assert.equal(liveRes.envelope.meta.stale, false);
    assert.equal(liveRes.envelope.data.totalCount, 3);

    // 2) Cache HIT dentro do TTL (5 min)
    const cachedRes = await src.get(t0 + 60_000);
    assert.equal(cachedRes.cacheHit, true);
    assert.equal(cachedRes.envelope.meta.source, "live");

    // 3) Stale (provedor falha após expirar TTL, preserva última leitura boa)
    shouldFail = true;
    const staleRes = await src.get(t0 + 6 * 60_000);
    assert.equal(staleRes.envelope.meta.source, "live");
    assert.equal(staleRes.envelope.meta.stale, true);
    assert.equal(staleRes.envelope.data.totalCount, 3);

    // 4) Fallback honesto quando não há leitura prévia (cold offline)
    const coldOfflineSrc = createSeismicSource("24h", "2.5", mockFetch);
    const fbRes = await coldOfflineSrc.get(t0);
    assert.equal(fbRes.envelope.meta.source, "fallback");
    assert.equal(fbRes.envelope.meta.stale, false);
    assert.ok(fbRes.envelope.data.events.length >= 8);

    // 5) Rota HTTP expõe headers Cache-Control, X-Cache e X-RateLimit-*
    const routeRes = await getEarthquakesRoute(
      new NextRequest("http://127.0.0.1:3000/api/observatory/earthquakes?window=24h&minMag=4.5")
    );
    assert.equal(routeRes.status, 200);
    assert.ok(routeRes.headers.get("cache-control")?.includes("s-maxage="));
    assert.ok(routeRes.headers.get("x-ratelimit-limit") === "120");
    const routeBody = await routeRes.json();
    assert.ok(routeBody.meta && Array.isArray(routeBody.data.events));
  });
});

describe("D39 · Parte 2: Placas Tectônicas Contemporâneas PB2002, Geometria 3D, RN21 (dispose) e RN22 (isThrottled)", () => {
  test("3. public/data/tectonic-plates-pb2002.json é compacto, válido, carregado sob demanda e gera BufferGeometry nos 3 limites", () => {
    const platesPath = path.join(webRoot, "public/data/tectonic-plates-pb2002.json");
    const stat = fs.statSync(platesPath);
    assert.ok(stat.size < 40 * 1024, `JSON de placas deve ser < 40 KiB (atual: ${stat.size} B)`);

    const plates = JSON.parse(fs.readFileSync(platesPath, "utf-8")) as TectonicPlatesCollection;
    assert.equal(plates.type, "FeatureCollection");
    assert.ok(plates.features.length >= 20, "Deve cobrir as principais fronteiras tectônicas globais PB2002");

    const typesSeen = new Set(plates.features.map((f) => f.properties.boundaryType));
    assert.deepEqual(
      [...typesSeen].sort(),
      ["convergent", "divergent", "transform"],
      "Deve conter limites convergentes, divergentes e transformantes"
    );

    const geometries = buildPlateBoundaryGeometries(plates);
    for (const kind of ["convergent", "divergent", "transform"] as const) {
      const geo = geometries[kind];
      assert.ok(geo, `Geometria ${kind} não deve ser nula`);
      const pos = geo.getAttribute("position");
      assert.ok(pos.count >= 20);
      for (let i = 0; i < pos.count; i++) {
        assert.ok(
          Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i))
        );
      }
      geo.dispose();
    }

    assert.ok(magnitudeToMarkerScale(7.5) > magnitudeToMarkerScale(4.5));
    assert.ok(magnitudeToMarkerScale(4.5) > magnitudeToMarkerScale(2.5));

    // Verificação estática de RN21 (dispose) e RN22 (isThrottled) no SeismicTectonicLayer.tsx
    const layerSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/SeismicTectonicLayer.tsx"),
      "utf-8"
    );
    assert.match(layerSrc, /plateGeometries\.convergent\?\.dispose\(\)/);
    assert.match(layerSrc, /epicenterGeometry\.dispose\(\)/);
    assert.match(layerSrc, /waveRingGeometry\.dispose\(\)/);
    assert.match(layerSrc, /if \(isThrottled\) return;/);
  });
});

describe("D39 · Parte 3: UI D14 Bilíngue, Supressão Temporal, URL, Estudos (RN16) e Busca ⌘K", () => {
  beforeEach(() => {
    useObservatoryStore.getState().resetObservatory();
    useTimelineStore.setState({ geologicalMa: null, selectedYear: 2026 });
    useLocaleStore.setState({ locale: "pt-BR", enMessages: EN_MESSAGES });
  });

  test("4. SeismicLayerControls, ObservatoryPanel e ObservatoryTelemetryHUD renderizam em pt-BR/en e suprimem em eras passadas", () => {
    const fb = buildFallbackSeismicPayload("7d", "4.5");
    useObservatoryStore.setState({
      isPanelOpen: true,
      activeLayers: ["USGS_EARTHQUAKES"],
      earthquakes: fb,
      seismicWindow: "7d",
      seismicMinMagnitude: "4.5",
      showTectonicPlates: true,
      selectedEntity: {
        type: "EARTHQUAKE",
        data: fb.events.find((e) => e.tsunamiAlert) ?? fb.events[0]!,
        meta: {
          source: "fallback",
          provider: "TellusPedia (referência sísmica PB2002 / USGS)",
          fetchedAt: "2026-11-26T00:00:00Z",
          stale: false,
        },
      },
    });

    const controlsPt = renderToStaticMarkup(React.createElement(SeismicLayerControls));
    assert.match(controlsPt, /data-testid="seismic-window-group"/);
    assert.match(controlsPt, /data-testid="seismic-mag-group"/);
    assert.match(controlsPt, /data-testid="seismic-plates-switch"/);
    assert.match(controlsPt, /Placas tectônicas \(PB2002\)/);
    assertNoDivInsideParagraph(controlsPt, "SeismicLayerControls PT");

    const panelPt = renderToStaticMarkup(
      React.createElement(ObservatoryPanel, { initialExpanded: ["USGS_EARTHQUAKES"] })
    );
    assert.match(panelPt, /Terremotos &amp; Placas Tectônicas/);
    assertNoDivInsideParagraph(panelPt, "ObservatoryPanel USGS PT");

    const hudPt = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.match(hudPt, /data-testid="earthquake-telemetry"/);
    assert.match(hudPt, /Alerta oceânico de tsunami/);
    assert.match(hudPt, /data-testid="earthquake-usgs-link"/);
    assertNoDivInsideParagraph(hudPt, "ObservatoryTelemetryHUD PT");

    // Inglês (EN)
    useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
    const controlsEn = renderToStaticMarkup(React.createElement(SeismicLayerControls));
    assert.match(controlsEn, /Tectonic plates \(PB2002\)/);
    assert.match(controlsEn, /Hypocentral depth/);
    const hudEn = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.match(hudEn, /Seismic Bulletin \(USGS\)/);
    assert.match(hudEn, /Oceanic tsunami alert/);

    // Supressão coerente em eras geológicas (Pangeia 250 Ma) e históricas pré-1957
    useTimelineStore.setState({ geologicalMa: 250, selectedYear: null });
    assert.equal(renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD)), "");

    useTimelineStore.setState({ geologicalMa: null, selectedYear: 1914 });
    assert.equal(renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD)), "");
  });

  test("5. URL (?camadas=USGS_EARTHQUAKES&sismos=...), Estudos (/study/[slug]) e Busca ⌘K suportam a camada sísmica", () => {
    assert.equal(encodeSeismicView("30d", "6.0", false), "30d,6.0,0");
    assert.deepEqual(readSeismicView("30d,6.0,0"), {
      window: "30d",
      minMagnitude: "6.0",
      showPlates: false,
    });

    const view: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    useObservatoryStore.setState({
      activeLayers: ["USGS_EARTHQUAKES"],
      seismicWindow: "30d",
      seismicMinMagnitude: "6.0",
      showTectonicPlates: false,
    });
    const encoded = encodeView(view);
    assert.match(encoded, /camadas=USGS_EARTHQUAKES/);
    assert.match(encoded, /sismos=30d%2C6\.0%2C0/);

    useObservatoryStore.getState().resetObservatory();
    restoreView(`?visao=1&${encoded}`, view);
    const restored = useObservatoryStore.getState();
    assert.deepEqual(restored.activeLayers, ["USGS_EARTHQUAKES"]);
    assert.equal(restored.seismicWindow, "30d");
    assert.equal(restored.seismicMinMagnitude, "6.0");
    assert.equal(restored.showTectonicPlates, false);

    // Validação Zod e fontes primárias em Estudos (RN16 / RN02)
    const parsedStudy = studyInput.safeParse({
      title: "Sismicidade Circumpacífica",
      activeObservatoryLayers: ["USGS_EARTHQUAKES"],
    });
    assert.equal(parsedStudy.success, true);

    const sanitized = sanitizeStudy({
      title: "Sismicidade Circumpacífica",
      timelineStartYear: 2020,
      timelineEndYear: 2026,
      activeObservatoryLayers: ["USGS_EARTHQUAKES"],
    });
    assert.deepEqual(sanitized.activeObservatoryLayers, ["USGS_EARTHQUAKES"]);
    const sources = collectStudyPrimarySources({
      ...sanitized,
      id: "estudo-sismos",
      createdAt: "2026-11-26T00:00:00Z",
    });
    assert.ok(sources.some((s) => s.source.includes("USGS Earthquake Hazards")));
    assert.ok(sources.some((s) => s.source.includes("PB2002")));

    // Busca ⌘K
    const hits = searchExplore("placas tectonicas");
    assert.ok(hits.some((r) => r.id === "layer:USGS_EARTHQUAKES"));
    const hitsQuake = searchExplore("terremotos usgs");
    assert.ok(hitsQuake.some((r) => r.id === "layer:USGS_EARTHQUAKES"));
  });
});
