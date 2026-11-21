import { applyTimelinePreset, enterGeologicalMode, restoreStudySnapshot, selectCountry } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useStudyStore } from "../src/stores/studyStore";
import {
  getMemoryStudy,
  saveMemoryStudy,
  forkStudyRecord,
  restoreStudyRecord,
  StudyRecord,
} from "../src/lib/studies-store";
import { HistoricalEraBadge } from "../src/components/globe/HistoricalEraBadge";
import {
  resolveHistoricalEra,
  resolveHistoricalEntity,
  resolveEffectiveHistoricalYear,
  HISTORICAL_ENTITIES,
} from "../src/lib/historical-entities";
import { StudyShareModal } from "../src/components/study/StudyShareModal";
import { useSceneStore } from "../src/stores/sceneStore";

describe("Componente 4: Persistência & Compartilhamento de Estudos (RN16) e Componente Visual de Era", () => {
  test("1. Resolução Canônica de Eras Históricas (resolveHistoricalEra)", () => {
    assert.equal(resolveHistoricalEra(1870).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1914).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1939).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1969).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(2024).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(null).id, "CONTEMPORARY");
  });

  test("2. Resolução e Continuidade de Entidades Históricas (resolveHistoricalEntity)", () => {
    assert.equal(resolveHistoricalEntity("DEU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("RUS", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("BRA", 1870), "BRA");
  });

  test("3. Serialização de Estudos com Estado Histórico e Fork Imutável (RN16)", () => {
    const study: StudyRecord = {
      id: "estudo-prussia-1870-k3m1",
      parentId: null,
      title: "Unificação Alemã e Reino da Prússia",
      description: "Recorte geopolítico da Europa Central em 1870",
      timelineStartYear: 1850,
      timelineEndYear: 1889,
      selectedCountryIsos: ["PRU", "FRA"],
      activeCategories: ["WAR_MILITARY", "POLITICS_REGIMES"],
      cameraLat: 52.5,
      cameraLng: 13.4,
      cameraAltitude: 2.2,
      markdownNotes: "Análise da Guerra Franco-Prussiana e fundação do Império Alemão.",
      historicalEra: "PRUSSIA_1870",
      isApollo11Active: false,
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(study);
    const retrieved = getMemoryStudy("estudo-prussia-1870-k3m1");
    assert.ok(retrieved);
    assert.equal(retrieved.historicalEra, "PRUSSIA_1870");
    assert.equal(retrieved.isApollo11Active, false);
    assert.equal(retrieved.selectedCountryIsos[0], "PRU");

    // Test Fork preservation
    const forked: StudyRecord = {
      ...retrieved,
      id: "fork-prussia-99aa",
      parentId: retrieved.id,
      title: `[Fork] ${retrieved.title}`,
      createdAt: new Date().toISOString(),
    };
    saveMemoryStudy(forked);

    const retrievedFork = getMemoryStudy("fork-prussia-99aa");
    assert.ok(retrievedFork);
    assert.equal(retrievedFork.parentId, "estudo-prussia-1870-k3m1");
    assert.equal(retrievedFork.historicalEra, "PRUSSIA_1870");
    assert.equal(retrievedFork.isApollo11Active, false);
  });

  test("4. useStudyStore gerencia historicalEra e isApollo11Active perfeitamente", () => {
    const store = useStudyStore.getState();
    store.resetStudy();

    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    store.setStudy({
      id: "apollo11-study",
      title: "Missão Apollo 11",
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: true,
      notes: "Telemetria translunar",
    });

    const activeState = useStudyStore.getState();
    assert.equal(activeState.currentStudyId, "apollo11-study");
    assert.equal(activeState.historicalEra, "COLD_WAR_1969");
    assert.equal(activeState.isApollo11Active, true);

    store.setHistoricalEra("WW2_1939");
    assert.equal(useStudyStore.getState().historicalEra, "WW2_1939");

    store.setIsApollo11Active(false);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    store.resetStudy();
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);
  });

  test("5. HistoricalEraBadge renderiza badge flutuante para eras históricas e oculta no contemporâneo", () => {
    // 1. Contemporary (2024) -> Returns empty (null)
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.equal(html, "", "Contemporary era should not render HistoricalEraBadge");

    // 2. Historical Year 1870 -> Displays Prussia era badge and restore button
    useTimelineStore.getState().selectYear(1870);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Cartografia Histórica:"), "Badge should have title");
    assert.ok(html.includes("Unificação Alemã &amp; Reino da Prússia") || html.includes("Unificação Alemã & Reino da Prússia"), "Badge should display Prussia era label");
    assert.ok(html.includes("Restaurar Cartografia Atual"), "Badge should have restore button");

    // 3. Historical Year 1914 -> WWI
    useTimelineStore.getState().selectYear(1914);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Primeira Guerra Mundial"));

    // 4. Historical Year 1939 -> WWII
    useTimelineStore.getState().selectYear(1939);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Segunda Guerra Mundial"));

    // 5. Cold War 1969
    useTimelineStore.getState().selectYear(1969);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Guerra Fria &amp; Corrida Espacial") || html.includes("Guerra Fria & Corrida Espacial"));

    // Cleanup
    useTimelineStore.getState().selectYear(null);
  });

  test("6. StudyShareModal exibe badges informativos de Cartografia Histórica e Apollo 11 quando ativos", () => {
    useStudyStore.getState().setShareModalOpen(true);

    // With 1870 active
    useTimelineStore.getState().selectYear(1870);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(html.includes("Cartografia Histórica Ativa Capturada"), "Modal should display historical era captured badge");
    assert.ok(html.includes("Unificação Alemã &amp; Reino da Prússia") || html.includes("Unificação Alemã & Reino da Prússia"));

    // With Apollo 11 active (glo-1969)
    useTimelineStore.getState().selectMilestone("glo-1969");
    html = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(html.includes("Missão Espacial Apollo 11 (1969)"), "Modal should display Apollo 11 badge");

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().selectYear(null);
    useTimelineStore.getState().selectMilestone(null);
  });

  test("7. resolveEffectiveHistoricalYear resolves correctly across presets, intervals and milestones", () => {
    // 1. Explicit year takes precedence
    assert.equal(resolveEffectiveHistoricalYear({ selectedYear: 1870, startYear: 1974, endYear: 2024 }), 1870);

    // 2. Milestone takes precedence over interval
    assert.equal(resolveEffectiveHistoricalYear({ milestoneYear: 1969, startYear: 1974, endYear: 2024 }), 1969);

    // 3. Cold War preset interval (1947 - 1991) resolves to 1969
    const coldWarYear = resolveEffectiveHistoricalYear({ startYear: 1947, endYear: 1991 });
    assert.equal(coldWarYear, 1969);
    assert.equal(resolveHistoricalEra(coldWarYear).id, "COLD_WAR_1969");

    // 4. World Wars preset interval (1914 - 1945) resolves to 1939
    const wwYear = resolveEffectiveHistoricalYear({ startYear: 1914, endYear: 1945 });
    assert.equal(wwYear, 1939);
    assert.equal(resolveHistoricalEra(wwYear).id, "WW2_1939");

    // 5. Prussia era interval (1850 - 1889) resolves to 1870
    const pruYear = resolveEffectiveHistoricalYear({ startYear: 1850, endYear: 1889 });
    assert.equal(pruYear, 1870);
    assert.equal(resolveHistoricalEra(pruYear).id, "PRUSSIA_1870");

    // 6. Contemporary LAST_50_YEARS interval (1974 - 2024) resolves to null -> CONTEMPORARY
    const contempYear = resolveEffectiveHistoricalYear({ startYear: 1974, endYear: 2024 });
    assert.equal(contempYear, null);
    assert.equal(resolveHistoricalEra(contempYear).id, "CONTEMPORARY");
  });

  test("8. HistoricalEraBadge: dynamically offsets layout when study banner is active and handles restore reset", () => {
    useTimelineStore.getState().selectYear(1870);

    // Without study open -> top-16 sm:top-5
    useStudyStore.getState().resetStudy();
    let html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("top-16 sm:top-5"), "Default positioning when no study is active");
    assert.ok(html.includes("1870 — Unificação Alemã & Reino da Prússia") || html.includes("1870 — Unificação Alemã &amp; Reino da Prússia"));

    // With active study banner mounted -> top-24 sm:top-20 to avoid visual occlusion
    useStudyStore.getState().setStudy({
      id: "estudo-teste-posicao",
      title: "Estudo de Teste",
      historicalEra: "PRUSSIA_1870",
    });
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("top-24 sm:top-20"), "Lower positioning when study banner is active");

    // Test Restore Cartography: resets timeline, clears studyStore era, and migrates historical entity to modern successor
    selectCountry("PRU");
    assert.equal(useGlobeStore.getState().selectedIso, "PRU");

    // Simulate clicking restore (using the exact handler logic)
    useTimelineStore.getState().selectMilestone(null);
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().setYearRange(1974, 2024);
    useStudyStore.getState().setHistoricalEra(null);
    useStudyStore.getState().setIsApollo11Active(false);

    const currentIso = useGlobeStore.getState().selectedIso;
    if (currentIso && HISTORICAL_ENTITIES[currentIso]?.successorIsos?.length > 0) {
      selectCountry(HISTORICAL_ENTITIES[currentIso].successorIsos[0]);
    }

    assert.equal(useTimelineStore.getState().selectedYear, 2024);
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);
    assert.equal(useGlobeStore.getState().selectedIso, "DEU", "Extinct PRU should transition to modern DEU upon cartography restoration");

    // Cleanup
    useStudyStore.getState().resetStudy();
    useTimelineStore.getState().selectYear(null);
    selectCountry(null);
  });

  test("9. Cold War study restore: preserves cartography without falsely activating Apollo 11 when isApollo11Active is false", () => {
    // 1. Study with isApollo11Active: false
    const coldWarStudy: StudyRecord = {
      id: "estudo-sem-apollo",
      title: "Estudo Guerra Fria Geral",
      timelineStartYear: 1947,
      timelineEndYear: 1991,
      selectedCountryIsos: ["BRA", "DEU"],
      activeCategories: ["POLITICS_REGIMES"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.5,
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: false,
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(coldWarStudy);
    const retrieved = getMemoryStudy("estudo-sem-apollo");
    assert.ok(retrieved);
    assert.equal(retrieved.historicalEra, "COLD_WAR_1969");
    assert.equal(retrieved.isApollo11Active, false);

    // Simulate restoring in /study/[slug]/page.tsx
    useTimelineStore.getState().setYearRange(retrieved.timelineStartYear, retrieved.timelineEndYear);
    if (retrieved.historicalEra === "COLD_WAR_1969") {
      if (retrieved.isApollo11Active) {
        useTimelineStore.getState().selectYear(1969);
      } else {
        useTimelineStore.getState().selectYear(1968);
      }
    }
    if (retrieved.isApollo11Active) {
      useTimelineStore.getState().selectMilestone("glo-1969");
    } else {
      useTimelineStore.getState().selectMilestone(null);
    }

    // Historical era is COLD_WAR_1969
    assert.equal(resolveHistoricalEra(useTimelineStore.getState().selectedYear).id, "COLD_WAR_1969");
    // But Apollo 11 is NOT active
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
    assert.notEqual(useTimelineStore.getState().selectedYear, 1969);

    // Cleanup
    useTimelineStore.getState().selectYear(null);
  });
});

describe("Componente 4: Persistência de Estudos Paleogeográficos & Rotas Históricas (RN16)", () => {
  test("1. Serialização de Estudo com geologicalMa e activeRouteId (StudyRecord)", () => {
    const studySnapshot: StudyRecord = {
      id: "estudo-paleo-pangea-test",
      parentId: null,
      title: "Pangeia e Deriva Continental",
      description: "Recorte da Pangeia a 250 Ma com rota de circum-navegação de Magalhães.",
      timelineStartYear: 1519,
      timelineEndYear: 1522,
      selectedCountryIsos: ["BRA", "ZAF", "IND"],
      activeCategories: ["SCIENCE_CULTURE"],
      cameraLat: 10.0,
      cameraLng: -20.0,
      cameraAltitude: 2.5,
      markdownNotes: "Notas de pesquisa científica.",
      historicalEra: null,
      isApollo11Active: false,
      geologicalMa: 250,
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(studySnapshot);
    const retrieved = getMemoryStudy("estudo-paleo-pangea-test");

    assert.ok(retrieved !== undefined);
    assert.equal(retrieved.id, "estudo-paleo-pangea-test");
    assert.equal(retrieved.geologicalMa, 250);
    assert.equal(retrieved.activeRouteId, "magellan-1519");
    assert.equal(retrieved.title, "Pangeia e Deriva Continental");
  });

  test("2. Fork Imutável (RN16) preserva geologicalMa e activeRouteId com isolamento de estado", () => {
    const originalStudy: StudyRecord = {
      id: "estudo-orig-150ma",
      parentId: null,
      title: "Gondwana e Laurásia Quinhentista",
      timelineStartYear: 1947,
      timelineEndYear: 1991,
      selectedCountryIsos: ["BRA", "DEU"],
      activeCategories: ["ECONOMY"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.2,
      geologicalMa: 150,
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(originalStudy);
    const forked = forkStudyRecord(originalStudy, "fork-derivado-150ma");

    assert.equal(forked.id, "fork-derivado-150ma");
    assert.equal(forked.parentId, "estudo-orig-150ma");
    assert.equal(forked.title, "[Fork] Gondwana e Laurásia Quinhentista");
    assert.equal(forked.geologicalMa, 150);
    assert.equal(forked.activeRouteId, "magellan-1519");

    // Imutabilidade estrita
    forked.title = "Alteração derivativa";
    forked.geologicalMa = 66;
    forked.activeRouteId = null;

    assert.equal(originalStudy.title, "Gondwana e Laurásia Quinhentista");
    assert.equal(originalStudy.geologicalMa, 150);
    assert.equal(originalStudy.activeRouteId, "magellan-1519");
  });

  test("3. Metadados do estudo não alteram a era nem a rota ativa", () => {
    applyTimelinePreset("PANGEA_250MA");
    const store = useStudyStore.getState();
    store.setStudy({
      id: "estudo-completo-66ma",
      title: "Cretáceo K-Pg e Extinção",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
    });

    assert.equal(useStudyStore.getState().currentStudyId, "estudo-completo-66ma");
    assert.equal(useTimelineStore.getState().geologicalMa, 250);
    assert.equal(useSceneStore.getState().activeSceneId, null);

    store.resetStudy();
    assert.equal(useStudyStore.getState().currentStudyId, null);
    assert.equal(useTimelineStore.getState().geologicalMa, 250);
    applyTimelinePreset("LAST_50_YEARS");
  });

  test("4. StudyShareModal exibe badges de Era Geológica e Rota de Expedição quando ativos", () => {
    enterGeologicalMode(250);
    useSceneStore.getState().openScene("magellan-1519");
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(html.includes("data-testid=\"modal-geological-era-badge\""), "Deve renderizar badge de era geológica no modal");
    assert.ok(html.includes("Paleogeografia &amp; Deriva Continental Ativa"));
    assert.ok(html.includes("Pangeia"));

    assert.ok(html.includes("data-testid=\"modal-historical-route-badge\""), "Deve renderizar badge de rota histórica no modal");
    assert.ok(html.includes("Rota de Expedição Histórica 3D"));

    assert.ok(html.includes("Paleogeografia:"));
    assert.ok(html.includes("Rota Histórica 3D:"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().setGeologicalMa(null);
    useSceneStore.getState().closeScene();
    useStudyStore.getState().resetStudy();
  });

  test("5. StudyShareModal omite badges paleogeográficos e de expedição no modo padrão contemporâneo", () => {
    useTimelineStore.getState().setGeologicalMa(null);
    useSceneStore.getState().closeScene();
    useStudyStore.getState().resetStudy();
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(!html.includes("data-testid=\"modal-geological-era-badge\""));
    assert.ok(!html.includes("data-testid=\"modal-historical-route-badge\""));

    useStudyStore.getState().setShareModalOpen(false);
  });

  test("6. Restauração de estudos antigos aplica a época, mantém o snapshot e limpa a seleção anterior", () => {
    const legacyStudy = Object.freeze({
      id: "estudo-restaurar-123",
      title: "Pangeia",
      selectedGeologicalMa: 250,
      selectedRouteId: "magellan-1519",
    });
    restoreStudySnapshot(legacyStudy);
    assert.equal(useTimelineStore.getState().geologicalMa, 250);
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.equal(useSceneStore.getState().isPlaying, false);

    applyTimelinePreset("LAST_50_YEARS");
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useSceneStore.getState().activeSceneId, null);
    assert.equal(legacyStudy.selectedGeologicalMa, 250);
    assert.equal(legacyStudy.selectedRouteId, "magellan-1519");

    restoreStudySnapshot({ id: "estudo-apollo", title: "Apollo 11", isApollo11Active: true });
    assert.equal(useTimelineStore.getState().selectedMilestoneId, "glo-1969");
    assert.equal(useTimelineStore.getState().selectedYear, 1969);
    restoreStudySnapshot({ id: "estudo-contemporaneo", title: "Presente", timelineStartYear: 1974, timelineEndYear: 2024 });
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
    assert.equal(useTimelineStore.getState().selectedYear, null);
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useSceneStore.getState().activeSceneId, null);
    useStudyStore.getState().resetStudy();
  });

  test("7. Fator de atenuação e extinção de luzes urbanas para uPaleoFactor > 0", () => {
    // Simulação do comportamento físico do EarthShaderMaterial
    const computeCityLightWeight = (uPaleoFactor: number) => {
      return 1.0 - Math.min(1.0, Math.max(0.0, uPaleoFactor / 0.2));
    };

    assert.equal(computeCityLightWeight(0.0), 1.0, "Luzes urbanas a 100% no presente");
    assert.equal(computeCityLightWeight(0.1), 0.5, "Atenuação de 50% na transição inicial");
    assert.equal(computeCityLightWeight(0.2), 0.0, "Extinção total a partir de 0.2");
    assert.equal(computeCityLightWeight(1.0), 0.0, "Extinção total permanente na Pangeia");
  });

  test("8. restoreStudyRecord normaliza e sanitiza snapshots com geologicalMa e activeRouteId", () => {
    // 1. Snapshot com dados válidos
    const restored = restoreStudyRecord({
      id: "estudo-restaurado-valido",
      title: "Pangeia Jurássica",
      geologicalMa: 150,
      activeRouteId: "magellan-1519",
      selectedCountryIsos: ["BRA", "AGO"],
    });

    assert.equal(restored.id, "estudo-restaurado-valido");
    assert.equal(restored.geologicalMa, 150);
    assert.equal(restored.activeRouteId, "magellan-1519");
    assert.equal(restored.historicalEra, null, "historicalEra deve ser suprimido em era geológica");
    assert.equal(restored.isApollo11Active, false, "Apollo 11 deve ser falso em era geológica");
    assert.deepEqual(restored.selectedCountryIsos, ["BRA", "AGO"]);

    // 2. Snapshot com dados inválidos (geologicalMa negativo, activeRouteId vazio)
    const sanitized = restoreStudyRecord({
      id: "estudo-invalido",
      title: "Estudo com Erros",
      geologicalMa: -50,
      activeRouteId: "   ",
      historicalEra: "WW2_1939",
    });

    assert.equal(sanitized.geologicalMa, null, "geologicalMa negativo deve ser sanitizado para null");
    assert.equal(sanitized.activeRouteId, null, "activeRouteId em branco deve ser sanitizado para null");
    assert.equal(sanitized.historicalEra, "WW2_1939", "historicalEra deve ser mantido se geologicalMa for nulo");
  });

  test("9. forkStudyRecord sanitiza valores anômalos e previne anacronismos na derivação", () => {
    const parentWithAnomalies: StudyRecord = {
      id: "parent-anomalo",
      title: "Estudo com Mistura Ilícita",
      timelineStartYear: 1969,
      timelineEndYear: 1969,
      selectedCountryIsos: ["USA"],
      activeCategories: ["SCIENCE_CULTURE"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.5,
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: true,
      geologicalMa: 250, // Permiano não pode coexistir com Guerra Fria / Apollo 11
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    const forked = forkStudyRecord(parentWithAnomalies, "fork-sanitizado-pangea");

    assert.equal(forked.id, "fork-sanitizado-pangea");
    assert.equal(forked.parentId, "parent-anomalo");
    assert.equal(forked.geologicalMa, 250);
    assert.equal(forked.activeRouteId, "magellan-1519");
    assert.equal(forked.historicalEra, null, "Guerra Fria deve ser anulada quando Ma > 0.3");
    assert.equal(forked.isApollo11Active, false, "Apollo 11 deve ser desativado na Pangeia");

    // Teste com Ma zero ou negativo
    const parentWithZeroMa: StudyRecord = {
      ...parentWithAnomalies,
      geologicalMa: 0,
    };
    const forkedZero = forkStudyRecord(parentWithZeroMa, "fork-zero-ma");
    assert.equal(forkedZero.geologicalMa, null, "0 Ma deve virar null (modo contemporâneo)");
    assert.equal(forkedZero.historicalEra, "COLD_WAR_1969");
    assert.equal(forkedZero.isApollo11Active, true);
  });

  test("10. useStudyStore métodos restoreStudy e forkStudy sincronizam e isolam o estado", () => {
    const store = useStudyStore.getState();
    store.resetStudy();

    // 1. restoreStudy
    store.restoreStudy({
      id: "estudo-restaurado-store",
      parentId: "root-123",
      title: "Extinção Cretáceo K-Pg",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
      historicalEra: "WW1_1914", // deve ser sanitizado
      isApollo11Active: true, // deve ser sanitizado
    });

    assert.equal(useStudyStore.getState().currentStudyId, "estudo-restaurado-store");
    assert.equal(useStudyStore.getState().parentId, "root-123");
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    // 2. forkStudy
    store.forkStudy({
      id: "fork-estudo-store-999",
      parentId: "estudo-restaurado-store",
      title: "[Fork] Extinção Cretáceo K-Pg",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
    });

    assert.equal(useStudyStore.getState().currentStudyId, "fork-estudo-store-999");
    assert.equal(useStudyStore.getState().parentId, "estudo-restaurado-store");

    store.resetStudy();
  });

  test("11. StudyShareModal suprime anacronismos: exclui badges de Apollo 11 e Guerra Fria quando era geológica está ativa", () => {
    // Configura estado com Apollo 11 inicialmente ativo, mas depois alternado para modo geológico
    useTimelineStore.getState().selectYear(1969);
    useTimelineStore.getState().selectMilestone("glo-1969");
    enterGeologicalMode(250); // Pangeia ativada
    useSceneStore.getState().closeScene();
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    // Deve exibir Pangeia
    assert.ok(html.includes("data-testid=\"modal-geological-era-badge\""));
    assert.ok(html.includes("Pangeia"));

    // NÃO deve exibir Apollo 11 mesmo que milestoneId ou ano anterior fosse 1969
    assert.ok(!html.includes("Trajetória Translunar Ativa"), "Apollo 11 não deve aparecer no modal da Pangeia");
    assert.ok(!html.includes("Missão Espacial: Apollo 11"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().setGeologicalMa(null);
    useStudyStore.getState().resetStudy();
  });

  test("12. StudyShareModal respeita desativação de rotas históricas (omite badge se rota foi desativada)", () => {
    // Cenário: estudo carregado tinha rota, mas o usuário a desativou na HUD
    useSceneStore.getState().closeScene();
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(!html.includes("data-testid=\"modal-historical-route-badge\""), "Não deve exibir badge de rota desativada");
    assert.ok(!html.includes("• Rota Histórica 3D:"));

    useStudyStore.getState().setShareModalOpen(false);
  });
});
