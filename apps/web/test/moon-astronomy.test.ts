import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";

import {
  APOLLO11_LANDING_DATE,
  MOON_SCENE_ORBIT_RADIUS,
  calculateLunarPosition,
  calculateSubsolarPoint,
  getLunarPhase,
  getMoonScenePosition,
  getSunDirectionVector,
  resolveAstronomicalDate,
} from "../src/lib/astronomy";
import { calculatePlanetaryPosition } from "../src/lib/astronomy-planets";
import {
  MOON_DEFAULT_POSITION,
  MOON_RADIUS_UNITS,
  createApollo11TrajectoryCurve,
  selenographicToVector3,
  TRANQUILITY_BASE_COORDS,
} from "../src/lib/apollo11";
import { computeTidalLockQuaternion } from "../src/components/globe/OrbitingMoon";

function angularSeparationDeg(lon1Deg: number, lat1Deg: number, lon2Deg: number, lat2Deg: number): number {
  const toRad = Math.PI / 180;
  const a1 = lon1Deg * toRad;
  const d1 = lat1Deg * toRad;
  const a2 = lon2Deg * toRad;
  const d2 = lat2Deg * toRad;
  const cosSep = Math.max(
    -1,
    Math.min(1, Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(a1 - a2))
  );
  return (Math.acos(cosSep) * 180) / Math.PI;
}

describe("T15 · Lua com posição astronômica real (Meeus Cap. 47, fase solar e Apollo 11)", () => {
  test("1. Direção geocêntrica da Lua dentro de 1° da referência JPL/Meeus em 3+ datas", () => {
    const references = [
      {
        label: "Meeus Ex. 47.a (1992-04-12 00:00 UTC)",
        date: new Date("1992-04-12T00:00:00Z"),
        // Meeus Astronomical Algorithms 2nd ed., Ch. 47 Example 47.a
        expectedLonDeg: 133.1627,
        expectedLatDeg: -3.2291,
        expectedRaDeg: 134.6885,
        expectedDecDeg: 13.7684,
        expectedDistKm: 368410,
      },
      {
        label: "Lua Cheia (2024-01-25 17:54 UTC)",
        date: new Date("2024-01-25T17:54:00Z"),
        // JPL Horizons geocentric ecliptic/equatorial reference
        expectedLonDeg: 125.24,
        expectedLatDeg: 4.8,
        expectedRaDeg: 128.86,
        expectedDecDeg: 23.61,
        expectedDistKm: 400970,
      },
      {
        label: "Eclipse Solar Total / Lua Nova (2024-04-08 18:18 UTC)",
        date: new Date("2024-04-08T18:18:00Z"),
        // JPL Horizons geocentric reference at maximum eclipse conjunction
        expectedLonDeg: 19.36,
        expectedLatDeg: 0.35,
        expectedRaDeg: 17.74,
        expectedDecDeg: 7.9,
        expectedDistKm: 359780,
      },
      {
        label: "Pouso Apollo 11 (1969-07-20 20:17:40 UTC)",
        date: APOLLO11_LANDING_DATE,
        // JPL Horizons geocentric reference at Eagle touchdown
        expectedLonDeg: 187.87,
        expectedLatDeg: -1.37,
        expectedRaDeg: 186.69,
        expectedDecDeg: -4.38,
        expectedDistKm: 389440,
      },
    ];

    for (const ref of references) {
      const lunar = calculateLunarPosition(ref.date);
      const eclSep = angularSeparationDeg(
        lunar.eclipticLongitudeDeg,
        lunar.eclipticLatitudeDeg,
        ref.expectedLonDeg,
        ref.expectedLatDeg
      );
      const eqSep = angularSeparationDeg(
        lunar.rightAscensionDeg,
        lunar.declinationDeg,
        ref.expectedRaDeg,
        ref.expectedDecDeg
      );

      assert.ok(
        eclSep < 1.0,
        `${ref.label}: erro eclíptico ${eclSep.toFixed(4)}° excede 1°`
      );
      assert.ok(
        eqSep < 1.0,
        `${ref.label}: erro equatorial ${eqSep.toFixed(4)}° excede 1°`
      );
      assert.ok(
        Math.abs(lunar.distanceKm - ref.expectedDistKm) < 500,
        `${ref.label}: distância ${lunar.distanceKm} km difere de ${ref.expectedDistKm} km`
      );
    }
  });

  test("2. Fase lunar visível compatível com a direção solar na data (Lua Cheia 2024-01-25 e Lua Nova 2024-04-08)", () => {
    // Lua Cheia: 2024-01-25 17:54 UTC -> Lua oposta ao Sol (dot ~ -1)
    const fullMoonDate = new Date("2024-01-25T17:54:00Z");
    const fullMoon = calculateLunarPosition(fullMoonDate);
    const fullSunSub = calculateSubsolarPoint(fullMoonDate);
    const fullSunDir = getSunDirectionVector(fullSunSub.latitude, fullSunSub.longitude);
    const fullDot = fullMoon.earthFixedDirection.dot(fullSunDir);
    const fullPhase = getLunarPhase(fullMoonDate);

    assert.equal(fullPhase.phaseName, "Lua Cheia", `Esperava Lua Cheia, obteve ${fullPhase.phaseName}`);
    assert.ok(fullPhase.illumination >= 0.99, `Iluminação na Lua Cheia deve ser ~100% (obteve ${fullPhase.illumination})`);
    assert.ok(
      fullDot < -0.98,
      `Na Lua Cheia a Lua deve estar oposta ao Sol em 3D (dot=${fullDot.toFixed(4)})`
    );

    // No modo Cósmico, na Lua Cheia a direção eclíptica geocêntrica da Lua aponta para fora do Sol (mesmo lado da Terra)
    const earthJan2024 = calculatePlanetaryPosition("EARTH", fullMoonDate);
    const earthOutward = earthJan2024.scenePosition.clone().normalize();
    const cosmicFullDot = fullMoon.eclipticDirection.dot(earthOutward);
    assert.ok(
      cosmicFullDot > 0.98,
      `No modo Cósmico, Lua Cheia deve ficar no lado oposto ao Sol em relação à Terra (dot=${cosmicFullDot.toFixed(4)})`
    );

    // Lua Nova / Eclipse: 2024-04-08 18:18 UTC -> Lua alinhada com o Sol (dot ~ +1)
    const newMoonDate = new Date("2024-04-08T18:18:00Z");
    const newMoon = calculateLunarPosition(newMoonDate);
    const newSunSub = calculateSubsolarPoint(newMoonDate);
    const newSunDir = getSunDirectionVector(newSunSub.latitude, newSunSub.longitude);
    const newDot = newMoon.earthFixedDirection.dot(newSunDir);
    const newPhase = getLunarPhase(newMoonDate);

    assert.equal(newPhase.phaseName, "Lua Nova", `Esperava Lua Nova, obteve ${newPhase.phaseName}`);
    assert.ok(newPhase.illumination <= 0.01, `Iluminação na Lua Nova deve ser ~0% (obteve ${newPhase.illumination})`);
    assert.ok(
      newDot > 0.99,
      `Na Lua Nova a Lua deve alinhar-se na direção do Sol em 3D (dot=${newDot.toFixed(4)})`
    );
  });

  test("3. Escala comprimida documentada preservando direção real e excentricidade perigeu/apogeu", () => {
    const perigee = calculateLunarPosition(new Date("2024-04-08T18:18:00Z"));
    const apogee = calculateLunarPosition(new Date("2024-01-25T17:54:00Z"));

    const rPerigee = perigee.scenePosition.length();
    const rApogee = apogee.scenePosition.length();

    assert.ok(rPerigee >= 3.3 && rPerigee < MOON_SCENE_ORBIT_RADIUS, `Perigeu comprimido fora do esperado: ${rPerigee}`);
    assert.ok(rApogee > MOON_SCENE_ORBIT_RADIUS && rApogee <= 3.9, `Apogeu comprimido fora do esperado: ${rApogee}`);
    assert.ok(
      perigee.scenePosition.clone().normalize().distanceTo(perigee.earthFixedDirection) < 1e-6,
      "Posição comprimida deve preservar exatamente a direção astronômica"
    );
  });

  test("4. Apollo 11 deriva a posição da Lua da data histórica (20/07/1969) sem valor fixo", () => {
    const expectedApolloPos = getMoonScenePosition(APOLLO11_LANDING_DATE, "earth");
    assert.ok(
      MOON_DEFAULT_POSITION.distanceTo(expectedApolloPos) < 1e-6,
      "MOON_DEFAULT_POSITION deve derivar de getMoonScenePosition(APOLLO11_LANDING_DATE)"
    );
    // Não pode mais ser o valor fixo antigo (3.6, 0.4, 0)
    assert.ok(
      MOON_DEFAULT_POSITION.distanceTo(new THREE.Vector3(3.6, 0.4, 0)) > 1.0,
      "Posição da Lua na Apollo 11 não deve usar o vetor fixo antigo (3.6, 0.4, 0)"
    );

    const resolvedApolloDate = resolveAstronomicalDate({ activeScene: "APOLLO11" });
    assert.equal(resolvedApolloDate.toISOString(), "1969-07-20T20:17:40.000Z");

    // Curva Apollo 11 continua conectando Cabo Canaveral ao Mar da Tranquilidade sem penetrar a Lua
    const curve = createApollo11TrajectoryCurve(MOON_DEFAULT_POSITION);
    const landing = curve.getPoint(1);
    const expectedLanding = selenographicToVector3(
      TRANQUILITY_BASE_COORDS.lat,
      TRANQUILITY_BASE_COORDS.lng,
      MOON_RADIUS_UNITS,
      MOON_DEFAULT_POSITION
    );
    assert.ok(landing.distanceTo(expectedLanding) < 1e-4);

    // Base da Tranquilidade deve estar na face voltada para a Terra (distância à Terra < distância do centro da Lua)
    assert.ok(
      landing.length() < MOON_DEFAULT_POSITION.length(),
      "Base da Tranquilidade deve ficar na face visível da Lua voltada para a Terra"
    );
  });

  test("5. Acoplamento de maré (computeTidalLockQuaternion) mantém a face visível voltada para a Terra", () => {
    const positions = [
      getMoonScenePosition(new Date("2024-01-25T17:54:00Z"), "earth"),
      getMoonScenePosition(new Date("2024-04-08T18:18:00Z"), "earth"),
      getMoonScenePosition(APOLLO11_LANDING_DATE, "earth"),
    ];

    for (const pos of positions) {
      const quat = computeTidalLockQuaternion(pos);
      const nearSideNormal = new THREE.Vector3(1, 0, 0).applyQuaternion(quat).normalize();
      const towardEarth = pos.clone().negate().normalize();
      const dot = nearSideNormal.dot(towardEarth);
      assert.ok(
        dot > 0.9999,
        `Face visível da Lua deve apontar estritamente para a Terra (dot=${dot})`
      );
    }
  });

  test("6. Guardrails de OrbitingMoon.tsx: sem rotação constante 0.04, shader world-space e dispose WebGL", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/OrbitingMoon.tsx"),
      "utf-8"
    );
    assert.doesNotMatch(src, /delta\s*\*\s*0\.04/, "OrbitingMoon não pode mais girar a 0.04 rad/s constante");
    assert.match(src, /calculateLunarPosition/, "OrbitingMoon deve usar calculateLunarPosition");
    assert.match(src, /resolveAstronomicalDate/, "OrbitingMoon deve resolver a data astronômica da época ativa");
    assert.match(src, /currentMoonWorldPos/, "OrbitingMoon deve manter currentMoonWorldPos atualizado");
    assert.match(src, /modelMatrix\s*\*\s*vec4\(normal,\s*0\.0\)/, "Shader lunar deve usar normal em espaço mundial (AGENTS.md §1)");
    assert.doesNotMatch(src, /normalMatrix\s*\*\s*normal/, "Proibido normalMatrix com uSunDirection");
    assert.match(src, /moonGeo\.dispose\(\)/, "Geometria da Lua deve ser descartada");
    assert.match(src, /moonMat\.dispose\(\)/, "Material da Lua deve ser descartado");
    assert.match(src, /loadedTex\.dispose\(\)/, "Textura da Lua deve ser descartada");
  });
});
