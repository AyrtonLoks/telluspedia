import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ECLIPSES_CATALOG,
  ECLIPSES_LIST,
  sanitizeEclipseNasaUrl,
} from "../src/lib/eclipses-catalog";
import {
  buildTotalityRibbonGeometry,
  computeEclipseGeometry,
  TOTALITY_RIBBON_RADIUS,
} from "../src/lib/eclipses-geometry";
import { ECLIPSE_IDS, resolveEclipseTargetDate } from "../src/lib/eclipses-ids";
import {
  calculateProbePosition,
  DEEP_SPACE_PROBE_IDS,
  DEEP_SPACE_PROBES_CATALOG,
  formatLightTime,
  generateProbeTrajectoryPoints,
  LIGHT_SECONDS_PER_AU,
  sanitizeNasaMissionUrl,
} from "../src/lib/deep-space-probes";
import { getProbeViewOffset, cosmicMinDistance } from "../src/components/globe/CosmicCameraController";
import { computeSunDirection } from "../src/lib/epoch/useSunDirection";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { focusDeepSpaceProbe, selectEclipseEvent, clearCelestialFocus } from "../src/stores/actions";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { searchExplore } from "../src/lib/explore/search";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { EclipseHud } from "../src/components/eclipse/EclipseHud";

const webRoot = path.resolve(__dirname, "..");

describe("D41 · Eclipses Solares/Lunares & Sondas do Espaço Profundo (Voyager 1/2, JWST, New Horizons)", () => {
  beforeEach(() => {
    useCosmicStore.getState().resetCosmicState();
    useGlobeStore.setState({ selectedIso: null, hoveredIso: null, isReaderOpen: false });
    useTimelineStore.setState({ selectedYear: 2026, selectedMilestoneId: null, geologicalMa: null });
  });

  test("1. Catálogo de 5 eclipses (4 solares totais + 1 lunar total): sizígia real, umbra/penumbra e faixa de totalidade 3D", () => {
    assert.equal(ECLIPSES_LIST.length, 5);
    const solarCount = ECLIPSES_LIST.filter((e) => e.kind === "solar_total").length;
    assert.ok(solarCount >= 4, "Deve haver ao menos 4 eclipses solares totais emblemáticos");

    for (const id of ECLIPSE_IDS) {
      const g0 = computeEclipseGeometry(id, 0);
      assert.equal(g0.targetDate.getTime(), Date.parse(ECLIPSES_CATALOG[id].greatestUtcIso));
      assert.ok(Math.abs(g0.shadowLat - ECLIPSES_CATALOG[id].greatestLat) < 0.05, `${id} lat`);
      assert.ok(Math.abs(g0.shadowLng - ECLIPSES_CATALOG[id].greatestLng) < 0.05, `${id} lng`);
      assert.ok(g0.lunarDistanceKm > 350_000 && g0.lunarDistanceKm < 410_000);
      assert.ok(g0.umbralConeLengthKm > 365_000);

      if (g0.eclipse.kind === "solar_total") {
        assert.ok(
          g0.sunMoonSeparationDeg < 1.2,
          `${id}: Lua Nova em sizígia solar exige separação < 1,2° (obtido ${g0.sunMoonSeparationDeg}°)`
        );
        assert.ok(g0.umbraRadiusKm >= 95 && g0.penumbraRadiusKm > 2500);
        assert.ok(g0.umbraAngularRad < g0.penumbraAngularRad);

        // Varredura temporal desloca a umbra de oeste para leste sobre os continentes
        const gBefore = computeEclipseGeometry(id, -45);
        const gAfter = computeEclipseGeometry(id, 45);
        assert.ok(
          gBefore.shadowDirection.distanceTo(gAfter.shadowDirection) > 0.12,
          `${id}: varredura -45..+45 min deve deslocar a umbra significativamente`
        );

        // Geometria 3D da faixa de totalidade sobre a esfera no raio 1.0028
        const ribbon = buildTotalityRibbonGeometry(
          g0.eclipse.centerline,
          g0.eclipse.umbraWidthKm
        );
        const pos = ribbon.getAttribute("position");
        assert.ok(pos.count >= 40);
        const r = Math.hypot(pos.getX(0), pos.getY(0), pos.getZ(0));
        assert.ok(Math.abs(r - TOTALITY_RIBBON_RADIUS) < 1e-3);
        ribbon.dispose();
      } else {
        assert.ok(
          g0.sunMoonSeparationDeg > 178.5,
          `${id}: Lua Cheia em eclipse lunar exige oposição > 178,5° (obtido ${g0.sunMoonSeparationDeg}°)`
        );
        assert.equal(g0.lunarUmbraImmersion, 1);
      }
    }

    // Sincronização do relógio solar canônico (`useSunDirection`) ao ativar Sobral 1919
    const sunSobral = computeSunDirection({
      effectiveYear: 1919,
      selectedMilestoneId: null,
      activeScene: null,
      activeEclipseId: "sobral-1919",
      eclipseOffsetMinutes: 0,
    });
    assert.equal(sunSobral.isLiveClock, false);
    assert.equal(
      sunSobral.targetDate.getTime(),
      resolveEclipseTargetDate("sobral-1919", 0).getTime()
    );

    // Sanitização estrita de URLs NASA GSFC
    assert.equal(sanitizeEclipseNasaUrl("javascript:alert(1)"), "https://science.nasa.gov/eclipses/");
    assert.equal(sanitizeEclipseNasaUrl("https://evil.example/eclipse"), "https://science.nasa.gov/eclipses/");
    assert.match(
      sanitizeEclipseNasaUrl(ECLIPSES_CATALOG["sobral-1919"].nasaUrl),
      /^https:\/\/science\.nasa\.gov\//
    );
  });

  test("2. Efemérides calibradas, distância em UA e tempo-luz DSN das 4 sondas (Voyager 1/2, New Horizons, JWST)", () => {
    assert.deepEqual([...DEEP_SPACE_PROBE_IDS], ["VOYAGER_1", "VOYAGER_2", "NEW_HORIZONS", "JWST"]);

    const v1_1990 = calculateProbePosition("VOYAGER_1", 1990.123);
    const v1_2012 = calculateProbePosition("VOYAGER_1", 2012.649);
    const v1_2026 = calculateProbePosition("VOYAGER_1", 2026.0);
    const v2_2026 = calculateProbePosition("VOYAGER_2", 2026.0);
    const nh_2015 = calculateProbePosition("NEW_HORIZONS", 2015.534);
    const nh_2026 = calculateProbePosition("NEW_HORIZONS", 2026.0);
    const jwst_2026 = calculateProbePosition("JWST", 2026.0);

    // Crescimento monotônico real: Pale Blue Dot (~40.5 UA) < Heliopausa (121.6 UA) < 2026 (~169.8 UA)
    assert.ok(Math.abs(v1_1990.distanceSunAu - 40.47) < 0.2);
    assert.ok(Math.abs(v1_2012.distanceSunAu - 121.6) < 0.2);
    assert.ok(v1_2026.distanceSunAu > 168 && v1_2026.distanceSunAu < 173);

    // Hierarquia real de distâncias em 2026: Voyager 1 > Voyager 2 > New Horizons > JWST (~1.01 UA)
    assert.ok(v1_2026.distanceSunAu > v2_2026.distanceSunAu);
    assert.ok(v2_2026.distanceSunAu > nh_2026.distanceSunAu);
    assert.ok(nh_2026.distanceSunAu > 60);
    assert.ok(Math.abs(nh_2015.distanceSunAu - 32.91) < 0.25, "Sobrevoo de Plutão em jul/2015 ~32.9 UA");

    // JWST em órbita de halo no ponto de Lagrange Sol–Terra L2 (~0.010–0.012 UA da Terra, ~5 s-luz)
    assert.ok(jwst_2026.distanceSunAu > 0.99 && jwst_2026.distanceSunAu < 1.04);
    assert.ok(jwst_2026.distanceEarthAu > 0.008 && jwst_2026.distanceEarthAu < 0.015);
    assert.ok(jwst_2026.oneWayLightSeconds >= 4.5 && jwst_2026.oneWayLightSeconds <= 6.5);

    // Tempo-luz da Voyager 1 em 2026 > 23 horas (> 82.800 s) e exatamente proporcional a LIGHT_SECONDS_PER_AU
    assert.ok(v1_2026.oneWayLightSeconds > 23 * 3600);
    assert.ok(
      Math.abs(v1_2026.oneWayLightSeconds - v1_2026.distanceEarthAu * LIGHT_SECONDS_PER_AU) < 1.0
    );
    assert.equal(formatLightTime(5.36, "pt-BR"), "5,4 s-luz");
    assert.equal(formatLightTime(5.36, "en"), "5.4 light-sec");
    assert.equal(formatLightTime(84720, "pt-BR"), "23h 32m");

    // Antes do lançamento: isLaunched = false e posição finita sem NaN
    const v1Pre = calculateProbePosition("VOYAGER_1", 1969);
    assert.equal(v1Pre.isLaunched, false);
    assert.ok(Number.isFinite(v1Pre.scenePosition.x) && Number.isFinite(v1Pre.scenePosition.z));

    assert.equal(sanitizeNasaMissionUrl("javascript:evil()"), "https://science.nasa.gov/missions/");
    for (const id of DEEP_SPACE_PROBE_IDS) {
      assert.match(sanitizeNasaMissionUrl(DEEP_SPACE_PROBES_CATALOG[id].nasaUrl), /^https:\/\//);
      assert.match(sanitizeNasaMissionUrl(DEEP_SPACE_PROBES_CATALOG[id].jplUrl), /^https:\/\//);
    }
  });

  test("3. Handover seguro de câmera sem NaN (AGENTS.md §1), preservação do país (D15) e dispose() GPU (RN21)", () => {
    for (const mode of ["visual", "real"] as const) {
      for (const probeId of DEEP_SPACE_PROBE_IDS) {
        const pos = calculateProbePosition(probeId, 2026.4, mode);
        const offset = getProbeViewOffset(probeId, mode);
        const minDist = cosmicMinDistance(null, mode, probeId);
        assert.ok(
          Number.isFinite(pos.scenePosition.x) &&
            Number.isFinite(pos.scenePosition.y) &&
            Number.isFinite(pos.scenePosition.z),
          `${probeId} (${mode}) scenePosition livre de NaN`
        );
        assert.ok(offset.length() >= 1.2, `${probeId} (${mode}) offset seguro >= 1.2`);
        assert.ok(minDist >= 0.4, `${probeId} (${mode}) minDistance seguro >= 0.4`);

        // JWST permanece fora do envelope visual da Terra na cena cósmica
        if (probeId === "JWST") {
          const trail = generateProbeTrajectoryPoints("JWST", 2026.4, mode, 32);
          assert.equal(trail.length, 33);
          assert.ok(trail.every((pt) => Number.isFinite(pt.x) && pt.length() > 15));
        }
      }
    }

    // Focar sonda no Cosmos não limpa o país selecionado no RightDock (D15)
    useGlobeStore.setState({ selectedIso: "BRA" });
    focusDeepSpaceProbe("VOYAGER_1");
    assert.equal(useCosmicStore.getState().isCosmicMode, true);
    assert.equal(useCosmicStore.getState().focusedProbeId, "VOYAGER_1");
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
    clearCelestialFocus();
    assert.equal(useCosmicStore.getState().focusedProbeId, null);

    // RN21 e raycast não bloqueante nas camadas 3D novas
    const eclipseLayerSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/EclipseShadowLayer.tsx"),
      "utf-8"
    );
    const probesLayerSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/DeepSpaceProbesLayer.tsx"),
      "utf-8"
    );
    assert.match(eclipseLayerSrc, /\.dispose\(\)/);
    assert.match(eclipseLayerSrc, /raycast=\{ignoreRaycast\}/);
    assert.match(probesLayerSrc, /\.dispose\(\)/);
    assert.match(probesLayerSrc, /<CelestialLabel\b/);
    assert.doesNotMatch(probesLayerSrc, /distanceFactor/);
  });

  test("4. HTML5 Phrasing Content Invariant (zero <div> em <p>), URL compartilhável e busca ⌘K", () => {
    focusDeepSpaceProbe("VOYAGER_1");
    const probeHtml = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.match(probeHtml, /Voyager 1/);
    assert.match(probeHtml, /data-testid="probe-light-time"/);
    for (const p of probeHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []) {
      assert.ok(!p.includes("<div"), `CosmicProbeInspectorCard violou <p>: ${p}`);
    }

    selectEclipseEvent("sobral-1919", { offsetMinutes: 15 });
    const eclipseHtml = renderToStaticMarkup(React.createElement(EclipseHud));
    assert.match(eclipseHtml, /Sobral/);
    assert.match(eclipseHtml, /\/dossies\/einstein/);
    for (const p of eclipseHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []) {
      assert.ok(!p.includes("<div"), `EclipseHud violou <p>: ${p}`);
    }

    // Round-trip de URL para sonda e eclipse
    useCosmicStore.getState().enterCosmicProbeView("JWST");
    useCosmicStore.getState().setActiveEclipse("luxor-2027", -20);
    const cam: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    const encoded = encodeView(cam);
    assert.match(encoded, /sonda=JWST/);
    assert.match(encoded, /eclipse=luxor-2027%2C-20|eclipse=luxor-2027,-20/);

    useCosmicStore.getState().resetCosmicState();
    restoreView(`?visao=1&${encoded}`, cam);
    assert.equal(useCosmicStore.getState().isCosmicMode, true);
    assert.equal(useCosmicStore.getState().focusedProbeId, "JWST");
    assert.equal(useCosmicStore.getState().activeEclipseId, "luxor-2027");
    assert.equal(useCosmicStore.getState().eclipseOffsetMinutes, -20);

    // Busca universal ⌘K encontra sondas e eclipses
    assert.ok(searchExplore("Voyager 1").some((r) => r.id === "probe:VOYAGER_1"));
    assert.ok(searchExplore("James Webb").some((r) => r.id === "probe:JWST"));
    assert.ok(searchExplore("Sobral 1919").some((r) => r.id === "eclipse:sobral-1919"));
    assert.ok(searchExplore("Luxor 2027").some((r) => r.id === "eclipse:luxor-2027"));
  });
});
