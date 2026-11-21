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
import { ALL_SCENES, SCENE_SOURCES, getScene, globalMilestones } from "../src/lib/scenes/catalog";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES } from "../src/lib/country-data";
import { HISTORICAL_ROUTES } from "../src/lib/historical-routes";
import { APOLLO11_PHASES, CAPE_CANAVERAL_COORDS, TRANQUILITY_BASE_COORDS } from "../src/lib/apollo11";

describe("D12b: migração sem perda para cenas", () => {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/pre-d12b-events.json"), "utf-8"));

  test("os 28 marcos globais e os 17 dos países, idênticos aos anteriores", () => {
    assert.equal(GLOBAL_MILESTONES.length, 28);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(GLOBAL_MILESTONES)), before.global);
    for (const [iso, list] of Object.entries(before.pilot)) {
      assert.deepStrictEqual(JSON.parse(JSON.stringify(PILOT_COUNTRIES[iso].milestones)), list, iso);
    }
    assert.equal(Object.values(PILOT_COUNTRIES).reduce((n, c) => n + c.milestones.length, 0), 17);
  });

  test("Magalhães: rota completa (frota, 17 pontos, diário, citações, dossiê) idêntica", () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(HISTORICAL_ROUTES["magellan-1519"])), before.magellan);
    const scene = getScene("magellan-1519")!;
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
    assert.deepStrictEqual(JSON.parse(JSON.stringify(ALL_SCENES)), JSON.parse(JSON.stringify(parsed)));
    const catalog = fs.readFileSync(path.join(__dirname, "../src/lib/scenes/catalog.ts"), "utf-8");
    assert.doesNotMatch(catalog, /from "zod"|import \{[^}]*\} from "\.\/schema"/, "zod fora do bundle do cliente");
  });

  test("catálogo: 45 cenas publicadas, todas com fonte, ids únicos, ordem cronológica dos globais", () => {
    assert.equal(ALL_SCENES.length, 45);
    assert.ok(ALL_SCENES.every((s) => s.sources.length > 0 && s.sources[0].label.length > 1));
    assert.equal(new Set(ALL_SCENES.map((s) => s.id)).size, 45);
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
