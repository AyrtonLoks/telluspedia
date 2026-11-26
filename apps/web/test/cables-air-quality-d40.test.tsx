import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

import { WORLD_COUNTRIES_CATALOG } from "../src/lib/country-data";
import {
  loadSubmarineCables,
  sanitizeTeleGeographyUrl,
} from "../src/lib/submarine-cables-data";
import {
  buildSubmarineCableGeometries,
  createCoastalMarkerRaycast,
  createSubmarineCableRaycast,
  SUBMARINE_CABLES_RADIUS,
} from "../src/components/globe/SubmarineCablesLayer";
import * as THREE from "three";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import {
  classifyEuropeanAqiBand,
  classifyUsAqiBand,
} from "../src/lib/air-quality-types";
import {
  GLOBAL_AQI_CAPITALS,
  parseOpenMeteoSingleAqi,
  parseOpenMeteoStationsBatch,
} from "../src/lib/air-quality-data";
import {
  AQI_LIVE_TTL_MS,
  createAirQualityPointSource,
  createAirQualityStationsSource,
  resetAirQualitySources,
} from "../src/lib/air-quality-source";
import { GET as getAirQualityRoute } from "../src/app/api/observatory/air-quality/route";
import { RATE_LIMIT_BUCKETS, resetRateLimitState } from "../src/lib/rate-limit";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { studyInput } from "../src/lib/study-schema";
import { collectStudyPrimarySources } from "../src/lib/study-export";
import { searchExplore } from "../src/lib/explore/search";

const webRoot = path.resolve(__dirname, "..");

describe("D40 · Cabos Submarinos de Internet (TeleGeography) & Qualidade do Ar PM2.5/AQI (Open-Meteo)", () => {
  beforeEach(() => {
    useObservatoryStore.getState().resetObservatory();
    resetAirQualitySources();
    resetRateLimitState("observatory:air-quality");
  });

  test("1. Dataset TeleGeography: 16 sistemas transoceânicos, 6 gargalos estratégicos, raio 1.0025, URLs HTTPS sanitizadas e dispose()/isThrottled", async () => {
    const dataset = await loadSubmarineCables();
    assert.ok(dataset, "Dataset TeleGeography deve carregar de public/data/submarine-cables-telegeography.json");
    assert.equal(dataset.cables.length, 16);
    assert.equal(dataset.chokePoints.length, 6);
    assert.equal(SUBMARINE_CABLES_RADIUS, 1.0025);

    for (const cable of dataset.cables) {
      assert.ok(cable.designCapacityTbps > 0);
      assert.ok(cable.lengthKm > 1000);
      assert.ok(cable.landingPoints.length >= 2);
      assert.match(cable.officialUrl, /^https:\/\/www\.submarinecablemap\.com\//);
      for (const lp of cable.landingPoints) {
        assert.match(lp.countryIso, /^[A-Z]{3}$/);
        assert.ok(
          Object.hasOwn(WORLD_COUNTRIES_CATALOG, lp.countryIso) || lp.countryIso === "SGP",
          `ISO ${lp.countryIso} em ${cable.id} deve pertencer a WORLD_COUNTRIES_CATALOG (1:110m) ou cidade-Estado SGP (1:50m)`
        );
      }
    }

    // Geometria SLERP esférica no raio exato 1.0025
    const { byCable } = buildSubmarineCableGeometries(dataset.cables, "ellalink");
    assert.equal(byCable.length, 16);
    const firstGeo = byCable[0]!.geometry;
    const posAttr = firstGeo.getAttribute("position");
    assert.ok(posAttr.count >= 16);
    const r = Math.hypot(posAttr.getX(0), posAttr.getY(0), posAttr.getZ(0));
    assert.ok(Math.abs(r - 1.0025) < 1e-4, `Raio esperado 1.0025, obtido ${r}`);
    for (const item of byCable) item.geometry.dispose();

    // Sanitização estrita de URL TeleGeography
    assert.equal(sanitizeTeleGeographyUrl("javascript:alert(1)"), "https://www.submarinecablemap.com/");
    assert.equal(sanitizeTeleGeographyUrl("https://evil.example.com/cable"), "https://www.submarinecablemap.com/");
    assert.equal(
      sanitizeTeleGeographyUrl("https://www.submarinecablemap.com/submarine-cable/ellalink#frag"),
      "https://www.submarinecablemap.com/submarine-cable/ellalink"
    );

    // RN21 (dispose) e RN22 (isThrottled) nas camadas 3D
    const cablesSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/SubmarineCablesLayer.tsx"),
      "utf-8"
    );
    const aqiSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/AirQualityLayer.tsx"),
      "utf-8"
    );
    assert.match(cablesSrc, /\.dispose\(\)/);
    assert.match(cablesSrc, /if\s*\(\s*isThrottled\s*\)\s*return/);
    assert.match(aqiSrc, /\.dispose\(\)/);
  });

  test("2. Classificação US AQI (EPA) e European AQI (EEA) e parser de medições Open-Meteo", () => {
    assert.equal(classifyUsAqiBand(32), "good");
    assert.equal(classifyUsAqiBand(78), "moderate");
    assert.equal(classifyUsAqiBand(125), "sensitive");
    assert.equal(classifyUsAqiBand(175), "unhealthy");
    assert.equal(classifyUsAqiBand(250), "very_unhealthy");
    assert.equal(classifyUsAqiBand(340), "hazardous");

    assert.equal(classifyEuropeanAqiBand(15), "good");
    assert.equal(classifyEuropeanAqiBand(35), "moderate");
    assert.equal(classifyEuropeanAqiBand(55), "sensitive");
    assert.equal(classifyEuropeanAqiBand(75), "unhealthy");
    assert.equal(classifyEuropeanAqiBand(95), "very_unhealthy");
    assert.equal(classifyEuropeanAqiBand(115), "hazardous");

    const single = parseOpenMeteoSingleAqi({
      current: {
        time: 1_764_000_000,
        pm2_5: 12.34,
        pm10: 21.8,
        us_aqi: 51,
        european_aqi: 26,
        nitrogen_dioxide: 14.2,
        ozone: 48.9,
      },
    });
    assert.equal(single.pm25, 12.3);
    assert.equal(single.usAqi, 51);
    assert.equal(single.europeanAqi, 26);
    assert.ok(single.observedAt?.endsWith("Z"));

    const batchRaw = GLOBAL_AQI_CAPITALS.map((_, idx) => ({
      current: {
        time: 1_764_000_000,
        pm2_5: 8 + idx * 2,
        pm10: 15 + idx * 3,
        us_aqi: 30 + idx * 4,
        european_aqi: 15 + idx * 2,
      },
    }));
    const batch = parseOpenMeteoStationsBatch(batchRaw);
    assert.equal(batch.totalCount, GLOBAL_AQI_CAPITALS.length);
    assert.equal(batch.worstUsAqiStationId, GLOBAL_AQI_CAPITALS[GLOBAL_AQI_CAPITALS.length - 1]?.id);
  });

  test("3. Contrato T05 em estações capitais e degradação honesta (null) em consultas pontuais de país", async () => {
    assert.equal(AQI_LIVE_TTL_MS, 15 * 60 * 1000);

    let failUpstream = false;
    const mockStationsFetch: typeof fetch = async () => {
      if (failUpstream) return new Response("Bad Gateway", { status: 502 });
      return new Response(
        JSON.stringify(
          GLOBAL_AQI_CAPITALS.map((s) => ({
            current: {
              time: 1_764_000_000,
              pm2_5: s.refPm25,
              pm10: s.refPm25 * 1.5,
              us_aqi: s.refUsAqi,
              european_aqi: s.refEuAqi,
            },
          }))
        ),
        { status: 200 }
      );
    };

    const stSource = createAirQualityStationsSource(mockStationsFetch);
    const t0 = 1_700_000_000_000;

    const r1 = await stSource.get(t0);
    assert.equal(r1.envelope.meta.source, "live");
    assert.equal(r1.cacheHit, false);

    const r2 = await stSource.get(t0 + 5 * 60 * 1000);
    assert.equal(r2.cacheHit, true);

    failUpstream = true;
    const r3 = await stSource.get(t0 + 16 * 60 * 1000);
    assert.equal(r3.envelope.meta.stale, true);

    // Consulta pontual offline retorna data: null com source: "fallback" (nunca inventa números para o país — T03)
    const offlinePoint = createAirQualityPointSource(-15.79, -47.88, mockStationsFetch);
    const rp = await offlinePoint.get(t0);
    assert.equal(rp.envelope.meta.source, "fallback");
    assert.equal(rp.envelope.data, null);
  });

  test("4. Rota /api/observatory/air-quality valida coordenadas estritamente (400) e aplica rate-limit T43", async () => {
    assert.equal(RATE_LIMIT_BUCKETS["observatory:air-quality"].limit, 120);

    const badLat = await getAirQualityRoute(
      new NextRequest("http://localhost:3000/api/observatory/air-quality?lat=999&lng=-47.88")
    );
    assert.equal(badLat.status, 400);

    const missingLng = await getAirQualityRoute(
      new NextRequest("http://localhost:3000/api/observatory/air-quality?lat=-15.79")
    );
    assert.equal(missingLng.status, 400);

    const sqli = await getAirQualityRoute(
      new NextRequest("http://localhost:3000/api/observatory/air-quality?lat=10;DROP&lng=20")
    );
    assert.equal(sqli.status, 400);
  });

  test("5. Persistência em URL (?camadas=SUBMARINE_CABLES,AIR_QUALITY&cabos=&aqi=), Estudos (Zod + citações) e busca ⌘K", () => {
    const obs = useObservatoryStore.getState();
    obs.setAllLayers(["SUBMARINE_CABLES", "AIR_QUALITY"]);
    obs.setCableBasinFilter("atlantic");
    obs.setShowCableChokePoints(false);
    obs.setAqiScaleMode("european_aqi");

    const cam: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    const encoded = encodeView(cam);
    assert.match(encoded, /SUBMARINE_CABLES/);
    assert.match(encoded, /AIR_QUALITY/);
    assert.match(encoded, /cabos=atlantic%2C0/);
    assert.match(encoded, /aqi=european_aqi/);

    obs.resetObservatory();
    restoreView(`?visao=1&${encoded}`, cam);
    const after = useObservatoryStore.getState();
    assert.deepEqual(after.activeLayers, ["SUBMARINE_CABLES", "AIR_QUALITY"]);
    assert.equal(after.cableBasinFilter, "atlantic");
    assert.equal(after.showCableChokePoints, false);
    assert.equal(after.aqiScaleMode, "european_aqi");

    const parsedStudy = studyInput.safeParse({
      title: "Infraestrutura Submarina e Qualidade do Ar",
      activeObservatoryLayers: ["SUBMARINE_CABLES", "AIR_QUALITY"],
      selectedCountryIsos: ["BRA", "PRT"],
    });
    assert.equal(parsedStudy.success, true);
    if (parsedStudy.success) {
      assert.deepEqual(parsedStudy.data.activeObservatoryLayers, ["SUBMARINE_CABLES", "AIR_QUALITY"]);
      const sources = collectStudyPrimarySources({
        id: "test-d40",
        title: "Infraestrutura",
        description: null,
        markdownNotes: null,
        parentId: null,
        timelineStartYear: 1976,
        timelineEndYear: 2026,
        cameraLat: 0,
        cameraLng: 0,
        cameraAltitude: 2.5,
        selectedCountryIsos: ["BRA"],
        activeCategories: ["SCIENCE_CULTURE"],
        activeObservatoryLayers: ["SUBMARINE_CABLES", "AIR_QUALITY"],
        activeCosmicLayers: [],
        historicalEra: "CONTEMPORARY",
        activeRouteId: null,
        focusedCelestialBody: null,
        geologicalMa: null,
        isApollo11Active: false,
        isCosmicMode: false,
        choroplethIndicator: null,
        choroplethYear: null,
        gibsProduct: null,
        gibsMonth: null,
        mapViewMode: "3d",
        mapProjection: "equalEarth",
        annotations: [],
        createdAt: new Date().toISOString(),
      });
      assert.ok(sources.some((s) => s.source.includes("TeleGeography")));
      assert.ok(sources.some((s) => s.source.includes("Open-Meteo Air Quality")));
    }

    assert.ok(searchExplore("EllaLink").some((r) => r.id === "layer:SUBMARINE_CABLES"));
    assert.ok(searchExplore("PM2.5").some((r) => r.id === "layer:AIR_QUALITY"));
  });

  test("6. Raycast 3D de cabos submarinos nunca intercepta cliques sobre países nem atravessa o verso do globo", async () => {
    const dataset = await loadSubmarineCables();
    assert.ok(dataset);
    const { byCable } = buildSubmarineCableGeometries(dataset.cables, null);

    const castRadialRayAt = (lat: number, lng: number, camRadius = 2.4) => {
      const origin = latLngToVector3(lat, lng, camRadius);
      const direction = origin.clone().negate().normalize();
      const raycaster = new THREE.Raycaster(origin, direction);
      const hits: THREE.Intersection[] = [];
      for (const item of byCable) {
        const line = new THREE.LineSegments(item.geometry);
        line.updateMatrixWorld(true);
        const fn = createSubmarineCableRaycast(item.geometry);
        fn.call(line, raycaster, hits);
      }
      return hits;
    };

    // Cliques sobre países (interior e costa: Brasil, Portugal, Egito) cedem 100% a EarthSphere (0 hits em cabos)
    assert.equal(castRadialRayAt(-15.79, -47.88).length, 0, "Brasília não pode bater em cabo submarino");
    assert.equal(castRadialRayAt(-3.73, -38.52).length, 0, "Terra firme costeira (Ceará) cede ao país");
    assert.equal(castRadialRayAt(38.72, -9.14).length, 0, "Lisboa/Portugal cede ao país");
    assert.equal(castRadialRayAt(30.04, 31.24).length, 0, "Cairo/Egito cede ao país");

    // Oceano Pacífico Sul aberto longe de cabos -> 0 hits
    assert.equal(castRadialRayAt(-48.0, -135.0).length, 0, "Oceano distante de cabos não gera falso positivo");

    // Clique exato sobre vértice oceânico do EllaLink no Atlântico Equatorial (6.5°N, 31.0°W) seleciona o cabo
    const oceanHits = castRadialRayAt(6.5, -31.0, 2.2);
    assert.ok(oceanHits.length >= 1, "Segmento oceânico do EllaLink deve ser selecionável no mar");
    const hitRadius = oceanHits[0]!.point.length();
    assert.ok(Math.abs(hitRadius - SUBMARINE_CABLES_RADIUS) < 2e-3);

    // Raio apontando pelo antípoda (-6.5°S, 149.0°E) não atravessa o planeta para acertar EllaLink no verso
    const ellalinkItem = byCable.find((item) => item.cable.id === "ellalink")!;
    const antipodeOrigin = latLngToVector3(-6.5, 149.0, 2.4);
    const antipodeRay = new THREE.Raycaster(antipodeOrigin, antipodeOrigin.clone().negate().normalize());
    const antipodeHits: THREE.Intersection[] = [];
    const ellalinkLine = new THREE.LineSegments(ellalinkItem.geometry);
    ellalinkLine.updateMatrixWorld(true);
    createSubmarineCableRaycast(ellalinkItem.geometry).call(ellalinkLine, antipodeRay, antipodeHits);
    assert.equal(antipodeHits.length, 0, "Cabo no hemisfério oculto não pode ser atingido através do globo");

    // Marcadores costeiros cedem sobre terra em zoom macro (> 1.82) e delegam em zoom próximo (<= 1.82)
    let delegatedCalls = 0;
    const coastalFn = createCoastalMarkerRaycast(
      () => {
        delegatedCalls += 1;
      },
      () => true
    );
    const dummyMesh = new THREE.Mesh();
    const macroOrigin = latLngToVector3(-15.79, -47.88, 2.4);
    coastalFn.call(
      dummyMesh,
      new THREE.Raycaster(macroOrigin, macroOrigin.clone().negate().normalize()),
      []
    );
    assert.equal(delegatedCalls, 0, "Em zoom macro sobre terra firme o marcador costeiro cede ao país");

    const closeOrigin = latLngToVector3(-3.73, -38.52, 1.65);
    coastalFn.call(
      dummyMesh,
      new THREE.Raycaster(closeOrigin, closeOrigin.clone().negate().normalize()),
      []
    );
    assert.equal(delegatedCalls, 1, "Em zoom aproximado (<= 1.82) o porto costeiro permanece clicável");

    for (const item of byCable) item.geometry.dispose();
  });
});
