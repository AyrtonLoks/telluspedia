/**
 * Modelo 3D multicomponente do Telescópio Espacial James Webb (`JWST · L2`, D41):
 * - Escudo térmico em losango (kite) com 5 camadas separadas de Kapton/VDA e arqueamento catenário;
 * - Espelho primário segmentado com 18 hexágonos individuais de berílio folheado a ouro + colmeia traseira;
 * - Defletor central Cassegrain preto, módulo científico ISIM, tripé do espelho secundário e barramento solar.
 */

import * as THREE from "three";
import type { ProbeMaterialPalette } from "./probe-materials";

const ignoreRaycast = () => null;

export function addProbeStrut(
  parent: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  geometries: THREE.BufferGeometry[]
): void {
  const delta = end.clone().sub(start);
  const len = delta.length();
  if (len < 1e-5) return;
  const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
  geometries.push(geo);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.raycast = ignoreRaycast;
  parent.add(mesh);
}

export function buildJwstGroup(
  palette: ProbeMaterialPalette,
  geometries: THREE.BufferGeometry[]
): THREE.Group {
  const root = new THREE.Group();

  // 1. Escudo térmico em losango (kite) de 5 camadas separadas de Kapton/VDA (+Z voltado ao Sol/Terra)
  for (let layer = 0; layer < 5; layer++) {
    const scale = 1 - layer * 0.025;
    const z = 0.04 - layer * 0.022;
    const kite = new THREE.Shape();
    kite.moveTo(0.58 * scale, 0);
    kite.lineTo(0.06 * scale, 0.31 * scale);
    kite.lineTo(-0.52 * scale, 0);
    kite.lineTo(0.06 * scale, -0.31 * scale);
    kite.closePath();

    const sGeo = new THREE.ShapeGeometry(kite);
    const posAttr = sGeo.getAttribute("position");
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      posAttr.setZ(i, -0.016 * (px * px) + 0.01 * Math.abs(py));
    }
    sGeo.computeVertexNormals();
    geometries.push(sGeo);

    const sheet = new THREE.Mesh(
      sGeo,
      layer === 0 ? palette.sunshieldRoseMat : palette.sunshieldSilverMat
    );
    sheet.position.set(0, 0, z);
    sheet.raycast = ignoreRaycast;
    root.add(sheet);
  }

  for (const [vx, vy] of [
    [0.56, 0],
    [-0.5, 0],
    [0.06, 0.3],
    [0.06, -0.3],
  ] as const) {
    addProbeStrut(
      root,
      new THREE.Vector3(vx, vy, 0.055),
      new THREE.Vector3(vx * 0.9, vy * 0.9, -0.065),
      0.008,
      palette.graphiteDarkMat,
      geometries
    );
  }

  // 2. Conjunto óptico frio (-Z): 18 hexágonos de berílio folheado a ouro voltados ao espaço profundo
  const mirrorAssembly = new THREE.Group();
  mirrorAssembly.position.set(-0.04, 0, -0.22);
  // Inclina o espelho em três-quartos para expor os 18 hexágonos dourados acima do escudo de 5 camadas
  mirrorAssembly.rotation.y = 0.42;
  root.add(mirrorAssembly);

  const pitch = 0.058;
  const segRadius = pitch * 0.92;
  const hexGeo = new THREE.CylinderGeometry(segRadius, segRadius, 0.012, 6);
  hexGeo.rotateZ(-Math.PI / 2);
  hexGeo.rotateX(Math.PI / 6);
  geometries.push(hexGeo);

  const backHexGeo = new THREE.CylinderGeometry(pitch * 0.98, pitch * 0.98, 0.018, 6);
  backHexGeo.rotateZ(-Math.PI / 2);
  backHexGeo.rotateX(Math.PI / 6);
  geometries.push(backHexGeo);

  const focalPoint = new THREE.Vector3(0.68, 0, 0);
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const s = -q - r;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
      if (ring === 0 || ring > 2) continue;

      const u = pitch * 1.5 * q;
      const v = pitch * Math.sqrt(3) * (r + q * 0.5);
      const segPos = new THREE.Vector3((u * u + v * v) * 0.18, v, u);

      const seg = new THREE.Mesh(hexGeo, palette.mirrorGoldMat);
      seg.position.copy(segPos);
      seg.quaternion.setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        focalPoint.clone().sub(segPos).normalize()
      );
      seg.raycast = ignoreRaycast;
      mirrorAssembly.add(seg);

      const backSeg = new THREE.Mesh(backHexGeo, palette.graphiteDarkMat);
      backSeg.position.copy(segPos).add(new THREE.Vector3(-0.015, 0, 0));
      backSeg.quaternion.copy(seg.quaternion);
      backSeg.raycast = ignoreRaycast;
      mirrorAssembly.add(backSeg);
    }
  }

  const baffleGeo = new THREE.ConeGeometry(0.044, 0.14, 18);
  baffleGeo.rotateZ(-Math.PI / 2);
  geometries.push(baffleGeo);
  const baffle = new THREE.Mesh(baffleGeo, palette.graphiteDarkMat);
  baffle.position.set(0.06, 0, 0);
  baffle.raycast = ignoreRaycast;
  mirrorAssembly.add(baffle);

  const isimGeo = new THREE.BoxGeometry(0.14, 0.16, 0.16);
  geometries.push(isimGeo);
  const isim = new THREE.Mesh(isimGeo, palette.graphiteDarkMat);
  isim.position.set(-0.09, 0, 0);
  isim.raycast = ignoreRaycast;
  mirrorAssembly.add(isim);

  addProbeStrut(
    root,
    new THREE.Vector3(-0.08, 0, -0.05),
    new THREE.Vector3(-0.12, 0, -0.22),
    0.028,
    palette.graphiteDarkMat,
    geometries
  );

  // 3. Tripé dobrável + espelho secundário convexo dourado à frente da colmeia (+X)
  const secPos = new THREE.Vector3(0.36, 0, 0);
  for (const anchor of [
    new THREE.Vector3(0.01, 0, -0.21),
    new THREE.Vector3(0.01, 0.18, 0.13),
    new THREE.Vector3(0.01, -0.18, 0.13),
  ]) {
    addProbeStrut(mirrorAssembly, anchor, secPos, 0.0085, palette.graphiteDarkMat, geometries);
  }

  const secHousingGeo = new THREE.CylinderGeometry(0.042, 0.034, 0.032, 20);
  secHousingGeo.rotateZ(Math.PI / 2);
  geometries.push(secHousingGeo);
  const secHousing = new THREE.Mesh(secHousingGeo, palette.graphiteDarkMat);
  secHousing.position.copy(secPos);
  secHousing.raycast = ignoreRaycast;
  mirrorAssembly.add(secHousing);

  const secMirrorGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.008, 20);
  secMirrorGeo.rotateZ(Math.PI / 2);
  geometries.push(secMirrorGeo);
  const secMirror = new THREE.Mesh(secMirrorGeo, palette.mirrorGoldMat);
  secMirror.position.copy(secPos).add(new THREE.Vector3(-0.016, 0, 0));
  secMirror.raycast = ignoreRaycast;
  mirrorAssembly.add(secMirror);

  // 4. Barramento quente voltado ao Sol (+Z) + painel fotovoltaico traseiro
  const warmBusGeo = new THREE.BoxGeometry(0.16, 0.13, 0.08);
  geometries.push(warmBusGeo);
  const warmBus = new THREE.Mesh(warmBusGeo, palette.kaptonGoldMat);
  warmBus.position.set(-0.06, 0, 0.09);
  warmBus.raycast = ignoreRaycast;
  root.add(warmBus);

  const solarGeo = new THREE.BoxGeometry(0.28, 0.09, 0.008);
  geometries.push(solarGeo);
  const solarPanel = new THREE.Mesh(solarGeo, palette.solarCellMat);
  solarPanel.position.set(-0.27, -0.02, 0.12);
  solarPanel.rotation.y = 0.28;
  solarPanel.raycast = ignoreRaycast;
  root.add(solarPanel);

  return root;
}
