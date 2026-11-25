import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as topojson from "topojson-client";
import { geoCentroid } from "d3-geo";
import {
  DEFAULT_MAP_PROJECTION,
  MAP_PROJECTION_IDS,
  isMapProjectionId,
  isMapViewMode,
  readMapView,
} from "../src/lib/map-projections-types";
import {
  MAP_PROJECTION_CATALOG,
  MAP_PROJECTION_LIST,
  clamp2dZoom,
  createMapProjection,
  invertMapPoint,
  measureProjectedEqualAreaPatch,
  pickCountryAt2dPoint,
  resolveTopologyFeatureIso,
} from "../src/lib/map-projections";
import {
  contemporaryTopology,
  getContemporarySpatialIndex,
  loadHistoricalTopology,
  getHistoricalSpatialIndex,
  type CountryProperties,
} from "../src/lib/historical-topology";
import { useGlobeStore } from "../src/stores/globeStore";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useChoroplethStore } from "../src/stores/choroplethStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";
import { restoreStudySnapshot, selectCountry } from "../src/stores/actions";
import { findSearchResult, runSearchResult, searchExplore } from "../src/lib/explore/search";
import { ProjectionSelectorHud } from "../src/components/map2d/ProjectionSelectorHud";

function resetAllStores() {
  useGlobeStore.getState().resetView();
  useCosmicStore.getState().exitToEarthView();
  useChoroplethStore.getState().resetChoropleth();
  useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
}

afterEach(() => {
  resetAllStores();
});

describe("D33: Catálogo de projeções cartográficas e distorções geométricas", () => {
  test("expõe exatamente 4 projeções com metadados bilíngues completos", () => {
    assert.deepEqual([...MAP_PROJECTION_IDS], [
      "equal-earth",
      "mercator",
      "natural-earth",
      "azimuthal",
    ]);
    assert.equal(MAP_PROJECTION_LIST.length, 4);
    for (const id of MAP_PROJECTION_IDS) {
      const meta = MAP_PROJECTION_CATALOG[id];
      assert.ok(meta.name.length > 0);
      assert.ok(meta.nameEn.length > 0);
      assert.ok(meta.didacticNote.length > 20);
      assert.ok(meta.didacticNoteEn.length > 20);
      assert.ok(meta.preserves.length > 10 && meta.preservesEn.length > 10);
      assert.ok(meta.distorts.length > 10 && meta.distortsEn.length > 10);
    }
    assert.equal(isMapProjectionId("equal-earth"), true);
    assert.equal(isMapProjectionId("unknown"), false);
    assert.equal(isMapViewMode("2d"), true);
    assert.equal(isMapViewMode("iso"), false);
  });

  test("Equal Earth preserva área real (Groenlândia vs Equador) enquanto Mercator exagera > 8×", () => {
    const equalEarth = createMapProjection("equal-earth", 1280, 760);
    const mercator = createMapProjection("mercator", 1280, 760);
    const naturalEarth = createMapProjection("natural-earth", 1280, 760);

    const eqEquatorial = measureProjectedEqualAreaPatch(equalEarth, 20, 0);
    const eqGreenland = measureProjectedEqualAreaPatch(equalEarth, -42, 72);
    assert.ok(eqEquatorial && eqGreenland);
    const eqRatio = eqGreenland / eqEquatorial;
    assert.ok(
      eqRatio > 0.92 && eqRatio < 1.08,
      `Equal Earth deveria preservar área próxima de 1.0, obteve ${eqRatio.toFixed(3)}`
    );

    const mEquatorial = measureProjectedEqualAreaPatch(mercator, 20, 0);
    const mGreenland = measureProjectedEqualAreaPatch(mercator, -42, 72);
    assert.ok(mEquatorial && mGreenland);
    const mRatio = mGreenland / mEquatorial;
    assert.ok(
      mRatio > 8.0,
      `Mercator deveria exagerar área a 72°N em >8× (sec² 72° ≈ 10.5), obteve ${mRatio.toFixed(2)}`
    );

    const neEquatorial = measureProjectedEqualAreaPatch(naturalEarth, 20, 0);
    const neGreenland = measureProjectedEqualAreaPatch(naturalEarth, -42, 72);
    assert.ok(neEquatorial && neGreenland);
    const neRatio = neGreenland / neEquatorial;
    assert.ok(
      neRatio > 1.0 && neRatio < mRatio * 0.4,
      `Natural Earth deve ficar como compromisso moderado, obteve ${neRatio.toFixed(2)}`
    );
  });

  test("Azimutal Equidistante preserva distâncias radiais proporcionais a partir do ponto focal", () => {
    // Centro em Brasília (-47.9, -15.8): pontos a 30° e 60° de distância angular devem ter razão radial 2.0
    const az = createMapProjection("azimuthal", 1200, 800, { center: [0, 0] });
    const origin = az([0, 0]);
    const p30 = az([30, 0]);
    const p60 = az([60, 0]);
    const p30North = az([0, 30]);
    assert.ok(origin && p30 && p60 && p30North);

    const d30 = Math.hypot(p30[0] - origin[0], p30[1] - origin[1]);
    const d60 = Math.hypot(p60[0] - origin[0], p60[1] - origin[1]);
    const d30N = Math.hypot(p30North[0] - origin[0], p30North[1] - origin[1]);

    assert.ok(Math.abs(d60 / d30 - 2.0) < 0.01, `Razão radial 60°/30° esperada 2.0, obteve ${d60 / d30}`);
    assert.ok(Math.abs(d30N / d30 - 1.0) < 0.01, `Distância isotrópica a 30° esperada 1.0, obteve ${d30N / d30}`);
  });

  test("invertMapPoint rejeita pontos fora do disco da projeção e aceita pontos válidos", () => {
    const equalEarth = createMapProjection("equal-earth", 1280, 760);
    const cornerOutside = invertMapPoint(equalEarth, "equal-earth", 2, 2);
    assert.equal(cornerOutside, null, "Canto fora da elipse Equal Earth deve retornar null");

    const brasiliaPx = equalEarth([-47.9, -15.8]);
    assert.ok(brasiliaPx);
    const roundTrip = invertMapPoint(equalEarth, "equal-earth", brasiliaPx[0], brasiliaPx[1]);
    assert.ok(roundTrip);
    assert.ok(Math.abs(roundTrip[0] - -47.9) < 0.1);
    assert.ok(Math.abs(roundTrip[1] - -15.8) < 0.1);
    assert.equal(clamp2dZoom(99), 12);
    assert.equal(clamp2dZoom(0.2), 1);
  });
});

describe("D33: Picking exato dos 177 países e fronteiras históricas nas 4 projeções", () => {
  test("todos os países de Natural Earth 1:110m podem ser projetados e resolvidos nas 4 projeções", () => {
    const spatialIndex = getContemporarySpatialIndex();
    assert.ok(spatialIndex, "Índice espacial contemporâneo deve estar disponível");

    const fc = topojson.feature<CountryProperties>(
      contemporaryTopology,
      contemporaryTopology.objects.countries
    );
    assert.equal(fc.features.length, 177, "Natural Earth 1:110m deve conter 177 polígonos");

    // Pontos internos representativos dos 6 continentes + Groenlândia + Austrália + Brasil
    const landmarks: Array<{ iso: string; lng: number; lat: number }> = [
      { iso: "BRA", lng: -51.9, lat: -14.2 },
      { iso: "USA", lng: -98.5, lat: 39.8 },
      { iso: "GRL", lng: -42.6, lat: 71.7 },
      { iso: "DEU", lng: 10.4, lat: 51.1 },
      { iso: "ZAF", lng: 24.0, lat: -29.0 },
      { iso: "EGY", lng: 30.8, lat: 26.8 },
      { iso: "IND", lng: 79.0, lat: 22.0 },
      { iso: "CHN", lng: 104.2, lat: 35.8 },
      { iso: "JPN", lng: 138.2, lat: 36.2 },
      { iso: "AUS", lng: 133.8, lat: -25.3 },
      { iso: "ARG", lng: -64.0, lat: -34.0 },
    ];

    for (const projId of MAP_PROJECTION_IDS) {
      const proj = createMapProjection(projId, 1400, 820);
      for (const mark of landmarks) {
        const px = proj([mark.lng, mark.lat]);
        assert.ok(px, `${mark.iso} deve projetar em ${projId}`);
        const picked = pickCountryAt2dPoint(proj, projId, px[0], px[1], spatialIndex, null);
        assert.ok(picked, `${mark.iso} deve ser invertido em ${projId}`);
        assert.equal(picked.iso, mark.iso, `Picking de ${mark.iso} falhou em ${projId}`);
      }
    }

    // Verifica que todas as 177 features possuem ISO resolúvel com zero-padding e centróide projetável
    const equalEarth = createMapProjection("equal-earth", 1400, 820);
    let resolvedCount = 0;
    for (const feature of fc.features) {
      const iso = resolveTopologyFeatureIso(
        { ...feature.properties, id: feature.id ?? feature.properties?.id },
        null
      );
      if (iso) resolvedCount++;
      const [cLng, cLat] = geoCentroid(feature);
      const px = equalEarth([cLng, cLat]);
      assert.ok(px && Number.isFinite(px[0]) && Number.isFinite(px[1]));
    }
    assert.equal(resolvedCount, 177, "Todos os 177 polígonos devem resolver um identificador");
  });

  test("picking em topologia histórica (1969) resolve entidades da Guerra Fria", async () => {
    const topo1969 = await loadHistoricalTopology("/data/history/borders-1969.json");
    assert.ok(topo1969, "Topologia de 1969 deve carregar");
    const index1969 = getHistoricalSpatialIndex("COLD_WAR_1969", topo1969);
    assert.ok(index1969);

    const proj = createMapProjection("equal-earth", 1280, 760);
    const moscowPx = proj([37.6, 55.7]);
    assert.ok(moscowPx);
    const picked = pickCountryAt2dPoint(proj, "equal-earth", moscowPx[0], moscowPx[1], index1969, 1969);
    assert.equal(picked?.iso, "SUN");
  });
});

describe("D33: Alternância 3D ↔ 2D, pausa RN22, URL, Busca ⌘K e Estudos", () => {
  test("ativar Modo 2D pausa o render loop 3D (isThrottled=true) e preserva país e Coroplético", () => {
    selectCountry("BRA");
    useChoroplethStore.getState().setIndicator("NY.GDP.PCAP.CD");
    assert.equal(useGlobeStore.getState().isThrottled, false);

    useGlobeStore.getState().setViewMode("2d");
    assert.equal(useGlobeStore.getState().viewMode, "2d");
    assert.equal(useGlobeStore.getState().isThrottled, true);
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
    assert.equal(useChoroplethStore.getState().activeIndicator, "NY.GDP.PCAP.CD");

    // Abrir e fechar Reader em 2D mantém o 3D pausado
    useGlobeStore.getState().setReaderOpen(true);
    useGlobeStore.getState().setReaderOpen(false);
    assert.equal(useGlobeStore.getState().isThrottled, true);

    // Voltar para 3D retoma o render loop preservando país e Coroplético
    useGlobeStore.getState().setViewMode("3d");
    assert.equal(useGlobeStore.getState().isThrottled, false);
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
    assert.equal(useChoroplethStore.getState().activeIndicator, "NY.GDP.PCAP.CD");
  });

  test("view-url serializa e restaura mapa=2d e proj=mercator/azimuthal", () => {
    const view: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    selectCountry("GRL");
    useGlobeStore.getState().setViewMode("2d");
    useGlobeStore.getState().setProjectionId("mercator");

    const encoded = encodeView(view);
    assert.match(encoded, /mapa=2d/);
    assert.match(encoded, /proj=mercator/);
    assert.match(encoded, /pais=GRL/);

    resetAllStores();
    assert.equal(useGlobeStore.getState().viewMode, "3d");

    const ok = restoreView(`?visao=1&${encoded}`, view);
    assert.equal(ok, true);
    assert.equal(useGlobeStore.getState().viewMode, "2d");
    assert.equal(useGlobeStore.getState().projectionId, "mercator");
    assert.equal(useGlobeStore.getState().selectedIso, "GRL");
    assert.equal(useGlobeStore.getState().isThrottled, true);

    // Parâmetro inválido cai com segurança para padrão
    assert.deepEqual(readMapView("2d", "bogus"), {
      viewMode: "2d",
      projectionId: DEFAULT_MAP_PROJECTION,
    });
  });

  test("Estudos validam, sanitizam e restauram mapViewMode + mapProjection", () => {
    const parsed = studyInput.safeParse({
      title: "Comparação Mercator vs Equal Earth",
      mapViewMode: "2d",
      mapProjection: "azimuthal",
      selectedCountryIsos: ["BRA"],
    });
    assert.equal(parsed.success, true);

    const sanitized = sanitizeStudy({
      title: "Comparação Mercator vs Equal Earth",
      mapViewMode: "2d",
      mapProjection: "azimuthal",
      selectedCountryIsos: ["BRA"],
    });
    assert.equal(sanitized.mapViewMode, "2d");
    assert.equal(sanitized.mapProjection, "azimuthal");

    // No modo Cosmos, mapViewMode 2D é limpo para evitar conflito
    const cosmicSanitized = sanitizeStudy({
      title: "Estudo Cósmico",
      isCosmicMode: true,
      mapViewMode: "2d",
      mapProjection: "mercator",
    });
    assert.equal(cosmicSanitized.mapViewMode, null);
    assert.equal(cosmicSanitized.mapProjection, null);

    restoreStudySnapshot({
      id: "estudo-2d-test",
      ...sanitized,
    });
    assert.equal(useGlobeStore.getState().viewMode, "2d");
    assert.equal(useGlobeStore.getState().projectionId, "azimuthal");
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
  });

  test("Busca ⌘K encontra e executa comandos de Modo 2D e projeções", () => {
    const matches = searchExplore("mercator");
    assert.ok(matches.some((m) => m.id === "proj:mercator"));
    const mercatorCmd = findSearchResult("proj:mercator");
    assert.ok(mercatorCmd);
    runSearchResult(mercatorCmd);
    assert.equal(useGlobeStore.getState().viewMode, "2d");
    assert.equal(useGlobeStore.getState().projectionId, "mercator");

    const back3d = findSearchResult("map:3d");
    assert.ok(back3d);
    runSearchResult(back3d);
    assert.equal(useGlobeStore.getState().viewMode, "3d");
  });

  test("ProjectionSelectorHud renderiza as 4 projeções e notas didáticas em pt-BR e en", () => {
    const ptHtml = renderToStaticMarkup(
      <ProjectionSelectorHud
        projectionId="mercator"
        onSelectProjection={() => {}}
        showGraticule={true}
        onToggleGraticule={() => {}}
        zoom={1.5}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetView={() => {}}
        selectedCountryLabel="Brasil"
        azimuthalFollowSelected={true}
        onToggleAzimuthalCenter={() => {}}
      />
    );
    assert.match(ptHtml, /Equal Earth/);
    assert.match(ptHtml, /Mercator/);
    assert.match(ptHtml, /Natural Earth/);
    assert.match(ptHtml, /Azimutal/);
    assert.match(ptHtml, /Groenlândia/);
    assert.match(ptHtml, /1\.5×/);

    useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
    const enHtml = renderToStaticMarkup(
      <ProjectionSelectorHud
        projectionId="azimuthal"
        onSelectProjection={() => {}}
        showGraticule={true}
        onToggleGraticule={() => {}}
        zoom={1.0}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetView={() => {}}
        selectedCountryLabel="Brazil"
        azimuthalFollowSelected={true}
        onToggleAzimuthalCenter={() => {}}
      />
    );
    assert.match(enHtml, /Azimuthal Equidistant/);
    assert.match(enHtml, /Graticule/);
    assert.match(enHtml, /Center: Brazil/);
  });
});
