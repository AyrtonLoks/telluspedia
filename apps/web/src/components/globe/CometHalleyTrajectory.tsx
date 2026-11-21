"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useSolarSystemVisible } from "@/stores/cosmicExitStore";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { cn } from "@/components/ui/cn";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  calculateHalleyPosition,
  generateHalleyOrbitalPath,
  ASTROPHYSICAL_CATALOG,
} from "@/lib/astronomy-planets";
import { celestialLabelPriority } from "@/lib/cosmic-scale";
import { CelestialLabel } from "./CelestialLabel";

import { isDragRelease } from "@/lib/pointer-intent";
const ION_PARTICLE_COUNT = 320;
const DUST_PARTICLE_COUNT = 380;

/** Deterministic PRNG (Mulberry32) so nucleus sculpture and particle clouds are reproducible. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth deterministic 3D value noise for procedural rocky terrain displacement. */
function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3D(x: number, y: number, z: number): number {
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

function fbm3D(x: number, y: number, z: number): number {
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
function buildPerpendicularBasis(dir: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
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
 * World-space solar-lit carbonaceous & icy-vent shader for Halley's sculpted nucleus.
 * Strictly respects AGENTS.md §1 GLSL World-Space Normal Invariant.
 */
const halleyNucleusVertexShader = `
attribute vec3 aTerrain;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying vec3 vTerrain;

void main() {
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vLocalPos = position;
  vTerrain = aTerrain;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const halleyNucleusFragmentShader = `
uniform float uActivity;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying vec3 vTerrain;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

void main() {
  vec3 baseN = normalize(vWorldNormal);
  vec3 sunDir = normalize(-vWorldPos);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  // Analytical 3D micro-relief gradient for crisp rocky detail up close (no derivatives extension required)
  vec3 p = vLocalPos * 42.0;
  float eps = 0.08;
  float n0 = vnoise(p) * 0.65 + vnoise(p * 2.3) * 0.35;
  float nx = vnoise(p + vec3(eps, 0.0, 0.0)) * 0.65 + vnoise((p + vec3(eps, 0.0, 0.0)) * 2.3) * 0.35;
  float ny = vnoise(p + vec3(0.0, eps, 0.0)) * 0.65 + vnoise((p + vec3(0.0, eps, 0.0)) * 2.3) * 0.35;
  float nz = vnoise(p + vec3(0.0, 0.0, eps)) * 0.65 + vnoise((p + vec3(0.0, 0.0, eps)) * 2.3) * 0.35;
  vec3 grad = vec3(nx - n0, ny - n0, nz - n0) / eps;
  vec3 N = normalize(baseN - grad * 0.28);

  float ndotl = dot(N, sunDir);
  float diffuse = max(0.0, ndotl);
  float softTerminator = smoothstep(-0.18, 0.45, ndotl);

  // Carbonaceous dark crust with dusty ridges and icy blue-white fissures
  float ridge = vTerrain.x;
  float ao = vTerrain.y;
  float iceVent = vTerrain.z;

  vec3 darkCrust = vec3(0.09, 0.10, 0.13);
  vec3 dustRidge = vec3(0.32, 0.31, 0.33);
  vec3 iceColor = vec3(0.70, 0.88, 0.98);

  vec3 albedo = mix(darkCrust, dustRidge, clamp(ridge * 0.75 + n0 * 0.35, 0.0, 1.0));
  albedo = mix(albedo, iceColor, iceVent * 0.55);
  albedo *= ao;

  // Specular glint on exposed ice patches facing sunlight
  vec3 halfVec = normalize(sunDir + viewDir);
  float spec = pow(max(0.0, dot(N, halfVec)), 28.0) * (0.08 + iceVent * 0.55) * diffuse;

  // Cool starlight ambient fill + icy Fresnel silhouette rim so night side stays sculptural
  float fresnel = pow(1.0 - max(0.0, dot(baseN, viewDir)), 2.8);
  vec3 rimColor = mix(vec3(0.28, 0.42, 0.58), vec3(0.45, 0.85, 1.0), uActivity);

  vec3 color = albedo * (0.14 + diffuse * 1.45) + vec3(0.85, 0.94, 1.0) * spec;
  color += rimColor * fresnel * (0.32 + uActivity * 0.45);

  // Active sunlit sublimation vents erupting near perihelion
  color += vec3(0.50, 0.90, 1.0) * iceVent * softTerminator * uActivity * 0.85;

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Volumetric additive ion (plasma) plume shader — straight anti-solar streamers with soft Fresnel edge falloff.
 */
const ionPlumeVertexShader = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const ionPlumeFragmentShader = `
uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  // Soft volumetric edge falloff eliminates hard tube silhouettes from every camera angle
  float edgeSoft = pow(abs(dot(normalize(vWorldNormal), viewDir)), 1.45);
  float alongFade = smoothstep(0.0, 0.09, vUv.y) * pow(max(0.0, 1.0 - vUv.y), 1.4);

  // Animated solar-wind plasma striations flowing away from the Sun
  float streak1 = 0.65 + 0.35 * sin(vUv.x * 25.1327 + vUv.y * 5.0 - uTime * 3.0);
  float streak2 = 0.75 + 0.25 * cos(vUv.x * 12.5664 - vUv.y * 9.0 + uTime * 2.1);
  float filament = streak1 * streak2;

  vec3 coreColor = vec3(0.82, 0.97, 1.0);
  vec3 midColor = vec3(0.22, 0.72, 0.98);
  vec3 tipColor = vec3(0.14, 0.36, 0.92);
  vec3 col = mix(coreColor, midColor, smoothstep(0.0, 0.35, vUv.y));
  col = mix(col, tipColor, smoothstep(0.35, 1.0, vUv.y));

  float alpha = edgeSoft * alongFade * filament * uOpacity * 0.72;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/**
 * Volumetric additive curved dust plume shader — broad warm solar-lit fan with silky edge falloff.
 */
const dustPlumeVertexShader = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const dustPlumeFragmentShader = `
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float edgeSoft = pow(abs(dot(normalize(vWorldNormal), viewDir)), 1.65);
  float alongFade = smoothstep(0.0, 0.11, vUv.y) * pow(max(0.0, 1.0 - vUv.y), 1.3);
  float band = 0.82 + 0.18 * sin(vUv.x * 12.5664 + vUv.y * 2.5);

  vec3 coreColor = vec3(1.0, 0.95, 0.80);
  vec3 midColor = vec3(0.98, 0.78, 0.44);
  vec3 tipColor = vec3(0.84, 0.54, 0.22);
  vec3 col = mix(coreColor, midColor, smoothstep(0.0, 0.42, vUv.y));
  col = mix(col, tipColor, smoothstep(0.42, 1.0, vUv.y));

  float alpha = edgeSoft * alongFade * band * uOpacity * 0.58;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

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

export const CometHalleyTrajectory: React.FC = () => {
  const { camera } = useThree();
  // Visível no Cosmos e durante a descida de volta à Terra (D17).
  const isCosmicMode = useSolarSystemVisible();
  const activeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const hoveredBodyId = useCosmicStore((s) => s.hoveredBodyId);
  const focusBody = useCosmicStore((s) => s.focusBody);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);

  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  const showComets = isCosmicMode && activeCosmicLayers.includes("COMETS");
  const showLabels = activeCosmicLayers.includes("LABELS");

  const isFocused = focusedBodyId === "HALLEY";
  const isHovered = hoveredBodyId === "HALLEY";

  const nucleusRef = useRef<THREE.Mesh>(null);
  const pickMeshRef = useRef<THREE.Mesh>(null);
  const isDistantRef = useRef<boolean>(true);
  const [isDistant, setIsDistant] = useState<boolean>(true);

  const halley = useMemo(() => calculateHalleyPosition(selectedYear), [selectedYear]);

  // Static GPU resources
  const {
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
  } = useMemo(() => {
    const oGeo = new THREE.BufferGeometry().setFromPoints(generateHalleyOrbitalPath(240));
    const nGeo = buildHalleyNucleusGeometry();
    const nMat = new THREE.ShaderMaterial({
      vertexShader: halleyNucleusVertexShader,
      fragmentShader: halleyNucleusFragmentShader,
      uniforms: {
        uActivity: { value: 0.0 },
      },
    });
    const pGeo = new THREE.SphereGeometry(1.0, 12, 12);
    const pMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const texture = createRadialFalloffTexture(128);

    const iPlumeMat = new THREE.ShaderMaterial({
      vertexShader: ionPlumeVertexShader,
      fragmentShader: ionPlumeFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uOpacity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const dPlumeMat = new THREE.ShaderMaterial({
      vertexShader: dustPlumeVertexShader,
      fragmentShader: dustPlumeFragmentShader,
      uniforms: {
        uOpacity: { value: 0.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const iMat = new THREE.PointsMaterial({
      size: 0.36,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const dMat = new THREE.PointsMaterial({
      size: 0.56,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return {
      orbitGeometry: oGeo,
      nucleusGeo: nGeo,
      nucleusMat: nMat,
      pickGeo: pGeo,
      pickMat: pMat,
      comaTexture: texture,
      ionPlumeMat: iPlumeMat,
      dustPlumeMat: dPlumeMat,
      ionTailMat: iMat,
      dustTailMat: dMat,
    };
  }, []);

  // Volumetric plumes & particle streams — allocated ONLY when Halley is inside the sublimation zone (< 4.5 AU)
  const ionPlumeGeo = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.tailLength <= 0) return null;
    return buildIonPlumeGeometry(halley.tailDirection, halley.tailLength);
  }, [showComets, halley]);

  const dustPlumeGeo = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.dustTailLength <= 0) return null;
    return buildDustPlumeGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
  }, [showComets, halley]);

  const ionTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.tailLength <= 0) return null;
    return buildIonTailGeometry(halley.tailDirection, halley.tailLength);
  }, [showComets, halley]);

  const dustTailGeometry = useMemo(() => {
    if (!showComets || !halley.hasTail || halley.dustTailLength <= 0) return null;
    return buildDustTailGeometry(
      halley.tailDirection,
      halley.orbitalVelocityDirection,
      halley.dustTailLength
    );
  }, [showComets, halley]);

  // Sync shader uniforms & particle opacities with physical activity
  useEffect(() => {
    nucleusMat.uniforms.uActivity.value = halley.activityFactor;
    ionPlumeMat.uniforms.uOpacity.value = halley.tailOpacity;
    dustPlumeMat.uniforms.uOpacity.value = halley.dustTailOpacity;
    ionTailMat.opacity = halley.tailOpacity;
    dustTailMat.opacity = halley.dustTailOpacity;
  }, [
    nucleusMat,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
    halley.activityFactor,
    halley.tailOpacity,
    halley.dustTailOpacity,
  ]);

  // Restore pointer cursor cleanly on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, []);

  // Strict disposal of dynamic tail geometries
  useEffect(() => {
    return () => {
      ionPlumeGeo?.dispose();
    };
  }, [ionPlumeGeo]);

  useEffect(() => {
    return () => {
      dustPlumeGeo?.dispose();
    };
  }, [dustPlumeGeo]);

  useEffect(() => {
    return () => {
      ionTailGeometry?.dispose();
    };
  }, [ionTailGeometry]);

  useEffect(() => {
    return () => {
      dustTailGeometry?.dispose();
    };
  }, [dustTailGeometry]);

  // Strict disposal of static GPU resources
  useEffect(() => {
    return () => {
      orbitGeometry.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      pickGeo.dispose();
      pickMat.dispose();
      comaTexture.dispose();
      ionPlumeMat.dispose();
      dustPlumeMat.dispose();
      ionTailMat.dispose();
      dustTailMat.dispose();
    };
  }, [
    orbitGeometry,
    nucleusGeo,
    nucleusMat,
    pickGeo,
    pickMat,
    comaTexture,
    ionPlumeMat,
    dustPlumeMat,
    ionTailMat,
    dustTailMat,
  ]);

  // Animate nucleus tumble, solar-wind plasma ripples, and distance-adaptive 3D click target
  useFrame((_, delta) => {
    if (!showComets) return;

    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.22;
      nucleusRef.current.rotation.z += delta * 0.09;
    }

    if (halley.hasTail && ionPlumeMat.uniforms.uTime) {
      ionPlumeMat.uniforms.uTime.value += delta;
    }

    const camDist = camera.position.distanceTo(halley.scenePosition);
    if (pickMeshRef.current) {
      // Constant generous ~32px click target from wide Solar System view down to close-up inspection
      const pickRadius = THREE.MathUtils.clamp(camDist * 0.036, 0.55, 8.5);
      pickMeshRef.current.scale.setScalar(pickRadius);
    }

    const distantNow = camDist > 4.5;
    if (distantNow !== isDistantRef.current) {
      isDistantRef.current = distantNow;
      setIsDistant(distantNow);
    }
  });

  if (!showComets) return null;

  const handleSelectHalley = () => {
    focusBody("HALLEY");
  };

  const handleHoverStart = () => {
    setHoveredBody("HALLEY");
    if (typeof document !== "undefined") {
      document.body.style.cursor = "pointer";
    }
  };

  const handleHoverEnd = () => {
    setHoveredBody(null);
    if (typeof document !== "undefined") {
      document.body.style.cursor = "auto";
    }
  };

  const outerComaScale = halley.hasTail ? halley.comaRadius * 2.1 : 0;

  return (
    <group name="comet-halley">
      {/* Keplerian Trajectory Line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial
          color={isFocused ? "#38bdf8" : halley.isPerihelionPassage ? "#67e8f9" : "#0284c7"}
          transparent
          opacity={isFocused ? 0.78 : halley.isPerihelionPassage ? 0.55 : 0.28}
          linewidth={1}
        />
      </lineLoop>

      {/* Comet Nucleus, Multi-Layer Coma & Volumetric Dual Tail */}
      <group position={halley.scenePosition}>
        {/* Sculpted bilobed carbonaceous-icy nucleus lit by true world-space Sun direction */}
        <mesh ref={nucleusRef} name="halley-nucleus" geometry={nucleusGeo} material={nucleusMat} />

        {/* Distance-adaptive invisible picking sphere for effortless selection at any zoom */}
        <mesh
          ref={pickMeshRef}
          name="halley-pick-collider"
          geometry={pickGeo}
          material={pickMat}
          onClick={(e) => {
            e.stopPropagation();
            if (isDragRelease(e)) return;
            handleSelectHalley();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            handleHoverStart();
          }}
          onPointerOut={handleHoverEnd}
        />

        {/* Inner diffuse radial coma sprite (always larger than nucleus diameter so never occluded) */}
        <sprite scale={[halley.comaRadius, halley.comaRadius, 1]}>
          <spriteMaterial
            map={comaTexture}
            color={halley.hasTail ? "#e0f7ff" : "#bae6fd"}
            transparent
            opacity={halley.comaOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Outer luminous coma envelope — emerges when sublimation is active (< 4.5 AU) */}
        {halley.hasTail && outerComaScale > 0 && (
          <sprite scale={[outerComaScale, outerComaScale, 1]}>
            <spriteMaterial
              map={comaTexture}
              color="#38bdf8"
              transparent
              opacity={Number((halley.activityFactor * 0.42).toFixed(3))}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )}

        {/* Volumetric Dual Tail + Particle Streams — visible ONLY below 4.5 AU */}
        {halley.hasTail && ionPlumeGeo && (
          <mesh name="halley-ion-plume" geometry={ionPlumeGeo} material={ionPlumeMat} />
        )}
        {halley.hasTail && dustPlumeGeo && (
          <mesh name="halley-dust-plume" geometry={dustPlumeGeo} material={dustPlumeMat} />
        )}
        {halley.hasTail && ionTailGeometry && (
          <points name="halley-ion-tail" geometry={ionTailGeometry} material={ionTailMat} />
        )}
        {halley.hasTail && dustTailGeometry && (
          <points name="halley-dust-tail" geometry={dustTailGeometry} material={dustTailMat} />
        )}

        {/* Discreet screen-space selection halo — hidden in close-up so it never stamps over the nucleus */}
        {(isHovered || (isFocused && isDistant)) && (
          <Html center className="pointer-events-none select-none">
            <span
              data-testid="halley-selection-halo"
              className={cn(
                "block h-7 w-7 rounded-full border transition-colors duration-fast ease-out",
                isFocused
                  ? "border-accent bg-accent/10 shadow-e1"
                  : "border-fg-muted/70 bg-transparent"
              )}
            />
          </Html>
        )}

        {/* Rótulo clicável pelo componente único (D11): px fixos e anticolisão */}
        {showLabels && (
          <CelestialLabel
            anchorHeight={0.2}
            priority={celestialLabelPriority(ASTROPHYSICAL_CATALOG.HALLEY.equatorialRadiusKm, { focused: isFocused, hovered: isHovered })}
          >
            <button
              type="button"
              data-testid="halley-label"
              aria-label="Selecionar Cometa 1P/Halley"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectHalley();
              }}
              onMouseEnter={handleHoverStart}
              onMouseLeave={handleHoverEnd}
              className={cn(
                "pointer-events-auto cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border bg-surface/86 px-2.5 py-1 text-caption font-medium shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out hover:border-accent hover:text-accent",
                isFocused
                  ? "border-accent text-accent"
                  : halley.hasTail
                  ? "border-line-strong text-fg"
                  : "border-line text-fg"
              )}
            >
              <span>1P/Halley</span>
              <span className="font-mono tabular-nums text-fg-secondary">
                {halley.distanceSunAu.toFixed(2)} UA
              </span>
              {halley.isPerihelionPassage ? (
                <span className="text-cat-science">· Periélio</span>
              ) : halley.hasTail ? (
                <span className="text-cat-science">· Cauda ativa</span>
              ) : null}
            </button>
          </CelestialLabel>
        )}
      </group>
    </group>
  );
};
