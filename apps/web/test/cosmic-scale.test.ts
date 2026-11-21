import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  bodySceneRadius,
  earthSystemScale,
  celestialLabelPriority,
  scaledViewDistance,
  REAL_SCALE_FACTOR,
  RING_RATIOS,
  SUN_CORONA_RATIO,
  SUN_GEOMETRY_RADIUS,
} from "../src/lib/cosmic-scale";
import { resolveLabelCollisions, type LabelBox } from "../src/lib/label-layout";
import { ASTROPHYSICAL_CATALOG, mapDistanceToSceneRadius, calculatePlanetaryPosition, KEPLERIAN_DATA } from "../src/lib/astronomy-planets";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { getScaledBodyViewOffset, cosmicMinDistance } from "../src/components/globe/CosmicCameraController";

const root = path.resolve(__dirname, "..");
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf-8");
const km = (id: keyof typeof ASTROPHYSICAL_CATALOG) => ASTROPHYSICAL_CATALOG[id].equatorialRadiusKm;
const SOLID = ["SUN", "MERCURY", "VENUS", "EARTH", "MOON", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO"] as const;

describe("D11: política única de escala", () => {
  test("modo visual: lei de potência única com a Terra = 1 e o Sol = 7,5 (geometria do SunCore)", () => {
    assert.equal(bodySceneRadius(km("EARTH"), "visual"), 1);
    assert.ok(Math.abs(bodySceneRadius(km("SUN"), "visual") - SUN_GEOMETRY_RADIUS) < 0.1);
    // a ordem de tamanho real é preservada
    const order = [...SOLID].sort((a, b) => km(a) - km(b));
    for (let i = 1; i < order.length; i++) {
      assert.ok(bodySceneRadius(km(order[i]), "visual") > bodySceneRadius(km(order[i - 1]), "visual"), `${order[i]} > ${order[i - 1]}`);
    }
    assert.equal(calculatePlanetaryPosition("JUPITER", 2026).visualRadius, bodySceneRadius(km("JUPITER"), "visual"));
  });

  test("modo real: um único fator — razões de raio iguais às razões reais", () => {
    for (const a of SOLID) {
      const ratio = bodySceneRadius(km(a), "real") / bodySceneRadius(km("EARTH"), "real");
      assert.ok(Math.abs(ratio - km(a) / km("EARTH")) < 1e-9, a);
    }
    assert.equal(earthSystemScale("real"), REAL_SCALE_FACTOR);
    assert.equal(earthSystemScale("visual"), 1, "EarthSphere mantém raio 1 no modo visual");
  });

  test("o Sol (com a coroa) nunca alcança o periélio de Mercúrio na distância comprimida", () => {
    const m = KEPLERIAN_DATA.MERCURY;
    const perihelion = mapDistanceToSceneRadius(m.a0 * (1 - m.e0));
    for (const mode of ["visual", "real"] as const) {
      const corona = bodySceneRadius(km("SUN"), mode) * SUN_CORONA_RATIO;
      assert.ok(corona < perihelion, `${mode}: coroa ${corona.toFixed(2)} < periélio ${perihelion.toFixed(2)}`);
    }
  });

  test("anéis proporcionais ao raio do planeta (Saturno ~1,2–2,3 R)", () => {
    assert.deepEqual(RING_RATIOS.SATURN, [1.22, 2.3]);
    assert.ok(RING_RATIOS.URANUS[1] < RING_RATIOS.SATURN[1]);
    const src = read("src/components/globe/PlanetarySystem.tsx");
    assert.match(src, /radius \* RING_RATIOS\.SATURN\[0\], radius \* RING_RATIOS\.SATURN\[1\]/);
    assert.doesNotMatch(src, /ringInnerRadius \|\|/);
  });

  test("câmera: offset escala com o raio e respeita os mínimos do AGENTS.md", () => {
    assert.deepEqual(getScaledBodyViewOffset("JUPITER", "visual").toArray(), [0, 6.3, 12.6]);
    assert.ok(getScaledBodyViewOffset("EARTH", "real").length() >= 1.5 - 1e-9, "Terra ≥ 1,5");
    assert.ok(getScaledBodyViewOffset("MOON", "real").length() >= 0.4 - 1e-9, "Lua ≥ 0,4");
    const mercury = getScaledBodyViewOffset("MERCURY", "real").length();
    assert.ok(mercury > bodySceneRadius(km("MERCURY"), "real") * 2, "fora do corpo");
    assert.ok(mercury < getScaledBodyViewOffset("MERCURY", "visual").length(), "mais perto no modo real");
    assert.equal(getScaledBodyViewOffset("SUN", "real").length(), getScaledBodyViewOffset("SUN", "visual").length());
    assert.equal(cosmicMinDistance("JUPITER", "visual"), 1.0);
    assert.ok(cosmicMinDistance("MERCURY", "real") < 1.0);
    assert.equal(scaledViewDistance(10, 2, 1, 0.3), 5);
  });

  test("estado: escala visual por padrão, alternável e restaurada no reset", () => {
    const s = useCosmicStore.getState();
    assert.equal(s.scaleMode, "visual");
    s.setScaleMode("real");
    assert.equal(useCosmicStore.getState().scaleMode, "real");
    useCosmicStore.getState().resetCosmicState();
    assert.equal(useCosmicStore.getState().scaleMode, "visual");
  });
});

describe("D11: rótulos únicos com anticolisão", () => {
  const box = (id: string, priority: number, x: number, y: number, onScreen = true): LabelBox => ({ id, priority, x, y, width: 80, height: 20, onScreen });

  test("sobreposição: vence a maior prioridade; separados, ambos aparecem", () => {
    const visible = resolveLabelCollisions([box("lua", 1737, 100, 100), box("terra", 6378, 110, 105), box("marte", 3389, 400, 100)]);
    assert.deepEqual([...visible].sort(), ["marte", "terra"]);
  });

  test("foco e hover passam na frente do tamanho; fora da tela não aparece", () => {
    const focusedMoon = celestialLabelPriority(km("MOON"), { focused: true });
    const visible = resolveLabelCollisions([box("lua", focusedMoon, 100, 100), box("terra", celestialLabelPriority(km("EARTH")), 105, 100), box("x", 1e9, 0, 0, false)]);
    assert.deepEqual([...visible], ["lua"]);
    assert.ok(celestialLabelPriority(5.5, { hovered: true }) > celestialLabelPriority(km("SUN")));
  });

  test("todos os corpos usam o mesmo componente, sem distanceFactor", () => {
    for (const f of ["PlanetarySystem.tsx", "SunCore.tsx", "OrbitingMoon.tsx", "CometHalleyTrajectory.tsx"]) {
      const src = read(`src/components/globe/${f}`);
      assert.match(src, /<CelestialLabel\b/, `${f} usa CelestialLabel`);
      assert.match(src, /celestialLabelPriority\(/, `${f} usa a prioridade comum`);
      assert.doesNotMatch(src, /distanceFactor/, `${f} sem distanceFactor`);
    }
    for (const f of ["PlanetarySystem.tsx", "SunCore.tsx", "OrbitingMoon.tsx"]) {
      assert.match(read(`src/components/globe/${f}`), /bodySceneRadius\(/, `${f} usa a política de raio`);
    }
    assert.match(read("src/components/globe/GlobeCanvas.tsx"), /<CelestialLabelManager \/>/);
    assert.match(read("src/components/globe/GlobeCanvas.tsx"), /<group position=\{earthPosition\} scale=\{earthGroupScale\}>/);
  });

  test("invariante: a Terra não é desenhada pelo PlanetarySystem (desduplicação)", () => {
    assert.match(read("src/components/globe/PlanetarySystem.tsx"), /\{id !== "EARTH" && \(/);
  });

  test("escala documentada em ARCHITECTURE.md", () => {
    const doc = read("../../docs/ARCHITECTURE.md");
    assert.match(doc, /Política de escala do modo Cosmos/);
    assert.match(doc, /mapDistanceToSceneRadius/);
    assert.match(doc, /0,43/);
    assert.match(doc, /CelestialLabel/);
  });
});
