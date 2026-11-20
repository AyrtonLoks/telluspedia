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
  APOLLO11_MOON_CAMERA,
  APOLLO11_WIDE_CAMERA,
  CAPE_CANAVERAL_COORDS,
  MOON_DEFAULT_POSITION,
  MOON_RADIUS_UNITS,
  createApollo11TrajectoryCurve,
  selenographicToVector3,
  TRANQUILITY_BASE_COORDS,
} from "../src/lib/apollo11";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import { MAX_CAMERA_ALTITUDE } from "../src/stores/globeStore";
import {
  computeTidalLockQuaternion,
  stepOrbitalPosition,
} from "../src/components/globe/OrbitingMoon";

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

describe("T15 · Lua com posição astronômica real (Meeus Cap. 47, SLERP orbital suave e Apollo 11)", () => {
  test("1. Direção geocêntrica da Lua dentro de 1° da referência JPL/Meeus em 4 datas", () => {
    const references = [
      {
        label: "Meeus Ex. 47.a (1992-04-12 00:00 UTC)",
        date: new Date("1992-04-12T00:00:00Z"),
        expectedLonDeg: 133.1627,
        expectedLatDeg: -3.2291,
        expectedRaDeg: 134.6885,
        expectedDecDeg: 13.7684,
        expectedDistKm: 368410,
      },
      {
        label: "Lua Cheia (2024-01-25 17:54 UTC)",
        date: new Date("2024-01-25T17:54:00Z"),
        expectedLonDeg: 125.24,
        expectedLatDeg: 4.8,
        expectedRaDeg: 128.86,
        expectedDecDeg: 23.61,
        expectedDistKm: 400970,
      },
      {
        label: "Eclipse Solar Total / Lua Nova (2024-04-08 18:18 UTC)",
        date: new Date("2024-04-08T18:18:00Z"),
        expectedLonDeg: 19.36,
        expectedLatDeg: 0.35,
        expectedRaDeg: 17.74,
        expectedDecDeg: 7.9,
        expectedDistKm: 359780,
      },
      {
        label: "Pouso Apollo 11 (1969-07-20 20:17:40 UTC)",
        date: APOLLO11_LANDING_DATE,
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

      assert.ok(eclSep < 1.0, `${ref.label}: erro eclíptico ${eclSep.toFixed(4)}° excede 1°`);
      assert.ok(eqSep < 1.0, `${ref.label}: erro equatorial ${eqSep.toFixed(4)}° excede 1°`);
      assert.ok(
        Math.abs(lunar.distanceKm - ref.expectedDistKm) < 500,
        `${ref.label}: distância ${lunar.distanceKm} km difere de ${ref.expectedDistKm} km`
      );
    }
  });

  test("2. Fase lunar visível compatível com a direção solar na data (Lua Cheia 2024-01-25 e Lua Nova 2024-04-08)", () => {
    const fullMoonDate = new Date("2024-01-25T17:54:00Z");
    const fullMoon = calculateLunarPosition(fullMoonDate);
    const fullSunSub = calculateSubsolarPoint(fullMoonDate);
    const fullSunDir = getSunDirectionVector(fullSunSub.latitude, fullSunSub.longitude);
    const fullDot = fullMoon.earthFixedDirection.dot(fullSunDir);
    const fullPhase = getLunarPhase(fullMoonDate);

    assert.equal(fullPhase.phaseName, "Lua Cheia");
    assert.ok(fullPhase.illumination >= 0.99);
    assert.ok(fullDot < -0.98, `Na Lua Cheia a Lua deve estar oposta ao Sol em 3D (dot=${fullDot.toFixed(4)})`);

    const earthJan2024 = calculatePlanetaryPosition("EARTH", fullMoonDate);
    const earthOutward = earthJan2024.scenePosition.clone().normalize();
    assert.ok(fullMoon.eclipticDirection.dot(earthOutward) > 0.98);

    const newMoonDate = new Date("2024-04-08T18:18:00Z");
    const newMoon = calculateLunarPosition(newMoonDate);
    const newSunSub = calculateSubsolarPoint(newMoonDate);
    const newSunDir = getSunDirectionVector(newSunSub.latitude, newSunSub.longitude);
    const newDot = newMoon.earthFixedDirection.dot(newSunDir);
    const newPhase = getLunarPhase(newMoonDate);

    assert.equal(newPhase.phaseName, "Lua Nova");
    assert.ok(newPhase.illumination <= 0.01);
    assert.ok(newDot > 0.99, `Na Lua Nova a Lua deve alinhar-se com o Sol em 3D (dot=${newDot.toFixed(4)})`);
  });

  test("3. Escala comprimida documentada preservando direção real e excentricidade perigeu/apogeu", () => {
    const perigee = calculateLunarPosition(new Date("2024-04-08T18:18:00Z"));
    const apogee = calculateLunarPosition(new Date("2024-01-25T17:54:00Z"));

    const rPerigee = perigee.scenePosition.length();
    const rApogee = apogee.scenePosition.length();

    assert.ok(rPerigee >= 3.3 && rPerigee < MOON_SCENE_ORBIT_RADIUS);
    assert.ok(rApogee > MOON_SCENE_ORBIT_RADIUS && rApogee <= 3.9);
    assert.ok(perigee.scenePosition.clone().normalize().distanceTo(perigee.earthFixedDirection) < 1e-6);
  });

  test("4. Apollo 11: OrbitingMoon e Apollo11Trajectory coincidem exatamente em 1969-07-20T20:17:40Z (mesmo com exactDate sem hora) e câmeras enquadram Lua + Terra", () => {
    // Regressão crítica: o marco usa-1969 tem exactDate: "1969-07-20" (sem hora).
    // activeScene: "APOLLO11" DEVE prevalecer para não deslocar a Lua em 124°!
    const resolvedWithDateOnlyMilestone = resolveAstronomicalDate({
      selectedYear: 1969,
      selectedMilestoneExactDate: "1969-07-20",
      selectedMilestoneYear: 1969,
      activeScene: "APOLLO11",
    });
    assert.equal(resolvedWithDateOnlyMilestone.toISOString(), "1969-07-20T20:17:40.000Z");

    const orbitMoonPos = getMoonScenePosition(resolvedWithDateOnlyMilestone, "earth");
    assert.ok(
      orbitMoonPos.distanceTo(MOON_DEFAULT_POSITION) < 1e-6,
      "OrbitingMoon e Apollo11Trajectory devem convergir no mesmo ponto exato da Lua"
    );

    const curve = createApollo11TrajectoryCurve(MOON_DEFAULT_POSITION);
    const landing = curve.getPoint(1);
    const expectedLanding = selenographicToVector3(
      TRANQUILITY_BASE_COORDS.lat,
      TRANQUILITY_BASE_COORDS.lng,
      MOON_RADIUS_UNITS,
      MOON_DEFAULT_POSITION
    );
    assert.ok(landing.distanceTo(expectedLanding) < 1e-4);
    assert.ok(landing.length() < MOON_DEFAULT_POSITION.length());

    // Câmera Orbital Ampla dentro de MAX_CAMERA_ALTITUDE e enquadrando Terra, Cabo Canaveral e Lua na tela
    assert.ok(APOLLO11_WIDE_CAMERA.altitude <= MAX_CAMERA_ALTITUDE);
    const wideCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    wideCam.position.copy(
      latLngToVector3(APOLLO11_WIDE_CAMERA.lat, APOLLO11_WIDE_CAMERA.lng, APOLLO11_WIDE_CAMERA.altitude)
    );
    wideCam.lookAt(0, 0, 0);
    wideCam.updateMatrixWorld();

    const moonNdc = MOON_DEFAULT_POSITION.clone().project(wideCam);
    const capeNdc = latLngToVector3(CAPE_CANAVERAL_COORDS.lat, CAPE_CANAVERAL_COORDS.lng, 1.002).project(wideCam);
    assert.ok(Math.abs(moonNdc.x) < 0.9 && Math.abs(moonNdc.y) < 0.5, `Lua fora do enquadramento amplo: (${moonNdc.x}, ${moonNdc.y})`);
    assert.ok(Math.abs(capeNdc.x) < 0.5 && Math.abs(capeNdc.y) < 0.5, `Cabo Canaveral fora do enquadramento amplo: (${capeNdc.x}, ${capeNdc.y})`);

    // Câmera Lua aproxima-se da Lua real de 1969-07-20 (< 1.5 unidades)
    const moonCamPos = latLngToVector3(
      APOLLO11_MOON_CAMERA.lat,
      APOLLO11_MOON_CAMERA.lng,
      APOLLO11_MOON_CAMERA.altitude
    );
    assert.ok(
      moonCamPos.distanceTo(MOON_DEFAULT_POSITION) < 1.5,
      `Câmera da Lua deve ficar próxima à Lua de 1969-07-20 (dist=${moonCamPos.distanceTo(MOON_DEFAULT_POSITION)})`
    );
  });

  test("5. Movimento suavizado SLERP: sem teletransporte durante playback da timeline e convergência exata ao pausar", () => {
    // 5a. Durante playback (mudando de ano a cada 20 frames -> saltos de ~132°), a Lua gira suavemente sem teletransportar
    let pos = getMoonScenePosition(new Date("1960-06-21T12:00:00Z"), "earth");
    const yearlyTargets = [1961, 1962, 1963].map((y) =>
      getMoonScenePosition(new Date(Date.UTC(y, 5, 21, 12, 0, 0)), "earth")
    );

    for (let frame = 0; frame < 60; frame++) {
      const target = yearlyTargets[Math.floor(frame / 20)];
      const next = stepOrbitalPosition(pos, target, 1 / 60, {
        isPlaying: true,
        playbackSpeed: 30,
        isApolloScene: false,
      });
      const stepAngle = Math.acos(
        Math.max(-1, Math.min(1, pos.clone().normalize().dot(next.clone().normalize())))
      );
      assert.ok(stepAngle < 0.06, `Salto brusco durante playback no frame ${frame}: ${stepAngle} rad`);
      assert.ok(next.length() >= 3.3 && next.length() <= 3.9, `Raio orbital inválido durante playback: ${next.length()}`);
      pos = next;
    }

    // 5b. Ao pausar em um alvo distante (~150°), desliza suavemente pela casca esférica até travar no alvo exato
    const finalTarget = getMoonScenePosition(new Date("2024-01-25T17:54:00Z"), "earth");
    let glidePos = finalTarget.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 2.6);
    for (let frame = 0; frame < 240; frame++) {
      const next = stepOrbitalPosition(glidePos, finalTarget, 1 / 60, {
        isPlaying: false,
        playbackSpeed: 1,
        isApolloScene: false,
      });
      const stepAngle = Math.acos(
        Math.max(-1, Math.min(1, glidePos.clone().normalize().dot(next.clone().normalize())))
      );
      assert.ok(stepAngle < 0.06, `Salto brusco durante SLERP no frame ${frame}: ${stepAngle} rad`);
      assert.ok(next.length() >= 3.3, `SLERP não pode cortar por dentro da Terra (r=${next.length()})`);
      glidePos = next;
    }
    assert.ok(
      glidePos.distanceTo(finalTarget) < 1e-3,
      `Após pausa, Lua deve convergir exatamente para Meeus Cap. 47 (erro=${glidePos.distanceTo(finalTarget)})`
    );

    // 5c. Entrada na cena Apollo 11 converge rapidamente e sem corte na Terra para MOON_DEFAULT_POSITION
    let apolloPos = MOON_DEFAULT_POSITION.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 2.1);
    for (let frame = 0; frame < 90; frame++) {
      apolloPos = stepOrbitalPosition(apolloPos, MOON_DEFAULT_POSITION, 1 / 60, {
        isPlaying: false,
        playbackSpeed: 1,
        isApolloScene: true,
      });
      assert.ok(apolloPos.length() >= 3.3);
    }
    assert.ok(
      apolloPos.distanceTo(MOON_DEFAULT_POSITION) < 1e-2,
      `Apollo 11 deve acoplar a Lua na ponta da trajetória (erro=${apolloPos.distanceTo(MOON_DEFAULT_POSITION)})`
    );
  });

  test("6. Acoplamento de maré (computeTidalLockQuaternion) mantém a face visível voltada para a Terra", () => {
    const positions = [
      getMoonScenePosition(new Date("2024-01-25T17:54:00Z"), "earth"),
      getMoonScenePosition(new Date("2024-04-08T18:18:00Z"), "earth"),
      getMoonScenePosition(APOLLO11_LANDING_DATE, "earth"),
    ];

    for (const pos of positions) {
      const quat = computeTidalLockQuaternion(pos);
      const nearSideNormal = new THREE.Vector3(1, 0, 0).applyQuaternion(quat).normalize();
      const towardEarth = pos.clone().negate().normalize();
      assert.ok(nearSideNormal.dot(towardEarth) > 0.9999);
    }
  });

  test("7. Guardrails de OrbitingMoon.tsx: SLERP imperativo sem snap em re-render, shader world-space e dispose WebGL", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/globe/OrbitingMoon.tsx"),
      "utf-8"
    );
    assert.doesNotMatch(src, /delta\s*\*\s*0\.04/, "OrbitingMoon não pode girar a 0.04 rad/s fixo sem efeméride");
    assert.doesNotMatch(src, /position=\{targetLocalPos\}/, "Grupo da Lua não deve receber position={targetLocalPos} no JSX (causaria snap em re-renders)");
    assert.match(src, /stepOrbitalPosition/, "OrbitingMoon deve interpolar suavemente via stepOrbitalPosition");
    assert.match(src, /calculateLunarPosition/, "OrbitingMoon deve usar calculateLunarPosition");
    assert.match(src, /useSunDirection/, "OrbitingMoon deve consumir a fonte única de data/direção solar (T14)");
    assert.match(src, /currentMoonWorldPos/, "OrbitingMoon deve manter currentMoonWorldPos atualizado");
    assert.match(src, /modelMatrix\s*\*\s*vec4\(normal,\s*0\.0\)/, "Shader lunar deve usar normal em espaço mundial (AGENTS.md §1)");
    assert.doesNotMatch(src, /normalMatrix\s*\*\s*normal/, "Proibido normalMatrix com uSunDirection");
    assert.match(src, /moonGeo\.dispose\(\)/, "Geometria da Lua deve ser descartada");
    assert.match(src, /moonMat\.dispose\(\)/, "Material da Lua deve ser descartado");
    assert.match(src, /loadedTex\.dispose\(\)/, "Textura da Lua deve ser descartada");
  });
});
