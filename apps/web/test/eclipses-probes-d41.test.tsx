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
import {
  createProbeMaterialPalette,
  disposeProbeMaterialPalette,
} from "../src/components/globe/probe-materials";
import {
  buildProbeModelGroup,
  disposeBuiltProbeModel,
} from "../src/components/globe/probe-models";
import { resolveProbeSceneScale } from "../src/components/globe/DeepSpaceProbesLayer";
import { getProbeViewOffset, cosmicMinDistance } from "../src/components/globe/CosmicCameraController";
import { computeSunDirection } from "../src/lib/epoch/useSunDirection";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import {
  focusCelestialBody,
  focusDeepSpaceProbe,
  selectEclipseEvent,
  clearCelestialFocus,
} from "../src/stores/actions";
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

  test("1. Catálogo de 5 eclipses: estações calibradas (Sobral/Príncipe/Luxor/Espanha), sizígia colinear e faixa acima das nuvens", () => {
    assert.equal(ECLIPSES_LIST.length, 5);
    const solarCount = ECLIPSES_LIST.filter((e) => e.kind === "solar_total").length;
    assert.ok(solarCount >= 4, "Deve haver ao menos 4 eclipses solares totais emblemáticos");
    assert.ok(TOTALITY_RIBBON_RADIUS > 1.006, "Faixa de totalidade deve ficar acima de CloudLayer (1.006)");

    // Sobral 1919: offset default (-69 min = 12:00 UTC) cai diretamente sobre Sobral, Ceará (-3.69°, -40.35°)
    const sobralDefault = computeEclipseGeometry(
      "sobral-1919",
      ECLIPSES_CATALOG["sobral-1919"].defaultOffsetMinutes
    );
    assert.ok(Math.abs(sobralDefault.shadowLat - -3.69) < 0.05, "Umbra sobre Sobral lat");
    assert.ok(Math.abs(sobralDefault.shadowLng - -40.35) < 0.05, "Umbra sobre Sobral lng");
    assert.match(sobralDefault.activeLocationPt, /Sobral/);

    // Príncipe (+64 min = 14:13 UTC) cai sobre a Ilha do Príncipe (1.61°, 7.40°)
    const principe = computeEclipseGeometry("sobral-1919", 64);
    assert.ok(Math.abs(principe.shadowLat - 1.61) < 0.05);
    assert.ok(Math.abs(principe.shadowLng - 7.4) < 0.05);

    for (const id of ECLIPSE_IDS) {
      const g0 = computeEclipseGeometry(id, 0);
      assert.equal(g0.targetDate.getTime(), Date.parse(ECLIPSES_CATALOG[id].greatestUtcIso));
      assert.ok(Math.abs(g0.shadowLat - ECLIPSES_CATALOG[id].greatestLat) < 0.05, `${id} lat`);
      assert.ok(Math.abs(g0.shadowLng - ECLIPSES_CATALOG[id].greatestLng) < 0.05, `${id} lng`);
      assert.ok(g0.lunarDistanceKm > 350_000 && g0.lunarDistanceKm < 410_000);
      assert.ok(g0.umbralConeLengthKm > 365_000);

      if (g0.eclipse.kind === "solar_total") {
        assert.ok(g0.sunMoonSeparationDeg < 1.2);
        // Colinearidade estrita Sol–Lua–Umbra na cena comprimida
        const rayToMoon = g0.syzygyMoonLocalPos.clone().sub(g0.shadowDirection).normalize();
        assert.ok(
          rayToMoon.dot(g0.sunDirection) > 0.9999,
          `${id}: raio da mancha de umbra até a Lua deve ser estritamente paralelo aos raios solares`
        );

        const gBefore = computeEclipseGeometry(id, -40);
        const gAfter = computeEclipseGeometry(id, 40);
        assert.ok(gBefore.shadowDirection.distanceTo(gAfter.shadowDirection) > 0.12);

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
        assert.ok(g0.sunMoonSeparationDeg > 178.5);
        assert.equal(g0.lunarUmbraImmersion, 1);
        assert.ok(
          g0.syzygyMoonLocalPos.clone().normalize().dot(g0.sunDirection) < -0.99,
          "No eclipse lunar a Lua deve estar no cone anti-solar da Terra"
        );
      }
    }

    const sunSobral = computeSunDirection({
      effectiveYear: 1919,
      selectedMilestoneId: null,
      activeScene: null,
      activeEclipseId: "sobral-1919",
      eclipseOffsetMinutes: -69,
    });
    assert.equal(sunSobral.isLiveClock, false);
    assert.equal(
      sunSobral.targetDate.getTime(),
      resolveEclipseTargetDate("sobral-1919", -69).getTime()
    );

    assert.equal(sanitizeEclipseNasaUrl("javascript:alert(1)"), "https://science.nasa.gov/eclipses/");
    assert.equal(sanitizeEclipseNasaUrl("https://evil.example/eclipse"), "https://science.nasa.gov/eclipses/");
  });

  test("2. Efemérides DSN e modelos 3D PBR multicomponente das 4 sondas (Voyager 1/2, New Horizons, JWST)", () => {
    assert.deepEqual([...DEEP_SPACE_PROBE_IDS], ["VOYAGER_1", "VOYAGER_2", "NEW_HORIZONS", "JWST"]);

    const v1_1990 = calculateProbePosition("VOYAGER_1", 1990.123);
    const v1_2012 = calculateProbePosition("VOYAGER_1", 2012.649);
    const v1_2026 = calculateProbePosition("VOYAGER_1", 2026.0);
    const v2_2026 = calculateProbePosition("VOYAGER_2", 2026.0);
    const nh_2015 = calculateProbePosition("NEW_HORIZONS", 2015.534);
    const nh_2026 = calculateProbePosition("NEW_HORIZONS", 2026.0);
    const jwst_2026 = calculateProbePosition("JWST", 2026.0);

    assert.ok(Math.abs(v1_1990.distanceSunAu - 40.47) < 0.2);
    assert.ok(Math.abs(v1_2012.distanceSunAu - 121.6) < 0.2);
    assert.ok(v1_2026.distanceSunAu > 168 && v1_2026.distanceSunAu < 173);
    assert.ok(v1_2026.distanceSunAu > v2_2026.distanceSunAu);
    assert.ok(v2_2026.distanceSunAu > nh_2026.distanceSunAu);
    assert.ok(Math.abs(nh_2015.distanceSunAu - 32.91) < 0.25);
    assert.ok(jwst_2026.oneWayLightSeconds >= 4.5 && jwst_2026.oneWayLightSeconds <= 6.5);
    assert.ok(v1_2026.oneWayLightSeconds > 23 * 3600);
    assert.ok(
      Math.abs(v1_2026.oneWayLightSeconds - v1_2026.distanceEarthAu * LIGHT_SECONDS_PER_AU) < 1.0
    );
    assert.equal(formatLightTime(5.36, "pt-BR"), "5,4 s-luz");
    assert.equal(formatLightTime(5.36, "en"), "5.4 light-sec");

    // Proporção física: no modo real (Terra = 0.11), JWST tem escala estritamente menor que a Terra
    assert.ok(resolveProbeSceneScale("JWST", "real") < 0.11);

    // Validação estrutural dos modelos 3D PBR e descarte completo (RN21)
    const palette = createProbeMaterialPalette();
    assert.ok(palette.materials.length >= 8 && palette.textures.length >= 5);
    for (const id of DEEP_SPACE_PROBE_IDS) {
      const built = buildProbeModelGroup(id, palette);
      let meshCount = 0;
      built.group.traverse((obj) => {
        if ((obj as { isMesh?: boolean }).isMesh) meshCount++;
      });
      if (id === "JWST") {
        assert.ok(meshCount >= 45, `JWST deve ter 18 segmentos hexagonais + 5 camadas Kapton + tripé (achou ${meshCount})`);
      } else {
        assert.ok(meshCount >= 10, `${id} deve ser montagem 3D multicomponente detalhada (achou ${meshCount})`);
      }
      disposeBuiltProbeModel(built);
    }
    disposeProbeMaterialPalette(palette);

    assert.equal(sanitizeNasaMissionUrl("javascript:evil()"), "https://science.nasa.gov/missions/");
  });

  test("3. Handover seguro de câmera sem NaN (AGENTS.md §1), preservação de modo no Cosmos e dispose() GPU (RN21)", () => {
    for (const mode of ["visual", "real"] as const) {
      for (const probeId of DEEP_SPACE_PROBE_IDS) {
        const pos = calculateProbePosition(probeId, 2026.4, mode);
        const offset = getProbeViewOffset(probeId, mode, 2026.4);
        const minDist = cosmicMinDistance(null, mode, probeId);
        assert.ok(
          Number.isFinite(pos.scenePosition.x) &&
            Number.isFinite(pos.scenePosition.y) &&
            Number.isFinite(pos.scenePosition.z)
        );
        assert.ok(offset.length() >= 0.3, `${probeId} (${mode}) offset seguro >= 0.3`);
        assert.ok(minDist >= 0.18, `${probeId} (${mode}) minDistance seguro >= 0.18`);

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

    // Selecionar eclipse dentro do Modo Cosmos preserva o Modo Cosmos e mantém o inspetor na Lua
    useCosmicStore.getState().enterCosmicView("MOON");
    selectEclipseEvent("luxor-2027");
    assert.equal(useCosmicStore.getState().isCosmicMode, true, "Não deve sair do Modo Cosmos de surpresa");
    assert.equal(useCosmicStore.getState().focusedBodyId, "MOON");
    assert.ok(
      Math.abs((useTimelineStore.getState().selectedYear ?? 0) - 2027.5847) < 0.01,
      "Deve sincronizar ano decimal de 2 de agosto de 2027"
    );

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
    assert.match(probesLayerSrc, /disposeProbeMaterialPalette/);
    assert.match(probesLayerSrc, /<CelestialLabel\b/);
    assert.doesNotMatch(probesLayerSrc, /OctahedronGeometry/);
  });

  test("4. Simulador de Eclipses integrado à Lua, HTML5 Phrasing Content Invariant, URL e busca ⌘K", () => {
    // Focar a Lua renderiza o Simulador de Eclipses diretamente no CosmicInspectorHUD
    useCosmicStore.getState().enterCosmicView("MOON");
    selectEclipseEvent("blood-moon-2025");
    const moonHtml = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.match(moonHtml, /data-testid="moon-eclipse-simulator"/);
    assert.match(moonHtml, /Lua de Sangue/);
    for (const p of moonHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []) {
      assert.ok(!p.includes("<div"), `CosmicInspectorHUD/Moon violou <p>: ${p}`);
    }

    // No Modo Cosmos, EclipseHud flutuante esquerdo fica oculto (evita duplicidade); no Globo, aparece limpo
    assert.equal(renderToStaticMarkup(React.createElement(EclipseHud)), "");
    selectEclipseEvent("sobral-1919", { lat: -3.69, lng: -40.35, targetMode: "earth" });
    assert.equal(useCosmicStore.getState().isCosmicMode, false);
    const eclipseHtml = renderToStaticMarkup(React.createElement(EclipseHud));
    assert.match(eclipseHtml, /Sobral/);
    assert.match(eclipseHtml, /\/dossies\/einstein/);
    for (const p of eclipseHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []) {
      assert.ok(!p.includes("<div"), `EclipseHud violou <p>: ${p}`);
    }

    // No Modo Terra, focar a Lua também expõe o Simulador de Eclipses
    focusCelestialBody("MOON");
    const earthMoonHtml = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.match(earthMoonHtml, /data-testid="moon-eclipse-simulator"/);

    // Round-trip de URL para sonda e eclipse (restaura ano decimal exato do eclipse)
    useCosmicStore.getState().enterCosmicProbeView("JWST");
    useCosmicStore.getState().setActiveEclipse("luxor-2027", -20);
    const cam: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    const encoded = encodeView(cam);
    assert.match(encoded, /sonda=JWST/);
    assert.match(encoded, /eclipse=luxor-2027%2C-20|eclipse=luxor-2027,-20/);

    useCosmicStore.getState().resetCosmicState();
    restoreView(`?visao=1&ano=2027&${encoded}`, cam);
    assert.equal(useCosmicStore.getState().isCosmicMode, true);
    assert.equal(useCosmicStore.getState().focusedProbeId, "JWST");
    assert.equal(useCosmicStore.getState().activeEclipseId, "luxor-2027");
    assert.equal(useCosmicStore.getState().eclipseOffsetMinutes, -20);
    assert.ok(Math.abs((useTimelineStore.getState().selectedYear ?? 0) - 2027.5846) < 0.01);

    assert.ok(searchExplore("Voyager 1").some((r) => r.id === "probe:VOYAGER_1"));
    assert.ok(searchExplore("James Webb").some((r) => r.id === "probe:JWST"));
    assert.ok(searchExplore("Sobral 1919").some((r) => r.id === "eclipse:sobral-1919"));
    assert.ok(searchExplore("Luxor 2027").some((r) => r.id === "eclipse:luxor-2027"));
  });
});
