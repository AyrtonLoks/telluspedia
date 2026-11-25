import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SceneSchema, parseSceneCollection, sceneStartYear, type SceneInput } from "../src/lib/scenes/schema";

const base: SceneInput = {
  id: "queda-muro-berlim",
  title: "Queda do Muro de Berlim",
  summary: "Abertura dos postos de controle entre Berlim Oriental e Ocidental.",
  category: "POLITICS_REGIMES",
  date: { start: "1989-11-09", precision: "day" },
  country: "DEU",
  location: { lat: 52.5163, lng: 13.3777 },
  sources: [{ label: "Bundesarchiv", url: "https://www.bundesarchiv.de/" }],
};

describe("D12a: schema de cena", () => {
  test("marco simples válido, com padrões preenchidos", () => {
    const s = SceneSchema.parse(base);
    assert.deepEqual(s.trajectories, []);
    assert.equal(s.published, true);
    assert.equal(sceneStartYear(s), 1989);
  });

  test("toda cena precisa de fonte citável (RN02)", () => {
    assert.equal(SceneSchema.safeParse({ ...base, sources: [] }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, sources: [{ label: "" }] }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, sources: [{ label: "IHGB", url: "não é url" }] }).success, false);
  });

  test("datas parciais ISO, precisão e fim depois do início", () => {
    for (const start of ["1989", "1989-11", "1989-11-09", "-44-03-15"]) {
      assert.ok(SceneSchema.safeParse({ ...base, date: { start, precision: "year" } }).success, start);
    }
    for (const start of ["09/11/1989", "1989-13", "1989-11-32", ""]) {
      assert.equal(SceneSchema.safeParse({ ...base, date: { start, precision: "day" } }).success, false, start);
    }
    assert.equal(SceneSchema.safeParse({ ...base, date: { start: "1990", end: "1989", precision: "year" } }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, date: { start: "1989", precision: "semana" } }).success, false);
  });

  test("ids em kebab-case, ISO alfa-3, coordenadas e câmera dentro dos limites", () => {
    assert.equal(SceneSchema.safeParse({ ...base, id: "Queda Muro" }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, countries: ["DE"] }).success, false);
    assert.ok(SceneSchema.safeParse({ ...base, country: "TUR_HIST", countries: ["SUN", "GDR"] }).success, "entidades históricas");
    assert.equal(SceneSchema.safeParse({ ...base, location: { lat: 95, lng: 0 } }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, camera: { lat: 0, lng: 0, altitude: 0.5 } }).success, false, "altitude abaixo do mínimo da câmera");
    assert.equal(SceneSchema.safeParse({ ...base, borderEra: "ERA_INEXISTENTE" }).success, false);
  });

  test("trajetória de superfície: ordem cronológica, veículo conhecido e câmera obrigatória", () => {
    const traj = {
      kind: "surface",
      id: "rota",
      label: "Rota",
      vehicle: "ship",
      points: [
        { id: "a", name: "Sevilha", lat: 37.38, lng: -5.99, time: "1519-08-10T12:00:00Z" },
        { id: "b", name: "Sanlúcar", lat: 36.78, lng: -6.35, time: "1519-09-20T12:00:00Z", facts: { diaDeViagem: 41 } },
      ],
    };
    assert.equal(SceneSchema.safeParse({ ...base, trajectories: [traj] }).success, false, "sem câmera");
    const camera = { lat: 20, lng: -30, altitude: 3 };
    assert.ok(SceneSchema.safeParse({ ...base, camera, trajectories: [traj] }).success);
    const reversed = { ...traj, points: [...traj.points].reverse() };
    assert.equal(SceneSchema.safeParse({ ...base, camera, trajectories: [reversed] }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, camera, trajectories: [{ ...traj, vehicle: "dragão" }] }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, camera, trajectories: [{ ...traj, points: [traj.points[0]] }] }).success, false);
  });

  test("trajetória Terra–Lua por fases com instantes", () => {
    const apollo = {
      kind: "cislunar",
      id: "apollo-11",
      label: "Apollo 11",
      vehicle: "spacecraft",
      launchSite: { name: "LC-39A", lat: 28.5721, lng: -80.648 },
      landingSite: { name: "Base da Tranquilidade", lat: 0.674, lng: 23.4729 },
      phases: [
        { id: "launch", label: "Lançamento", time: "1969-07-16T13:32:00Z" },
        { id: "landing", label: "Pouso", time: "1969-07-20T20:17:40Z" },
      ],
    };
    assert.ok(SceneSchema.safeParse({ ...base, camera: { lat: 12, lng: -148, altitude: 6 }, trajectories: [apollo] }).success);
    assert.equal(SceneSchema.safeParse({ ...base, camera: { lat: 12, lng: -148, altitude: 6 }, trajectories: [{ ...apollo, phases: [{ id: "warp", label: "x", time: "1969-07-16T13:32:00Z" }, apollo.phases[1]] }] }).success, false);
    assert.equal(SceneSchema.safeParse({ ...base, camera: { lat: 12, lng: -148, altitude: 6 }, trajectories: [{ ...apollo, phases: [{ ...apollo.phases[0], time: "1969-07-16" }, apollo.phases[1]] }] }).success, false, "instante sem hora/fuso");
  });

  test("coleção: ids únicos e erro com caminho legível", () => {
    assert.throws(() => parseSceneCollection([base, base], "teste.json"), /id duplicado queda-muro-berlim/);
    assert.throws(() => parseSceneCollection([{ ...base, sources: [] }], "teste.json"), /teste\.json\[0\] queda-muro-berlim: sources/);
    assert.equal(parseSceneCollection([base, { ...base, id: "outro", published: false, wikidata: "Q12345" }], "teste.json").length, 2);
  });
});

import fs from "node:fs";
import path from "node:path";
import { ALL_SCENES, SCENE_SOURCES, getScene, globalMilestones, loadScene } from "../src/lib/scenes/catalog";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "../src/lib/country-data";
import { HISTORICAL_ROUTES } from "../src/lib/historical-routes";
import { APOLLO11_PHASES, CAPE_CANAVERAL_COORDS, TRANQUILITY_BASE_COORDS } from "../src/lib/apollo11";

describe("D12b: migração sem perda para cenas", () => {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/pre-d12b-events.json"), "utf-8"));

  test("os 28 marcos globais originais e os 17 dos países seguem idênticos após D24, T48 e D36", () => {
    // D24 acrescentou Marco Polo e Vasco da Gama; T48 acrescentou 7 marcos globais curados (2022–2026);
    // D36 acrescentou o Prêmio Vautrin Lud a Milton Santos (1994).
    const D24_NEW = ["polo-1271", "gama-1497"];
    const T48_NEW = [
      "glo-2022-ukr",
      "glo-2022-artemis",
      "glo-2023-who",
      "glo-2023-chandrayaan",
      "glo-2024-brics",
      "glo-2025-cop30",
      "glo-2026-milton",
    ];
    const D36_NEW = ["bra-1994-milton-santos"];
    const ADDED = [...D24_NEW, ...T48_NEW, ...D36_NEW];
    assert.equal(GLOBAL_MILESTONES.length, 28 + ADDED.length);
    assert.deepStrictEqual(ADDED.filter((id) => GLOBAL_MILESTONES.some((m) => m.id === id)), ADDED);
    const previous = GLOBAL_MILESTONES.filter((m) => !ADDED.includes(m.id));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(previous)), before.global);
    for (const [iso, list] of Object.entries(before.pilot)) {
      assert.deepStrictEqual(JSON.parse(JSON.stringify(PILOT_COUNTRIES[iso].milestones)), list, iso);
    }
    assert.equal(Object.values(PILOT_COUNTRIES).reduce((n, c) => n + c.milestones.length, 0), 17);
  });

  test("Magalhães: rota completa (frota, 17 pontos, diário, citações, dossiê) idêntica", async () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(HISTORICAL_ROUTES["magellan-1519"])), before.magellan);
    // Sob demanda desde a T35: a cena completa chega por loadScene.
    const scene = (await loadScene("magellan-1519"))!;
    assert.equal(scene.trajectories[0].kind, "surface");
    assert.equal(scene.participants.length, 5);
  });

  test("Apollo 11: fases idênticas e instantes pelo GET a partir do lançamento", () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(APOLLO11_PHASES)), before.apolloPhases);
    const t = getScene("glo-1969")!.trajectories[0];
    assert.equal(t.kind, "cislunar");
    if (t.kind !== "cislunar") return;
    assert.deepEqual(t.phases.map((p) => p.time), ["1969-07-16T13:32:00Z", "1969-07-16T16:22:13Z", "1969-07-19T17:21:50Z", "1969-07-20T20:17:40Z"]);
    assert.equal(t.launchSite.lat, CAPE_CANAVERAL_COORDS.lat);
    assert.equal(t.landingSite?.lng, TRANQUILITY_BASE_COORDS.lng);
  });

  test("cada arquivo de cena passa no schema e a normalização do cliente bate com o zod", () => {
    const parsed = SCENE_SOURCES.flatMap(([file, items]) => parseSceneCollection(items, file));
    // As cenas sob demanda (D24) entram no catálogo pelo índice leve; são validadas em scenes-lazy.test.ts.
    const eager = ALL_SCENES.filter((s) => parsed.some((p) => p.id === s.id));
    assert.equal(eager.length, parsed.length);
    // Cenas com detalhes à parte podem já ter sido completadas por outro teste: compara sem esses campos.
    const strip = (list: unknown[]) => JSON.parse(JSON.stringify(list), (k, v) => (k === "participants" || k === "chronicle" ? undefined : v));
    assert.deepStrictEqual(strip(eager), strip(parsed));
    const catalog = fs.readFileSync(path.join(__dirname, "../src/lib/scenes/catalog.ts"), "utf-8");
    assert.doesNotMatch(catalog, /from "zod"|import \{[^}]*\} from "\.\/schema"/, "zod fora do bundle do cliente");
  });

  test("catálogo: 55 cenas publicadas (47 + 7 marcos T48 + 1 marco D36), todas com fonte, ids únicos, ordem cronológica dos globais", () => {
    assert.equal(ALL_SCENES.length, 55);
    assert.ok(ALL_SCENES.every((s) => s.sources.length > 0 && s.sources[0].label.length > 1));
    assert.equal(new Set(ALL_SCENES.map((s) => s.id)).size, 55);
    const years = globalMilestones().map((m) => m.year);
    assert.deepEqual(years, [...years].sort((a, b) => a - b));
  });

  test("os dados não estão mais chumbados no código", () => {
    const cd = fs.readFileSync(path.join(__dirname, "../src/lib/country-data.ts"), "utf-8");
    assert.doesNotMatch(cd, /exactDate: "/, "marcos saíram de country-data.ts");
    const hr = fs.readFileSync(path.join(__dirname, "../src/lib/historical-routes.ts"), "utf-8");
    assert.doesNotMatch(hr, /quoteFromPigafetta: "/, "rota saiu de historical-routes.ts");
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "../src/lib/apollo11.ts"), "utf-8"), /historicalGET: "/);
  });
});

import * as THREE from "three";
import { cislunarControlPoints, cislunarMoonPosition, createCislunarCurve, MOON_RADIUS_SCENE } from "../src/lib/scenes/cislunar";
import { createSurfaceTrajectoryCurve, ROUTE_ALTITUDE } from "../src/lib/scenes/surface";
import { getApollo11ControlPoints, MOON_DEFAULT_POSITION } from "../src/lib/apollo11";

describe("D12c: player genérico (camadas 3D)", () => {
  const apollo = getScene("glo-1969")!.trajectories[0];

  test("Terra–Lua: a Apollo 11 pelos dados gera exatamente a mesma trajetória de antes", () => {
    if (apollo.kind !== "cislunar") throw new Error();
    assert.ok(cislunarMoonPosition(apollo).distanceTo(MOON_DEFAULT_POSITION) < 1e-12, "Lua no instante do pouso");
    const generic = cislunarControlPoints(apollo, cislunarMoonPosition(apollo));
    const legacy = getApollo11ControlPoints();
    assert.equal(generic.length, 12);
    generic.forEach((p, i) => assert.ok(p.distanceTo(legacy[i]) < 1e-9, `ponto ${i}`));
    const end = createCislunarCurve(apollo).getPoint(1);
    assert.ok(Math.abs(end.distanceTo(MOON_DEFAULT_POSITION) - MOON_RADIUS_SCENE) < 1e-9, "termina na superfície da Lua");
  });

  test("Terra–Lua sem pouso (missão orbital) termina em órbita lunar", () => {
    if (apollo.kind !== "cislunar") throw new Error();
    const orbital = { ...apollo, landingSite: undefined, phases: apollo.phases.slice(0, 3) };
    const pts = cislunarControlPoints(orbital, cislunarMoonPosition(orbital));
    assert.equal(pts.length, 9);
    const moon = cislunarMoonPosition(orbital);
    assert.ok(pts[pts.length - 1].distanceTo(moon) > MOON_RADIUS_SCENE, "fora da Lua");
  });

  test("superfície: qualquer lista de pontos vira spline geodésica na altitude da rota", () => {
    const { curve, waypoints3D } = createSurfaceTrajectoryCurve([
      { lat: 48.85, lng: 2.35 },
      { lat: 41.9, lng: 12.5 },
      { lat: 37.98, lng: 23.73 },
    ]);
    assert.equal(waypoints3D.length, 3);
    for (let u = 0; u <= 1; u += 0.05) {
      const r = curve.getPointAt(u).length();
      assert.ok(r > 1 && Math.abs(r - ROUTE_ALTITUDE) < 2e-3, `raio ${r}`);
    }
    assert.ok(curve.getPoint(0) instanceof THREE.Vector3);
  });

  test("o globo usa o player genérico; nada de componente 3D por evento", () => {
    const canvas = fs.readFileSync(path.join(__dirname, "../src/components/globe/GlobeCanvas.tsx"), "utf-8");
    assert.match(canvas, /<ScenePlayer scene=\{activeSceneData\} \/>/);
    assert.doesNotMatch(canvas, /Apollo11Trajectory|HistoricalRouteTrajectory/);
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/components/globe/Apollo11Trajectory.tsx")));
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/components/globe/HistoricalRouteTrajectory.tsx")));
    const player = fs.readFileSync(path.join(__dirname, "../src/components/scenes/ScenePlayer.tsx"), "utf-8");
    assert.doesNotMatch(player, /magellan|apollo|1519|1969/i, "o player não conhece eventos pelo nome");
    const surface = fs.readFileSync(path.join(__dirname, "../src/components/scenes/SurfaceTrajectoryLayer.tsx"), "utf-8");
    assert.match(surface, /isShip \?/, "veículo conforme o tipo");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cislunarTelemetry } from "../src/lib/scenes/cislunar";
import { ScenePlayerOverlay } from "../src/components/scenes/ScenePlayerOverlay";
import { useSceneStore } from "../src/stores/sceneStore";

describe("D12c: painel genérico do player", () => {
  const apollo = getScene("glo-1969")!.trajectories[0];

  test("telemetria Terra–Lua derivada dos dados: GET pelas fases e distância até a Lua real", () => {
    if (apollo.kind !== "cislunar") throw new Error();
    const start = cislunarTelemetry(apollo, 0);
    assert.equal(start.getFormatted, "000:00:00");
    assert.equal(start.phaseIndex, 0);
    assert.ok(start.distanceKm < 1000, "no lançamento, perto da Terra");
    const end = cislunarTelemetry(apollo, 1);
    assert.equal(end.getFormatted, "102:45:40", "GET do pouso (Mission Report)");
    assert.equal(end.phaseIndex, 3);
    assert.ok(end.distanceKm > 350_000 && end.distanceKm < 410_000, `distância no pouso ${end.distanceKm}`);
    assert.equal(cislunarTelemetry(apollo, 0.6).phaseIndex, 2, "inserção em órbita lunar");
    const mids = [0.2, 0.4, 0.6, 0.8].map((p) => cislunarTelemetry(apollo, p).getSeconds);
    assert.deepEqual(mids, [...mids].sort((a, b) => a - b), "GET cresce com o progresso");
  });

  test("GET nunca fica antes do instante da fase exibida (fase e relógio coerentes)", () => {
    if (apollo.kind !== "cislunar") throw new Error();
    const launch = Date.parse(apollo.phases[0].time);
    for (let i = 0; i <= 100; i++) {
      const tel = cislunarTelemetry(apollo, i / 100);
      const phaseGet = (Date.parse(apollo.phases[tel.phaseIndex].time) - launch) / 1000;
      assert.ok(tel.getSeconds >= phaseGet, `p=${i / 100}: GET ${tel.getFormatted} antes da fase ${apollo.phases[tel.phaseIndex].id}`);
    }
  });

  test("um só painel serve Magalhães e Apollo 11, com textos e estatísticas vindos dos dados", async () => {
    await loadScene("magellan-1519"); // sob demanda desde a T35
    useSceneStore.getState().openScene("magellan-1519");
    useSceneStore.getState().jumpToStep(6);
    const mag = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "magellan-1519" }));
    for (const s of ["CIRCUM-NAVEGAÇÃO", "Léguas navegadas", "léguas", "Diário de Bordo — Antonio Pigafetta (1524)", "Fernão de Magalhães", 'data-scene-id="magellan-1519"']) assert.ok(mag.includes(s), s);
    useSceneStore.getState().closeScene();

    useSceneStore.getState().openScene("glo-1969");
    useSceneStore.getState().seek(0.97);
    const apo = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1969" }));
    for (const s of ["APOLLO 11", "Telemetria de Voo Espacial NASA", "SATURN V / LEO", "TOUCHDOWN / EAGLE", "Distância da Terra", "Tempo de missão (GET)", "The Eagle has landed", "Visão ampla", "Lua"]) assert.ok(apo.includes(s), s);
    useSceneStore.getState().seek(0.5);
    assert.ok(!renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1969" })).includes("The Eagle has landed"), "frase final só perto do fim");
    assert.equal(renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "queda-muro-inexistente" })), "");
  });

  test("os painéis por evento foram removidos; velocidade sintética não é mais exibida", () => {
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/components/globe/Apollo11TelemetryOverlay.tsx")));
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/components/globe/HistoricalRouteOverlay.tsx")));
    const overlay = fs.readFileSync(path.join(__dirname, "../src/components/scenes/ScenePlayerOverlay.tsx"), "utf-8");
    assert.doesNotMatch(overlay, /magellan|apollo 11|1519|1969|km\/h/i, "o painel não conhece eventos pelo nome");
    assert.match(fs.readFileSync(path.join(__dirname, "../src/components/shell/GlobeExperienceShell.tsx"), "utf-8"), /<ScenePlayerOverlay sceneId=\{sceneId\} closing=\{scenePresence.closing\} \/>/);
  });
});

import { resolveEpoch } from "../src/lib/epoch/resolveEpoch";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { applyTimelinePreset, selectHistoricalRoute } from "../src/stores/actions";
import { sceneLockedInstant, sceneOpenedBy, sceneStepStarts } from "../src/lib/scenes/catalog";
import { sceneIdFromSearch, searchWithScene } from "../src/components/scenes/SceneLinkSync";

describe("D12d: ativação de cenas pelos dados", () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, "..", rel), "utf-8");

  test("resolveEpoch e o store de cenas não conhecem eventos pelo nome", () => {
    for (const f of ["src/lib/epoch/resolveEpoch.ts", "src/lib/epoch/constants.ts", "src/stores/sceneStore.ts", "src/lib/epoch/useSunDirection.ts"]) {
      assert.doesNotMatch(read(f), /"MAGELLAN"|"APOLLO11"|EpochScene/, f);
    }
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/stores/historicalRouteStore.ts")), "store antigo removido");
    assert.ok(!fs.existsSync(path.join(__dirname, "../src/stores/apollo11Store.ts")), "store antigo removido");
  });

  test("cena só abre por seleção explícita; o ano nunca abre cena", () => {
    assert.equal(resolveEpoch({ selectedYear: 1969 }).activeScene, null);
    assert.equal(resolveEpoch({ selectedYear: 1519 }).activeScene, null);
    assert.equal(resolveEpoch({ activeSceneId: "glo-1969" }).activeScene, "glo-1969");
    assert.equal(resolveEpoch({ selectedMilestoneId: "usa-1969" }).activeScene, "glo-1969", "openedBy nos dados");
    assert.equal(sceneOpenedBy("elcano-1522"), undefined, "marco simples não abre o player");
    assert.equal(resolveEpoch({ activeSceneId: "elcano-1522" }).activeScene, null, "sem trajetória não é cena tocável");
    // Período da cena (antes da Era Espacial) decide modo e telemetria, não o nome
    assert.deepEqual(
      (({ mode, isContemporary }) => ({ mode, isContemporary }))(resolveEpoch({ activeSceneId: "magellan-1519", selectedYear: 2020 })),
      { mode: "HISTORICAL", isContemporary: false }
    );
  });

  test("instante travado e passos vêm da trajetória da cena", () => {
    assert.equal(sceneLockedInstant("glo-1969")?.toISOString(), "1969-07-20T20:17:40.000Z");
    assert.equal(sceneLockedInstant("magellan-1519"), null);
    const steps = sceneStepStarts(getScene("magellan-1519"));
    assert.equal(steps[0], 0);
    assert.equal(steps[steps.length - 1], 1);
  });

  test("sair da cena restaura timeline, país e câmera de antes da abertura", () => {
    useSceneStore.getState().closeScene({ restore: false });
    useTimelineStore.setState({ selectedYear: 1990, selectedMilestoneId: null, startYear: 1974, endYear: 2024, geologicalMa: null });
    useGlobeStore.getState().setSelectedIso("BRA");
    useGlobeStore.getState().setCameraPosition(-10, -50, 2.5);

    selectHistoricalRoute("magellan-1519");
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.equal(useTimelineStore.getState().selectedYear, 1519);
    useGlobeStore.getState().setCameraPosition(30, 10, 3);

    useSceneStore.getState().closeScene();
    const t = useTimelineStore.getState();
    const g = useGlobeStore.getState();
    assert.equal(useSceneStore.getState().activeSceneId, null);
    assert.deepEqual([t.selectedYear, t.startYear, t.endYear], [1990, 1974, 2024]);
    assert.equal(g.selectedIso, "BRA");
    assert.deepEqual([g.cameraLat, g.cameraLng, g.cameraAltitude], [-10, -50, 2.5]);
  });

  test("preset da rota: fechar volta ao preset anterior (período e ano)", () => {
    useSceneStore.getState().closeScene({ restore: false });
    applyTimelinePreset("COLD_WAR");
    applyTimelinePreset("MAGELLAN_1519");
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519");
    assert.deepEqual([useTimelineStore.getState().startYear, useTimelineStore.getState().endYear], [1519, 1522]);
    useSceneStore.getState().closeScene();
    const t = useTimelineStore.getState();
    assert.deepEqual([t.startYear, t.endYear, t.selectedYear], [1947, 1991, null]);
  });

  test("marco que abre cena (pin/busca) guarda o estado anterior; a cena só fecha pelo fechar ou por outra cena (D24)", () => {
    useTimelineStore.setState({ selectedYear: 2001, selectedMilestoneId: null, geologicalMa: null });
    useTimelineStore.getState().selectYear(1969);
    useTimelineStore.getState().selectMilestone("usa-1969");
    assert.equal(useSceneStore.getState().activeSceneId, "glo-1969");
    useSceneStore.getState().closeScene();
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);

    useTimelineStore.getState().selectMilestone("glo-1969");
    assert.equal(useSceneStore.getState().activeSceneId, "glo-1969");
    // Clicar fora (vazio do globo, país, outro botão) desmarca o marco: a cena continua.
    useTimelineStore.getState().selectMilestone(null);
    assert.equal(useSceneStore.getState().activeSceneId, "glo-1969", "desmarcar o marco não fecha a cena");
    // Um marco simples também não interrompe a cena.
    useTimelineStore.getState().selectMilestone("elcano-1522");
    assert.equal(useSceneStore.getState().activeSceneId, "glo-1969", "marco simples não fecha a cena");
    assert.equal(useTimelineStore.getState().selectedMilestoneId, "elcano-1522");
    // Um marco que abre outra cena troca de cena.
    useTimelineStore.getState().selectMilestone("magellan-1519");
    assert.equal(useSceneStore.getState().activeSceneId, "magellan-1519", "outra cena substitui a aberta");
    useSceneStore.getState().closeScene({ restore: false });
    assert.equal(useSceneStore.getState().activeSceneId, null, "o botão de fechar fecha");
  });

  test("link ?cena=<id>: leitura e escrita preservam os outros parâmetros", () => {
    assert.equal(sceneIdFromSearch("?cena=glo-1969&entity=x"), "glo-1969");
    assert.equal(sceneIdFromSearch("?cena="), null);
    assert.equal(searchWithScene("?entity=x", "magellan-1519"), "?entity=x&cena=magellan-1519");
    assert.equal(searchWithScene("?cena=glo-1969&entity=x", null), "?entity=x");
    assert.equal(searchWithScene("?cena=glo-1969", null), "");
    assert.match(read("src/components/shell/GlobeExperienceShell.tsx"), /<SceneLinkSync \/>/);
  });
});

import { execFileSync } from "node:child_process";
import {
  REVIEW_FACT,
  bindingsToDrafts,
  buildSparqlQuery,
  parseWktPoint,
  wikidataTimeToPartial,
  type SparqlBinding,
} from "../src/lib/scenes/wikidata";

describe("D12e: ingestão do Wikidata como rascunhos", () => {
  const fixturePath = path.join(__dirname, "fixtures/wikidata-sparql-sample.json");
  const bindings = (JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as { results: { bindings: SparqlBinding[] } }).results.bindings;
  const run = (extra: Partial<Parameters<typeof bindingsToDrafts>[1]> = {}) =>
    bindingsToDrafts(bindings, { category: "WAR_MILITARY", retrievedAt: "2026-11-21", ...extra });

  test("datas do serviço SPARQL: precisão, sem sinal e ano astronômico para a.C.", () => {
    assert.deepEqual(wikidataTimeToPartial("1916-02-21T00:00:00Z", 11), { date: "1916-02-21", precision: "day" });
    assert.deepEqual(wikidataTimeToPartial("+1916-02-21T00:00:00Z", 10), { date: "1916-02", precision: "month" });
    assert.deepEqual(wikidataTimeToPartial("1918-01-01T00:00:00Z", 9), { date: "1918", precision: "year" });
    assert.deepEqual(wikidataTimeToPartial("1980-01-01T00:00:00Z", 8), { date: "1980", precision: "decade" });
    assert.deepEqual(wikidataTimeToPartial("-0047-08-07T00:00:00Z", 11), { date: "-48-08-07", precision: "day" }, "-0047 astronômico = 48 a.C.");
    assert.deepEqual(wikidataTimeToPartial("0000-01-01T00:00:00Z", 9), { date: "-1", precision: "year" });
    assert.equal(wikidataTimeToPartial("1916-00-00T00:00:00Z", 6), null, "milênio: precisão insuficiente");
    assert.deepEqual(parseWktPoint("Point(5.421944444 49.208055555)"), { lat: 49.2081, lng: 5.4219 });
    assert.equal(parseWktPoint("Point(200 10)"), null);
  });

  test("resposta real vira rascunhos válidos, não publicados, com QID e fontes", () => {
    const { drafts, skipped } = run();
    assert.equal(drafts.length, 9);
    assert.deepEqual(skipped.map((s) => s.qid).sort(), ["Q1048", "Q43642"], "itens sem data (pessoa, ave) são ignorados");
    for (const d of drafts) {
      const parsed = SceneSchema.parse(d);
      assert.equal(parsed.published, false, d.id);
      assert.match(parsed.wikidata ?? "", /^Q\d+$/);
      assert.equal(parsed.sources[0].url, `https://www.wikidata.org/wiki/${parsed.wikidata}`);
      assert.ok(String(parsed.facts?.[REVIEW_FACT]).includes("categoria"), "pendências anotadas");
    }
    const verdun = drafts.find((d) => d.wikidata === "Q130847")!;
    assert.equal(verdun.id, "batalha-de-verdun-1916");
    assert.deepEqual(verdun.date, { start: "1916-02-21", end: "1916-12-18", precision: "day" });
    assert.equal(verdun.country, "FRA");
    assert.deepEqual(verdun.location, { lat: 49.2081, lng: 5.4219 });
    assert.ok(verdun.sources.some((s) => s.url === "https://pt.wikipedia.org/wiki/Batalha_de_Verdun"));

    const przemysl = drafts.find((d) => d.wikidata === "Q16992")!;
    assert.equal(przemysl.date.start, "1918-11-02", "intervalo por dia vence o P585 só com o ano");
    assert.match(String(przemysl.facts?.[REVIEW_FACT]), /título em inglês/);
    assert.match(String(przemysl.facts?.[REVIEW_FACT]), /coordenadas/);

    const farsalos = drafts.find((d) => d.wikidata === "Q203681")!;
    assert.equal(farsalos.id, "batalha-de-farsalos-48ac");
    assert.match(String(farsalos.facts?.[REVIEW_FACT]), /datas divergentes/);
    assert.match(String(farsalos.facts?.[REVIEW_FACT]), /país atual/, "P17 moderno é sinalizado");
  });

  test("não reimporta QID existente e evita colisão de id", () => {
    const { drafts, skipped } = run({ existingQids: ["Q130847"], existingIds: ["batalha-do-somme-1916"] });
    assert.ok(!drafts.some((d) => d.wikidata === "Q130847"));
    assert.ok(skipped.some((s) => s.qid === "Q130847" && /já existe/.test(s.reason)));
    assert.equal(drafts.find((d) => d.wikidata === "Q132568")?.id, "batalha-do-somme-1916-q132568");
  });

  test("consulta SPARQL por QIDs ou por classe e período", () => {
    const byQid = buildSparqlQuery({ qids: ["Q130847", "invalido"] });
    assert.match(byQid, /VALUES \?item \{ wd:Q130847 \}/);
    assert.doesNotMatch(byQid, /LIMIT/);
    const byClass = buildSparqlQuery({ classQid: "Q178561", fromYear: 1914, toYear: 1918, limit: 9999 });
    assert.match(byClass, /wdt:P31 wd:Q178561/);
    assert.match(byClass, /YEAR\(\?when\) >= 1914/);
    assert.match(byClass, /LIMIT 500$/);
    assert.throws(() => buildSparqlQuery({}), /QIDs ou uma classe/);
  });

  test("rascunhos ficam fora do site; cena publicada não tem pendência de revisão", () => {
    const catalog = fs.readFileSync(path.join(__dirname, "../src/lib/scenes/catalog.ts"), "utf-8");
    assert.doesNotMatch(catalog, /drafts/, "o catálogo do cliente não carrega rascunhos");
    for (const s of ALL_SCENES) assert.ok(!(s.facts && REVIEW_FACT in s.facts), `${s.id} publicada com ${REVIEW_FACT}`);
    const draftsFile = path.join(__dirname, "../src/data/scenes/drafts/wikidata.json");
    if (fs.existsSync(draftsFile)) {
      for (const d of parseSceneCollection(JSON.parse(fs.readFileSync(draftsFile, "utf-8")), "drafts/wikidata.json")) {
        assert.equal(d.published, false, `${d.id}: rascunho publicado — mova para uma cena publicada`);
      }
    }
  });

  test("script: --input com resposta salva, --dry-run não grava", () => {
    const draftsFile = path.join(__dirname, "../src/data/scenes/drafts/wikidata.json");
    const before = fs.existsSync(draftsFile) ? fs.readFileSync(draftsFile, "utf-8") : null;
    const out = execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/ingest-wikidata.ts", "--input", fixturePath, "--category", "WAR_MILITARY", "--dry-run"],
      { cwd: path.join(__dirname, ".."), encoding: "utf-8" }
    );
    assert.match(out, /9 rascunho\(s\) novo\(s\), 2 ignorado\(s\)/);
    assert.match(out, /Q130847  batalha-de-verdun-1916|Q130847  ignorado/);
    assert.equal(fs.existsSync(draftsFile) ? fs.readFileSync(draftsFile, "utf-8") : null, before, "dry-run não altera os rascunhos");
  });
});
