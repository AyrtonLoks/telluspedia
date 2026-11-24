"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { getContemporarySpatialIndex, type CountrySpatialIndex } from "@/lib/historical-topology";
import type { GraphicsQualityPreset } from "@/lib/webgl-quality";
import {
  OCEAN_GYRES,
  computeCoupledDriftVelocity,
  gyreNormalizedDistance,
  type CoupledVelocitySample,
} from "@/lib/marine-debris-data";
import { DriftSimulationRibbons, debrisSphericalPoint as sphericalPoint } from "./MarineDebrisRibbons";

/** Raio logo acima das correntes oceânicas (1.008) e abaixo dos ventos atmosféricos (1.014). */
export const MARINE_DEBRIS_RADIUS = 1.009;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MAX_DELTA_SECONDS = 0.05;
const TRAIL_SEGMENTS = 10;
const VERTS_PER_DRIFTER = TRAIL_SEGMENTS * 2;

export function debrisCountsForPreset(preset: GraphicsQualityPreset): {
  gyrePoints: number;
  drifters: number;
} {
  if (preset === "low") return { gyrePoints: 900, drifters: 320 };
  if (preset === "medium") return { gyrePoints: 1500, drifters: 520 };
  return { gyrePoints: 2200, drifters: 760 };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GYRE_VERTEX_SHADER = /* glsl */ `
  attribute float aIntensity;
  attribute float aSize;
  varying float vIntensity;

  void main() {
    vIntensity = clamp(aIntensity, 0.0, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (2.6 / max(0.8, -mvPos.z)), 1.5, 11.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const GYRE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  varying float vIntensity;

  vec3 debrisRamp(float t) {
    vec3 c0 = vec3(0.09, 0.64, 0.72); // #17a3b8 baixa
    vec3 c1 = vec3(0.96, 0.76, 0.16); // #f5c229 moderada
    vec3 c2 = vec3(0.97, 0.45, 0.19); // #f77330 alta
    vec3 c3 = vec3(0.92, 0.22, 0.42); // #eb386b núcleo crítico
    if (t < 0.35) return mix(c0, c1, t / 0.35);
    if (t < 0.70) return mix(c1, c2, (t - 0.35) / 0.35);
    return mix(c2, c3, (t - 0.70) / 0.30);
  }

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float falloff = smoothstep(0.5, 0.06, dist);
    float alpha = falloff * (0.28 + 0.62 * vIntensity) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(debrisRamp(vIntensity), alpha);
  }
`;

const DRIFTER_VERTEX_SHADER = /* glsl */ `
  attribute float aDensity;
  attribute float aAlpha;
  varying float vDensity;
  varying float vAlpha;

  void main() {
    vDensity = clamp(aDensity, 0.0, 1.0);
    vAlpha = clamp(aAlpha, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DRIFTER_FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  varying float vDensity;
  varying float vAlpha;

  void main() {
    float alpha = vAlpha * uOpacity;
    if (alpha < 0.01) discard;
    vec3 lowCol = vec3(0.22, 0.80, 0.86);
    vec3 highCol = vec3(0.98, 0.54, 0.26);
    vec3 color = mix(lowCol, highCol, vDensity);
    gl_FragColor = vec4(color, alpha);
  }
`;

interface GyreCloudBuffers {
  count: number;
  gyreIndex: Uint8Array;
  angles: Float32Array;
  radii: Float32Array;
  positions: Float32Array;
  intensities: Float32Array;
  sizes: Float32Array;
}

function buildGyreCloud(totalPoints: number): GyreCloudBuffers {
  const rng = mulberry32(0xdebb2901);
  const weightSum = OCEAN_GYRES.reduce((acc, g) => acc + g.intensity, 0);
  const gyreIndex = new Uint8Array(totalPoints);
  const angles = new Float32Array(totalPoints);
  const radii = new Float32Array(totalPoints);
  const positions = new Float32Array(totalPoints * 3);
  const intensities = new Float32Array(totalPoints);
  const sizes = new Float32Array(totalPoints);

  const pt: [number, number, number] = [0, 0, 0];
  let cursor = 0;

  for (let gi = 0; gi < OCEAN_GYRES.length; gi++) {
    const gyre = OCEAN_GYRES[gi];
    const share =
      gi === OCEAN_GYRES.length - 1
        ? totalPoints - cursor
        : Math.max(80, Math.round((gyre.intensity / weightSum) * totalPoints));

    for (let j = 0; j < share && cursor < totalPoints; j++, cursor++) {
      // Distribuição radial gaussiana aproximada (Box-Muller clamped)
      const u1 = Math.max(1e-4, rng());
      const u2 = rng();
      const radial = Math.min(2.15, Math.sqrt(-2 * Math.log(u1)) * 0.58);
      const angle = u2 * Math.PI * 2;

      gyreIndex[cursor] = gi;
      angles[cursor] = angle;
      radii[cursor] = radial;

      const lat = gyre.centerLat + Math.sin(angle) * radial * gyre.radiusLat;
      const lng = gyre.centerLng + Math.cos(angle) * radial * gyre.radiusLng;
      sphericalPoint(lat, lng, MARINE_DEBRIS_RADIUS, pt);
      positions[cursor * 3] = pt[0];
      positions[cursor * 3 + 1] = pt[1];
      positions[cursor * 3 + 2] = pt[2];

      const localDensity = Math.exp(-0.55 * radial * radial) * gyre.intensity;
      intensities[cursor] = Math.min(1, localDensity);
      sizes[cursor] = 2.6 + localDensity * 5.2;
    }
  }

  return { count: totalPoints, gyreIndex, angles, radii, positions, intensities, sizes };
}

interface DrifterBuffers {
  count: number;
  lats: Float32Array;
  lngs: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  positions: Float32Array;
  densities: Float32Array;
  alphas: Float32Array;
}

function collapseDrifter(
  positions: Float32Array,
  densities: Float32Array,
  alphas: Float32Array,
  vertBase: number,
  x: number,
  y: number,
  z: number,
  density: number
) {
  for (let v = 0; v < VERTS_PER_DRIFTER; v++) {
    const idx = vertBase + v;
    const p = idx * 3;
    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;
    densities[idx] = density;
    alphas[idx] = 0;
  }
}

function respawnOceanDrifter(
  rng: () => number,
  spatialIndex: CountrySpatialIndex | null
): [number, number] {
  for (let attempt = 0; attempt < 24; attempt++) {
    const lat = (Math.asin(Math.max(-0.88, Math.min(0.88, 2 * rng() - 1))) * RAD2DEG);
    const lng = rng() * 360 - 180;
    if (!spatialIndex || spatialIndex([lng, lat]) === null) {
      return [lat, lng];
    }
  }
  const gyre = OCEAN_GYRES[Math.floor(rng() * OCEAN_GYRES.length)];
  return [gyre.centerLat + (rng() - 0.5) * 14, gyre.centerLng + (rng() - 0.5) * 24];
}

function buildDrifterBuffers(
  count: number,
  spatialIndex: CountrySpatialIndex | null
): DrifterBuffers {
  const rng = mulberry32(0x7e11029a);
  const lats = new Float32Array(count);
  const lngs = new Float32Array(count);
  const ages = new Float32Array(count);
  const maxAges = new Float32Array(count);
  const totalVerts = count * VERTS_PER_DRIFTER;
  const positions = new Float32Array(totalVerts * 3);
  const densities = new Float32Array(totalVerts);
  const alphas = new Float32Array(totalVerts);
  const pt: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < count; i++) {
    const [lat, lng] = respawnOceanDrifter(rng, spatialIndex);
    lats[i] = lat;
    lngs[i] = lng;
    maxAges[i] = 4.5 + rng() * 5.0;
    ages[i] = rng() * maxAges[i];
    sphericalPoint(lat, lng, MARINE_DEBRIS_RADIUS + 0.0006, pt);
    collapseDrifter(positions, densities, alphas, i * VERTS_PER_DRIFTER, pt[0], pt[1], pt[2], 0.25);
  }

  return { count, lats, lngs, ages, maxAges, positions, densities, alphas };
}

export const MarineDebrisLayer: React.FC = () => {
  const { invalidate } = useThree();
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const qualityPreset = useGraphicsQualityStore((s) => s.preset);
  const opacity = useObservatoryStore((s) => s.layerOpacity.MARINE_DEBRIS ?? 0.9);
  const currents = useObservatoryStore((s) => s.currents);
  const winds = useObservatoryStore((s) => s.winds);
  const windage = useObservatoryStore((s) => s.marineDebrisWindage);
  const selectedGyreId = useObservatoryStore((s) => s.selectedGyreId);

  const spatialIndex = useMemo(() => getContemporarySpatialIndex(), []);
  const counts = useMemo(() => debrisCountsForPreset(qualityPreset), [qualityPreset]);

  // 1) Nuvem observada dos 5 giros subtropicais
  const gyreData = useMemo(() => buildGyreCloud(counts.gyrePoints), [counts.gyrePoints]);
  const gyreGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(gyreData.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", posAttr);
    geom.setAttribute("aIntensity", new THREE.BufferAttribute(gyreData.intensities, 1));
    geom.setAttribute("aSize", new THREE.BufferAttribute(gyreData.sizes, 1));
    return geom;
  }, [gyreData]);

  const gyreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GYRE_VERTEX_SHADER,
        fragmentShader: GYRE_FRAGMENT_SHADER,
        uniforms: { uOpacity: { value: opacity } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 2) Traçadores Lagrangianos acoplados a correntes + ventos (D27)
  const drifterData = useMemo(
    () => buildDrifterBuffers(counts.drifters, spatialIndex),
    [counts.drifters, spatialIndex]
  );
  const drifterGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(drifterData.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const denAttr = new THREE.BufferAttribute(drifterData.densities, 1);
    denAttr.setUsage(THREE.DynamicDrawUsage);
    const alpAttr = new THREE.BufferAttribute(drifterData.alphas, 1);
    alpAttr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute("position", posAttr);
    geom.setAttribute("aDensity", denAttr);
    geom.setAttribute("aAlpha", alpAttr);
    return geom;
  }, [drifterData]);

  const drifterMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: DRIFTER_VERTEX_SHADER,
        fragmentShader: DRIFTER_FRAGMENT_SHADER,
        uniforms: { uOpacity: { value: opacity * 0.78 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Descarte obrigatório de buffers e materiais WebGL (RN21 / AGENTS.md §2)
  useEffect(() => {
    return () => {
      gyreGeometry.dispose();
    };
  }, [gyreGeometry]);

  useEffect(() => {
    return () => {
      drifterGeometry.dispose();
    };
  }, [drifterGeometry]);

  useEffect(() => {
    return () => {
      gyreMaterial.dispose();
      drifterMaterial.dispose();
    };
  }, [gyreMaterial, drifterMaterial]);

  useEffect(() => {
    gyreMaterial.uniforms.uOpacity.value = opacity;
    drifterMaterial.uniforms.uOpacity.value = opacity * 0.78;
    invalidate();
  }, [opacity, gyreMaterial, drifterMaterial, invalidate]);

  const rngRef = useRef<() => number>(mulberry32(0x1a9a29d0));
  const velScratch = useRef<CoupledVelocitySample>({ u: 0, v: 0, speedMs: 0, inOcean: false });
  const ptScratch = useRef<[number, number, number]>([0, 0, 0]);
  const surfaceWind = winds?.surface ?? null;

  useFrame((_, rawDelta) => {
    if (isThrottled) return;
    const dt = Math.min(rawDelta, MAX_DELTA_SECONDS);

    // Rotação sutil coerente com o hemisfério nos 5 giros observados
    const gyrePos = gyreData.positions;
    const pt = ptScratch.current;
    for (let i = 0; i < gyreData.count; i++) {
      const gyre = OCEAN_GYRES[gyreData.gyreIndex[i]];
      const dir = gyre.rotation === "clockwise" ? -1 : 1;
      const boost = selectedGyreId === gyre.id ? 1.45 : 1.0;
      const angularRate = dir * boost * (0.14 / Math.max(0.45, gyreData.radii[i]));
      const nextAngle = gyreData.angles[i] + angularRate * dt;
      gyreData.angles[i] = nextAngle;
      const r = gyreData.radii[i];
      const lat = gyre.centerLat + Math.sin(nextAngle) * r * gyre.radiusLat;
      const lng = gyre.centerLng + Math.cos(nextAngle) * r * gyre.radiusLng;
      sphericalPoint(lat, lng, MARINE_DEBRIS_RADIUS, pt);
      const p3 = i * 3;
      gyrePos[p3] = pt[0];
      gyrePos[p3 + 1] = pt[1];
      gyrePos[p3 + 2] = pt[2];
    }
    (gyreGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    // Advecção Lagrangiana contínua acoplada a correntes + ventos + convergência de Ekman
    const vel = velScratch.current;
    const rng = rngRef.current;
    const { lats, lngs, ages, maxAges, positions, densities, alphas } = drifterData;
    const speedScale = 4.6;

    for (let i = 0; i < drifterData.count; i++) {
      const vertBase = i * VERTS_PER_DRIFTER;
      ages[i] += dt;
      let lat = lats[i];
      let lng = lngs[i];
      computeCoupledDriftVelocity(lat, lng, currents, surfaceWind, windage, vel);

      if (ages[i] >= maxAges[i] || !vel.inOcean || vel.speedMs < 0.008) {
        const [nLat, nLng] = respawnOceanDrifter(rng, spatialIndex);
        lats[i] = nLat;
        lngs[i] = nLng;
        ages[i] = 0;
        sphericalPoint(nLat, nLng, MARINE_DEBRIS_RADIUS + 0.0006, pt);
        collapseDrifter(positions, densities, alphas, vertBase, pt[0], pt[1], pt[2], 0.2);
        continue;
      }

      const cosLat = Math.max(0.25, Math.cos(lat * DEG2RAD));
      const nextLat = Math.max(-71, Math.min(71, lat + vel.v * speedScale * dt));
      let nextLng = lng + (vel.u * speedScale * dt) / cosLat;
      if (nextLng > 180) nextLng -= 360;
      if (nextLng < -180) nextLng += 360;

      if (spatialIndex && spatialIndex([nextLng, nextLat]) !== null) {
        const [nLat, nLng] = respawnOceanDrifter(rng, spatialIndex);
        lats[i] = nLat;
        lngs[i] = nLng;
        ages[i] = 0;
        sphericalPoint(nLat, nLng, MARINE_DEBRIS_RADIUS + 0.0006, pt);
        collapseDrifter(positions, densities, alphas, vertBase, pt[0], pt[1], pt[2], 0.2);
        continue;
      }

      lats[i] = nextLat;
      lngs[i] = nextLng;

      // Desloca rastro da cauda para a cabeça (zero alocação)
      for (let seg = TRAIL_SEGMENTS - 1; seg >= 1; seg--) {
        const dst = vertBase + seg * 2;
        const src = vertBase + (seg - 1) * 2;
        const dp = dst * 3;
        const sp = src * 3;
        positions[dp] = positions[sp];
        positions[dp + 1] = positions[sp + 1];
        positions[dp + 2] = positions[sp + 2];
        positions[dp + 3] = positions[sp + 3];
        positions[dp + 4] = positions[sp + 4];
        positions[dp + 5] = positions[sp + 5];
        densities[dst] = densities[src];
        densities[dst + 1] = densities[src + 1];
      }

      sphericalPoint(lat, lng, MARINE_DEBRIS_RADIUS + 0.0006, pt);
      const p0 = vertBase * 3;
      positions[p0] = pt[0];
      positions[p0 + 1] = pt[1];
      positions[p0 + 2] = pt[2];
      sphericalPoint(nextLat, nextLng, MARINE_DEBRIS_RADIUS + 0.0006, pt);
      positions[p0 + 3] = pt[0];
      positions[p0 + 4] = pt[1];
      positions[p0 + 5] = pt[2];

      // Intensidade cromática aumenta quando o traçador se aproxima de um dos 5 giros
      let gyreProximity = 0.2;
      for (const gyre of OCEAN_GYRES) {
        const nd = gyreNormalizedDistance(nextLat, nextLng, gyre);
        if (nd < 2.2) {
          gyreProximity = Math.max(gyreProximity, 1 - nd / 2.2);
        }
      }
      densities[vertBase] = gyreProximity;
      densities[vertBase + 1] = gyreProximity;

      const lifeFrac = ages[i] / maxAges[i];
      const lifeFade = Math.min(1, lifeFrac * 6) * Math.min(1, (1 - lifeFrac) * 5);
      for (let seg = 0; seg < TRAIL_SEGMENTS; seg++) {
        const headFade = 1 - seg / TRAIL_SEGMENTS;
        const base = vertBase + seg * 2;
        alphas[base] = headFade * lifeFade * 0.72;
        alphas[base + 1] = Math.max(0, headFade - 0.1) * lifeFade * 0.72;
      }
    }

    (drifterGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (drifterGeometry.getAttribute("aDensity") as THREE.BufferAttribute).needsUpdate = true;
    (drifterGeometry.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group>
      <points geometry={gyreGeometry} material={gyreMaterial} frustumCulled={false} renderOrder={5} />
      <lineSegments geometry={drifterGeometry} material={drifterMaterial} frustumCulled={false} renderOrder={6} />
      <DriftSimulationRibbons opacity={opacity} />
    </group>
  );
};
