import { enterGeologicalMode } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { latLngToVector3, slerpVectors } from "../src/lib/geo-spatial";
import { useTimelineStore } from "../src/stores/timelineStore";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useStudyStore } from "../src/stores/studyStore";
import { forkStudyRecord, restoreStudyRecord } from "../src/lib/studies-store";
import { StudyShareModal } from "../src/components/study/StudyShareModal";
import { useSceneStore } from "../src/stores/sceneStore";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { calculateIssPosition } from "../src/lib/satellites";
import { isContemporaryEpoch, ObservatoryLayerId } from "../src/lib/observatory-data";
import {
  FALLBACK_FIRMS_HOTSPOTS,
  FALLBACK_EONET_EVENTS,
  FALLBACK_AIRCRAFT_FLEET,
  FALLBACK_MARITIME_ROUTES,
} from "../src/lib/observatory-fallback";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { REFERENCE_ISS_TLE, altitudeToSceneRadius, greatCircleKm, tleEpochToIso } from "../src/lib/satellites";

describe("Horizonte 3: Observatório Planetário (NASA) & Tráfego Global (RN17, RN18, RN21, RN23)", () => {
  test("1. useObservatoryStore gerencia ativação, desativação e alternância múltipla de camadas", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    assert.equal(store.activeLayers.length, 0);

    // Ativa FIRMS
    store.toggleLayer("NASA_FIRMS");
    assert.ok(useObservatoryStore.getState().activeLayers.includes("NASA_FIRMS"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 1);

    // Ativa ISS
    store.toggleLayer("ISS_SATELLITES");
    assert.ok(useObservatoryStore.getState().activeLayers.includes("ISS_SATELLITES"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 2);

    // Desativa FIRMS
    store.toggleLayer("NASA_FIRMS");
    assert.ok(!useObservatoryStore.getState().activeLayers.includes("NASA_FIRMS"));
    assert.ok(useObservatoryStore.getState().activeLayers.includes("ISS_SATELLITES"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 1);

    // Ativação direta e idempotente com setLayerActive
    store.setLayerActive("FLIGHTS_OPENSKY", true);
    store.setLayerActive("FLIGHTS_OPENSKY", true); // Idempotente
    assert.ok(useObservatoryStore.getState().activeLayers.includes("FLIGHTS_OPENSKY"));

    store.setLayerActive("FLIGHTS_OPENSKY", false);
    assert.ok(!useObservatoryStore.getState().activeLayers.includes("FLIGHTS_OPENSKY"));

    // setAllLayers
    const allFive: ObservatoryLayerId[] = [
      "NASA_FIRMS",
      "NASA_EONET",
      "ISS_SATELLITES",
      "FLIGHTS_OPENSKY",
      "MARITIME_ROUTES",
    ];
    store.setAllLayers(allFive);
    assert.equal(useObservatoryStore.getState().activeLayers.length, 5);
    for (const id of allFive) {
      assert.ok(useObservatoryStore.getState().activeLayers.includes(id));
    }

    store.resetObservatory();
  });

  test("2. useObservatoryStore controla opacidades e painel flutuante", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    // Painel flutuante
    assert.equal(store.isPanelOpen, false);
    store.setPanelOpen(true);
    assert.equal(useObservatoryStore.getState().isPanelOpen, true);
    store.togglePanel();
    assert.equal(useObservatoryStore.getState().isPanelOpen, false);

    // Opacidade com clamp entre [0, 1]
    store.setLayerOpacity("NASA_FIRMS", 0.75);
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 0.75);

    store.setLayerOpacity("NASA_FIRMS", 1.5); // Deve ser limitado a 1.0
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 1.0);

    store.setLayerOpacity("NASA_FIRMS", -0.2); // Deve ser limitado a 0.0
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 0.0);

    store.resetObservatory();
  });

  test("3. useObservatoryStore gerencia seleção de entidades para telemetria", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    assert.equal(store.selectedEntity, null);

    const testEvent = FALLBACK_EONET_EVENTS[0];
    store.setSelectedEntity({ type: "EONET", data: testEvent });

    const selected = useObservatoryStore.getState().selectedEntity;
    assert.ok(selected);
    assert.equal(selected.type, "EONET");
    assert.equal(selected.data.id, testEvent.id);

    store.setSelectedEntity(null);
    assert.equal(useObservatoryStore.getState().selectedEntity, null);
  });

  test("4. useObservatoryStore.loadLayerData opera com resiliência e fallback offline", async () => {
    const store = useObservatoryStore.getState();

    // Deve executar sem lançar exceções mesmo sem backend de rede mockado
    await assert.doesNotReject(async () => {
      await store.loadLayerData("NASA_FIRMS");
      await store.loadLayerData("NASA_EONET");
      await store.loadLayerData("ISS_SATELLITES");
      await store.loadLayerData("FLIGHTS_OPENSKY");
    });

    // Confirma que os dados de fallback estão presentes
    assert.ok(useObservatoryStore.getState().firmsHotspots.length > 0);
    assert.ok(useObservatoryStore.getState().eonetEvents.length > 0);
    assert.ok(useObservatoryStore.getState().issTelemetry !== null);
    assert.ok(useObservatoryStore.getState().aircraftFleet.length > 0);
    assert.ok(useObservatoryStore.getState().maritimeRoutes.length > 0);
  });

  test("5. Posição da ISS por SGP4 (calculateIssPosition, TLE de referência): envelope físico real", () => {
    // D04: o antigo modelo analítico inventado foi substituído por SGP4. Instante = época do TLE de
    // referência, para o teste ser determinístico (SGP4 longe da época acumula erro).
    const t0 = Date.parse(tleEpochToIso(REFERENCE_ISS_TLE.line1)!);
    const telemetry = calculateIssPosition(t0);

    // Altitude real da ISS (varia com reboosts e decaimento): órbita baixa entre 370 e 460 km
    assert.ok(telemetry.altitudeKm >= 370 && telemetry.altitudeKm <= 460, `Altitude: ${telemetry.altitudeKm} km`);
    // Velocidade orbital de LEO
    assert.ok(telemetry.velocityKmh >= 27400 && telemetry.velocityKmh <= 27800, `Velocidade: ${telemetry.velocityKmh} km/h`);
    // Inclinação da ISS ≈ 51,6° (do próprio TLE)
    assert.ok(Math.abs(telemetry.orbitInclinationDeg - 51.64) < 0.1, `Inclinação: ${telemetry.orbitInclinationDeg}`);
    // Latitude geodésica limitada pela inclinação (a geodésica fica ~0,2° acima da geocêntrica)
    assert.ok(Math.abs(telemetry.latitude) <= 52, `Latitude: ${telemetry.latitude}`);
    assert.ok(telemetry.longitude >= -180 && telemetry.longitude <= 180);

    // 96 amostras ao longo de 24 h a partir da época
    for (let i = 0; i < 96; i++) {
      const sample = calculateIssPosition(t0 + i * 15 * 60 * 1000);
      assert.ok(Number.isFinite(sample.latitude) && Number.isFinite(sample.longitude));
      assert.ok(Math.abs(sample.latitude) <= 52);
      assert.ok(sample.longitude >= -180 && sample.longitude <= 180);
      assert.ok(sample.altitudeKm >= 370 && sample.altitudeKm <= 460);
    }
  });

  test("6. Trilha orbital contínua da ISS (groundTrack): cobre 1 órbita completa sem NaNs", () => {
    const t0 = Date.parse(tleEpochToIso(REFERENCE_ISS_TLE.line1)!);
    const telemetry = calculateIssPosition(t0);
    assert.ok(Array.isArray(telemetry.groundTrack));
    assert.ok(telemetry.groundTrack.length >= 30, `Trilha com ${telemetry.groundTrack.length} pontos`);
    for (const pt of telemetry.groundTrack) {
      assert.ok(Number.isFinite(pt.lat) && Number.isFinite(pt.lng));
      assert.ok(Math.abs(pt.lat) <= 52);
      assert.ok(pt.lng >= -180 && pt.lng <= 180);
    }
    // Altitude em escala real do globo (raio 1 = 6.371 km): ≈ 1,06–1,07, não 1,18
    const r = altitudeToSceneRadius(telemetry.altitudeKm);
    assert.ok(r > 1.05 && r < 1.08, `Raio da órbita na cena: ${r}`);
    const vec = latLngToVector3(telemetry.latitude, telemetry.longitude, r);
    assert.ok(Math.abs(vec.length() - r) < 1e-6);
  });

  test("7. Envelopes de altitude e afastamento da crosta terrestre (RN21)", () => {
    // Crosta base: R = 1.000
    // Queimadas FIRMS: R = 1.0025
    // Rotas Marítimas: R = 1.003
    // Eventos EONET: R = 1.006
    // Frotas Aéreas: R = 1.018
    // Órbita ISS: R = 1.180

    for (const h of FALLBACK_FIRMS_HOTSPOTS) {
      const v = latLngToVector3(h.lat, h.lng, 1.0025);
      assert.ok(Math.abs(v.length() - 1.0025) < 1e-4);
    }

    for (const r of FALLBACK_MARITIME_ROUTES) {
      for (const [lat, lng] of r.coordinates) {
        const v = latLngToVector3(lat, lng, 1.003);
        assert.ok(Math.abs(v.length() - 1.003) < 1e-4);
      }
    }

    for (const a of FALLBACK_AIRCRAFT_FLEET) {
      const v = latLngToVector3(a.lat, a.lng, 1.018);
      assert.ok(Math.abs(v.length() - 1.018) < 1e-4);
    }

    // A altitude da ISS (1.18) é superior à de aeronaves (1.018), que é superior às rotas (1.003)
    assert.ok(1.18 > 1.018);
    assert.ok(1.018 > 1.006);
    assert.ok(1.006 > 1.003);
    assert.ok(1.003 > 1.0025);
    assert.ok(1.0025 > 1.000);
  });

  test("8. Base de orientação de aeronaves (AirTrafficLayer): ortonormalidade e rumo (heading)", () => {
    for (const plane of FALLBACK_AIRCRAFT_FLEET) {
      const pos = latLngToVector3(plane.lat, plane.lng, 1.018);
      const up = pos.clone().normalize();

      const northProj = new THREE.Vector3(0, 1, 0).sub(
        up.clone().multiplyScalar(new THREE.Vector3(0, 1, 0).dot(up))
      );
      const north =
        northProj.lengthSq() > 1e-6
          ? northProj.normalize()
          : new THREE.Vector3(0, 0, -1);

      const east = new THREE.Vector3().crossVectors(north, up).normalize();
      const headingRad = (plane.headingDeg * Math.PI) / 180;
      const forward = north
        .clone()
        .multiplyScalar(Math.cos(headingRad))
        .add(east.clone().multiplyScalar(Math.sin(headingRad)))
        .normalize();

      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(forward, right).normalize();

      // Ortonormalidade estrita: produto escalar nulo entre eixos
      assert.ok(Math.abs(right.dot(forward)) < 1e-4, "right e forward devem ser perpendiculares");
      assert.ok(Math.abs(right.dot(correctedUp)) < 1e-4, "right e up devem ser perpendiculares");
      assert.ok(Math.abs(forward.dot(correctedUp)) < 1e-4, "forward e up devem ser perpendiculares");

      // Determinante da matriz de rotação deve ser +1 (sem reflexão cartográfica)
      const rotMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward);
      const det = rotMatrix.determinant();
      assert.ok(
        Math.abs(det - 1.0) < 1e-4,
        `Determinante da base de orientação deve ser +1, obteve ${det}`
      );
    }
  });

  test("9. Supressão temporal de anacronismos (isContemporaryEpoch - RN09, RN10)", () => {
    // 1. Período contemporâneo (1957 em diante, sem Ma geológico)
    assert.equal(isContemporaryEpoch(2026, null), true);
    assert.equal(isContemporaryEpoch(1969, null), true); // Apollo 11 / Era espacial
    assert.equal(isContemporaryEpoch(1957, null), true); // Sputnik 1

    // 2. Pré-Era Espacial (<1957)
    assert.equal(isContemporaryEpoch(1956, null), false, "1956 precede a Era Espacial");
    assert.equal(isContemporaryEpoch(1939, null), false, "Segunda Guerra Mundial");
    assert.equal(isContemporaryEpoch(1914, null), false, "Primeira Guerra Mundial");
    assert.equal(isContemporaryEpoch(1870, null), false, "Guerra Franco-Prussiana");
    assert.equal(isContemporaryEpoch(1519, null), false, "Circum-navegação de Magalhães");

    // 3. Eras Geológicas (Pangeia, Gondwana, K-Pg)
    assert.equal(isContemporaryEpoch(null, 250), false, "Pangeia a 250 Ma atrás");
    assert.equal(isContemporaryEpoch(null, 150), false, "Gondwana a 150 Ma atrás");
    assert.equal(isContemporaryEpoch(null, 66), false, "Cretáceo K-Pg a 66 Ma atrás");
    assert.equal(isContemporaryEpoch(2026, 250), false, "Conflito: Ma geológico prevalece");
  });

  test("10. ObservatoryPanel renderiza componentes sem <div> dentro de <p> e exibe anacronismo em anos anteriores a 1957", () => {
    useObservatoryStore.getState().setPanelOpen(true);
    useTimelineStore.getState().selectYear(1914); // Primeira Guerra Mundial
    useTimelineStore.getState().setGeologicalMa(null);

    const html = renderToStaticMarkup(React.createElement(ObservatoryPanel));

    // Validação de presença do painel
    assert.ok(html.includes("data-testid=\"observatory-panel\""));
    assert.ok(html.includes("Observatório Planetário"));
    assert.ok(html.includes("Queimadas Ativas (FIRMS)"));
    assert.ok(html.includes("ISS &amp; Satélites Artificiais"));
    assert.ok(html.includes("Tráfego Aéreo"));

    // Validação de exibição do banner de anacronismo
    assert.ok(
      html.includes("data-testid=\"observatory-anachronism-banner\""),
      "Deve renderizar o banner de anacronismo para o ano de 1914"
    );
    assert.ok(html.includes("Telemetria Contemporânea Pausada"));
    assert.ok(html.includes("precede a Era Espacial (1957)"));

    // Invariante de Phrasing Content: nenhuma tag <div> dentro de <p>
    const pBlocks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pBlocks) {
      assert.ok(!p.includes("<div"), `Tag <p> no ObservatoryPanel não pode conter <div>: ${p}`);
    }

    // Modo contemporâneo: remove banner de anacronismo
    useTimelineStore.getState().selectYear(2026);
    const modernHtml = renderToStaticMarkup(React.createElement(ObservatoryPanel));
    assert.ok(
      !modernHtml.includes("data-testid=\"observatory-anachronism-banner\""),
      "Banner de anacronismo não deve ser exibido em 2026"
    );

    useObservatoryStore.getState().resetObservatory();
  });

  test("11. ObservatoryTelemetryHUD renderiza telemetria para ISS, EONET, Aeronave e Rota Marítima", () => {
    // 1. Telemetria da ISS
    const issData = calculateIssPosition();
    useObservatoryStore.getState().setSelectedEntity({ type: "ISS", data: issData });

    const issHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(issHtml.includes("data-testid=\"observatory-telemetry-hud\""));
    assert.ok(issHtml.includes("Telemetria Orbital ISS"));
    assert.ok(issHtml.includes("Focar Câmera na ISS"));
    assert.ok(issHtml.includes(`${issData.altitudeKm} km`));

    // 2. Evento Severo EONET
    const event = FALLBACK_EONET_EVENTS[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "EONET", data: event });

    const eonetHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(eonetHtml.includes("Evento Severo NASA"));
    assert.ok(eonetHtml.includes(event.title));
    assert.ok(eonetHtml.includes("Focar Evento"));

    // 3. Aeronave Comercial
    const plane = FALLBACK_AIRCRAFT_FLEET[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "AIRCRAFT", data: plane });

    const planeHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(planeHtml.includes("Aeronave rastreada"));
    assert.ok(planeHtml.includes(plane.callsign));
    assert.ok(planeHtml.includes(`${plane.altitudeMeters} m`));
    assert.ok(planeHtml.includes("Focar Câmera na Aeronave"));

    // 4. Corredor Marítimo
    const route = FALLBACK_MARITIME_ROUTES[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "MARITIME", data: route });

    const maritimeHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(maritimeHtml.includes("Corredor Mercante"));
    assert.ok(maritimeHtml.includes(route.name));
    assert.ok(maritimeHtml.includes("Focar Corredor Marítimo"));

    // 5. Entidade nula: não renderiza
    useObservatoryStore.getState().setSelectedEntity(null);
    const nullHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.equal(nullHtml, "");
  });

  test("12. StudyShareModal exibe badge do Observatório Planetário quando há camadas ativas", () => {
    useObservatoryStore.getState().setAllLayers(["NASA_FIRMS", "ISS_SATELLITES"]);
    useTimelineStore.getState().setGeologicalMa(null);
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(
      html.includes("data-testid=\"modal-observatory-badge\""),
      "Deve renderizar o badge do observatório no modal"
    );
    assert.ok(html.includes("Observatório Planetário Ativo"));
    assert.ok(html.includes("2 camada(s) científica(s) capturada(s)"));
    assert.ok(html.includes("• Observatório: 2 camada(s) ativa(s)"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useObservatoryStore.getState().resetObservatory();
  });

  test("13. StudyShareModal suprime badge do Observatório quando era geológica ou época pré-1957 está ativa", () => {
    // 1. Configura camadas ativas no observatório, mas ativa Pangeia (250 Ma)
    useObservatoryStore.getState().setAllLayers(["NASA_FIRMS", "ISS_SATELLITES"]);
    enterGeologicalMode(250);
    useStudyStore.getState().setShareModalOpen(true);

    const htmlGeo = renderToStaticMarkup(React.createElement(StudyShareModal));

    // Deve exibir Pangeia
    assert.ok(htmlGeo.includes("data-testid=\"modal-geological-era-badge\""));

    // NÃO deve exibir o badge do Observatório contemporâneo na Pangeia
    assert.ok(
      !htmlGeo.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório contemporâneo não deve aparecer no modal da Pangeia"
    );

    // 2. Configura Primeira Guerra Mundial (1914): deve suprimir badge do observatório
    useTimelineStore.getState().setGeologicalMa(null);
    useTimelineStore.getState().selectYear(1914);
    useTimelineStore.getState().setYearRange(1914, 1918);

    const htmlWw1 = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(
      !htmlWw1.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório contemporâneo não deve aparecer no modal em 1914 (pré-1957)"
    );

    // 3. Configura Circum-navegação de Magalhães (1519): deve suprimir badge
    useTimelineStore.getState().selectYear(1519);
    useSceneStore.getState().openScene("magellan-1519");

    const htmlMagellan = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(
      !htmlMagellan.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório não deve aparecer no modal para rota de Magalhães (1519)"
    );

    // Cleanup
    useSceneStore.getState().closeScene();
    useTimelineStore.getState().selectYear(2026);
    useTimelineStore.getState().setYearRange(1974, 2024);
    useStudyStore.getState().setShareModalOpen(false);
    useStudyStore.getState().resetStudy();
    useObservatoryStore.getState().resetObservatory();
  });

  test("14. Restauração e Fork de Estudo (restoreStudyRecord & forkStudyRecord) com activeObservatoryLayers e proteção contra anacronismos", () => {
    // 1. Snapshot com camadas do observatório em época contemporânea
    const restored = restoreStudyRecord({
      id: "estudo-observatorio-1",
      title: "Monitoramento de Queimadas e Satélites",
      timelineEndYear: 2024,
      activeObservatoryLayers: ["NASA_FIRMS", "ISS_SATELLITES", "MARITIME_ROUTES"],
    });

    assert.equal(restored.id, "estudo-observatorio-1");
    assert.deepEqual(restored.activeObservatoryLayers, [
      "NASA_FIRMS",
      "ISS_SATELLITES",
      "MARITIME_ROUTES",
    ]);

    // 2. Fork contemporâneo preserva camadas
    const forked = forkStudyRecord(restored, "fork-observatorio-1");
    assert.equal(forked.parentId, "estudo-observatorio-1");
    assert.deepEqual(forked.activeObservatoryLayers, [
      "NASA_FIRMS",
      "ISS_SATELLITES",
      "MARITIME_ROUTES",
    ]);

    // 3. Estudo com era geológica anula camadas contemporâneas do observatório
    const geologicalStudy = restoreStudyRecord({
      id: "estudo-geologico-anacronico",
      title: "Pangeia com Satélites (Inválido)",
      geologicalMa: 250,
      activeObservatoryLayers: ["NASA_FIRMS", "ISS_SATELLITES"],
    });

    assert.deepEqual(
      geologicalStudy.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo quando geologicalMa for definido"
    );

    const forkedGeo = forkStudyRecord(geologicalStudy, "fork-geologico-sanitizado");
    assert.deepEqual(forkedGeo.activeObservatoryLayers, []);

    // 4. Estudo pré-1957 (Primeira Guerra Mundial 1914-1918) anula camadas contemporâneas
    const ww1Study = restoreStudyRecord({
      id: "estudo-ww1",
      title: "Primeira Guerra Mundial",
      timelineStartYear: 1914,
      timelineEndYear: 1918,
      historicalEra: "WW1_1914",
      activeObservatoryLayers: ["ISS_SATELLITES", "FLIGHTS_OPENSKY"],
    });

    assert.deepEqual(
      ww1Study.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo para estudos com final pré-1957"
    );

    const forkedWw1 = forkStudyRecord(ww1Study, "fork-ww1-sanitizado");
    assert.deepEqual(forkedWw1.activeObservatoryLayers, []);

    // 5. Estudo com rota de Magalhães anula camadas contemporâneas
    const magellanStudy = restoreStudyRecord({
      id: "estudo-magalhaes",
      title: "Expedição de Magalhães",
      timelineStartYear: 1519,
      timelineEndYear: 1522,
      activeRouteId: "magellan-1519",
      activeObservatoryLayers: ["MARITIME_ROUTES"],
    });

    assert.deepEqual(
      magellanStudy.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo para a rota histórica de 1519"
    );
  });

  test("15. TopNavBar renderiza o botão do Observatório e reflete camadas ativas", () => {
    // 1. Sem camadas ativas
    useObservatoryStore.getState().resetObservatory();
    const htmlEmpty = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.ok(htmlEmpty.includes("data-testid=\"top-nav-observatory-button\""));
    assert.ok(htmlEmpty.includes("Observatório"));
    assert.ok(!htmlEmpty.includes("animate-ping"), "Não deve pulsar quando não há camadas ativas");

    // 2. Com camada ativa: deve acionar o ponto luminoso pulsante
    useObservatoryStore.getState().setLayerActive("ISS_SATELLITES", true);
    const htmlActive = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.ok(htmlActive.includes("animate-ping"), "Deve conter o indicador animado de pulso ativo");

    useObservatoryStore.getState().resetObservatory();
  });

  test("16. Descarte estrito de geometrias e buffers WebGL reais do Observatório (RN21)", () => {
    // 1. BufferGeometry de focos FIRMS
    const count = FALLBACK_FIRMS_HOTSPOTS.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const h = FALLBACK_FIRMS_HOTSPOTS[i];
      const pos = latLngToVector3(h.lat, h.lng, 1.0025);
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      assert.ok(!Number.isNaN(pos.x));
      assert.ok(!Number.isNaN(pos.y));
      assert.ok(!Number.isNaN(pos.z));
    }
    const firmsGeo = new THREE.BufferGeometry();
    firmsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    firmsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const firmsMat = new THREE.PointsMaterial({ size: 4.5 });

    // Descarte sem erro
    firmsGeo.dispose();
    firmsMat.dispose();

    // 2. BufferGeometry da Trilha Orbital da ISS em R=1.18
    const issPoints: THREE.Vector3[] = [];
    const issTelemetry = calculateIssPosition();
    for (const pt of issTelemetry.groundTrack) {
      const v = latLngToVector3(pt.lat, pt.lng, 1.18);
      issPoints.push(v);
      assert.ok(Math.abs(v.length() - 1.18) < 1e-4);
    }
    const issOrbitGeo = new THREE.BufferGeometry().setFromPoints(issPoints);
    const issOrbitMat = new THREE.LineBasicMaterial({ color: "#22d3ee" });
    issOrbitGeo.dispose();
    issOrbitMat.dispose();

    // 3. BufferGeometry de Rotas Marítimas Geodésicas via slerp em R=1.003
    for (const route of FALLBACK_MARITIME_ROUTES) {
      const routePoints: THREE.Vector3[] = [];
      const coords = route.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        const v1 = latLngToVector3(coords[i][0], coords[i][1], 1.003);
        const v2 = latLngToVector3(coords[i + 1][0], coords[i + 1][1], 1.003);
        for (let s = 0; s <= 4; s++) {
          const pt = slerpVectors(v1, v2, s / 4);
          routePoints.push(pt);
          assert.ok(Math.abs(pt.length() - 1.003) < 1e-4);
        }
      }
      const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
      routeGeo.dispose();
    }

    // 4. Geometria de Cone Orientado de Aeronaves
    const planeGeo = new THREE.ConeGeometry(0.005, 0.018, 5);
    planeGeo.rotateX(Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
    planeGeo.dispose();
    planeMat.dispose();
  });

  test("17. useStudyStore.setStudy executa restauração imutável de estudo sem erros em runtime", () => {
    useStudyStore.getState().resetStudy();

    useStudyStore.getState().setStudy({
      id: "estudo-teste-setStudy",
      title: "Estudo Restaurado via setStudy",
      description: "Descrição de validação",
      timelineStartYear: 1980,
      timelineEndYear: 2020,
      geologicalMa: null,
      activeRouteId: null,
      activeObservatoryLayers: ["NASA_FIRMS", "MARITIME_ROUTES"],
    });

    const current = useStudyStore.getState();
    assert.equal(current.currentStudyId, "estudo-teste-setStudy");
    assert.equal(current.title, "Estudo Restaurado via setStudy");
    assert.deepEqual(current.activeObservatoryLayers, ["NASA_FIRMS", "MARITIME_ROUTES"]);

    useStudyStore.getState().resetStudy();
  });

  test("18. Propagação orbital dinâmica contínua da ISS e integridade de telemetria", () => {
    const t0 = Date.parse(tleEpochToIso(REFERENCE_ISS_TLE.line1)!);
    const pos0 = calculateIssPosition(t0);
    const pos60s = calculateIssPosition(t0 + 60000); // 1 minuto depois

    // Em 60 s a ISS percorre ~460 km de arco
    const km = greatCircleKm({ lat: pos0.latitude, lng: pos0.longitude }, { lat: pos60s.latitude, lng: pos60s.longitude });
    assert.ok(km > 380 && km < 520, `Deslocamento em 60 s: ${km.toFixed(0)} km`);
    assert.ok(pos0.altitudeKm >= 370 && pos0.altitudeKm <= 460);
    assert.ok(pos60s.altitudeKm >= 370 && pos60s.altitudeKm <= 460);

    // Trilha: uma órbita (±meio período) com passo de 1,5 min
    assert.ok(pos0.groundTrack.length >= 60 && pos0.groundTrack.length <= 66, `Trilha: ${pos0.groundTrack.length}`);
    for (const pt of pos0.groundTrack) {
      assert.ok(!Number.isNaN(pt.lat) && Math.abs(pt.lat) <= 52);
      assert.ok(!Number.isNaN(pt.lng) && pt.lng >= -180 && pt.lng <= 180);
    }
  });
});
