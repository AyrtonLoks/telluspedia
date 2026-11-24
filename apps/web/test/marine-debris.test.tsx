/**
 * D29 — Lixo Marítimo, Giros Oceânicos & Microplásticos (`RN17`):
 * 5 giros observados (NOAA / Eriksen–Lebreton), advecção Lagrangiana acoplada a correntes + ventos (D27),
 * simulador educativo de deriva, controles D14 bilíngues, descarte GPU (`dispose`) e serialização em Estudos.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildClimatologyCurrentsGrid } from "../src/lib/currents-data";
import { buildClimatologyWindField } from "../src/lib/winds-data";
import { getContemporarySpatialIndex } from "../src/lib/historical-topology";
import {
  DEBRIS_LAUNCH_PRESETS,
  OCEAN_GYRES,
  computeCoupledDriftVelocity,
  sampleObservedDebrisDensity,
  simulateDriftTrajectories,
  snapToNearestOcean,
  type CoupledVelocitySample,
} from "../src/lib/marine-debris-data";
import { debrisCountsForPreset } from "../src/components/globe/MarineDebrisLayer";
import { MarineDebrisControls } from "../src/components/observatory/MarineDebrisControls";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";

const webRoot = path.resolve(__dirname, "..");

describe("D29 · Lixo Marítimo, Giros Oceânicos & Advecção Lagrangiana (RN17)", () => {
  test("1. Catálogo dos 5 giros subtropicais respeita rotação hemisférica, fontes primárias e campo observado", () => {
    assert.equal(OCEAN_GYRES.length, 5);
    const ids = new Set(OCEAN_GYRES.map((g) => g.id));
    for (const id of ["north-pacific", "south-pacific", "north-atlantic", "south-atlantic", "indian-ocean"]) {
      assert.ok(ids.has(id as (typeof OCEAN_GYRES)[number]["id"]), `giro ${id} presente`);
    }

    for (const gyre of OCEAN_GYRES) {
      // HN gira no sentido horário; HS no sentido anti-horário (Coriolis / Ekman)
      const expectedRotation = gyre.centerLat > 0 ? "clockwise" : "counterclockwise";
      assert.equal(gyre.rotation, expectedRotation, `${gyre.id} deve seguir Coriolis`);
      assert.ok(gyre.peakParticlesPerKm2 > 10_000);
      assert.ok(gyre.estimatedMassTonnes > 10_000);
      assert.match(gyre.sourceUrl, /^https:\/\//);
      assert.ok(gyre.namePt.length > 5 && gyre.nameEn.length > 5);

      const centerDensity = sampleObservedDebrisDensity(gyre.centerLat, gyre.centerLng);
      assert.ok(centerDensity >= 0.5, `centro de ${gyre.id} deve apresentar alta densidade observada`);
    }

    // Ponto polar distante tem densidade observada praticamente nula
    assert.ok(sampleObservedDebrisDensity(-82, 0) < 0.05);
  });

  test("2. Advecção Lagrangiana acopla correntes + windage (1–3%) e converge os 6 lançamentos costeiros aos seus giros", () => {
    const currents = buildClimatologyCurrentsGrid();
    const surfaceWind = buildClimatologyWindField().surface;
    const spatialIndex = getContemporarySpatialIndex();

    // Windage maior altera o vetor resultante sobre oceano aberto (acoplamento real D27a + D27b)
    const v1: CoupledVelocitySample = { u: 0, v: 0, speedMs: 0, inOcean: false };
    const v3: CoupledVelocitySample = { u: 0, v: 0, speedMs: 0, inOcean: false };
    computeCoupledDriftVelocity(30, -140, currents, surfaceWind, 0.01, v1);
    computeCoupledDriftVelocity(30, -140, currents, surfaceWind, 0.03, v3);
    assert.equal(v1.inOcean, true);
    assert.equal(v3.inOcean, true);
    assert.ok(
      Math.hypot(v3.u - v1.u, v3.v - v1.v) > 0.01,
      "variação do fator de windage (1% → 3%) deve modificar a velocidade acoplada"
    );

    // Snap costeiro: ponto ligeiramente sobre a costa do Rio de Janeiro encaixa no Atlântico Sul adjacente
    const snapped = snapToNearestOcean(-22.9, -43.2, currents, spatialIndex);
    assert.ok(snapped, "ponto costeiro deve encontrar célula oceânica adjacente");
    assert.equal(spatialIndex?.([snapped.lng, snapped.lat]), null);

    // Todos os 6 presets costeiros convergem para o giro de sua respectiva bacia oceânica
    const expectedBasin: Record<string, string> = {
      santos: "south-atlantic",
      tokyo: "north-pacific",
      lisbon: "north-atlantic",
      lima: "south-pacific",
      "cape-town": "south-atlantic",
      perth: "indian-ocean",
    };

    for (const preset of DEBRIS_LAUNCH_PRESETS) {
      const sim = simulateDriftTrajectories({
        origin: { lat: preset.lat, lng: preset.lng, label: preset.labelPt },
        currents,
        surfaceWind,
        windage: 0.02,
        horizonMonths: 24,
        spatialIndex,
      });
      assert.equal(sim.trajectories.length, 5, "conjunto deve gerar 5 traçadores (central + 4 dispersões)");
      assert.ok(sim.distanceKm > 500, `${preset.id} deve percorrer trajetória oceânica mensurável`);
      assert.equal(
        sim.destinationGyre.id,
        expectedBasin[preset.id],
        `${preset.id} deve convergir para ${expectedBasin[preset.id]}`
      );
    }
  });

  test("3. MarineDebrisControls renderiza selo T05 dual, 5 giros e simulador bilíngue (pt-BR e en)", () => {
    const prevObs = useObservatoryStore.getState();
    const prevLocale = useLocaleStore.getState();
    try {
      useObservatoryStore.setState({
        currents: buildClimatologyCurrentsGrid(),
        winds: buildClimatologyWindField(),
        selectedGyreId: "north-pacific",
        marineDebrisReleasePoint: { lat: -24.5, lng: -45.5, label: "Santos (Brasil)" },
        marineDebrisWindage: 0.02,
        marineDebrisHorizonMonths: 24,
      });

      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
      const ptHtml = renderToStaticMarkup(React.createElement(MarineDebrisControls));
      assert.match(ptHtml, /data-testid="marine-debris-controls"/);
      assert.match(ptHtml, /data-testid="debris-provenance-note"/);
      assert.match(ptHtml, /Giros observados:/);
      assert.match(ptHtml, /Advecção Lagrangiana:/);
      assert.match(ptHtml, /Giro do Pacífico Norte/);
      assert.match(ptHtml, /data-testid="debris-simulation-result"/);
      assert.match(ptHtml, /Giro do Atlântico Sul/);

      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const enHtml = renderToStaticMarkup(React.createElement(MarineDebrisControls));
      assert.match(enHtml, /Observed gyres:/);
      assert.match(enHtml, /Lagrangian advection:/);
      assert.match(enHtml, /North Pacific Gyre/);
      assert.match(enHtml, /South Atlantic Gyre/);
      assert.match(enHtml, /Launch drifters by clicking the ocean/);
    } finally {
      useObservatoryStore.setState({
        currents: prevObs.currents,
        winds: prevObs.winds,
        selectedGyreId: prevObs.selectedGyreId,
        marineDebrisReleasePoint: prevObs.marineDebrisReleasePoint,
        marineDebrisWindage: prevObs.marineDebrisWindage,
        marineDebrisHorizonMonths: prevObs.marineDebrisHorizonMonths,
      });
      useLocaleStore.setState({ locale: prevLocale.locale, enMessages: prevLocale.enMessages });
    }
  });

  test("4. MarineDebrisLayer respeita T39, RN22 (isThrottled), dispose() na GPU e schema de Estudos aceita MARINE_DEBRIS", () => {
    const low = debrisCountsForPreset("low");
    const med = debrisCountsForPreset("medium");
    const high = debrisCountsForPreset("high");
    assert.ok(low.gyrePoints < med.gyrePoints && med.gyrePoints < high.gyrePoints);
    assert.ok(low.drifters < med.drifters && med.drifters < high.drifters);

    const layerSrc =
      fs.readFileSync(path.join(webRoot, "src/components/globe/MarineDebrisLayer.tsx"), "utf8") +
      "\n" +
      fs.readFileSync(path.join(webRoot, "src/components/globe/MarineDebrisRibbons.tsx"), "utf8");
    assert.match(layerSrc, /if \(isThrottled\) return/);
    assert.match(layerSrc, /gyreGeometry\.dispose\(\)/);
    assert.match(layerSrc, /drifterGeometry\.dispose\(\)/);
    assert.match(layerSrc, /gyreMaterial\.dispose\(\)/);
    assert.match(layerSrc, /drifterMaterial\.dispose\(\)/);
    assert.match(layerSrc, /ribbonGeometry\?\.dispose\(\)/);
    assert.match(layerSrc, /ribbonMaterial\?\.dispose\(\)/);

    // Schema de Estudos aceita MARINE_DEBRIS em época contemporânea e suprime em eras históricas (G-EPOCA/G-ESTUDOS)
    const contemporaryStudy = studyInput.safeParse({
      title: "Convergência de Microplásticos no Atlântico Sul",
      activeObservatoryLayers: ["MARINE_DEBRIS", "GLOBAL_WINDS"],
    });
    assert.equal(contemporaryStudy.success, true);

    const sanitizedModern = sanitizeStudy({
      title: "Estudo Contemporâneo",
      timelineEndYear: 2026,
      activeObservatoryLayers: ["MARINE_DEBRIS"],
    });
    assert.deepEqual(sanitizedModern.activeObservatoryLayers, ["MARINE_DEBRIS"]);

    const sanitizedHistorical = sanitizeStudy({
      title: "Estudo 1914",
      timelineStartYear: 1910,
      timelineEndYear: 1914,
      historicalEra: "WW1_1914",
      activeObservatoryLayers: ["MARINE_DEBRIS"],
    });
    assert.deepEqual(sanitizedHistorical.activeObservatoryLayers, []);
  });
});
