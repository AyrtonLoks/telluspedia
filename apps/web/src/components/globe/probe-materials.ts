/**
 * Texturas procedurais determinísticas (`THREE.DataTexture`) e materiais PBR para sondas espaciais (D41):
 * - Folha térmica multicamada Kapton dourada amarrotada (MLI — Voyager, New Horizons, barramento JWST);
 * - Compósito térmico branco com nervuras radiais (antenas parabólicas HGA de alto ganho);
 * - Escudo térmico Kapton/VDA de 5 camadas e berílio folheado a ouro óptico (JWST);
 * - Mapa de reflexão equirretangular cósmico (luz solar quente + faixa estelar fria) para brilho
 *   metálico realista em qualquer distância heliocêntrica (1 a 170+ UA), com `.dispose()` integral (RN21).
 */

import * as THREE from "three";

export interface ProbeMaterialPalette {
  envMap: THREE.DataTexture;
  kaptonGoldMat: THREE.MeshStandardMaterial;
  mirrorGoldMat: THREE.MeshStandardMaterial;
  dishWhiteMat: THREE.MeshStandardMaterial;
  sunshieldSilverMat: THREE.MeshStandardMaterial;
  sunshieldRoseMat: THREE.MeshStandardMaterial;
  graphiteDarkMat: THREE.MeshStandardMaterial;
  titaniumStrutMat: THREE.MeshStandardMaterial;
  solarCellMat: THREE.MeshStandardMaterial;
  goldenRecordMat: THREE.MeshStandardMaterial;
  textures: THREE.Texture[];
  materials: THREE.Material[];
}

function hash2d(ix: number, iy: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Mapa de ambiente cósmico 128×64 para reflexos metálicos GGX nítidos no espaço profundo. */
function createCosmicEnvTexture(): THREE.DataTexture {
  const width = 128;
  const height = 64;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const theta = u * Math.PI * 2;
      const dx = sinPhi * Math.cos(theta);
      const dy = cosPhi;
      const dz = sinPhi * Math.sin(theta);

      // Sol principal em (+0.55, +0.42, +0.72) + contra-luz fria galáctica em (-0.6, +0.35, -0.7)
      const sunDot = Math.max(0, dx * 0.55 + dy * 0.42 + dz * 0.72);
      const rimDot = Math.max(0, -dx * 0.58 + dy * 0.36 - dz * 0.73);
      const band = Math.exp(-Math.pow((dy - 0.12 * dx) * 3.2, 2));

      const sunGlow = Math.pow(sunDot, 22) * 1.9 + Math.pow(sunDot, 3) * 0.52;
      const rimGlow = Math.pow(rimDot, 8) * 0.72 + Math.pow(rimDot, 2) * 0.24;
      const base = 0.14 + 0.18 * band;

      const r = Math.min(255, Math.round((base * 0.85 + sunGlow * 1.05 + rimGlow * 0.55) * 255));
      const g = Math.min(255, Math.round((base * 0.92 + sunGlow * 0.95 + rimGlow * 0.78) * 255));
      const b = Math.min(255, Math.round((base * 1.12 + sunGlow * 0.78 + rimGlow * 1.08) * 255));

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Texturas de cor e relevo amarrotado (crinkle) da manta térmica Kapton MLI dourada. */
function createKaptonFoilTextures(): { map: THREE.DataTexture; bump: THREE.DataTexture } {
  const size = 64;
  const colorData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = valueNoise(x * 0.36, y * 0.36);
      const n2 = valueNoise(x * 0.85 + 11.3, y * 0.85 + 7.1);
      const ridge = 1 - Math.abs(n1 * 2 - 1);
      const crinkle = Math.min(1, Math.max(0, ridge * 0.68 + n2 * 0.32));

      const shade = 0.76 + crinkle * 0.34;
      const idx = (y * size + x) * 4;
      colorData[idx] = Math.min(255, Math.round(218 * shade));
      colorData[idx + 1] = Math.min(255, Math.round(158 * shade));
      colorData[idx + 2] = Math.min(255, Math.round(44 * shade));
      colorData[idx + 3] = 255;

      const h = Math.round(crinkle * 255);
      bumpData[idx] = h;
      bumpData[idx + 1] = h;
      bumpData[idx + 2] = h;
      bumpData[idx + 3] = 255;
    }
  }

  const map = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;

  const bump = new THREE.DataTexture(bumpData, size, size, THREE.RGBAFormat);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.magFilter = THREE.LinearFilter;
  bump.minFilter = THREE.LinearFilter;
  bump.needsUpdate = true;

  return { map, bump };
}

/** Textura com nervuras estruturais concêntricas/radiais para antenas parabólicas HGA brancas. */
function createDishCompositeTextures(): { map: THREE.DataTexture; bump: THREE.DataTexture } {
  const size = 64;
  const colorData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const ringRib = Math.pow(Math.abs(Math.sin(v * Math.PI * 6)), 10);
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const radialRib = Math.pow(Math.abs(Math.cos(u * Math.PI * 12)), 14);
      const rib = Math.max(ringRib * 0.55, radialRib * 0.75);
      const base = 232 - Math.round(rib * 24);
      const idx = (y * size + x) * 4;
      colorData[idx] = base;
      colorData[idx + 1] = Math.min(255, base + 4);
      colorData[idx + 2] = Math.min(255, base + 10);
      colorData[idx + 3] = 255;

      const h = Math.round(128 + rib * 110);
      bumpData[idx] = h;
      bumpData[idx + 1] = h;
      bumpData[idx + 2] = h;
      bumpData[idx + 3] = 255;
    }
  }

  const map = new THREE.DataTexture(colorData, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;

  const bump = new THREE.DataTexture(bumpData, size, size, THREE.RGBAFormat);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.ClampToEdgeWrapping;
  bump.magFilter = THREE.LinearFilter;
  bump.minFilter = THREE.LinearFilter;
  bump.needsUpdate = true;

  return { map, bump };
}

/** Textura de células fotovoltaicas azul-cobalto com trilhas prateadas (painel solar do JWST). */
function createSolarPanelTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const gy = y % 8 === 0;
    for (let x = 0; x < size; x++) {
      const gx = x % 16 === 0;
      const grid = gx || gy;
      const idx = (y * size + x) * 4;
      data[idx] = grid ? 148 : 22;
      data[idx + 1] = grid ? 168 : 54;
      data[idx + 2] = grid ? 196 : 118;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createProbeMaterialPalette(): ProbeMaterialPalette {
  const envMap = createCosmicEnvTexture();
  const kapton = createKaptonFoilTextures();
  const dish = createDishCompositeTextures();
  const solarTex = createSolarPanelTexture();

  const kaptonGoldMat = new THREE.MeshStandardMaterial({
    map: kapton.map,
    bumpMap: kapton.bump,
    bumpScale: 0.018,
    metalness: 0.88,
    roughness: 0.25,
    envMap,
    envMapIntensity: 1.45,
  });

  const mirrorGoldMat = new THREE.MeshStandardMaterial({
    color: "#f6c12b",
    emissive: "#3b2704",
    emissiveIntensity: 0.18,
    metalness: 0.96,
    roughness: 0.11,
    envMap,
    envMapIntensity: 1.75,
  });

  const dishWhiteMat = new THREE.MeshStandardMaterial({
    map: dish.map,
    bumpMap: dish.bump,
    bumpScale: 0.012,
    emissive: "#1e293b",
    emissiveIntensity: 0.16,
    metalness: 0.14,
    roughness: 0.44,
    side: THREE.DoubleSide,
    envMap,
    envMapIntensity: 0.85,
  });

  const sunshieldSilverMat = new THREE.MeshStandardMaterial({
    color: "#dde5f2",
    metalness: 0.86,
    roughness: 0.2,
    side: THREE.DoubleSide,
    envMap,
    envMapIntensity: 1.35,
  });

  const sunshieldRoseMat = new THREE.MeshStandardMaterial({
    color: "#d9b2c0",
    metalness: 0.8,
    roughness: 0.24,
    side: THREE.DoubleSide,
    envMap,
    envMapIntensity: 1.3,
  });

  const graphiteDarkMat = new THREE.MeshStandardMaterial({
    color: "#1e2633",
    emissive: "#0b0f17",
    emissiveIntensity: 0.2,
    metalness: 0.52,
    roughness: 0.46,
    envMap,
    envMapIntensity: 0.95,
  });

  const titaniumStrutMat = new THREE.MeshStandardMaterial({
    color: "#94a3b8",
    metalness: 0.78,
    roughness: 0.3,
    envMap,
    envMapIntensity: 1.2,
  });

  const solarCellMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    metalness: 0.55,
    roughness: 0.24,
    side: THREE.DoubleSide,
    envMap,
    envMapIntensity: 1.2,
  });

  const goldenRecordMat = new THREE.MeshStandardMaterial({
    color: "#facc15",
    emissive: "#422006",
    emissiveIntensity: 0.22,
    metalness: 0.95,
    roughness: 0.14,
    envMap,
    envMapIntensity: 1.7,
  });

  return {
    envMap,
    kaptonGoldMat,
    mirrorGoldMat,
    dishWhiteMat,
    sunshieldSilverMat,
    sunshieldRoseMat,
    graphiteDarkMat,
    titaniumStrutMat,
    solarCellMat,
    goldenRecordMat,
    textures: [envMap, kapton.map, kapton.bump, dish.map, dish.bump, solarTex],
    materials: [
      kaptonGoldMat,
      mirrorGoldMat,
      dishWhiteMat,
      sunshieldSilverMat,
      sunshieldRoseMat,
      graphiteDarkMat,
      titaniumStrutMat,
      solarCellMat,
      goldenRecordMat,
    ],
  };
}

export function disposeProbeMaterialPalette(palette: ProbeMaterialPalette): void {
  for (const mat of palette.materials) {
    mat.dispose();
  }
  for (const tex of palette.textures) {
    tex.dispose();
  }
}
