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
  buildDustPlumeGeometry,
  buildDustTailGeometry,
  buildHalleyNucleusGeometry,
  buildIonPlumeGeometry,
  buildIonTailGeometry,
  createRadialFalloffTexture,
} from "../src/components/globe/CometHalleyTrajectory";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useTimelineStore } from "../src/stores/timelineStore";

describe("D10 · Cometa 1P/Halley: distância real, núcleo esculpido, coma, cauda dupla e seleção", () => {
  test("1. Distância Terra-Halley em 1986-04-11 bate com JPL Horizons (~0.42 UA)", () => {
    const closeApproach1986 = new Date(Date.UTC(1986, 3, 11, 0, 0, 0));
    const halley = calculateHalleyPosition(closeApproach1986);
    const earth = calculatePlanetaryPosition("EARTH", closeApproach1986);

    const dx = halley.heliocentricAu.x - earth.heliocentricAu.x;
    const dy = halley.heliocentricAu.y - earth.heliocentricAu.y;
    const dz = halley.heliocentricAu.z - earth.heliocentricAu.z;
    const expectedDistAu = Math.sqrt(dx * dx + dy * dy + dz * dz);

    assert.ok(
      Math.abs(halley.distanceEarthAu - expectedDistAu) < 1e-3,
      `distanceEarthAu (${halley.distanceEarthAu}) deve igualar |r_comet - r_Earth| (${expectedDistAu})`
    );

    assert.ok(
      Math.abs(halley.distanceEarthAu - 0.42) <= 0.03,
      `Em 1986-04-11 a distância Terra-Halley deve ser ~0.42 UA (obteve ${halley.distanceEarthAu} UA)`
    );

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

  test("3. Em 2026 (~35 UA): sem cauda, núcleo discreto e coma residual maior que o núcleo", () => {
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
    assert.ok(
      halley2026.comaRadius > 0.4 && halley2026.comaRadius <= 0.9,
      `Coma residual em 2026 deve ser discreta e maior que o diâmetro do núcleo (${halley2026.comaRadius})`
    );
    assert.ok(halley2026.comaOpacity <= 0.3, `Opacidade da coma em 2026 deve ser discreta (${halley2026.comaOpacity})`);
  });

  test("4. No periélio (1986-02): cauda dupla ativa apontando contra o Sol e crescendo ao aproximar", () => {
    const perihelion1986 = calculateHalleyPosition(new Date(Date.UTC(1986, 1, 9, 11, 0, 0)));
    const midApproach = calculateHalleyPosition(new Date(Date.UTC(1985, 8, 15))); // ~2.5 UA
    const inactiveBoundary = calculateHalleyPosition(new Date(Date.UTC(1985, 0, 1))); // > 4.5 UA

    assert.ok(perihelion1986.distanceSunAu < 0.65, `Periélio ~0.586 UA (obteve ${perihelion1986.distanceSunAu})`);
    assert.equal(perihelion1986.hasTail, true);
    assert.equal(perihelion1986.isPerihelionPassage, true);
    assert.ok(perihelion1986.tailLength >= 15);
    assert.ok(perihelion1986.dustTailLength >= 10);
    assert.ok(perihelion1986.comaRadius >= 2.4);

    const antiSolarDot = perihelion1986.tailDirection.dot(
      perihelion1986.scenePosition.clone().normalize()
    );
    assert.ok(Math.abs(antiSolarDot - 1.0) < 1e-4, "tailDirection deve ser anti-solar");
    assert.ok(
      Math.abs(perihelion1986.orbitalVelocityDirection.length() - 1.0) < 1e-4,
      "orbitalVelocityDirection deve ser unitário"
    );

    assert.ok(inactiveBoundary.distanceSunAu >= HALLEY_TAIL_ACTIVATION_AU);
    assert.equal(inactiveBoundary.hasTail, false);
    assert.equal(midApproach.hasTail, true);
    assert.ok(midApproach.tailLength > 0 && midApproach.tailLength < perihelion1986.tailLength);
    assert.ok(midApproach.dustTailLength > 0 && midApproach.dustTailLength < perihelion1986.dustTailLength);
    assert.ok(midApproach.comaRadius > inactiveBoundary.comaRadius);
    assert.ok(perihelion1986.comaRadius > midApproach.comaRadius);
  });

  test("5. Núcleo esculpido bilobado com relevo, crateras, fissuras de gelo e normais suaves", () => {
    const geo = buildHalleyNucleusGeometry();
    assert.ok(geo.getIndex() !== null, "Geometria do núcleo deve ser indexada para normais suaves");
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);

    // Formato alongado bilobado (15x8x8 km -> eixo X claramente maior que Y/Z)
    assert.ok(size.x > size.y * 1.4, `Núcleo deve ser alongado bilobado (x=${size.x}, y=${size.y})`);
    assert.ok(size.x > size.z * 1.4, `Núcleo deve ser alongado bilobado (x=${size.x}, z=${size.z})`);

    const terrain = geo.getAttribute("aTerrain") as THREE.BufferAttribute;
    assert.ok(terrain, "Núcleo deve expor atributo aTerrain para shader procedural");
    let minAO = 1;
    let maxIce = 0;
    for (let i = 0; i < terrain.count; i++) {
      minAO = Math.min(minAO, terrain.getY(i));
      maxIce = Math.max(maxIce, terrain.getZ(i));
    }
    assert.ok(minAO < 0.7, `Núcleo deve conter cavidades de crateras (minAO=${minAO})`);
    assert.ok(maxIce > 0.5, `Núcleo deve conter fissuras de gelo exposto (maxIce=${maxIce})`);

    const norm = geo.getAttribute("normal") as THREE.BufferAttribute;
    for (let i = 0; i < norm.count; i++) {
      const len = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
      assert.ok(Math.abs(len - 1.0) < 1e-3, "Normais do núcleo devem ser unitárias");
    }
    geo.dispose();
  });

  test("6. Textura radial, plumas volumétricas e nuvens de partículas da cauda dupla", () => {
    const tex = createRadialFalloffTexture(33);
    const data = tex.image.data as Uint8Array;
    const centerIdx = (16 * 33 + 16) * 4;
    const cornerIdx = 0;
    assert.equal(data[centerIdx + 3], 255, "Centro exato da textura radial deve ter alpha 255");
    assert.equal(data[cornerIdx + 3], 0, "Canto da textura radial deve ser transparente");
    tex.dispose();

    const halley = calculateHalleyPosition(new Date(Date.UTC(1986, 1, 9, 11, 0, 0)));

    // Pluma volumétrica iônica
    const ionPlume = buildIonPlumeGeometry(halley.tailDirection, halley.tailLength);
    const ionPlumePos = ionPlume.getAttribute("position") as THREE.BufferAttribute;
    assert.ok(ionPlumePos.count > 200);
    for (let i = 0; i < ionPlumePos.count; i++) {
      const p = new THREE.Vector3(ionPlumePos.getX(i), ionPlumePos.getY(i), ionPlumePos.getZ(i));
      assert.ok(p.dot(halley.tailDirection) > 0, "Pluma iônica deve estender-se contra o Sol");
    }
    ionPlume.dispose();

    // Pluma volumétrica de poeira (curvada)
    const dustPlume = buildDustPlumeGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
    const dustPlumePos = dustPlume.getAttribute("position") as THREE.BufferAttribute;
    assert.ok(dustPlumePos.count > 200);
    dustPlume.dispose();

    // Partículas iônicas
    const ionGeo = buildIonTailGeometry(halley.tailDirection, halley.tailLength, 120);
    const ionPos = ionGeo.getAttribute("position") as THREE.BufferAttribute;
    const ionCol = ionGeo.getAttribute("color") as THREE.BufferAttribute;
    let ionRedSum = 0;
    let ionBlueSum = 0;
    for (let i = 0; i < ionPos.count; i++) {
      const p = new THREE.Vector3(ionPos.getX(i), ionPos.getY(i), ionPos.getZ(i));
      assert.ok(p.dot(halley.tailDirection) > 0, "Partícula da cauda iônica deve estender-se na direção anti-solar");
      ionRedSum += ionCol.getX(i);
      ionBlueSum += ionCol.getZ(i);
    }
    assert.ok(ionBlueSum > ionRedSum, "Cauda iônica deve ter tonalidade azulada (B > R)");
    ionGeo.dispose();

    // Partículas de poeira curvadas
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

  test("7. Curva orbital generateHalleyOrbitalPath alinha-se exatamente com calculateHalleyPosition", () => {
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

  test("8. CosmicInspectorHUD exibe distância vetorial real, status explícito da cauda e atalhos de época", () => {
    const decimal1986Apr11 = 1986 + 100 / 365;
    const expectedApr = calculateHalleyPosition(decimal1986Apr11);

    try {
      // Estado ativo (Abril 1986 — aproximação da Terra)
      useTimelineStore.setState({ selectedYear: decimal1986Apr11 });
      useCosmicStore.setState({
        isCosmicMode: true,
        focusedBodyId: "HALLEY",
        isInspectorOpen: true,
      });

      const activeHtml = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
      const formattedMkm = expectedApr.distanceEarthMkm.toLocaleString("pt-BR");
      assert.ok(activeHtml.includes(`${expectedApr.distanceEarthAu}`), "HUD deve exibir distanceEarthAu real");
      assert.ok(activeHtml.includes(formattedMkm), "HUD deve exibir distanceEarthMkm formatado");
      assert.ok(activeHtml.includes("Cauda dupla ativa"), "HUD deve sinalizar explicitamente cauda dupla ativa em 1986");
      assert.ok(activeHtml.includes("halley-epoch-perihelion-1986"), "HUD deve oferecer atalho para Periélio 1986");
      assert.ok(activeHtml.includes("halley-epoch-aphelion-2026"), "HUD deve oferecer atalho para Afélio 2026");
      assert.doesNotMatch(activeHtml, /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*<div\b/, "Sem <div> dentro de <p>");

      // Estado inativo (2026 — afélio ~35 UA)
      useTimelineStore.setState({ selectedYear: 2026 });
      const dormantHtml = renderToStaticMarkup(React.createElement(CosmicInspectorHUD));
      assert.ok(dormantHtml.includes("Sem cauda (afélio)"), "HUD deve sinalizar explicitamente ausência de cauda em 2026");
      assert.ok(dormantHtml.includes("Época: 2026"));
    } finally {
      useCosmicStore.getState().resetCosmicState();
      useTimelineStore.setState({ selectedYear: 2026 });
    }
  });

  test("9. Guardrails visuais, de seleção, GLSL world-space e memória WebGL em CometHalleyTrajectory.tsx", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/CometHalleyTrajectory.tsx"),
      "utf-8"
    );
    assert.doesNotMatch(src, /\bdistanceFactor\s*=/, "Label do Halley não pode usar distanceFactor");
    assert.doesNotMatch(src, /<ringGeometry\b/, "Indicador de seleção não pode usar ringGeometry 3D gigante");
    assert.doesNotMatch(src, /normalMatrix\s*\*\s*normal/, "Shaders devem usar modelMatrix (world-space), nunca normalMatrix");
    assert.match(src, /modelMatrix\s*\*\s*vec4\(normal,\s*0\.0\)/, "Shaders devem seguir invariante world-space normal (AGENTS.md §1)");
    assert.match(src, /pointer-events-auto/, "Label do Halley deve ser clicável para seleção fácil");
    assert.match(src, /pickMeshRef\.current\.scale\.setScalar/, "Colisor de picking deve escalar com a distância da câmera");
    assert.match(src, /halley\.hasTail/, "Cauda dupla deve ser condicionada a halley.hasTail");
    assert.match(src, /ionPlumeGeo\?\.dispose\(\)/, "Pluma iônica deve ser descartada");
    assert.match(src, /dustPlumeGeo\?\.dispose\(\)/, "Pluma de poeira deve ser descartada");
    assert.match(src, /ionTailGeometry\?\.dispose\(\)/, "Geometria da cauda iônica deve ser descartada");
    assert.match(src, /dustTailGeometry\?\.dispose\(\)/, "Geometria da cauda de poeira deve ser descartada");
    assert.match(src, /comaTexture\.dispose\(\)/, "Textura da coma deve ser descartada");
    assert.doesNotMatch(src, /text-\[\d/, "Label HTML não pode usar tamanho de fonte fora da escala D14");
    assert.doesNotMatch(src, /animate-pulse/, "Label HTML não pode usar animate-pulse");
  });
});
