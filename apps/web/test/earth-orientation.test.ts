import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { calculatePlanetaryPosition } from "../src/lib/astronomy-planets";
import { calculateSubsolarPoint } from "../src/lib/astronomy-solar";
import { getSunDirectionVector } from "../src/lib/astronomy";
import {
  earthCosmicLight,
  earthCosmicOrientation,
  earthOrientation,
  sceneDirectionToSun,
  stepEarthOrientation,
  worldSunDirection,
} from "../src/lib/earth-orientation";

const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const root = path.resolve(__dirname, "..");

function bodySun(date: Date) {
  const s = calculateSubsolarPoint(date);
  return getSunDirectionVector(s.latitude, s.longitude);
}

describe("D21 — Terra no Cosmos: eixo e lado iluminado", () => {
  beforeEach(() => {
    earthOrientation.identity();
    earthCosmicLight.weight = 0;
  });

  test("eixo inclinado 23,44° em relação ao norte da eclíptica", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-21T12:00:00Z", "1969-07-20T20:17:40Z"]) {
      const date = new Date(iso);
      const q = earthCosmicOrientation(bodySun(date), calculatePlanetaryPosition("EARTH", date).scenePosition);
      const pole = UP.clone().applyQuaternion(q);
      assert.ok(Math.abs(pole.angleTo(UP) / DEG - 23.44) < 0.01, iso);
    }
  });

  test("com a mesma data, o subsolar girado aponta para o Sol da cena (±1,5°)", () => {
    for (const iso of ["2026-03-20T15:00:00Z", "2026-06-21T12:00:00Z", "2026-09-23T06:00:00Z", "2026-12-21T18:00:00Z", "1969-07-20T20:17:40Z"]) {
      const date = new Date(iso);
      const pos = calculatePlanetaryPosition("EARTH", date).scenePosition;
      const q = earthCosmicOrientation(bodySun(date), pos);
      const angle = bodySun(date).applyQuaternion(q).angleTo(sceneDirectionToSun(pos)!) / DEG;
      assert.ok(angle < 1.5, `${iso}: ${angle.toFixed(2)}°`);
    }
  });

  test("datas diferentes: eixo continua certo e a longitude do meio-dia fica voltada ao Sol", () => {
    const pos = calculatePlanetaryPosition("EARTH", 2026).scenePosition; // 1º de janeiro
    const sun = bodySun(new Date("2026-06-21T12:00:00Z"));
    const q = earthCosmicOrientation(sun, pos);
    const toSun = sceneDirectionToSun(pos)!;
    const pole = UP.clone().applyQuaternion(q);
    const proj = (v: THREE.Vector3) => v.clone().addScaledVector(pole, -v.dot(pole)).normalize();
    assert.ok(proj(sun.clone().applyQuaternion(q)).angleTo(proj(toSun)) < 1e-6);
  });

  test("a luz da Terra vai do subsolar (modo Terra) ao Sol da cena (Cosmos) sem salto", () => {
    const body = bodySun(new Date("2026-06-21T12:00:00Z"));
    const pos = calculatePlanetaryPosition("EARTH", 2026).scenePosition;
    const target = earthCosmicOrientation(body, pos);
    const toSun = sceneDirectionToSun(pos)!;
    const out = new THREE.Vector3();
    assert.ok(worldSunDirection(body, out).angleTo(body) < 1e-9, "modo Terra: subsolar puro");
    let last = out.clone();
    for (let i = 0; i < 120; i++) {
      stepEarthOrientation(earthOrientation, target, 1 / 60, false, { cosmic: true, toSun });
      worldSunDirection(body, out);
      assert.ok(out.angleTo(last) < 6 * DEG, `passo ${i} sem salto`);
      last = out.clone();
    }
    for (let i = 0; i < 600; i++) stepEarthOrientation(earthOrientation, target, 1 / 60, false, { cosmic: true, toSun });
    assert.ok(worldSunDirection(body, out).angleTo(toSun) < 1e-3, "Cosmos: luz voltada ao Sol");
    assert.ok(earthOrientation.angleTo(target) < 1e-3);
  });

  test("movimento reduzido: salta direto", () => {
    const pos = calculatePlanetaryPosition("EARTH", 2026).scenePosition;
    const target = earthCosmicOrientation(bodySun(new Date()), pos);
    stepEarthOrientation(earthOrientation, target, 1 / 60, true, { cosmic: true, toSun: sceneDirectionToSun(pos) });
    assert.ok(earthOrientation.angleTo(target) < 1e-6);
    assert.equal(earthCosmicLight.weight, 1);
  });

  test("os shaders da Terra usam a direção do Sol em mundo e o picking usa o referencial local", () => {
    for (const f of ["EarthSphere.tsx", "CloudLayer.tsx", "Atmosphere.tsx"]) {
      const src = fs.readFileSync(path.join(root, "src/components/globe", f), "utf-8");
      assert.match(src, /worldSunDirection\(sun\.direction/, f);
      assert.doesNotMatch(src, /uSunDirection\.value\.copy\(sun\.direction\)/, f);
    }
    const earth = fs.readFileSync(path.join(root, "src/components/globe/EarthSphere.tsx"), "utf-8");
    assert.doesNotMatch(earth, /vector3ToLatLng\(e\.point\)/, "picking não pode usar o ponto em mundo");
    const canvas = fs.readFileSync(path.join(root, "src/components/globe/GlobeCanvas.tsx"), "utf-8");
    assert.match(canvas, /<EarthOrientationGroup cosmic=\{isCosmicMode\}/);
  });
});
