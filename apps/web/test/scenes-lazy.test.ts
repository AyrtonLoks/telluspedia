import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SceneSchema, parseSceneCollection, type Scene } from "../src/lib/scenes/schema";
import { LAZY_DETAIL_FILES, LAZY_SCENE_FILES } from "../src/lib/scenes/lazy-files";
import { HEAVY_SCENE_FIELDS } from "../src/lib/scenes/catalog-utils";
import {
  DETAIL_SCENE_IDS,
  LAZY_SCENE_IDS,
  PUBLISHED_SCENES,
  getScene,
  globalMilestones,
  isPlayableScene,
  isSceneLoaded,
  loadScene,
  sceneHasTrajectoryKind,
  sceneOpenedBy,
  useSceneDataVersion,
} from "../src/lib/scenes/catalog";
import { buildSceneIndex } from "../scripts/scenes-build-index";
import { useSceneStore } from "../src/stores/sceneStore";
import { ScenePlayerOverlay, fmtPartialDate } from "../src/components/scenes/ScenePlayerOverlay";
import { sceneIdFromSearch } from "../src/components/scenes/SceneLinkSync";

const DIR = path.join(__dirname, "../src/data/scenes");
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
const idOf = (file: string) => file.replace(/(\.details)?\.json$/, "");
const NEW_SCENES = ["polo-1271", "gama-1497", "glo-1914", "glo-1939", "glo-1989"];

describe("D24 — cenas sob demanda: dados", () => {
  test("cada cena sob demanda passa no schema completo (Zod)", () => {
    const parsed = parseSceneCollection(LAZY_SCENE_FILES.map(read), "lazy");
    assert.deepEqual(parsed.map((s) => s.id).sort(), [...NEW_SCENES].sort());
  });

  test("os detalhes à parte completam a cena do bundle e passam no schema", () => {
    for (const file of LAZY_DETAIL_FILES) {
      const id = idOf(file);
      const core = read(`${id}.json`);
      const details = read(file);
      assert.deepEqual(Object.keys(details).filter((k) => !(HEAVY_SCENE_FIELDS as readonly string[]).includes(k)), [], "só campos pesados");
      const merged = SceneSchema.parse({ ...core, ...details });
      assert.ok(merged.participants.length >= 5 && merged.chronicle.length >= 8, `${id}: participantes e crônica`);
    }
  });

  test("o índice leve está em sincronia com os arquivos (rode scripts/scenes-build-index.ts)", () => {
    assert.deepStrictEqual(read("scene-index.json"), JSON.parse(JSON.stringify(buildSceneIndex(DIR))));
    for (const entry of read("scene-index.json")) {
      for (const heavy of HEAVY_SCENE_FIELDS) assert.ok(!(heavy in entry), `${entry.id}: ${heavy} fora do índice`);
      assert.equal(entry.sources.length, 1, `${entry.id}: só a fonte da linha do tempo no índice`);
    }
  });

  test("lista de arquivos, carregadores do catálogo e disco batem", () => {
    assert.deepEqual([...LAZY_SCENE_IDS].sort(), LAZY_SCENE_FILES.map(idOf).sort());
    assert.deepEqual([...DETAIL_SCENE_IDS].sort(), LAZY_DETAIL_FILES.map(idOf).sort());
    for (const f of [...LAZY_SCENE_FILES, ...LAZY_DETAIL_FILES]) assert.ok(fs.existsSync(path.join(DIR, f)), f);
  });

  test("as cenas promovidas não ficam duplicadas no milestones.json", () => {
    const ids = read("milestones.json").map((m: { id: string }) => m.id);
    for (const id of NEW_SCENES) assert.ok(!ids.includes(id), id);
  });

  test("cena sob demanda não pode ter trajetória Terra–Lua (o relógio astronômico precisa dela de imediato)", () => {
    for (const file of LAZY_SCENE_FILES) {
      assert.ok(read(file).trajectories.every((t: { kind: string }) => t.kind !== "cislunar"), file);
    }
  });

  test("datas coerentes: passos e crônica dentro do período da cena", () => {
    for (const file of LAZY_SCENE_FILES) {
      const s = SceneSchema.parse(read(file));
      const from = parseInt(s.date.start, 10) - 1;
      const to = parseInt(s.date.end ?? s.date.start, 10) + 1;
      for (const t of s.trajectories) {
        if (t.kind !== "surface") continue;
        for (const p of t.points) {
          const y = new Date(p.time).getUTCFullYear();
          assert.ok(y >= from && y <= to, `${s.id}/${p.id}: ${p.time}`);
        }
      }
      for (const c of s.chronicle) {
        const y = parseInt(c.date, 10);
        assert.ok(y >= from && y <= to + 4, `${s.id} crônica ${c.date}`);
      }
    }
  });
});

describe("D24 — carga sob demanda: comportamento", () => {
  test("antes de carregar: a cena do índice já é tocável, aparece na timeline e abre por marco", () => {
    const gama = getScene("gama-1497")!;
    assert.equal(isSceneLoaded("gama-1497"), false);
    assert.equal(gama.trajectories.length, 0);
    assert.equal(gama.hud, undefined, "HUD também chega sob demanda");
    assert.ok(isPlayableScene(gama));
    assert.ok(sceneHasTrajectoryKind("gama-1497", "surface"));
    assert.ok(globalMilestones().some((m) => m.id === "gama-1497" && m.year === 1497));
    assert.equal(sceneOpenedBy("deu-1989")?.id, "glo-1989", "o marco nacional abre a cena do Muro");
    assert.equal(sceneIdFromSearch("?cena=polo-1271"), "polo-1271");
  });

  test("abrir uma cena sob demanda: o painel mostra um esqueleto e, carregada, o player completo", async () => {
    const before = useSceneDataVersion.getState().version;
    assert.equal(useSceneStore.getState().openScene("glo-1914"), true);
    const loading = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1914" }));
    assert.match(loading, /scene-player-overlay-loading/);
    assert.match(loading, /aria-busy="true"/);

    const full = (await loadScene("glo-1914")) as Scene;
    assert.ok(isSceneLoaded("glo-1914"));
    assert.ok(useSceneDataVersion.getState().version > before, "componentes re-renderizam");
    assert.equal(getScene("glo-1914"), full);
    assert.equal(PUBLISHED_SCENES.find((s) => s.id === "glo-1914"), full, "catálogo atualizado no lugar");
    assert.ok(full.trajectories[0].kind === "surface" && full.trajectories[0].points.length >= 10);

    useSceneStore.getState().jumpToStep(14);
    const html = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1914" }));
    for (const s of ["GRANDE GUERRA", "Clareira do Armistício", "Frente", "Participantes", "Crônica", "Potências Centrais", "Imperial War Museum"]) {
      assert.ok(html.includes(s), s);
    }
    useSceneStore.getState().closeScene({ restore: false });
  });

  test("carregar duas vezes reaproveita a mesma carga", async () => {
    const [a, b] = await Promise.all([loadScene("polo-1271"), loadScene("polo-1271")]);
    assert.equal(a, b);
    assert.equal(await loadScene("cena-inexistente"), undefined);
  });

  test("Apollo 11: o painel aparece na hora e a crônica chega depois", async () => {
    useSceneStore.getState().openScene("glo-1969");
    const first = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1969" }));
    assert.match(first, /APOLLO 11/);
    assert.doesNotMatch(first, /scene-player-overlay-loading/);
    await loadScene("glo-1969");
    const apollo = getScene("glo-1969")!;
    assert.ok(apollo.trajectories.length === 1 && apollo.chronicle.length >= 8, "detalhes mesclados sem perder a trajetória");
    assert.ok(apollo.participants.some((p) => p.name.startsWith("Neil A. Armstrong")));
    const html = renderToStaticMarkup(React.createElement(ScenePlayerOverlay, { sceneId: "glo-1969" }));
    assert.match(html, /scene-chronicle/);
    useSceneStore.getState().closeScene({ restore: false });
  });

  test("critério de aceite: ≥ 7 cenas completas, com fontes auditáveis", async () => {
    await Promise.all([...LAZY_SCENE_IDS, ...DETAIL_SCENE_IDS].map((id) => loadScene(id)));
    const complete = PUBLISHED_SCENES.filter((s) => s.trajectories.length > 0 && s.participants.length > 0 && s.chronicle.length > 0 && s.hud);
    assert.ok(complete.length >= 7, `${complete.length}: ${complete.map((s) => s.id).join(", ")}`);
    // Auditável: um link ou uma referência bibliográfica completa (autor, título e ano).
    const auditable = (src: Scene["sources"][number]) => Boolean(src.url?.startsWith("https://") || (src.authors && src.title && src.year));
    for (const s of complete) assert.ok(s.sources.some(auditable), `${s.id}: ao menos uma fonte auditável`);
    for (const id of NEW_SCENES) assert.ok(getScene(id)!.sources.filter((src) => src.url?.startsWith("https://")).length >= 1, `${id}: fonte com link`);
  });
});

describe("D24 — bundle e painel", () => {
  test("o catálogo só importa as cenas grandes por import() dinâmico", () => {
    const catalog = fs.readFileSync(path.join(__dirname, "../src/lib/scenes/catalog.ts"), "utf-8").replace(/\r\n/g, "\n");
    for (const f of [...LAZY_SCENE_FILES, ...LAZY_DETAIL_FILES]) {
      assert.doesNotMatch(catalog, new RegExp(`^import .*${f.replace(/\./g, "\\.")}`, "m"), `${f} não pode ser import estático`);
      assert.match(catalog, new RegExp(`import\\("\\.\\./\\.\\./data/scenes/${f.replace(/\./g, "\\.")}"\\)`), `${f} por import()`);
    }
  });

  test("datas parciais formatadas no padrão brasileiro", () => {
    assert.equal(fmtPartialDate("1498-05-20"), "20/05/1498");
    assert.equal(fmtPartialDate("1271-06"), "06/1271");
    assert.equal(fmtPartialDate("1295"), "1295");
  });
});

describe("D24 — camada de superfície genérica", () => {
  test("destaques vêm dos dados e a câmera inicial da cena é aplicada ao abrir", () => {
    const layer = fs.readFileSync(path.join(__dirname, "../src/components/scenes/SurfaceTrajectoryLayer.tsx"), "utf-8").replace(/\r\n/g, "\n");
    assert.doesNotMatch(layer, /index === 3 \|\||Guanabara|Mactan|Tidore/, "sem índices da Magalhães no código");
    assert.match(layer, /facts\?\.highlight === 1/);
    assert.match(layer, /getScene\(sceneId\)\?\.camera/);
    for (const file of ["magellan-1519.json", ...LAZY_SCENE_FILES]) {
      const points = read(file).trajectories[0].points as Array<{ facts?: { highlight?: number } }>;
      const n = points.filter((p) => p.facts?.highlight === 1).length;
      assert.ok(n >= 4 && n <= 6, `${file}: ${n} destaques`);
    }
  });
});

describe("D24 — o player aberto por um marco não fecha ao ser usado", () => {
  test("o clique fora do pino poupa o painel do player (inclusive o esqueleto)", () => {
    const pin = fs.readFileSync(path.join(__dirname, "../src/components/timeline/MilestonePin.tsx"), "utf-8").replace(/\r\n/g, "\n");
    assert.match(pin, /closest\("\[data-scene-player-overlay\]"\)/);
    const overlay = fs.readFileSync(path.join(__dirname, "../src/components/scenes/ScenePlayerOverlay.tsx"), "utf-8").replace(/\r\n/g, "\n");
    assert.equal((overlay.match(/data-scene-player-overlay="true"/g) ?? []).length, 2, "painel e esqueleto marcados");
  });
});

describe("D24 — arrastar o globo não é clique", () => {
  test("tolerância de arraste e onde ela é aplicada", async () => {
    const { isDragRelease, CLICK_DRAG_TOLERANCE_PX } = await import("../src/lib/pointer-intent");
    assert.equal(isDragRelease({ delta: 0 }), false);
    assert.equal(isDragRelease({ delta: CLICK_DRAG_TOLERANCE_PX }), false);
    assert.equal(isDragRelease({ delta: CLICK_DRAG_TOLERANCE_PX + 1 }), true);
    assert.equal(isDragRelease({}), false);
    const src = (f: string) => fs.readFileSync(path.join(__dirname, "../src/components", f), "utf-8").replace(/\r\n/g, "\n");
    assert.match(src("globe/EarthSphere.tsx"), /handleClick = \(e: ThreeEvent<MouseEvent>\) => \{\n    e\.stopPropagation\(\);\n[^\n]*\n    if \(isDragRelease\(e\)\) return;/, "país só por clique de verdade");
    assert.match(src("scenes/SurfaceTrajectoryLayer.tsx"), /if \(isDragRelease\(e\)\) return;/);
    assert.match(src("timeline/MilestonePin.tsx"), /if \(target\.closest\("canvas"\)\) return;/, "clique fora do pino ignora o globo (o R3F decide)");
  });
});

describe("D24 — cartão do marco não cobre o player", () => {
  test("com a cena do marco aberta, o cartão fixo do pino é escondido", () => {
    const pin = fs.readFileSync(path.join(__dirname, "../src/components/timeline/MilestonePin.tsx"), "utf-8").replace(/\r\n/g, "\n");
    assert.match(pin, /const showCard = isSelected && !playingHere;/);
    assert.match(pin, /showCard\n\s*\? "pointer-events-auto z-50/);
    assert.match(pin, /const hideOnHover = playingHere \|\| hoverSuppressed;/, "nem no hover, com a cena aberta");
    assert.match(pin, /selectMilestone\(null\);\n\s*setHoverSuppressed\(true\);/, "o X do cartão fecha de verdade");
    assert.match(pin, /onMouseLeave=\{\(\) => setHoverSuppressed\(false\)\}/);
  });
});

describe("D24 — arrastar não é clique também no Cosmos e no Observatório", () => {
  test("todo clique 3D que seleciona algo exige clique de verdade", () => {
    const G = (f: string) => fs.readFileSync(path.join(__dirname, "../src/components/globe", f), "utf-8");
    const expected: Record<string, number> = {
      // Observatório
      "AirTrafficLayer.tsx": 2,
      "VesselFleet.tsx": 2,
      "MaritimeRoutesLayer.tsx": 1,
      "NasaEonetLayer.tsx": 1,
      "NasaFirmsLayer.tsx": 1,
      "IssOrbitLayer.tsx": 2,
      // Cosmos (o segundo clique do Halley é a etiqueta HTML, fora do canvas)
      "PlanetarySystem.tsx": 1,
      "SunCore.tsx": 1,
      "OrbitingMoon.tsx": 1,
      "CometHalleyTrajectory.tsx": 1,
      // Globo
      "EarthSphere.tsx": 1,
    };
    for (const [file, n] of Object.entries(expected)) {
      const src = G(file);
      assert.equal((src.match(/if \(isDragRelease\((?:e|event)\)\) return;/g) ?? []).length, n, file);
      assert.match(src, /import \{ isDragRelease \} from "@\/lib\/pointer-intent";/, `${file}: import`);
    }
  });
});
