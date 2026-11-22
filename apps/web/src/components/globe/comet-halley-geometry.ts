/**
 * Geometria e texturas procedurais do cometa Halley (núcleo esculpido, plumas e caudas). Separadas do
 * componente na T36; `CometHalleyTrajectory.tsx` re-exporta as funções públicas.
 */
import * as THREE from "three";

export const ION_PARTICLE_COUNT = 320;
export const DUST_PARTICLE_COUNT = 380;

/** Deterministic PRNG (Mulberry32) so nucleus sculpture and particle clouds are reproducible. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth deterministic 3D value noise for procedural rocky terrain displacement. */
export function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const c000 = hash3(ix, iy, iz);
  const c100 = hash3(ix + 1, iy, iz);
  const c010 = hash3(ix, iy + 1, iz);
  const c110 = hash3(ix + 1, iy + 1, iz);
  const c001 = hash3(ix, iy, iz + 1);
  const c101 = hash3(ix + 1, iy, iz + 1);
  const c011 = hash3(ix, iy + 1, iz + 1);
  const c111 = hash3(ix + 1, iy + 1, iz + 1);

  const x00 = c000 + (c100 - c000) * ux;
  const x10 = c010 + (c110 - c010) * ux;
  const x01 = c001 + (c101 - c001) * ux;
  const x11 = c011 + (c111 - c011) * ux;

  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

export function fbm3D(x: number, y: number, z: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    value += amp * noise3D(x * freq, y * freq, z * freq);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

/**
 * Generates an ultra-smooth radial falloff RGBA DataTexture (works identically in GPU and Node/SSR).
 */
export function createRadialFalloffTexture(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const half = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.sqrt(dx * dx + dy * dy);
      // Combination of bright core + soft Gaussian halo vanishing strictly to 0 at r = 1
      const falloff =
        r >= 1
          ? 0
          : Math.pow(1 - r, 2.2) * (0.45 + 0.55 * Math.exp(-r * r * 5.2));

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.min(255, Math.round(falloff * 255));
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds an orthonormal basis (u, v) perpendicular to a given unit direction vector.
 */
export function buildPerpendicularBasis(dir: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const ref = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(dir, ref).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();
  return [u, v];
}

/**
 * Builds 1P/Halley's sculpted bilobed ("peanut") carbonaceous-icy nucleus geometry
 * inspired by ESA Giotto flyby imagery (15 × 8 × 8 km proportion), with procedural
 * rocky ridges, impact craters, seamless smooth vertex normals, and per-vertex terrain attributes.
 */
export function buildHalleyNucleusGeometry(): THREE.BufferGeometry {
  const widthSegments = 56;
  const heightSegments = 40;
  const geo = new THREE.SphereGeometry(0.095, widthSegments, heightSegments);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const vertexCount = pos.count;
  const terrain = new Float32Array(vertexCount * 3); // x: ridge height, y: crater AO, z: ice vent mask

  // 10 deterministic crater centers on unit sphere
  const rand = createSeededRandom(19860314); // Giotto closest approach 1986-03-14
  const craters: Array<{ dir: THREE.Vector3; radius: number; depth: number }> = [];
  for (let i = 0; i < 10; i++) {
    const theta = rand() * Math.PI * 2;
    const u = rand() * 2 - 1;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    craters.push({
      dir: new THREE.Vector3(s * Math.cos(theta), u, s * Math.sin(theta)).normalize(),
      radius: 0.24 + rand() * 0.24,
      depth: 0.08 + rand() * 0.08,
    });
  }

  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();

  for (let i = 0; i < vertexCount; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const baseR = v.length();
    dir.copy(v).divideScalar(baseR || 1);

    // Multi-octave rocky displacement + bilobed waist pinch
    const rocky = fbm3D(dir.x * 2.6 + 3.1, dir.y * 2.6 + 1.7, dir.z * 2.6 + 5.3);
    const fine = fbm3D(dir.x * 6.8 - 2.4, dir.y * 6.8 + 4.2, dir.z * 6.8 - 1.9);

    let displacement = 1.0 + (rocky - 0.5) * 0.34 + (fine - 0.5) * 0.12;
    let craterAO = 1.0;

    for (const crater of craters) {
      const dist = dir.distanceTo(crater.dir);
      if (dist < crater.radius) {
        const q = dist / crater.radius;
        // Parabolic bowl + subtle raised rim around q ~ 0.85
        const bowl = -(1 - q * q) * crater.depth;
        const rim = Math.exp(-Math.pow((q - 0.86) / 0.14, 2)) * crater.depth * 0.32;
        displacement += bowl + rim;
        craterAO = Math.min(craterAO, 0.42 + 0.58 * q * q);
      }
    }

    // Halley's elongated bilobed silhouette (~1.65 : 0.92 : 0.86) with subtle neck pinch
    const pinch = 1.0 - 0.22 * Math.exp(-dir.x * dir.x * 5.2);
    const sx = dir.x * baseR * displacement * 1.65;
    const sy = dir.y * baseR * displacement * 0.94 * pinch + Math.sin(dir.x * 2.8) * 0.012;
    const sz = dir.z * baseR * displacement * 0.86 * pinch;

    pos.setXYZ(i, sx, sy, sz);

    // Ice vent fissures concentrated in rugged ridges & bright active pockets
    const ventNoise = noise3D(dir.x * 5.2 + 9.1, dir.y * 5.2 - 3.7, dir.z * 5.2 + 2.2);
    const iceMask = Math.max(0, Math.min(1, (ventNoise - 0.62) / 0.26));

    terrain[i * 3] = Math.max(0, Math.min(1, rocky));
    terrain[i * 3 + 1] = craterAO;
    terrain[i * 3 + 2] = iceMask;
  }

  geo.setAttribute("aTerrain", new THREE.BufferAttribute(terrain, 3));
  geo.computeVertexNormals();

  // Weld vertex normals seamlessly across the SphereGeometry longitude seam (ix = 0 and ix = widthSegments)
  const norm = geo.getAttribute("normal") as THREE.BufferAttribute;
  const stride = widthSegments + 1;
  const avg = new THREE.Vector3();
  for (let iy = 0; iy <= heightSegments; iy++) {
    const i0 = iy * stride;
    const i1 = iy * stride + widthSegments;
    avg
      .set(
        norm.getX(i0) + norm.getX(i1),
        norm.getY(i0) + norm.getY(i1),
        norm.getZ(i0) + norm.getZ(i1)
      )
      .normalize();
    norm.setXYZ(i0, avg.x, avg.y, avg.z);
    norm.setXYZ(i1, avg.x, avg.y, avg.z);
  }
  norm.needsUpdate = true;

  return geo;
}

/**
 * Builds the volumetric tapered shell geometry for the straight anti-solar ion tail.
 */
export function buildIonPlumeGeometry(
  tailDirection: THREE.Vector3,
  tailLength: number,
  lengthSegments = 44,
  radialSegments = 20
): THREE.BufferGeometry {
  const axis = tailDirection.clone().normalize();
  const [u, v] = buildPerpendicularBasis(axis);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const TWO_PI = Math.PI * 2;

  for (let iy = 0; iy <= lengthSegments; iy++) {
    const t = iy / lengthSegments;
    const dist = 0.06 + t * tailLength;
    const radius = 0.14 + Math.pow(t, 0.85) * 0.62;

    for (let ix = 0; ix <= radialSegments; ix++) {
      const s = ix / radialSegments;
      const angle = s * TWO_PI;
      const ca = Math.cos(angle) * radius;
      const sa = Math.sin(angle) * radius;

      positions.push(
        axis.x * dist + u.x * ca + v.x * sa,
        axis.y * dist + u.y * ca + v.y * sa,
        axis.z * dist + u.z * ca + v.z * sa
      );
      uvs.push(s, t);
    }
  }

  const stride = radialSegments + 1;
  for (let iy = 0; iy < lengthSegments; iy++) {
    for (let ix = 0; ix < radialSegments; ix++) {
      const a = iy * stride + ix;
      const b = (iy + 1) * stride + ix;
      const c = (iy + 1) * stride + (ix + 1);
      const d = iy * stride + (ix + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the volumetric curved elliptical fan geometry for the warm dust tail,
 * curving smoothly from anti-solar toward the trailing orbital path (-orbitalVelocityDirection).
 */
export function buildDustPlumeGeometry(
  tailDirection: THREE.Vector3,
  orbitalVelocityDirection: THREE.Vector3,
  dustTailLength: number,
  lengthSegments = 44,
  radialSegments = 20
): THREE.BufferGeometry {
  const antiSolar = tailDirection.clone().normalize();
  const trailing = orbitalVelocityDirection.clone().normalize().negate();
  const curveDir = trailing.clone().addScaledVector(antiSolar, -trailing.dot(antiSolar));
  if (curveDir.lengthSq() < 1e-6) {
    const [fallback] = buildPerpendicularBasis(antiSolar);
    curveDir.copy(fallback);
  } else {
    curveDir.normalize();
  }
  const binormal = new THREE.Vector3().crossVectors(antiSolar, curveDir).normalize();

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const TWO_PI = Math.PI * 2;
  const center = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const frameNormal = new THREE.Vector3();

  for (let iy = 0; iy <= lengthSegments; iy++) {
    const t = iy / lengthSegments;
    const along = 0.08 + t * dustTailLength * (1 - 0.12 * t);
    const curve = Math.pow(t, 1.8) * dustTailLength * 0.44;

    center
      .copy(antiSolar)
      .multiplyScalar(along)
      .addScaledVector(curveDir, curve);

    // Analytic tangent along centerline to orient cross-section cleanly
    const dAlong = dustTailLength * (1 - 0.24 * t);
    const dCurve = 1.8 * Math.pow(Math.max(t, 1e-4), 0.8) * dustTailLength * 0.44;
    tangent
      .copy(antiSolar)
      .multiplyScalar(dAlong)
      .addScaledVector(curveDir, dCurve)
      .normalize();
    frameNormal.crossVectors(binormal, tangent).normalize();

    // Wider elliptical fan in the orbital plane
    const rPlane = 0.2 + Math.pow(t, 0.95) * 1.75;
    const rOut = 0.16 + Math.pow(t, 0.95) * 0.92;

    for (let ix = 0; ix <= radialSegments; ix++) {
      const s = ix / radialSegments;
      const angle = s * TWO_PI;
      const cp = Math.cos(angle) * rPlane;
      const co = Math.sin(angle) * rOut;

      positions.push(
        center.x + frameNormal.x * cp + binormal.x * co,
        center.y + frameNormal.y * cp + binormal.y * co,
        center.z + frameNormal.z * cp + binormal.z * co
      );
      uvs.push(s, t);
    }
  }

  const stride = radialSegments + 1;
  for (let iy = 0; iy < lengthSegments; iy++) {
    for (let ix = 0; ix < radialSegments; ix++) {
      const a = iy * stride + ix;
      const b = (iy + 1) * stride + ix;
      const c = (iy + 1) * stride + (ix + 1);
      const d = iy * stride + (ix + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the straight, narrow, bluish anti-solar ion (plasma) tail particle cloud.
 */
export function buildIonTailGeometry(
  tailDirection: THREE.Vector3,
  tailLength: number,
  count = ION_PARTICLE_COUNT
): THREE.BufferGeometry {
  const rand = createSeededRandom(19860209);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const axis = tailDirection.clone().normalize();
  const [u, v] = buildPerpendicularBasis(axis);
  const TWO_PI = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const t = Math.pow(rand(), 1.35);
    const angle = rand() * TWO_PI;
    const radial = Math.sqrt(rand());

    const along = 0.08 + t * tailLength;
    const spread = (0.06 + 0.42 * t) * radial;
    const c = Math.cos(angle) * spread;
    const s = Math.sin(angle) * spread;

    positions[i * 3] = axis.x * along + u.x * c + v.x * s;
    positions[i * 3 + 1] = axis.y * along + u.y * c + v.y * s;
    positions[i * 3 + 2] = axis.z * along + u.z * c + v.z * s;

    const intensity = Math.pow(1 - t, 1.15);
    colors[i * 3] = (0.72 * (1 - t) + 0.2 * t) * intensity;
    colors[i * 3 + 1] = (0.94 * (1 - t) + 0.62 * t) * intensity;
    colors[i * 3 + 2] = (1.0 * (1 - t) + 0.98 * t) * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Builds the broader, warm yellowish dust tail particle cloud curving smoothly from the
 * anti-solar direction toward the trailing orbital path (-orbitalVelocityDirection).
 */
export function buildDustTailGeometry(
  tailDirection: THREE.Vector3,
  orbitalVelocityDirection: THREE.Vector3,
  dustTailLength: number,
  count = DUST_PARTICLE_COUNT
): THREE.BufferGeometry {
  const rand = createSeededRandom(19860411);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const antiSolar = tailDirection.clone().normalize();
  const trailing = orbitalVelocityDirection.clone().normalize().negate();

  const curveDir = trailing.clone().addScaledVector(antiSolar, -trailing.dot(antiSolar));
  if (curveDir.lengthSq() < 1e-6) {
    const [fallback] = buildPerpendicularBasis(antiSolar);
    curveDir.copy(fallback);
  } else {
    curveDir.normalize();
  }
  const binormal = new THREE.Vector3().crossVectors(antiSolar, curveDir).normalize();
  const TWO_PI = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const t = Math.pow(rand(), 1.25);
    const angle = rand() * TWO_PI;
    const radial = Math.sqrt(rand());

    const along = 0.08 + t * dustTailLength * (1 - 0.12 * t);
    const curveOffset = Math.pow(t, 1.8) * dustTailLength * 0.44;
    const fanSpread = (0.09 + 1.05 * Math.pow(t, 1.1)) * radial;

    const cOffset = curveOffset + Math.cos(angle) * fanSpread;
    const bOffset = Math.sin(angle) * fanSpread * 0.58;

    positions[i * 3] = antiSolar.x * along + curveDir.x * cOffset + binormal.x * bOffset;
    positions[i * 3 + 1] = antiSolar.y * along + curveDir.y * cOffset + binormal.y * bOffset;
    positions[i * 3 + 2] = antiSolar.z * along + curveDir.z * cOffset + binormal.z * bOffset;

    const intensity = Math.pow(1 - t, 1.2);
    colors[i * 3] = (1.0 * (1 - t) + 0.96 * t) * intensity;
    colors[i * 3 + 1] = (0.94 * (1 - t) + 0.76 * t) * intensity;
    colors[i * 3 + 2] = (0.78 * (1 - t) + 0.44 * t) * intensity;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
