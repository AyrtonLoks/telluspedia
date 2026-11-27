/**
 * Modelos 3D multicomponente de engenharia aeroespacial (NASA / JPL) para Sondas do Espaço Profundo (D41):
 * - Voyager 1 & Voyager 2: antena parabólica HGA branca de 3,7 m com tripé de sub-refletor, barramento
 *   decagonal com o Disco de Ouro (Golden Record), haste de 3 RTGs, magnetômetro de 13 m, plataforma
 *   de câmeras ISS/UVS e antenas chicote PRA/PWS;
 * - New Horizons: chassi triangular em manta Kapton dourada ('Grand Piano'), HGA de 2,1 m de convés,
 *   gerador GPHS-RTG aletado em grafite e abertura óptica LORRI/Ralph;
 * - James Webb (JWST): delegado a `probe-models-jwst.ts` para respeitar o orçamento modular T45.
 */

import * as THREE from "three";
import type { DeepSpaceProbeId } from "@/lib/deep-space-probes-ids";
import type { ProbeMaterialPalette } from "./probe-materials";
import { addProbeStrut, buildJwstGroup } from "./probe-models-jwst";

const ignoreRaycast = () => null;

/** Cria uma antena parabólica côncava aberta na direção `+Z`. */
function createParabolicDishGeometry(
  outerRadius: number,
  depth: number,
  radialSegments = 32
): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(t * outerRadius, t * t * depth));
  }
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.rotateX(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildVoyagerGroup(
  palette: ProbeMaterialPalette,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const root = new THREE.Group();

  // 1. Antena parabólica HGA de 3,7 m voltada para +Z (Terra / Sol)
  const dishGeo = createParabolicDishGeometry(0.42, 0.13, 36);
  geometries.push(dishGeo);
  const dish = new THREE.Mesh(dishGeo, palette.dishWhiteMat);
  dish.position.set(0, 0, 0.02);
  dish.raycast = ignoreRaycast;
  root.add(dish);

  const rimGeo = new THREE.TorusGeometry(0.42, 0.011, 10, 36);
  geometries.push(rimGeo);
  const rim = new THREE.Mesh(rimGeo, palette.titaniumStrutMat);
  rim.position.set(0, 0, 0.15);
  rim.raycast = ignoreRaycast;
  root.add(rim);

  const hornGeo = new THREE.CylinderGeometry(0.024, 0.045, 0.11, 16);
  hornGeo.rotateX(Math.PI / 2);
  geometries.push(hornGeo);
  const horn = new THREE.Mesh(hornGeo, palette.graphiteDarkMat);
  horn.position.set(0, 0, 0.075);
  horn.raycast = ignoreRaycast;
  root.add(horn);

  const subGeo = new THREE.CylinderGeometry(0.068, 0.052, 0.036, 20);
  subGeo.rotateX(Math.PI / 2);
  geometries.push(subGeo);
  const sub = new THREE.Mesh(subGeo, palette.kaptonGoldMat);
  sub.position.set(0, 0, 0.27);
  sub.raycast = ignoreRaycast;
  root.add(sub);

  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3 + Math.PI / 6;
    addProbeStrut(
      root,
      new THREE.Vector3(Math.cos(ang) * 0.34, Math.sin(ang) * 0.34, 0.115),
      new THREE.Vector3(Math.cos(ang) * 0.045, Math.sin(ang) * 0.045, 0.265),
      0.0085,
      palette.titaniumStrutMat,
      geometries
    );
  }

  // 2. Barramento decagonal + Kapton MLI + Disco de Ouro (Golden Record)
  const busGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.15, 10);
  busGeo.rotateX(Math.PI / 2);
  geometries.push(busGeo);
  const bus = new THREE.Mesh(busGeo, palette.graphiteDarkMat);
  bus.position.set(0, 0, -0.09);
  bus.raycast = ignoreRaycast;
  root.add(bus);

  const busFoilGeo = new THREE.CylinderGeometry(0.185, 0.185, 0.162, 10);
  busFoilGeo.rotateX(Math.PI / 2);
  geometries.push(busFoilGeo);
  const busFoil = new THREE.Mesh(busFoilGeo, palette.kaptonGoldMat);
  busFoil.position.set(0, 0, -0.09);
  busFoil.raycast = ignoreRaycast;
  root.add(busFoil);

  const recordGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24);
  recordGeo.rotateZ(Math.PI / 2);
  geometries.push(recordGeo);
  const record = new THREE.Mesh(recordGeo, palette.goldenRecordMat);
  record.position.set(0.212, 0.01, -0.09);
  record.raycast = ignoreRaycast;
  root.add(record);

  // 3. Haste de energia com 3 geradores MHW-RTG
  const rtgDir = new THREE.Vector3(-0.82, -0.44, -0.36).normalize();
  const rtgStart = new THREE.Vector3(-0.16, -0.08, -0.11);
  const rtgEnd = rtgStart.clone().addScaledVector(rtgDir, 0.62);
  addProbeStrut(root, rtgStart, rtgEnd, 0.014, palette.titaniumStrutMat, geometries);
  addProbeStrut(
    root,
    new THREE.Vector3(-0.1, 0.06, -0.12),
    rtgStart.clone().addScaledVector(rtgDir, 0.32),
    0.009,
    palette.titaniumStrutMat,
    geometries
  );

  const rtgCanGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.13, 14);
  geometries.push(rtgCanGeo);
  const rtgQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rtgDir);
  for (const frac of [0.46, 0.71, 0.95]) {
    const can = new THREE.Mesh(rtgCanGeo, palette.graphiteDarkMat);
    can.position.copy(rtgStart).addScaledVector(rtgDir, 0.62 * frac);
    can.quaternion.copy(rtgQuat);
    can.raycast = ignoreRaycast;
    root.add(can);
  }

  // 4. Haste da plataforma científica (ISS Wide/Narrow Angle, IRIS, UVS)
  const scanStart = new THREE.Vector3(0.16, 0.07, -0.1);
  const scanEnd = new THREE.Vector3(0.58, 0.25, -0.24);
  addProbeStrut(root, scanStart, scanEnd, 0.013, palette.titaniumStrutMat, geometries);

  const scanHeadGeo = new THREE.BoxGeometry(0.13, 0.1, 0.11);
  geometries.push(scanHeadGeo);
  const scanHead = new THREE.Mesh(scanHeadGeo, palette.kaptonGoldMat);
  scanHead.position.copy(scanEnd);
  scanHead.raycast = ignoreRaycast;
  root.add(scanHead);

  const lensGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.095, 14);
  lensGeo.rotateZ(Math.PI / 2);
  geometries.push(lensGeo);
  const lensA = new THREE.Mesh(lensGeo, palette.graphiteDarkMat);
  lensA.position.copy(scanEnd).add(new THREE.Vector3(0.08, 0.022, 0.02));
  lensA.raycast = ignoreRaycast;
  root.add(lensA);

  const lensB = new THREE.Mesh(lensGeo, palette.dishWhiteMat);
  lensB.scale.set(0.75, 0.7, 0.7);
  lensB.position.copy(scanEnd).add(new THREE.Vector3(0.07, -0.024, -0.02));
  lensB.raycast = ignoreRaycast;
  root.add(lensB);

  // 5. Magnetômetro Astromast + antenas chicote PRA/PWS em V
  const magEnd = new THREE.Vector3(-0.34, 0.88, -0.44);
  addProbeStrut(
    root,
    new THREE.Vector3(-0.08, 0.16, -0.12),
    magEnd,
    0.0085,
    palette.kaptonGoldMat,
    geometries
  );
  const magTipGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
  geometries.push(magTipGeo);
  const magTip = new THREE.Mesh(magTipGeo, palette.kaptonGoldMat);
  magTip.position.copy(magEnd);
  magTip.raycast = ignoreRaycast;
  root.add(magTip);

  addProbeStrut(
    root,
    new THREE.Vector3(0.08, -0.15, -0.13),
    new THREE.Vector3(0.52, -0.68, -0.42),
    0.0055,
    palette.titaniumStrutMat,
    geometries
  );
  addProbeStrut(
    root,
    new THREE.Vector3(0.04, -0.16, -0.13),
    new THREE.Vector3(-0.18, -0.76, -0.46),
    0.0055,
    palette.titaniumStrutMat,
    geometries
  );

  return root;
}

function buildNewHorizonsGroup(
  palette: ProbeMaterialPalette,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const root = new THREE.Group();

  // 1. Corpo triangular 'Grand Piano' revestido em manta térmica Kapton dourada
  const shape = new THREE.Shape();
  shape.moveTo(-0.38, -0.22);
  shape.lineTo(0.34, -0.24);
  shape.lineTo(0.28, 0.08);
  shape.lineTo(-0.04, 0.34);
  shape.lineTo(-0.34, 0.14);
  shape.closePath();

  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  geometries.push(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, palette.kaptonGoldMat);
  body.position.set(0, 0, -0.18);
  body.raycast = ignoreRaycast;
  root.add(body);

  // 2. Antena parabólica HGA branca de 2,1 m montada no convés superior (+Z)
  const dishGeo = createParabolicDishGeometry(0.31, 0.095, 32);
  geometries.push(dishGeo);
  const dish = new THREE.Mesh(dishGeo, palette.dishWhiteMat);
  dish.position.set(-0.02, 0.01, 0.01);
  dish.raycast = ignoreRaycast;
  root.add(dish);

  const subGeo = new THREE.CylinderGeometry(0.048, 0.038, 0.032, 18);
  subGeo.rotateX(Math.PI / 2);
  geometries.push(subGeo);
  const sub = new THREE.Mesh(subGeo, palette.kaptonGoldMat);
  sub.position.set(-0.02, 0.01, 0.2);
  sub.raycast = ignoreRaycast;
  root.add(sub);

  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3 + Math.PI / 2;
    addProbeStrut(
      root,
      new THREE.Vector3(-0.02 + Math.cos(ang) * 0.25, 0.01 + Math.sin(ang) * 0.25, 0.08),
      new THREE.Vector3(-0.02 + Math.cos(ang) * 0.03, 0.01 + Math.sin(ang) * 0.03, 0.195),
      0.008,
      palette.titaniumStrutMat,
      geometries
    );
  }

  // 3. Gerador nuclear GPHS-RTG preto cilíndrico com 4 aletas térmicas radiais (-X)
  const rtgGroup = new THREE.Group();
  rtgGroup.position.set(-0.5, -0.04, -0.1);
  const rtgCoreGeo = new THREE.CylinderGeometry(0.055, 0.062, 0.34, 16);
  rtgCoreGeo.rotateZ(Math.PI / 2);
  geometries.push(rtgCoreGeo);
  const rtgCore = new THREE.Mesh(rtgCoreGeo, palette.graphiteDarkMat);
  rtgCore.raycast = ignoreRaycast;
  rtgGroup.add(rtgCore);

  const finGeo = new THREE.BoxGeometry(0.3, 0.16, 0.01);
  geometries.push(finGeo);
  for (const rotX of [0, Math.PI / 2]) {
    const fin = new THREE.Mesh(finGeo, palette.graphiteDarkMat);
    fin.rotation.x = rotX;
    fin.raycast = ignoreRaycast;
    rtgGroup.add(fin);
  }
  root.add(rtgGroup);

  // 4. Telescópio óptico LORRI + espectrômetro Ralph
  const lorriOuterGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.14, 20);
  geometries.push(lorriOuterGeo);
  const lorriOuter = new THREE.Mesh(lorriOuterGeo, palette.kaptonGoldMat);
  lorriOuter.position.set(0.14, 0.26, -0.1);
  lorriOuter.rotation.z = -0.35;
  lorriOuter.raycast = ignoreRaycast;
  root.add(lorriOuter);

  const lorriBaffleGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.15, 18);
  geometries.push(lorriBaffleGeo);
  const lorriBaffle = new THREE.Mesh(lorriBaffleGeo, palette.graphiteDarkMat);
  lorriBaffle.position.copy(lorriOuter.position);
  lorriBaffle.rotation.copy(lorriOuter.rotation);
  lorriBaffle.raycast = ignoreRaycast;
  root.add(lorriBaffle);

  return root;
}

export interface BuiltProbeModel {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
}

export function buildProbeModelGroup(
  probeId: DeepSpaceProbeId,
  palette: ProbeMaterialPalette
): BuiltProbeModel {
  const geometries: THREE.BufferGeometry[] = [];
  const group =
    probeId === "JWST"
      ? buildJwstGroup(palette, geometries)
      : probeId === "NEW_HORIZONS"
        ? buildNewHorizonsGroup(palette, geometries)
        : buildVoyagerGroup(palette, geometries);

  return { group, geometries };
}

export function disposeBuiltProbeModel(model: BuiltProbeModel): void {
  for (const geo of model.geometries) {
    geo.dispose();
  }
}
