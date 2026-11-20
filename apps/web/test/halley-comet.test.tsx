import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import * as THREE from "three";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HALLEY_TAIL_ACTIVATION_AU,
  calculateHalleyPosition,
  calculatePlanetaryPosition,
  generateHalleyOrbitalPath,
  solveKeplerEquation,
} from "../src/lib/astronomy-planets";
import {
  buildDustTailGeometry,
  buildIonTailGeometry,
  createRadialFalloffTexture,
} from "../src/components/globe/CometHalleyTrajectory";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useTimelineStore } from "../src/stores/timelineStore";

describe("D10 · Cometa 1P/Halley: distância real, anomalia normalizada, coma e cauda dupla", () => {
  test("1. Distância Terra-Halley em 1986-04-11 bate com JPL Horizons (~0.42 UA)", () => {
    const closeApproach1986 = new Date(Date.UTC(1986, 3, 11, 0, 0, 0));
    const halley = calculateHalleyPosition(closeApproach1986);
    const earth = calculatePlanetaryPosition("EARTH", closeApproach1986);

    // Conferir cálculo vetorial exato |r_comet - r_Earth|
    const dx = halley.heliocentricAu.x - earth.heliocentricAu.x;
    const dy = halley.heliocentricAu.y - earth.heliocentricAu.y;
    const dz = halley.heliocentricAu.z - earth.heliocentricAu.z;
    const expectedDistAu = Math.sqrt(dx * dx + dy * dy + dz * dz);

    assert.ok(
      Math.abs(halley.distanceEarthAu - expectedDistAu) < 1e-3,
      `distanceEarthAu (${halley.distanceEarthAu}) deve igualar |r_comet - r_Earth| (${expectedDistAu})`
    );

    // Referência JPL Horizons para aproximação máxima de 1986-04-11: ~0.417 UA (~0.42 UA)
    assert.ok(
      Math.abs(halley.distanceEarthAu - 0.42) <= 0.03,
      `Em 1986-04-11 a distância Terra-Halley deve ser ~0.42 UA (obteve ${halley.distanceEarthAu} UA)`
    );

    // Não pode mais usar a aproximação errada |distanceSunAu - 1.0| (~0.33 UA)
    const brokenApprox = Math.abs(halley.distanceSunAu - 1.0);
    assert.ok(
      Math.abs(halley.distanceEarthAu - brokenApprox) > 0.05,
      "Distância à Terra deve usar diferença vetorial 3D, não |r_Sol - 1|"
    );
  });

  test("2. Anomalia média M normalizada estritamente em [0, 2π) para épocas anteriores e posteriores a 1986", () => {
    const epochs = [1835.8, 1910.3, 1950.0, 1985.95, 1986.1081, 2000.0, 2026.5, 2061.58];
    const TWO_PI = 2 * Math.PI;

    for (const yr of epochs) {
      const h = calculateHalleyPosition(yr);
      assert.ok(
        h.meanAnomalyRad >= 0 && h.meanAnomalyRad < TWO_PI,
        `M fora de [0, 2π) no ano ${yr}: ${h.meanAnomalyRad}`
      );
      assert.ok(!Object.is(h.meanAnomalyRad, -0), `M não deve ser -0 no ano ${yr}`);

      const E = solveKeplerEquation(h.meanAnomalyRad, 0.9671429);
      let normalizedM = h.meanAnomalyRad;
      if (normalizedM > Math.PI) normalizedM -= TWO_PI;
      const residual = Math.abs(E - 0.9671429 * Math.sin(E) - normalizedM);
      assert.ok(residual < 1e-10, `Resíduo de Kepler alto (${residual}) no ano ${yr}`);
    }
  });

  test("3. Em 2026 (~35 UA): sem cauda, núcleo e coma discretos", () => {
    const halley2026 = calculateHalleyPosition(new Date(Date.UTC(2026, 5, 1)));

    assert.ok(
      halley2026.distanceSunAu > 34 && halley2026.distanceSunAu < 36,
      `Em 2026 Halley deve estar próximo de 35 UA (obteve ${halley2026.distanceSunAu})`
    );
    assert.equal(halley2026.hasTail, false, "Em 2026 (~35 UA) Halley não pode ter cauda");
    assert.equal(halley2026.activityFactor, 0);
    assert.equal(halley2026.tailLength, 0);
    assert.equal(halley2026.tailOpacity, 0);
    assert.equal(halley2026.dustTailLength, 0);
    assert.equal(halley2026.dustTailOpacity, 0);
    assert.equal(halley2026.isPerihelionPassage, false);
    assert.ok(halley2026.comaRadius <= 0.25, `Coma em 2026 deve ser discreta (${halley2026.comaRadius})`);
    assert.ok(halley2026.comaOpacity <= 0.25, `Opacidade da coma em 2026 deve ser discreta (${halley2026.comaOpacity})`);
  });

  test("4. No periélio (1986-02): cauda dupla ativa apontando contra o Sol e crescendo ao aproximar", () => {
    const perihelion1986 = calculateHalleyPosition(new Date(Date.UTC(1986, 1, 9, 11, 0, 0)));
    const midApproach = calculateHalleyPosition(new Date(Date.UTC(1985, 8, 15))); // ~2.5 UA
    const inactiveBoundary = calculateHalleyPosition(new Date(Date.UTC(1985, 0, 1))); // > 4.5 UA

    assert.ok(perihelion1986.distanceSunAu < 0.65, `Periélio ~0.586 UA (obteve ${perihelion1986.distanceSunAu})`);
    assert.equal(perihelion1986.hasTail, true);
    assert.equal(perihelion1986.isPerihelionPassage, true);
    assert.ok(perihelion1986.tailLength > 12);
    assert.ok(perihelion1986.dustTailLength > 8);
    assert.ok(perihelion1986.comaRadius > 1.0);

    // Cauda iônica aponta estritamente na direção anti-solar
    const antiSolarDot = perihelion1986.tailDirection.dot(
      perihelion1986.scenePosition.clone().normalize()
    );
    assert.ok(Math.abs(antiSolarDot - 1.0) < 1e-4, "tailDirection deve ser anti-solar");
    assert.ok(
      Math.abs(perihelion1986.orbitalVelocityDirection.length() - 1.0) < 1e-4,
      "orbitalVelocityDirection deve ser unitário"
    );

    // Crescimento monotônico conforme se aproxima do Sol
    assert.ok(inactiveBoundary.distanceSunAu >= HALLEY_TAIL_ACTIVATION_AU);
    assert.equal(inactiveBoundary.hasTail, false);
    assert.equal(midApproach.hasTail, true);
    assert.ok(midApproach.tailLength > 0 && midApproach.tailLength < perihelion1986.tailLength);
    assert.ok(midApproach.dustTailLength > 0 && midApproach.dustTailLength < perihelion1986.dustTailLength);
    assert.ok(midApproach.comaRadius > inactiveBoundary.comaRadius);
    assert.ok(perihelion1986.comaRadius > midApproach.comaRadius);
  });

  test("5. Textura radial da coma e geometrias da cauda iônica (reta/azulada) e de poeira (curvada/amarelada)", () => {
    const tex = createRadialFalloffTexture(33);
    const data = tex.image.data as Uint8Array;
    const centerIdx = (16 * 33 + 16) * 4;
    const cornerIdx = 0;
    assert.equal(data[centerIdx + 3], 255, "Centro exato da textura radial deve ter alpha 255");
    assert.equal(data[cornerIdx + 3], 0, "Canto da textura radial deve ser transparente");
    tex.dispose();

    const halley = calculateHalleyPosition(new Date(Date.UTC(1986, 1, 9, 11, 0, 0)));

    const ionGeo = buildIonTailGeometry(halley.tailDirection, halley.tailLength, 120);
    const ionPos = ionGeo.getAttribute("position") as THREE.BufferAttribute;
    const ionCol = ionGeo.getAttribute("color") as THREE.BufferAttribute;
    let ionRedSum = 0;
    let ionBlueSum = 0;
    for (let i = 0; i < ionPos.count; i++) {
      const p = new THREE.Vector3(ionPos.getX(i), ionPos.getY(i), ionPos.getZ(i));
      const proj = p.dot(halley.tailDirection);
      assert.ok(proj > 0, "Partícula da cauda iônica deve estender-se na direção anti-solar");
      ionRedSum += ionCol.getX(i);
      ionBlueSum += ionCol.getZ(i);
    }
    assert.ok(ionBlueSum > ionRedSum, "Cauda iônica deve ter tonalidade azulada (B > R)");
    ionGeo.dispose();

    const dustGeo = buildDustTailGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength,
      140
    );
    const dustPos = dustGeo.getAttribute("position") as THREE.BufferAttribute;
    const dustCol = dustGeo.getAttribute("color") as THREE.BufferAttribute;
    const antiSolar = halley.tailDirection.clone().normalize();
    const trailing = halley.orbitalVelocityDirection.clone().normalize().negate();
    const curveDir = trailing.clone().addScaledVector(antiSolar, -trailing.dot(antiSolar)).normalize();

    let nearCurveSum = 0;
    let nearCount = 0;
    let farCurveSum = 0;
    let farCount = 0;
    let dustRedSum = 0;
    let dustBlueSum = 0;

    for (let i = 0; i < dustPos.count; i++) {
      const p = new THREE.Vector3(dustPos.getX(i), dustPos.getY(i), dustPos.getZ(i));
      const along = p.dot(antiSolar);
      const curve = p.dot(curveDir);
      assert.ok(along > 0, "Cauda de poeira deve projetar-se na direção anti-solar");
      if (along < halley.dustTailLength * 0.3) {
        nearCurveSum += curve;
        nearCount++;
      } else if (along > halley.dustTailLength * 0.6) {
        farCurveSum += curve;
        farCount++;
      }
      dustRedSum += dustCol.getX(i);
      dustBlueSum += dustCol.getZ(i);
    }
    assert.ok(nearCount > 0 && farCount > 0);
    assert.ok(
      farCurveSum / farCount > nearCurveSum / nearCount + 0.5,
      "Cauda de poeira deve curvar-se progressivamente na direção oposta à velocidade orbital"
    );
    assert.ok(dustRedSum > dustBlueSum, "Cauda de poeira deve ter tonalidade amarelada quente (R > B)");
    dustGeo.dispose();
  });

  test("6. Curva orbital generateHalleyOrbitalPath alinha-se exatamente com calculateHalleyPosition", () => {
    const pathPts = generateHalleyOrbitalPath(360);
    const halleyPeri = calculateHalleyPosition(1986.1081);
    const minDist = pathPts.reduce(
      (min, pt) => Math.min(min, pt.distanceTo(halleyPeri.scenePosition)),
      Infinity
    );
    assert.ok(
      minDist < 0.5,
      `Posição de Halley deve coincidir com a curva orbital (distância mínima ${minDist})`
    );
  });

  test("7. CosmicInspectorHUD exibe a distância vetorial correta Terra-Halley (não |r_Sol - 1|)", () => {
    const decimal1986Apr11 = 1986 + 100 / 365; // ~1986-04-11
    const expected = calculateHalleyPosition(decimal1986Apr11);

    useTimelineStore.setState({ selectedYear: decimal1986Apr11 });
    useCosmicStore.setState({
      isCosmicMode: true,
      focusedBodyId: "HALLEY",
      isInspectorOpen: true,
    });

    try {
      const html = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
      const formattedMkm = expected.distanceEarthMkm.toLocaleString("pt-BR");
      assert.ok(
        html.includes(`${expected.distanceEarthAu}`),
        `HUD deve exibir distanceEarthAu (${expected.distanceEarthAu} UA)`
      );
      assert.ok(
        html.includes(formattedMkm),
        `HUD deve exibir distanceEarthMkm formatado (${formattedMkm} mi km)`
      );
    } finally {
      useCosmicStore.getState().resetCosmicState();
      useTimelineStore.setState({ selectedYear: 2026 });
    }
  });

  test("8. Guardrails visuais e de memória WebGL em CometHalleyTrajectory.tsx", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/CometHalleyTrajectory.tsx"),
      "utf-8"
    );
    assert.doesNotMatch(src, /\bdistanceFactor\s*=/, "Label do Halley não pode usar distanceFactor (deve ter tamanho fixo em px)");
    assert.doesNotMatch(src, /<ringGeometry\b/, "Indicador de seleção não pode usar ringGeometry 3D gigante");
    assert.match(src, /halley\.hasTail/, "Cauda dupla deve ser condicionada a halley.hasTail");
    assert.match(src, /ionTailGeometry\?\.dispose\(\)/, "Geometria da cauda iônica deve ser descartada");
    assert.match(src, /dustTailGeometry\?\.dispose\(\)/, "Geometria da cauda de poeira deve ser descartada");
    assert.match(src, /comaTexture\.dispose\(\)/, "Textura da coma deve ser descartada");
    assert.doesNotMatch(src, /text-\[\d/, "Label HTML não pode usar tamanho de fonte fora da escala D14");
    assert.doesNotMatch(src, /animate-pulse/, "Label HTML não pode usar animate-pulse");
  });
});
