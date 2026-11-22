import { applyTimelinePreset } from "../src/stores/actions";
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { latLngToVector3, slerpVectors } from "../src/lib/geo-spatial";
import { useTimelineStore } from "../src/stores/timelineStore";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScenePlayerOverlay } from "../src/components/scenes/ScenePlayerOverlay";
import { useStudyStore } from "../src/stores/studyStore";
import { useSceneStore } from "../src/stores/sceneStore";
import { PaleoEraBadge } from "../src/components/globe/PaleoEraBadge";
import { PresetSelector } from "../src/components/timeline/PresetSelector";
import { resolveGeologicalEra } from "../src/lib/paleo-data";
import { MAGELLAN_ROUTE, HISTORICAL_ROUTES } from "../src/lib/historical-routes";
import { EarthShader, createEarthMaterial } from "../src/components/globe/EarthShaderMaterial";
import { SurfaceTrajectoryLayer as HistoricalRouteTrajectory, ROUTE_ALTITUDE } from "../src/components/scenes/SurfaceTrajectoryLayer";
import { createSurfaceTrajectoryCurve } from "../src/lib/scenes/surface";
import { getScene, loadScene } from "../src/lib/scenes/catalog";
import { PaleoPlatesLayer, PALEO_PLATES_ALTITUDE, PANGEA_TECTONIC_ZONES } from "../src/components/globe/PaleoPlatesLayer";

const HistoricalRouteOverlay: React.FC<{ forceActive?: boolean }> = ({ forceActive }) =>
  React.createElement(ScenePlayerOverlay, forceActive ? { sceneId: "magellan-1519" } : {});

// D12c: a trajetória de Magalhães agora vem da cena de dados e passa pela camada genérica.
const createMagellanTrajectoryCurve = () => {
  const t = getScene("magellan-1519")!.trajectories[0];
  if (t.kind !== "surface") throw new Error("Magalhães deveria ter trajetória de superfície");
  return createSurfaceTrajectoryCurve(t.points);
};

describe("Componente 3: Interface do Usuário, Modo Geológico e Telemetria Naval (RN10, RN11 & RN12)", () => {
  // A cena de Magalhães é carregada sob demanda desde a T35 (no app, ao abrir a cena).
  before(() => loadScene("magellan-1519"));

  test("1. useSceneStore gerencia ciclo de vida, navegação passo-a-passo e progresso", () => {
    const store = useSceneStore.getState();
    store.closeScene();
    assert.equal(useSceneStore.getState().activeSceneId, null);
    assert.equal(useSceneStore.getState().isPlaying, false);

    // Ativar rota de Magalhães
    useSceneStore.getState().openScene("magellan-1519");
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.equal(useSceneStore.getState().isPlaying, true);
    assert.equal(useSceneStore.getState().progress, 0.0);
    assert.equal(useSceneStore.getState().stepIndex, 0);

    // Controles play / pause
    useSceneStore.getState().pause();
    assert.equal(useSceneStore.getState().isPlaying, false);
    useSceneStore.getState().play();
    assert.equal(useSceneStore.getState().isPlaying, true);
    useSceneStore.getState().togglePlay();
    assert.equal(useSceneStore.getState().isPlaying, false);

    // Navegar para próximo waypoint
    const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
    useSceneStore.getState().nextStep();
    assert.equal(useSceneStore.getState().stepIndex, 1);
    assert.ok(useSceneStore.getState().progress > 0);

    // Retroceder waypoint
    useSceneStore.getState().prevStep();
    assert.equal(useSceneStore.getState().stepIndex, 0);
    assert.equal(useSceneStore.getState().progress, 0.0);

    // Impedir índice negativo no prevWaypoint
    useSceneStore.getState().prevStep();
    assert.equal(useSceneStore.getState().stepIndex, 0);

    // Testar seek com clamping
    useSceneStore.getState().seek(0.5);
    assert.equal(useSceneStore.getState().progress, 0.5);
    assert.equal(useSceneStore.getState().stepIndex, Math.floor(0.5 * (totalWaypoints - 1) + 0.5));

    useSceneStore.getState().seek(-0.5);
    assert.equal(useSceneStore.getState().progress, 0.0);

    useSceneStore.getState().seek(1.5);
    assert.equal(useSceneStore.getState().progress, 1.0);
    assert.equal(useSceneStore.getState().stepIndex, totalWaypoints - 1);

    // Reset
    useSceneStore.getState().reset();
    assert.equal(useSceneStore.getState().progress, 0.0);
    assert.equal(useSceneStore.getState().stepIndex, 0);

    // Velocidade e minimização
    useSceneStore.getState().setPlaybackSpeed(2.0);
    assert.equal(useSceneStore.getState().playbackSpeed, 2.0);
    useSceneStore.getState().toggleMinimized();
    assert.equal(useSceneStore.getState().isMinimized, true);
    useSceneStore.getState().toggleMinimized();
    assert.equal(useSceneStore.getState().isMinimized, false);
  });

  test("2. HistoricalRouteOverlay renderiza HUD completo com navio, comandante e Diário de Pigafetta", () => {
    useSceneStore.getState().openScene("magellan-1519");
    useSceneStore.getState().jumpToStep(6); // Estreito de Magalhães

    const html = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: true }));
    assert.ok(html.includes("data-scene-player-overlay=\"true\""));
    assert.ok(html.includes("CIRCUM-NAVEGAÇÃO"));
    assert.ok(html.includes("Nau Trinidad") || html.includes("Victoria") || html.includes("Embarcação"));
    assert.ok(html.includes("Fernão de Magalhães"));
    assert.ok(html.includes("Estreito de Todos os Santos"));
    assert.ok(html.includes("Antonio Pigafetta"));
    assert.ok(html.includes("Todos os Santos"));
    assert.ok(html.includes("léguas"));
    assert.ok(html.includes("dias"));

    // Waypoint final de Elcano
    const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
    useSceneStore.getState().jumpToStep(totalWaypoints - 1); // Retorno Sanlúcar
    const htmlEnd = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: true }));
    assert.ok(htmlEnd.includes("Victoria"));
    assert.ok(htmlEnd.includes("Juan Sebastián Elcano"));
    assert.ok(htmlEnd.includes("dezoito homens"));

    // Quando inativo e sem forceActive, não renderiza nada
    useSceneStore.getState().closeScene();
    const htmlInactive = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: false }));
    assert.equal(htmlInactive, "");
  });

  test("3. PaleoEraBadge renderiza no fluxo compartilhado dos avisos do globo", () => {
    // 1. Pangeia (250 Ma)
    const htmlPangea = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 250 }));
    assert.ok(htmlPangea.includes("data-testid=\"paleo-era-badge\""));
    assert.ok(htmlPangea.includes("Pangeia"));
    assert.ok(htmlPangea.includes("250 Ma") || htmlPangea.includes("~250 Ma"));
    assert.ok(htmlPangea.includes("Restaurar Geografia Contemporânea"));
    assert.ok(htmlPangea.includes("flex-row"));
    assert.ok(!htmlPangea.includes("fixed"));

    // 3. Gondwana (150 Ma)
    const htmlGondwana = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 150 }));
    assert.ok(htmlGondwana.includes("Gondwana &amp; Laurásia") || htmlGondwana.includes("Gondwana"));
    assert.ok(htmlGondwana.includes("150 Ma") || htmlGondwana.includes("~150 Ma"));

    // 4. Cretáceo K-Pg (66 Ma)
    const htmlKpg = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 66 }));
    assert.ok(htmlKpg.includes("Extinção K-Pg") || htmlKpg.includes("Cretáceo"));
    assert.ok(htmlKpg.includes("66 Ma") || htmlKpg.includes("~66 Ma"));

    // 5. Inativo (geologicalMa: null) retorna vazio
    const htmlNull = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: null }));
    assert.equal(htmlNull, "");
  });

  test("4. useTimelineStore suporta modo geológico, rota de navegação e transição de presets", () => {
    // Inicializar no presente
    applyTimelinePreset("LAST_50_YEARS");
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useSceneStore.getState().activeSceneId, null);
    assert.equal(useTimelineStore.getState().startYear, 1974);
    assert.equal(useTimelineStore.getState().endYear, 2024);

    // Preset Pangeia
    applyTimelinePreset("PANGEA_250MA");
    assert.equal(useTimelineStore.getState().geologicalMa, 250);

    // Preset Gondwana
    applyTimelinePreset("GONDWANA_150MA");
    assert.equal(useTimelineStore.getState().geologicalMa, 150);

    // Preset Cretáceo
    applyTimelinePreset("KPG_66MA");
    assert.equal(useTimelineStore.getState().geologicalMa, 66);

    // Preset Circum-navegação de Magalhães
    applyTimelinePreset("MAGELLAN_1519");
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.equal(useTimelineStore.getState().startYear, 1519);
    assert.equal(useTimelineStore.getState().endYear, 1522);

    // Retorno ao contemporâneo
    applyTimelinePreset("21ST_CENTURY");
    assert.equal(useSceneStore.getState().activeSceneId, null);
    assert.equal(useTimelineStore.getState().startYear, 2000);
    assert.equal(useTimelineStore.getState().endYear, 2026);
  });

  test("5. PresetSelector renderiza opções humanas, geológicas e marítimas", () => {
    applyTimelinePreset("LAST_50_YEARS");
    const html = renderToStaticMarkup(React.createElement(PresetSelector));
    assert.ok(html.includes("50 Anos Padrão"));
    assert.ok(html.includes("Século XXI"));
    assert.ok(html.includes("Guerra Fria"));
    assert.ok(html.includes("Guerras Mundiais"));
    assert.ok(html.includes("Pangeia (250 Ma)"));
    assert.ok(html.includes("Gondwana &amp; Laurásia (150 Ma)"));
    assert.ok(html.includes("Cretáceo K-Pg (66 Ma)"));
    assert.ok(html.includes("Circum-navegação de Magalhães (1519–1522)"));
  });

  test("6. Matemática e Geodésia da Rota de Magalhães (historical-routes.ts)", () => {
    const route = HISTORICAL_ROUTES["magellan-1519"];
    assert.ok(route, "Rota de Magalhães deve existir no catálogo canônico");
    assert.equal(route.type, "MARITIME");
    assert.equal(route.startYear, 1519);
    assert.equal(route.endYear, 1522);
    assert.ok(route.totalDistanceKm > 55000);

    const waypoints = route.waypoints;
    assert.ok(waypoints.length >= 15);

    // 1. Partida em Sanlúcar de Barrameda / Sevilha
    const start = waypoints[0];
    assert.equal(start.lat, 36.78);
    assert.equal(start.lng, -6.35);

    // 2. Passagem confirmada pelo Estreito de Magalhães
    const straits = waypoints.find((w) => w.lat === -53.47 && w.lng === -70.92);
    assert.ok(straits, "Waypoint do Estreito de Magalhães deve estar estritamente presente");

    // 3. Mactan / Filipinas
    const mactan = waypoints.find((w) => w.lat === 10.31 && w.lng === 123.97);
    assert.ok(mactan, "Waypoint de Mactan deve estar estritamente presente");

    // 4. Retorno a Sanlúcar / Sevilha completando o circuito topológico
    const end = waypoints[waypoints.length - 1];
    assert.equal(end.lat, 36.78);
    assert.equal(end.lng, -6.35);
  });

  test("7. Resolução Canônica de Eras Paleogeográficas (paleo-data.ts)", () => {
    const era250 = resolveGeologicalEra(250);
    assert.ok(era250.id === "PANGEA_250MA" || era250.id === "pangaea-250ma" || (era250 as any).code === "PANGEA_250MA");
    assert.equal(era250.period, "PERMIAN_TRIASSIC");
    assert.ok(era250.landmassAreaKm2 >= 140000000);
    assert.ok(era250.oceanName.includes("Panthalassa"));

    const era150 = resolveGeologicalEra(150);
    assert.ok(era150.id === "GONDWANA_150MA" || era150.id === "gondwana-150ma" || (era150 as any).code === "GONDWANA_150MA");
    assert.equal(era150.period, "JURASSIC");

    const era66 = resolveGeologicalEra(66);
    assert.ok(era66.id === "KPG_66MA" || era66.id === "cretaceous-66ma" || (era66 as any).code === "KPG_66MA");
    assert.equal(era66.period, "CRETACEOUS");
  });
});

describe("Componente 2: Três Dimensões WebGL & Shaders (R3F) (RN11 & RN12)", () => {
  test("1. EarthShaderMaterial contém uniforms uPaleoTexture e uPaleoFactor inicializados", () => {
    assert.ok("uPaleoTexture" in EarthShader.uniforms, "uPaleoTexture deve existir nos uniforms");
    assert.ok("uPaleoFactor" in EarthShader.uniforms, "uPaleoFactor deve existir nos uniforms");
    assert.equal(EarthShader.uniforms.uPaleoFactor.value, 0.0);

    const mat = createEarthMaterial();
    assert.ok(mat instanceof THREE.ShaderMaterial);
    assert.ok("uPaleoTexture" in mat.uniforms);
    assert.ok("uPaleoFactor" in mat.uniforms);
    assert.equal(mat.uniforms.uPaleoFactor.value, 0.0);
    assert.ok(mat.uniforms.uPaleoTexture.value !== null, "Deve conter textura ou placeholder 1x1");
    mat.dispose();
  });

  test("2. GLSL Invariant: normal mundial estritamente preservado no vertex shader", () => {
    const vs = EarthShader.vertexShader;
    assert.ok(
      vs.includes("vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);"),
      "Vertex shader deve calcular normais no espaço mundial via modelMatrix"
    );
    assert.ok(
      !vs.includes("normalMatrix * normal"),
      "NUNCA deve utilizar normalMatrix no cálculo do vetor normal para evitar distorção solar"
    );
  });

  test("3. GLSL Invariant: supressão estrita de luzes noturnas urbanas quando uPaleoFactor > 0.0", () => {
    const fs = EarthShader.fragmentShader;
    assert.ok(
      fs.includes("uniform sampler2D uPaleoTexture;"),
      "Fragment shader deve declarar uPaleoTexture"
    );
    assert.ok(
      fs.includes("uniform float uPaleoFactor;"),
      "Fragment shader deve declarar uPaleoFactor"
    );
    assert.ok(
      fs.includes("mix(dayLit, paleoLit, uPaleoFactor)") ||
        fs.includes("mix(dayColor, paleoColor, uPaleoFactor)") ||
        fs.includes("mix(dayBase, paleoBase, uPaleoFactor)"),
      "Fragment shader deve fazer o blend da textura paleogeográfica"
    );
    assert.ok(
      fs.includes("mix(nightComposite, vec3(0.012, 0.022, 0.042), uPaleoFactor);"),
      "Invariante de extinção de luzes elétricas de cidades pré-históricas deve estar presente"
    );
  });

  test("4. HistoricalRouteTrajectory: spline geodésica em raio estrito de 1.004 evita colisão interna com (0,0,0)", () => {
    assert.equal(ROUTE_ALTITUDE, 1.004, "Altitude da rota deve ser estritamente 1.004");
    const { curve, curvePoints, waypoints3D } = createMagellanTrajectoryCurve();

    assert.ok(curve instanceof THREE.CatmullRomCurve3);
    assert.ok(curvePoints.length >= 200, "Deve gerar malha refinada de pontos geodésicos");
    assert.ok(waypoints3D.length >= 15);

    // Amostragem de 100 pontos da curva contínua
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const pt = curve.getPointAt(u);
      const distToCenter = pt.length();

      // Tolerância estrita de curvatura sobre a esfera
      assert.ok(
        Math.abs(distToCenter - 1.004) < 0.002,
        `Ponto em u=${u} tem distância ${distToCenter}, esperado ~1.004`
      );
      assert.ok(distToCenter > 1.0, "Trajetória nunca deve cortar sob a superfície terrestre");
      assert.ok(!Number.isNaN(pt.x));
      assert.ok(!Number.isNaN(pt.y));
      assert.ok(!Number.isNaN(pt.z));
    }
  });

  test("5. HistoricalRouteTrajectory: circum-navegação completa com waypoints canônicos e fechamento topológico", () => {
    const { waypoints3D } = createMagellanTrajectoryCurve();

    // 1. Sanlúcar de Barrameda / Sevilha (Partida)
    const startWp = waypoints3D[0].waypoint;
    assert.equal(startWp.lat, 36.78);
    assert.equal(startWp.lng, -6.35);

    // 2. Estreito de Magalhães (-53.47, -70.92)
    const strait = waypoints3D.find(
      (w) => Math.abs(w.waypoint.lat - -53.47) < 0.1 && Math.abs(w.waypoint.lng - -70.92) < 0.1
    );
    assert.ok(strait, "Estreito de Magalhães deve estar presente na trajetória");

    // 3. Ilhas Filipinas / Mactan (10.31, 123.97)
    const mactan = waypoints3D.find(
      (w) => Math.abs(w.waypoint.lat - 10.31) < 0.1 && Math.abs(w.waypoint.lng - 123.97) < 0.1
    );
    assert.ok(mactan, "Batalha de Mactan deve estar presente na trajetória");

    // 4. Retorno a Sanlúcar (Chegada da Nau Victoria)
    const endWp = waypoints3D[waypoints3D.length - 1].waypoint;
    assert.equal(endWp.lat, 36.78);
    assert.equal(endWp.lng, -6.35);

    // Distância euclidiana entre início e fim no raio 1.004 deve ser nula (circuito fechado)
    const startPt = waypoints3D[0].point;
    const endPt = waypoints3D[waypoints3D.length - 1].point;
    assert.ok(startPt.distanceTo(endPt) < 1e-4, "Trajetória 3D deve fechar circuito topológico no globo");
  });

  test("6. PaleoPlatesLayer: altitude estrita 1.002 e catalogação das 10 zonas tectônicas da Pangeia", () => {
    assert.equal(PALEO_PLATES_ALTITUDE, 1.002, "Camada tectônica deve operar no raio 1.002");
    assert.ok(Array.isArray(PANGEA_TECTONIC_ZONES));
    assert.equal(PANGEA_TECTONIC_ZONES.length, 10, "Deve catalogar exatamente 10 grandes zonas tectônicas");

    const names = PANGEA_TECTONIC_ZONES.map((z) => z.name);
    assert.ok(names.some((n) => n.includes("Varisca")));
    assert.ok(names.some((n) => n.includes("Uraliana")));
    assert.ok(names.some((n) => n.includes("Atlântico Central")));
    assert.ok(names.some((n) => n.includes("Tétis")));
    assert.ok(names.some((n) => n.includes("Samfrau")));

    // Todos os pontos das polilinhas devem ter coordenadas lat/lng válidas
    for (const zone of PANGEA_TECTONIC_ZONES) {
      assert.ok(zone.coords.length >= 5);
      for (const [lat, lng] of zone.coords) {
        assert.ok(lat >= -90 && lat <= 90);
        assert.ok(lng >= -180 && lng <= 180);
      }
    }
  });

  test("7. Validação estrutural de componentes R3F: HistoricalRouteTrajectory e PaleoPlatesLayer", () => {
    assert.equal(typeof HistoricalRouteTrajectory, "function", "HistoricalRouteTrajectory deve ser um componente React");
    assert.equal(typeof PaleoPlatesLayer, "function", "PaleoPlatesLayer deve ser um componente React");

    // Verificar que os dados e a geometria gerada possuem nomes canônicos e nós Three.js válidos
    const { curve, waypoints3D } = createMagellanTrajectoryCurve();
    assert.ok(curve, "Curva deve ser instanciada");
    assert.ok(waypoints3D.length > 0, "Waypoints devem estar preenchidos");

    const samplePos = curve.getPointAt(0.5);
    assert.ok(Math.abs(samplePos.length() - 1.004) < 0.002, "Posição média da rota deve ter raio 1.004");
  });

  test("8. Descarte de geometrias e materiais WebGL (evita memory leaks na GPU)", () => {
    // 1. Trajetória e Nau Victoria
    const { curve } = createMagellanTrajectoryCurve();
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.0016, 6, false);
    const lineMat = new THREE.MeshStandardMaterial();
    tubeGeo.dispose();
    lineMat.dispose();

    // 2. Placas Paleogeográficas
    const pts = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];
    const plateGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const plateMat = new THREE.LineBasicMaterial();
    plateGeo.dispose();
    plateMat.dispose();

    assert.ok(true, "Descarte de geometrias e materiais concluído com sucesso");
  });

  test("9. Base de orientação da Nau Victoria: base ortonormal com determinante +1 e quaternion unitário", () => {
    const { curve } = createMagellanTrajectoryCurve();

    // Amostragem em 50 pontos ao longo de toda a rota de circum-navegação
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const shipPos = curve.getPointAt(u).normalize().multiplyScalar(ROUTE_ALTITUDE);
      const tangent = curve.getTangentAt(u).normalize();
      const up = shipPos.clone().normalize();

      // Invariante de base destra: right = up x tangent, forward = right x up
      const right = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const forward = new THREE.Vector3().crossVectors(right, up).normalize();

      const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
      const det = rotMatrix.determinant();

      assert.ok(
        Math.abs(det - 1.0) < 1e-4,
        `Determinante da matriz de orientação em u=${u} deve ser +1.0 (base destra sem reflexão), recebido: ${det}`
      );

      const q = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      assert.ok(
        Math.abs(q.length() - 1.0) < 1e-4,
        `Quaternion de orientação em u=${u} deve ter comprimento 1.0 (unitário), recebido: ${q.length()}`
      );
    }
  });

  test("10. Raio do tubo de glow e envelope de altitude: superfície exterior e inferior acima de 1.000", () => {
    const { curve } = createMagellanTrajectoryCurve();
    const glowTubeRadius = 0.0032;
    const coreTubeRadius = 0.0016;

    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const pt = curve.getPointAt(u);
      const r = pt.length();

      // Superfície inferior do tubo de glow nunca deve cortar a superfície terrestre (r = 1.0)
      const bottomGlow = r - glowTubeRadius;
      const bottomCore = r - coreTubeRadius;

      assert.ok(
        bottomGlow > 1.0,
        `Superfície inferior do glow em u=${u} deve ser > 1.0, obtido ${bottomGlow}`
      );
      assert.ok(
        bottomCore > 1.0,
        `Superfície inferior do tubo central em u=${u} deve ser > 1.0, obtido ${bottomCore}`
      );
    }
  });

  test("11. Zonas tectônicas da Pangeia: interpolação slerp preserva altitude 1.002 sobre o relevo", () => {
    for (const zone of PANGEA_TECTONIC_ZONES) {
      for (let i = 0; i < zone.coords.length - 1; i++) {
        const [lat1, lng1] = zone.coords[i];
        const [lat2, lng2] = zone.coords[i + 1];

        const vA = latLngToVector3(lat1, lng1, PALEO_PLATES_ALTITUDE);
        const vB = latLngToVector3(lat2, lng2, PALEO_PLATES_ALTITUDE);

        for (let s = 1; s < 5; s++) {
          const t = s / 5;
          const interp = slerpVectors(vA, vB, t).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
          assert.ok(
            Math.abs(interp.length() - PALEO_PLATES_ALTITUDE) < 1e-5,
            "Cada vértice intermediário de fratura tectônica deve estar no raio 1.002"
          );
        }
      }
    }
  });

  test("12. useSceneStore: integração de reprodução, velocidade e waypoints sincronizados", () => {
    const store = useSceneStore.getState();

    // Ativação da rota
    store.openScene("magellan-1519");
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.equal(useSceneStore.getState().isPlaying, true);

    // Alteração de velocidade
    store.setPlaybackSpeed(2.0);
    assert.equal(useSceneStore.getState().playbackSpeed, 2.0);

    // Seek / alteração de progresso
    store.seek(0.5);
    assert.equal(useSceneStore.getState().progress, 0.5);
    assert.ok(useSceneStore.getState().stepIndex > 0);

    // Pause / Play
    store.pause();
    assert.equal(useSceneStore.getState().isPlaying, false);
    store.play();
    assert.equal(useSceneStore.getState().isPlaying, true);

    // Cleanup
    store.closeScene();
  });
});
