"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { getContemporarySpatialIndex } from "@/lib/historical-topology";
import type { GraphicsQualityPreset } from "@/lib/webgl-quality";
import {
  WIND_SCALE_MAX_MS,
  sampleWindGrid,
  type WindSample,
} from "@/lib/winds-data";
import {
  CURRENT_SCALE_MAX_MS,
  sampleOceanCurrentGrid,
  type OceanCurrentSample,
} from "@/lib/currents-data";

/** Raio da camada de fluxos (acima das nuvens em 1.006, abaixo da atmosfera em 1.025). */
export const WIND_LAYER_RADIUS = 1.012;

/** Segmentos por trilha de partícula (14 segmentos em um único draw call para curvas longas e legíveis). */
const TRAIL_SEGMENTS = 14;
const VERTS_PER_PARTICLE = TRAIL_SEGMENTS * 2;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MAX_DELTA_SECONDS = 0.05;

/** Contagem de trilhas adaptada ao preset de qualidade WebGL (T39). */
export function windParticleCountForPreset(preset: GraphicsQualityPreset): number {
  if (preset === "low") return 700;
  if (preset === "medium") return 1200;
  return 1800;
}

/**
 * Shader GPU unificado para Ventos Globais (uPaletteMode = 0) e Correntes Oceânicas (uPaletteMode = 1):
 * - Ventos: ciano → esmeralda → amarelo → laranja → rosa-vermelho (WIND_COLOR_STOPS).
 * - Correntes oceânicas: índigo profundo → azul marinho → ciano → turquesa → espuma clara (CURRENT_COLOR_STOPS).
 * - Troca instantânea por uniform sem recompilar shader nem recriar contexto WebGL.
 */
const VERTEX_SHADER = /* glsl */ `
  attribute float aSpeed;
  attribute float aAlpha;
  varying float vSpeed;
  varying float vAlpha;

  void main() {
    vSpeed = clamp(aSpeed, 0.0, 1.0);
    vAlpha = clamp(aAlpha, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uOpacity;
  uniform float uPaletteMode;
  varying float vSpeed;
  varying float vAlpha;

  vec3 windRamp(float t) {
    vec3 c0 = vec3(0.22, 0.74, 0.97); // #38bdf8 calma
    vec3 c1 = vec3(0.20, 0.83, 0.60); // #34d399 moderada
    vec3 c2 = vec3(0.98, 0.80, 0.08); // #facc15 forte
    vec3 c3 = vec3(0.98, 0.57, 0.24); // #fb923c muito forte
    vec3 c4 = vec3(0.96, 0.25, 0.37); // #f43f5e vendaval / jato

    if (t < 0.25) return mix(c0, c1, t / 0.25);
    if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
    if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
    return mix(c3, c4, (t - 0.75) / 0.25);
  }

  vec3 oceanRamp(float t) {
    vec3 c0 = vec3(0.18, 0.36, 0.78); // #2d5cc7 fluxo lento
    vec3 c1 = vec3(0.06, 0.56, 0.84); // #0f8fd6 moderado
    vec3 c2 = vec3(0.05, 0.74, 0.85); // #0dbcd9 ativo
    vec3 c3 = vec3(0.22, 0.88, 0.76); // #38e0c2 contorno oeste
    vec3 c4 = vec3(0.86, 0.96, 1.00); // #dbf5ff núcleo intenso

    if (t < 0.25) return mix(c0, c1, t / 0.25);
    if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
    if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
    return mix(c3, c4, (t - 0.75) / 0.25);
  }

  void main() {
    float alpha = vAlpha * uOpacity;
    if (alpha < 0.01) discard;
    vec3 baseColor = uPaletteMode > 0.5 ? oceanRamp(vSpeed) : windRamp(vSpeed);
    vec3 color = mix(baseColor, vec3(1.0), 0.14);
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Projeção esférica paramétrica não-espelhada (invariante AGENTS.md §1 — alinhada à SphereGeometry do Three.js).
 */
function sphericalPoint(lat: number, lng: number, radius: number, out: [number, number, number]) {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;
  const sinPhi = Math.sin(phi);
  out[0] = -(radius * sinPhi * Math.cos(theta));
  out[1] = radius * Math.cos(phi);
  out[2] = radius * sinPhi * Math.sin(theta);
}

/** Gerador determinístico rápido (Mulberry32) para distribuição esférica inicial uniforme. */
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

interface ParticleBuffers {
  count: number;
  lats: Float32Array;
  lngs: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  positions: Float32Array;
  speeds: Float32Array;
  alphas: Float32Array;
}

function collapseTrail(
  positions: Float32Array,
  speeds: Float32Array,
  alphas: Float32Array,
  vertBase: number,
  x: number,
  y: number,
  z: number,
  speed: number
) {
  for (let v = 0; v < VERTS_PER_PARTICLE; v++) {
    const idx = vertBase + v;
    const p = idx * 3;
    positions[p] = x;
    positions[p + 1] = y;
    positions[p + 2] = z;
    speeds[idx] = speed;
    alphas[idx] = 0;
  }
}

function createParticleBuffers(count: number): ParticleBuffers {
  const rand = mulberry32(27012026);
  const lats = new Float32Array(count);
  const lngs = new Float32Array(count);
  const ages = new Float32Array(count);
  const maxAges = new Float32Array(count);

  const vertexCount = count * VERTS_PER_PARTICLE;
  const positions = new Float32Array(vertexCount * 3);
  const speeds = new Float32Array(vertexCount);
  const alphas = new Float32Array(vertexCount);
  const pt: [number, number, number] = [0, 0, 0];

  for (let i = 0; i < count; i++) {
    const lat = Math.asin((rand() * 2 - 1) * 0.97) * RAD2DEG;
    const lng = rand() * 360 - 180;
    const maxAge = 2.4 + rand() * 2.6;
    lats[i] = lat;
    lngs[i] = lng;
    maxAges[i] = maxAge;
    ages[i] = rand() * maxAge;

    sphericalPoint(lat, lng, WIND_LAYER_RADIUS, pt);
    collapseTrail(positions, speeds, alphas, i * VERTS_PER_PARTICLE, pt[0], pt[1], pt[2], 0);
  }

  return { count, lats, lngs, ages, maxAges, positions, speeds, alphas };
}

/**
 * Camada 3D unificada de Ventos Globais (D27a) e Correntes Oceânicas Superficiais (D27b):
 * - Um único `LineSegments` com shader customizado (sem recriar contexto WebGL ao alternar modos).
 * - Apenas 1 projeção esférica por partícula/quadro (deslocamento direto dos vértices 3D da cauda).
 * - No modo Correntes Oceânicas, combina a máscara oceânica da grade com o índice espacial Natural Earth
 *   para manter 100% das streamlines estritamente sobre os oceanos (zero sobreposição em continentes).
 * - Zero alocações no `useFrame`, descarte estrito de buffers (RN21) e pausa no modo de leitura (RN22).
 */
export const WindParticlesLayer: React.FC = () => {
  const { invalidate } = useThree();
  const flowMode = useObservatoryStore((s) => s.flowMode);
  const winds = useObservatoryStore((s) => s.winds);
  const windAltitude = useObservatoryStore((s) => s.windAltitude);
  const currents = useObservatoryStore((s) => s.currents);
  const opacity = useObservatoryStore((s) => s.layerOpacity.GLOBAL_WINDS ?? 0.85);
  const isThrottled = useGlobeStore((s) => s.isThrottled);
  const qualityPreset = useGraphicsQualityStore((s) => s.preset);

  const windGrid = winds ? winds[windAltitude] : null;
  const activeReady = flowMode === "currents" ? currents !== null : windGrid !== null;
  const particleCount = windParticleCountForPreset(qualityPreset);

  // Índice espacial Natural Earth 110m (já em memória pelo EarthSphere) para recorte costeiro exato
  const landSpatialIndex = useMemo(() => getContemporarySpatialIndex(), []);
  const buffers = useMemo(() => createParticleBuffers(particleCount), [particleCount]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(buffers.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const spdAttr = new THREE.BufferAttribute(buffers.speeds, 1);
    spdAttr.setUsage(THREE.DynamicDrawUsage);
    const alphaAttr = new THREE.BufferAttribute(buffers.alphas, 1);
    alphaAttr.setUsage(THREE.DynamicDrawUsage);

    geom.setAttribute("position", posAttr);
    geom.setAttribute("aSpeed", spdAttr);
    geom.setAttribute("aAlpha", alphaAttr);
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), WIND_LAYER_RADIUS + 0.05);
    return geom;
  }, [buffers]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uOpacity: { value: 0.85 },
          uPaletteMode: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    []
  );

  // Descarte rigoroso de buffers e material WebGL ao trocar preset ou desmontar (RN21)
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uOpacity.value = Math.max(0.1, opacity);
    invalidate();
  }, [material, opacity, invalidate]);

  useEffect(() => {
    material.uniforms.uPaletteMode.value = flowMode === "currents" ? 1.0 : 0.0;
    invalidate();
  }, [material, flowMode, invalidate]);

  const windSampleRef = useRef<WindSample>({ u: 0, v: 0, speed: 0 });
  const currentSampleRef = useRef<OceanCurrentSample>({ u: 0, v: 0, speed: 0, inOcean: false });
  const headPtRef = useRef<[number, number, number]>([0, 0, 0]);
  const rngStateRef = useRef<number>(987654321);

  // Ao trocar de modo (Ventos ↔ Correntes) ou altitude (10 m ↔ 250 hPa), colapsa trilhas para transição limpa
  useEffect(() => {
    const pt = headPtRef.current;
    for (let i = 0; i < buffers.count; i++) {
      sphericalPoint(buffers.lats[i], buffers.lngs[i], WIND_LAYER_RADIUS, pt);
      collapseTrail(
        buffers.positions,
        buffers.speeds,
        buffers.alphas,
        i * VERTS_PER_PARTICLE,
        pt[0],
        pt[1],
        pt[2],
        0
      );
    }
    invalidate();
  }, [flowMode, windAltitude, buffers, invalidate]);

  useFrame((_, rawDelta) => {
    if (!activeReady || isThrottled) return;

    const dt = Math.min(rawDelta, MAX_DELTA_SECONDS);
    if (dt <= 0) return;

    const isCurrents = flowMode === "currents";
    const scaleMax = isCurrents
      ? CURRENT_SCALE_MAX_MS
      : WIND_SCALE_MAX_MS[windGrid!.altitude];
    // Escala de advecção visual calibrada por regime (correntes ~0,2–1,2 m/s; ventos ~5–65 m/s)
    const advectionGain = isCurrents
      ? 10.5
      : windGrid!.altitude === "jet250"
        ? 0.34
        : 0.68;

    const windSample = windSampleRef.current;
    const currentSample = currentSampleRef.current;
    const pt = headPtRef.current;
    const { lats, lngs, ages, maxAges, positions, speeds, alphas } = buffers;
    let rng = rngStateRef.current;

    const nextRand = () => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      return rng / 4294967296;
    };

    const isLandPoint = (lat: number, lng: number) =>
      landSpatialIndex !== null && landSpatialIndex([lng, lat]) !== null;

    const respawnParticle = (i: number, vertBase: number) => {
      let lat = Math.asin((nextRand() * 2 - 1) * 0.96) * RAD2DEG;
      let lng = nextRand() * 360 - 180;

      if (isCurrents && currents) {
        // Amostragem por rejeição (até 8 tentativas) para nascer estritamente sobre oceanos
        for (let attempt = 0; attempt < 8; attempt++) {
          if (!isLandPoint(lat, lng)) {
            sampleOceanCurrentGrid(currents, lat, lng, currentSample);
            if (currentSample.inOcean && currentSample.speed >= 0.02) break;
          }
          lat = Math.asin((nextRand() * 2 - 1) * 0.94) * RAD2DEG;
          lng = nextRand() * 360 - 180;
        }
      }

      lats[i] = lat;
      lngs[i] = lng;
      ages[i] = 0;
      sphericalPoint(lat, lng, WIND_LAYER_RADIUS, pt);
      collapseTrail(positions, speeds, alphas, vertBase, pt[0], pt[1], pt[2], 0);
    };

    for (let i = 0; i < buffers.count; i++) {
      let lat = lats[i];
      let lng = lngs[i];
      const age = ages[i] + dt;
      const maxAge = maxAges[i];
      const vertBase = i * VERTS_PER_PARTICLE;

      let u = 0;
      let v = 0;
      let speed = 0;
      let blockedOnLand = false;

      if (isCurrents && currents) {
        if (isLandPoint(lat, lng)) {
          blockedOnLand = true;
        } else {
          sampleOceanCurrentGrid(currents, lat, lng, currentSample);
          u = currentSample.u;
          v = currentSample.v;
          speed = currentSample.speed;
          blockedOnLand = !currentSample.inOcean;
        }
      } else if (windGrid) {
        sampleWindGrid(windGrid, lat, lng, windSample);
        u = windSample.u;
        v = windSample.v;
        speed = windSample.speed;
      }

      const normSpeed = Math.min(1, speed / scaleMax);
      const minSpeed = isCurrents ? 0.015 : 0.05;

      // Passo esférico com correção cos(lat) para velocidade angular realista em altas latitudes
      const cosLat = Math.max(0.2, Math.cos(lat * DEG2RAD));
      const dLng = (u * advectionGain * dt) / cosLat;
      const dLat = v * advectionGain * dt;

      const nextLat = lat + dLat;
      let nextLng = lng + dLng;
      const crossedSeam = nextLng > 180 || nextLng < -180;
      if (nextLng > 180) nextLng -= 360;
      else if (nextLng < -180) nextLng += 360;

      const hitCoast = isCurrents && (blockedOnLand || isLandPoint(nextLat, nextLng));
      const expired = hitCoast || age >= maxAge || Math.abs(nextLat) > 76 || speed < minSpeed;

      if (expired) {
        respawnParticle(i, vertBase);
        continue;
      }

      lat = nextLat;
      lng = nextLng;
      lats[i] = lat;
      lngs[i] = lng;
      ages[i] = age;
      sphericalPoint(lat, lng, WIND_LAYER_RADIUS, pt);

      if (crossedSeam) {
        // Evita segmento atravessando o globo ao cruzar ±180°
        collapseTrail(positions, speeds, alphas, vertBase, pt[0], pt[1], pt[2], normSpeed);
        continue;
      }

      // Desloca os segmentos da cauda (s = TRAIL_SEGMENTS-1 .. 1) sem recomputar seno/cosseno
      for (let s = TRAIL_SEGMENTS - 1; s > 0; s--) {
        const dstV = vertBase + s * 2;
        const srcV = dstV - 2;
        const dstP = dstV * 3;
        const srcP = srcV * 3;
        positions[dstP] = positions[srcP];
        positions[dstP + 1] = positions[srcP + 1];
        positions[dstP + 2] = positions[srcP + 2];
        positions[dstP + 3] = positions[srcP + 3];
        positions[dstP + 4] = positions[srcP + 4];
        positions[dstP + 5] = positions[srcP + 5];
        speeds[dstV] = speeds[srcV];
        speeds[dstV + 1] = speeds[srcV + 1];
      }

      // Novo segmento da cabeça: v0 = nova posição, v1 = antiga cabeça (antigo v0)
      const headP = vertBase * 3;
      const prevHeadX = positions[headP];
      const prevHeadY = positions[headP + 1];
      const prevHeadZ = positions[headP + 2];
      const prevHeadSpeed = speeds[vertBase];

      positions[headP] = pt[0];
      positions[headP + 1] = pt[1];
      positions[headP + 2] = pt[2];
      positions[headP + 3] = prevHeadX;
      positions[headP + 4] = prevHeadY;
      positions[headP + 5] = prevHeadZ;
      speeds[vertBase] = normSpeed;
      speeds[vertBase + 1] = prevHeadSpeed;

      // Fade suave nas pontas do ciclo de vida (sin(π * t))
      const lifeRatio = Math.min(1, Math.max(0, age / maxAge));
      const lifeFade = Math.sin(lifeRatio * Math.PI);
      const speedBoost = 0.72 + 0.28 * normSpeed;

      for (let s = 0; s < TRAIL_SEGMENTS; s++) {
        const v0 = vertBase + s * 2;
        const headWeight0 = Math.pow(1 - s / TRAIL_SEGMENTS, 1.35);
        const headWeight1 = Math.pow(1 - (s + 1) / TRAIL_SEGMENTS, 1.35);
        alphas[v0] = headWeight0 * lifeFade * speedBoost;
        alphas[v0 + 1] = headWeight1 * lifeFade * speedBoost;
      }
    }

    rngStateRef.current = rng;
    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (geometry.getAttribute("aSpeed") as THREE.BufferAttribute).needsUpdate = true;
    (geometry.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
  });

  if (!activeReady) return null;

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={() => null}
      renderOrder={2}
    />
  );
};
