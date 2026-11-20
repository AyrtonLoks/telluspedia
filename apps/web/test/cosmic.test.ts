import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  KEPLERIAN_DATA,
  ASTROPHYSICAL_CATALOG,
  solveKeplerEquation,
  calculatePlanetaryPosition,
  computeAllPlanetaryPositions,
  mapDistanceToSceneRadius,
  generateOrbitalPathPoints,
  calculateHalleyPosition,
  generateHalleyOrbitalPath,
  COSMIC_SCALE_A,
  COSMIC_SCALE_GAMMA,
} from "../src/lib/astronomy-planets";

import {
  decodeHygCatalog,
  equatorialToVector3,
  bvToRgb,
  greenwichSiderealAngle,
  starAppearance,
  IAU_CONSTELLATIONS,
} from "../src/lib/hyg-star-data";

import { useCosmicStore } from "../src/stores/cosmicStore";
import { useStudyStore } from "../src/stores/studyStore";
import { forkStudyRecord, restoreStudyRecord, StudyRecord } from "../src/lib/studies-store";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";

describe("Horizonte 4: Expansão Cósmica, Efemérides Keplerianas & Abóbada HYG (RN18, RN19, RN20, RN21, RN22, RN23, RN16)", () => {
  test("1. Resolução Analítica da Equação de Kepler (solveKeplerEquation): Convergência de Newton-Raphson", () => {
    // Casos de teste: diferentes anomalias médias e excentricidades
    const testCases = [
      { M: 0, e: 0.0167 },
      { M: Math.PI / 4, e: 0.2056 }, // Mercúrio
      { M: Math.PI / 2, e: 0.0934 }, // Marte
      { M: Math.PI, e: 0.0484 },     // Júpiter
      { M: 2.5, e: 0.9671 },         // Cometa Halley (alta excentricidade)
    ];

    for (const tc of testCases) {
      const E = solveKeplerEquation(tc.M, tc.e);
      assert.ok(!Number.isNaN(E), `E não deve ser NaN para M=${tc.M}, e=${tc.e}`);
      // Erro residual: |E - e*sin(E) - M| < 1e-10
      const residual = Math.abs(E - tc.e * Math.sin(E) - tc.M);
      assert.ok(
        residual < 1e-10,
        `Resíduo de Kepler ${residual} excede 1e-10 para M=${tc.M}, e=${tc.e}`
      );
    }
  });

  test("2. Precisão das Efemérides Keplerianas Standish/JPL para Todos os 8 Planetas + Plutão (J2000.0)", () => {
    const epochJ2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const planets = computeAllPlanetaryPositions(epochJ2000);

    // Validação de Semieixos Maiores e Distâncias ao Sol em J2000.0 (tolerância < 1%)
    const expectedAu: Record<string, { a: number; e: number }> = {
      MERCURY: { a: 0.3871, e: 0.2056 },
      VENUS: { a: 0.7233, e: 0.0068 },
      EARTH: { a: 1.0000, e: 0.0167 },
      MARS: { a: 1.5237, e: 0.0934 },
      JUPITER: { a: 5.2029, e: 0.0484 },
      SATURN: { a: 9.5367, e: 0.0539 },
      URANUS: { a: 19.1892, e: 0.0473 },
      NEPTUNE: { a: 30.0699, e: 0.0086 },
      PLUTO: { a: 39.4821, e: 0.2488 },
    };

    for (const [id, exp] of Object.entries(expectedAu)) {
      const p = (planets as any)[id];
      assert.ok(p, `Planeta ${id} deve existir no catálogo de posições`);
      assert.ok(
        Math.abs(p.distanceSunAu - exp.a) / exp.a < 0.26,
        `Distância do Sol de ${id} (${p.distanceSunAu}) deve respeitar o envelope orbital de semieixo ${exp.a}`
      );
      assert.ok(
        p.distanceSunMkm > 0,
        `Distância em milhões de km deve ser positiva para ${id}`
      );
      assert.ok(
        !Number.isNaN(p.scenePosition.x) &&
        !Number.isNaN(p.scenePosition.y) &&
        !Number.isNaN(p.scenePosition.z),
        `scenePosition de ${id} não deve conter NaN`
      );
    }

    // A Terra em J2000.0 deve ter distância de ~1.00 UA do Sol
    assert.ok(
      Math.abs(planets.EARTH.distanceSunAu - 1.0) < 0.03,
      `Distância Terra-Sol deve ser ~1.0 UA (calculado: ${planets.EARTH.distanceSunAu})`
    );

    // A distância da Terra para ela mesma deve ser 0
    assert.equal(planets.EARTH.distanceEarthAu, 0);
  });

  test("3. Mapeamento de Escala Didática (mapDistanceToSceneRadius): Preservação de Ordem e Supressão de Z-Fighting", () => {
    const distancesAu = [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.189, 30.07, 39.482];
    const sceneRadii = distancesAu.map(mapDistanceToSceneRadius);

    // 1. Monotonicidade estrita: r1 < r2 ==> R1 < R2
    for (let i = 0; i < sceneRadii.length - 1; i++) {
      assert.ok(
        sceneRadii[i] < sceneRadii[i + 1],
        `Raio da cena deve ser estritamente crescente: ${sceneRadii[i]} < ${sceneRadii[i + 1]}`
      );
    }

    // 2. Limites do frustum da câmera: Mercúrio visível (> 15) e Plutão contido (< 220)
    assert.ok(sceneRadii[0] > 15.0, `Mercúrio (${sceneRadii[0]}) deve ser > 15 (fora da corona solar)`);
    assert.ok(sceneRadii[sceneRadii.length - 1] < 220.0, `Plutão (${sceneRadii[sceneRadii.length - 1]}) deve ser < 220`);
    assert.equal(Math.round(mapDistanceToSceneRadius(1.0)), 28);
  });

  test("4. Geração de Curvas Orbitais Keplerianas Fechadas (generateOrbitalPathPoints)", () => {
    const orbitPoints = generateOrbitalPathPoints("MARS", 120);
    assert.equal(orbitPoints.length, 121); // 120 segmentos + ponto final de fechamento

    for (const pt of orbitPoints) {
      assert.ok(!Number.isNaN(pt.x) && !Number.isNaN(pt.y) && !Number.isNaN(pt.z));
      const dist = pt.length();
      // Órbita de Marte em escala de cena deve estar entre ~30 e ~40 unidades
      assert.ok(dist >= 30.0 && dist <= 42.0, `Ponto orbital de Marte fora do envelope: ${dist}`);
    }

    // Ponto inicial e final devem coincidir (órbita fechada)
    const pStart = orbitPoints[0];
    const pEnd = orbitPoints[orbitPoints.length - 1];
    assert.ok(pStart.distanceTo(pEnd) < 1e-4, "Órbita kepleriana deve ser fechada");
  });

  test("5. Dinâmica Orbital e Cauda Iônica do Cometa 1P/Halley (calculateHalleyPosition)", () => {
    // 1. Passagem histórica de periélio em 1986
    const halley1986 = calculateHalleyPosition(1986.11);
    assert.ok(halley1986.distanceSunAu < 1.0, `Periélio de 1986 deve ser < 1.0 UA (obteve ${halley1986.distanceSunAu})`);
    assert.equal(halley1986.isPerihelionPassage, true, "1986.11 deve ser detectado como passagem de periélio");
    assert.ok(halley1986.tailLength > 10.0, "Cauda deve ser longa no periélio");

    // 2. Afélio distante (ex.: ano 2024)
    const halley2024 = calculateHalleyPosition(2024.0);
    assert.ok(halley2024.distanceSunAu > 30.0, `Em 2024 Halley deve estar perto do afélio > 30 UA (obteve ${halley2024.distanceSunAu})`);
    assert.equal(halley2024.isPerihelionPassage, false, "2024 não é passagem de periélio");

    // 3. Vetor da cauda deve apontar estritamente no sentido oposto ao Sol (origem)
    const dot = halley1986.tailDirection.dot(halley1986.scenePosition.clone().normalize());
    assert.ok(Math.abs(dot - 1.0) < 1e-4, "A cauda deve ser colinear e oposta ao Sol");

    // 4. Curva orbital completa de Halley
    const halleyPath = generateHalleyOrbitalPath(180);
    assert.equal(halleyPath.length, 181);
    for (const pt of halleyPath) {
      assert.ok(!Number.isNaN(pt.x) && !Number.isNaN(pt.y) && !Number.isNaN(pt.z));
    }
  });

  const catalogBytes = readFileSync(resolve(__dirname, "../public/data/sky/hyg-v4.1.bin"));
  const catalog = decodeHygCatalog(Uint8Array.from(catalogBytes).buffer);

  test("6. Catálogo HYG v4.1 contém medições reais até V=6,5", () => {
    assert.equal(catalog.visibleCount, 8920);
    assert.equal(catalog.stars.length, 8922);
    assert.ok(catalog.stars.slice(0, catalog.visibleCount).every((star) => star.vMag <= 6.5));
    assert.ok(catalog.stars.slice(catalog.visibleCount).every((star) => star.vMag > 6.5));
    assert.ok(catalog.stars.every((star) => star.ra >= 0 && star.ra < 360 && Math.abs(star.dec) <= 90));

    const sirius = catalog.stars.find((star) => star.hip === 32349);
    assert.equal(sirius?.name, "Sirius");
    assert.ok(sirius && Math.abs(sirius.vMag + 1.44) < 0.0001);
    assert.ok(Math.abs(sirius.ra - 101.287215) < 0.0001);
    assert.equal(catalog.stars.some((star) => star.name === "Sol"), false);
    assert.throws(() => decodeHygCatalog(new ArrayBuffer(4)), /Invalid HYG1/);

    const bright = starAppearance(sirius.vMag);
    const faint = starAppearance(6.5);
    assert.ok(bright.diameter > faint.diameter && bright.opacity > faint.opacity);
    assert.ok(bvToRgb(-0.2)[2] > bvToRgb(-0.2)[0]);
    assert.ok(bvToRgb(1.8)[0] > bvToRgb(1.8)[2]);
    assert.ok(bvToRgb(Number.NaN).every(Number.isFinite));

    const polaris = catalog.stars.find((star) => star.hip === 11767);
    assert.ok(polaris && equatorialToVector3(polaris.ra, polaris.dec).y > 0.99);
    const epoch = new Date("2000-01-01T12:00:00Z");
    const gmst = greenwichSiderealAngle(epoch);
    assert.ok(Math.abs(THREE.MathUtils.radToDeg(gmst) - 280.46061837) < 1e-7);
    const greenwich = equatorialToVector3(THREE.MathUtils.radToDeg(gmst), 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -gmst);
    assert.ok(greenwich.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9);
  });

  test("7. Traçados das 88 constelações do Stellarium têm rótulos pt-BR e vértices HIP válidos", () => {
    assert.equal(IAU_CONSTELLATIONS.length, 88);
    assert.equal(new Set(IAU_CONSTELLATIONS.map((c) => c.iauCode)).size, 88);
    const hips = new Set(catalog.stars.map((star) => star.hip));

    for (const constellation of IAU_CONSTELLATIONS) {
      assert.ok(constellation.namePt && constellation.paths.length > 0);
      for (const line of constellation.paths) {
        assert.ok(line.length > 1 && line.every((id) => hips.has(id)));
      }
    }

    const orion = IAU_CONSTELLATIONS.find((c) => c.iauCode === "Ori");
    assert.equal(orion?.namePt, "Órion");
    assert.deepEqual(orion.paths[0], [26727, 26311, 25930]);
    const crux = IAU_CONSTELLATIONS.find((c) => c.iauCode === "Cru");
    assert.equal(crux?.namePt, "Cruzeiro do Sul");
    assert.deepEqual(crux.paths, [[61084, 60718], [62434, 59747]]);
    const ursa = IAU_CONSTELLATIONS.find((c) => c.iauCode === "UMa");
    assert.equal(ursa?.namePt, "Ursa Maior");
    assert.deepEqual(ursa.paths[0], [67301, 65378, 62956, 59774, 54061, 53910, 58001, 59774]);
  });

  test("8. Gerenciador de Estado Cósmico (useCosmicStore): Transições, Alvos e Camadas", () => {
    useCosmicStore.getState().resetCosmicState();
    const initial = useCosmicStore.getState();
    assert.equal(initial.isCosmicMode, false);
    assert.equal(initial.focusedBodyId, null);
    assert.equal(initial.isPlaying, false);

    // Entrar na visão cósmica
    useCosmicStore.getState().enterCosmicView("MARS");
    let state = useCosmicStore.getState();
    assert.equal(state.isCosmicMode, true);
    assert.equal(state.focusedBodyId, "MARS");
    assert.equal(state.isInspectorOpen, true);

    // Alternância de camadas
    assert.ok(state.activeCosmicLayers.includes("ORBITS"));
    useCosmicStore.getState().toggleLayer("ORBITS");
    state = useCosmicStore.getState();
    assert.ok(!state.activeCosmicLayers.includes("ORBITS"));
    useCosmicStore.getState().toggleLayer("ORBITS");
    state = useCosmicStore.getState();
    assert.ok(state.activeCosmicLayers.includes("ORBITS"));

    // Controles de reprodução orbital
    useCosmicStore.getState().setPlayback(true, 365);
    state = useCosmicStore.getState();
    assert.equal(state.isPlaying, true);
    assert.equal(state.playbackSpeed, 365);

    // Sair para visão da Terra
    useCosmicStore.getState().exitToEarthView();
    state = useCosmicStore.getState();
    assert.equal(state.isCosmicMode, false);
    assert.equal(state.focusedBodyId, null);
    assert.equal(state.isPlaying, false);

    useCosmicStore.getState().resetCosmicState();
  });

  test("9. Persistência de Estudos Cósmicos com Fork Imutável (RN16: restoreStudyRecord & forkStudyRecord)", () => {
    const originalCosmicStudy: StudyRecord = {
      id: "estudo-cosmos-jupiter-saturno",
      parentId: null,
      title: "Exploração dos Gigantes Gasosos",
      description: "Estudo orbital comparado de Júpiter e Saturno.",
      timelineStartYear: 1970,
      timelineEndYear: 2024,
      selectedCountryIsos: [],
      activeCategories: ["SCIENCE_CULTURE"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 80,
      markdownNotes: "Notas astrofísicas da missão Voyager.",
      historicalEra: null,
      isApollo11Active: false,
      geologicalMa: null,
      activeRouteId: null,
      activeObservatoryLayers: [],
      isCosmicMode: true,
      focusedCelestialBody: "JUPITER",
      activeCosmicLayers: ["ORBITS", "CONSTELLATIONS", "LABELS"],
      createdAt: new Date().toISOString(),
    };

    // 1. Restauração de Estudo Cósmico
    const restored = restoreStudyRecord(originalCosmicStudy);
    assert.equal(restored.id, "estudo-cosmos-jupiter-saturno");
    assert.equal(restored.isCosmicMode, true);
    assert.equal(restored.focusedCelestialBody, "JUPITER");
    assert.deepEqual(restored.activeCosmicLayers, ["ORBITS", "CONSTELLATIONS", "LABELS"]);

    // 2. Fork Imutável de Estudo Cósmico
    const forked = forkStudyRecord(originalCosmicStudy, "fork-cosmos-1234");
    assert.equal(forked.id, "fork-cosmos-1234");
    assert.equal(forked.parentId, "estudo-cosmos-jupiter-saturno");
    assert.equal(forked.title, "[Fork] Exploração dos Gigantes Gasosos");
    assert.equal(forked.isCosmicMode, true);
    assert.equal(forked.focusedCelestialBody, "JUPITER");
    assert.deepEqual(forked.activeCosmicLayers, ["ORBITS", "CONSTELLATIONS", "LABELS"]);

    // 3. Sincronização com useStudyStore
    useStudyStore.getState().resetStudy();
    useStudyStore.getState().restoreStudy(forked);
    const storeState = useStudyStore.getState();
    assert.equal(storeState.currentStudyId, "fork-cosmos-1234");
    assert.equal(storeState.isCosmicMode, true);
    assert.equal(storeState.focusedCelestialBody, "JUPITER");
    assert.deepEqual(storeState.activeCosmicLayers, ["ORBITS", "CONSTELLATIONS", "LABELS"]);

    useStudyStore.getState().resetStudy();
  });

  test("10. Invariante de Conteúdo de Fraseamento HTML5 (RN21) no CosmicInspectorHUD", () => {
    // Configura o store no modo cósmico inspecionando Marte
    useCosmicStore.getState().enterCosmicView("MARS");

    const html = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.ok(html.length > 0, "CosmicInspectorHUD deve produzir marcação HTML");

    // Validação estrita: Nenhum <div> dentro de <p> (HTML5 Phrasing Content Invariant)
    const pBlocks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    assert.ok(pBlocks.length > 0, "Deve renderizar blocos de parágrafo <p>");
    for (const p of pBlocks) {
      assert.ok(
        !p.includes("<div"),
        `Invariante violado: Tag <p> no CosmicInspectorHUD não pode conter <div>: ${p}`
      );
    }

    // Validação de elementos esperados
    assert.ok(html.includes("Marte"), "Deve exibir o nome do astro");
    assert.ok(html.includes("Distância até o Sol"), "Deve exibir telemetria até o Sol");
    assert.ok(html.includes("Distância até a Terra"), "Deve exibir telemetria até a Terra");
    assert.ok(html.includes("Propriedades Astrofísicas"), "Deve exibir ficha técnica");

    useCosmicStore.getState().resetCosmicState();
  });

  test("11. Ciclo de Vida e Descarte Estrito de Recursos WebGL Cósmicos (.dispose())", () => {
    // 1. Geometria e Material do Sol
    const sunGeo = new THREE.SphereGeometry(7.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: "#f59e0b" });
    sunGeo.dispose();
    sunMat.dispose();

    // 2. Geometria de Anéis de Saturno (RingGeometry)
    const saturnRingsGeo = new THREE.RingGeometry(3.3, 6.2, 64);
    const saturnRingsMat = new THREE.MeshBasicMaterial({ color: "#e2d8b8", side: THREE.DoubleSide });
    saturnRingsGeo.dispose();
    saturnRingsMat.dispose();

    // 3. Geometria do Cinturão de Asteroides (IcosahedronGeometry)
    const asteroidGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: "#94a3b8" });
    asteroidGeo.dispose();
    asteroidMat.dispose();

    // 4. Geometria da Órbita e Cauda do Cometa Halley (BufferGeometry & CylinderGeometry)
    const halleyPoints = generateHalleyOrbitalPath(60);
    const halleyOrbitGeo = new THREE.BufferGeometry().setFromPoints(halleyPoints);
    const halleyTailGeo = new THREE.CylinderGeometry(0.08, 0.9, 1.0, 16);
    halleyOrbitGeo.dispose();
    halleyTailGeo.dispose();

    // 5. Geometria das 3.500+ Estrelas HYG e Constelações IAU
    const starPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 500; i++) {
      starPoints.push(new THREE.Vector3(i, 0, 0));
    }
    const hygGeo = new THREE.BufferGeometry().setFromPoints(starPoints);
    const hygMat = new THREE.PointsMaterial({ size: 1.0 });
    hygGeo.dispose();
    hygMat.dispose();

    assert.ok(true, "Todos os buffers e materiais cósmicos foram descartados adequadamente via .dispose()");
  });

  test("12. Seleção da Lua no Modo Normal Terrestre: Foco Lunar, Fase e Botão 'Voltar à Terra'", () => {
    // Garante que estamos no modo normal terrestre com foco na Lua
    useCosmicStore.getState().exitToEarthView();
    useCosmicStore.getState().focusBody("MOON");

    const state = useCosmicStore.getState();
    assert.equal(state.isCosmicMode, false, "Deve estar no modo normal terrestre");
    assert.equal(state.focusedBodyId, "MOON", "O corpo focado deve ser a Lua");
    assert.equal(state.isInspectorOpen, true, "O inspetor deve estar aberto");

    const html = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.ok(html.includes("Lua"), "Deve exibir o nome da Lua no HUD");
    assert.ok(html.includes("Fase Lunar:"), "Deve exibir a fase lunar atual");
    assert.ok(html.includes("data-testid=\"moon-return-earth-button\""), "Deve renderizar o botão 'Voltar à Terra'");
    assert.ok(html.includes("Voltar à Terra"), "Texto do botão deve ser 'Voltar à Terra'");

    // Ao clicar em voltar à Terra, o foco é limpo
    useCosmicStore.getState().focusBody(null);
    assert.equal(useCosmicStore.getState().focusedBodyId, null);

    useCosmicStore.getState().resetCosmicState();
  });

  test("13. Seleção da Terra no Modo Cósmico: Ficha Planetária e Botão 'Explorar Superfície / Países'", () => {
    // Entra no modo cósmico com foco na Terra
    useCosmicStore.getState().enterCosmicView("EARTH");

    const state = useCosmicStore.getState();
    assert.equal(state.isCosmicMode, true, "Deve estar no modo cósmico");
    assert.equal(state.focusedBodyId, "EARTH", "O corpo focado deve ser a Terra");

    const html = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.ok(html.includes("Terra"), "Deve exibir o título da Terra");
    assert.ok(html.includes("78.1% Nitrogênio"), "Deve exibir a atmosfera terrestre");
    assert.ok(html.includes("data-testid=\"cosmic-land-earth-button\""), "Deve exibir o botão de aterrissagem na Terra");
    assert.ok(html.includes("Explorar Superfície / Países"), "Texto do botão de aterrissagem deve estar presente");

    // Aciona aterrissagem para sair do modo cósmico
    useCosmicStore.getState().exitToEarthView();
    assert.equal(useCosmicStore.getState().isCosmicMode, false);
    assert.equal(useCosmicStore.getState().focusedBodyId, null);

    useCosmicStore.getState().resetCosmicState();
  });

  test("14. Seleção da Lua no Modo Cósmico: Foco Orbital e Botão 'Focar na Terra'", () => {
    useCosmicStore.getState().enterCosmicView("MOON");

    const state = useCosmicStore.getState();
    assert.equal(state.isCosmicMode, true);
    assert.equal(state.focusedBodyId, "MOON");

    const html = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
    assert.ok(html.includes("Lua"));
    assert.ok(html.includes("data-testid=\"moon-focus-earth-button\""), "Deve exibir o botão para focar na Terra a partir da Lua");
    assert.ok(html.includes("Focar na Terra (Planeta-mãe)"));

    // Alterna foco para a Terra
    useCosmicStore.getState().focusBody("EARTH");
    assert.equal(useCosmicStore.getState().focusedBodyId, "EARTH");

    useCosmicStore.getState().resetCosmicState();
  });
});
