import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import * as THREE from "three";
import { renderToStaticMarkup } from "react-dom/server";

import {
  YEAR_ONLY_REFERENCE_DAY_UTC,
  YEAR_ONLY_REFERENCE_HOUR_UTC,
  YEAR_ONLY_REFERENCE_MONTH_UTC,
} from "../src/lib/astronomy";
import {
  SUN_LIGHT_DISTANCE,
  computeSunDirection,
  getSunDirection,
  setSolarClockOverrideForTest,
  tickSolarClock,
  useSunDirection,
} from "../src/lib/epoch/useSunDirection";
import { useTimelineStore } from "../src/stores/timelineStore";

function resetTimelineToPresent() {
  useTimelineStore.setState({
    startYear: 1974,
    endYear: 2024,
    selectedYear: null,
    selectedMilestoneId: null,
    geologicalMa: null,
  });
}

describe("T14 · Fonte única de direção solar (useSunDirection, relógio compartilhado e invalidate)", () => {
  test("1. Mesma data gera vetor estritamente idêntico entre luz direcional e shader (consumidores)", () => {
    const fixedDate = new Date("2026-03-20T15:30:00Z");

    const lightConsumer = computeSunDirection({
      effectiveYear: null,
      selectedMilestoneId: null,
      activeScene: null,
      now: fixedDate,
    });
    const shaderConsumer = computeSunDirection({
      effectiveYear: null,
      selectedMilestoneId: null,
      activeScene: null,
      now: fixedDate,
    });

    const lightDir = new THREE.Vector3(...lightConsumer.lightPosition).normalize();
    assert.equal(lightConsumer.timestamp, shaderConsumer.timestamp);
    assert.ok(
      lightDir.distanceTo(shaderConsumer.direction) < 1e-12,
      `Luz direcional e uSunDirection devem coincidir exatamente (diff=${lightDir.distanceTo(shaderConsumer.direction)})`
    );
    assert.ok(
      Math.abs(new THREE.Vector3(...lightConsumer.lightPosition).length() - SUN_LIGHT_DISTANCE) < 1e-9,
      "Distância da luz direcional deve ser SUN_LIGHT_DISTANCE"
    );
  });

  test("2. Após 10+ minutos com a aba aberta, luz direcional e terminador avançam juntos sem divergência", () => {
    const t0 = Date.UTC(2026, 4, 15, 12, 0, 0);
    const t15Min = t0 + 15 * 60 * 1000;
    const t2Hours = t0 + 120 * 60 * 1000;

    try {
      resetTimelineToPresent();

      const LightProbe: React.FC = () => {
        const sun = useSunDirection();
        const norm = new THREE.Vector3(...sun.lightPosition).normalize();
        return React.createElement("span", {
          "data-consumer": "light",
          "data-ts": sun.timestamp,
          "data-vec": `${norm.x.toFixed(6)},${norm.y.toFixed(6)},${norm.z.toFixed(6)}`,
        });
      };

      const ShaderProbe: React.FC = () => {
        const sun = useSunDirection();
        return React.createElement("span", {
          "data-consumer": "shader",
          "data-ts": sun.timestamp,
          "data-vec": `${sun.direction.x.toFixed(6)},${sun.direction.y.toFixed(6)},${sun.direction.z.toFixed(6)}`,
        });
      };

      const extract = (html: string) => {
        const lightVec = html.match(/data-consumer="light"[^>]*data-vec="([^"]+)"/)?.[1];
        const shaderVec = html.match(/data-consumer="shader"[^>]*data-vec="([^"]+)"/)?.[1];
        const lightTs = html.match(/data-consumer="light"[^>]*data-ts="([^"]+)"/)?.[1];
        const shaderTs = html.match(/data-consumer="shader"[^>]*data-ts="([^"]+)"/)?.[1];
        return { lightVec, shaderVec, lightTs, shaderTs };
      };

      setSolarClockOverrideForTest(t0);
      const html0 = renderToStaticMarkup(
        React.createElement("div", null, React.createElement(LightProbe), React.createElement(ShaderProbe))
      );
      const r0 = extract(html0);
      assert.ok(r0.lightVec && r0.shaderVec);
      assert.equal(r0.lightVec, r0.shaderVec, "Em t0, luz e shader devem ter o mesmo vetor");
      assert.equal(r0.lightTs, r0.shaderTs);

      // Avançar 15 minutos (> 10 min exigidos pelo critério de aceite)
      setSolarClockOverrideForTest(t15Min);
      tickSolarClock(t15Min);
      const html15 = renderToStaticMarkup(
        React.createElement("div", null, React.createElement(LightProbe), React.createElement(ShaderProbe))
      );
      const r15 = extract(html15);
      assert.equal(r15.lightVec, r15.shaderVec, "Após 15 minutos, luz e shader devem continuar idênticos");
      assert.equal(r15.lightTs, r15.shaderTs);
      assert.notEqual(r15.lightVec, r0.lightVec, "Após 15 minutos, o Sol deve ter se movido (~3,75°)");

      // Avançar 2 horas (~30° de rotação terrestre)
      setSolarClockOverrideForTest(t2Hours);
      const sun0 = getSunDirection(new Date(t0));
      const sun2h = getSunDirection(new Date(t2Hours));
      const lngDelta = Math.abs(sun2h.subsolar.longitude - sun0.subsolar.longitude);
      assert.ok(lngDelta > 28 && lngDelta < 32, `Em 2 horas a longitude subsolar deve variar ~30° (obteve ${lngDelta}°)`);
    } finally {
      setSolarClockOverrideForTest(null);
      resetTimelineToPresent();
    }
  });

  test("3. Convenção de data para anos sem data exata (21/jun 12:00 UTC) e precedência de marcos/Apollo 11", () => {
    assert.equal(YEAR_ONLY_REFERENCE_MONTH_UTC, 5);
    assert.equal(YEAR_ONLY_REFERENCE_DAY_UTC, 21);
    assert.equal(YEAR_ONLY_REFERENCE_HOUR_UTC, 12);

    const year1914 = computeSunDirection({
      effectiveYear: 1914,
      selectedMilestoneId: null,
      activeScene: null,
      now: new Date("2026-11-20T18:00:00Z"),
    });
    assert.equal(year1914.timestamp, "1914-06-21T12:00:00.000Z");
    assert.equal(year1914.isLiveClock, false);

    // Cena Apollo 11 tem precedência sobre exactDate sem hora ("1969-07-20")
    const apollo = computeSunDirection({
      effectiveYear: 1969,
      selectedMilestoneId: "usa-1969",
      activeScene: "APOLLO11",
      now: new Date("2026-11-20T18:00:00Z"),
    });
    assert.equal(apollo.timestamp, "1969-07-20T20:17:40.000Z");
    assert.equal(apollo.isLiveClock, false);

    // Presente contemporâneo usa relógio vivo
    const present = computeSunDirection({
      effectiveYear: null,
      selectedMilestoneId: null,
      activeScene: null,
      now: new Date("2026-11-20T18:05:00Z"),
    });
    assert.equal(present.timestamp, "2026-11-20T18:05:00.000Z");
    assert.equal(present.isLiveClock, true);
  });

  test("4. Guardrails arquiteturais: fonte única, invalidate() em frameloop=demand, normais world-space e documentação", () => {
    const root = path.resolve(__dirname, "..");
    const globeCanvas = fs.readFileSync(path.join(root, "src/components/globe/GlobeCanvas.tsx"), "utf-8");
    const earthSphere = fs.readFileSync(path.join(root, "src/components/globe/EarthSphere.tsx"), "utf-8");
    const orbitingMoon = fs.readFileSync(path.join(root, "src/components/globe/OrbitingMoon.tsx"), "utf-8");
    const earthShader = fs.readFileSync(path.join(root, "src/components/globe/EarthShaderMaterial.ts"), "utf-8");
    const archDoc = fs.readFileSync(path.resolve(root, "../../docs/ARCHITECTURE.md"), "utf-8");

    // Todos os 3 consumidores 3D usam useSunDirection e invalidam o canvas (frameloop="demand")
    for (const [name, src] of [
      ["GlobeCanvas.tsx", globeCanvas],
      ["EarthSphere.tsx", earthSphere],
      ["OrbitingMoon.tsx", orbitingMoon],
    ] as const) {
      assert.match(src, /useSunDirection/, `${name} deve consumir useSunDirection()`);
      assert.match(src, /invalidate\(\)/, `${name} deve invocar invalidate() ao atualizar a direção solar`);
      assert.doesNotMatch(src, /calculateSubsolarPoint/, `${name} não deve recalcular calculateSubsolarPoint localmente`);
      assert.doesNotMatch(src, /setInterval\(/, `${name} não deve manter setInterval solar próprio`);
    }

    // SolarDirectionalLight também re-invalida ao sair do Modo Leitura (isThrottled)
    assert.match(globeCanvas, /isThrottled[\s\S]*invalidate\(\)/);

    // Invariante AGENTS.md §1: normais em espaço mundial preservadas
    assert.match(earthShader, /modelMatrix\s*\*\s*vec4\(normal,\s*0\.0\)/);
    assert.match(orbitingMoon, /modelMatrix\s*\*\s*vec4\(normal,\s*0\.0\)/);

    // Convenção de data documentada em docs/ARCHITECTURE.md
    assert.match(archDoc, /useSunDirection/);
    assert.match(archDoc, /21 de junho.*12:00 UTC/);
  });
});
