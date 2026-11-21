"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSunDirection } from "@/lib/epoch/useSunDirection";
import { worldSunDirection } from "@/lib/earth-orientation";
import { loadGlobeTexture } from "@/lib/textures/globeTextures";
import { pickEarthTextureSet } from "./EarthSphere";

/** Raio da camada de nuvens (globo de raio 1; abaixo da atmosfera em 1.025). */
export const CLOUD_RADIUS = 1.006;

/** Opacidade-alvo: some no modo geológico (as nuvens são de 2001) e fica discreta na iluminação de estudo. */
export function cloudOpacityTarget(enabled: boolean, geological: boolean, studyLighting: boolean): number {
  if (!enabled || geological) return 0;
  return studyLighting ? 0.35 : 0.92;
}

/**
 * Nuvens reais (D02): composição MODIS/Terra do Blue Marble (NASA, domínio público).
 * Imagem estática — não é a cobertura de nuvens de hoje. Normal e Sol no espaço mundial
 * (invariante do AGENTS.md §1); o lado noturno fica quase invisível.
 */
const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uClouds;
  uniform vec3 uSunDirection;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    // A textura é sRGB (decodificada para linear pela GPU); volta à escala perceptual da foto.
    float c = pow(texture2D(uClouds, vUv).r, 1.0 / 2.2);
    float alpha = smoothstep(0.12, 0.85, c) * uOpacity;
    if (alpha < 0.004) discard;

    float nDotL = dot(normalize(vNormal), normalize(uSunDirection));
    float day = smoothstep(-0.12, 0.22, nDotL);
    float twilight = smoothstep(-0.2, 0.0, nDotL) * (1.0 - smoothstep(0.0, 0.25, nDotL));
    vec3 lit = vec3(1.0, 0.99, 0.97) * (0.72 + 0.38 * max(nDotL, 0.0));
    vec3 color = mix(vec3(0.035, 0.045, 0.06), lit, day) + vec3(1.0, 0.5, 0.22) * twilight * 0.25;

    gl_FragColor = vec4(color, alpha * mix(0.25, 1.0, day));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const CloudLayer: React.FC<{ enabled: boolean; geological: boolean; studyLighting: boolean }> = ({
  enabled,
  geological,
  studyLighting,
}) => {
  const sun = useSunDirection();
  const { gl, invalidate } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uClouds: { value: null as THREE.Texture | null },
          uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
          uOpacity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    let alive = true;
    let texture: THREE.Texture | null = null;
    loadGlobeTexture(gl, pickEarthTextureSet(gl.capabilities.maxTextureSize).clouds, "color")
      .then((tex) => {
        if (!alive) return tex.dispose();
        texture = tex;
        material.uniforms.uClouds.value = tex;
        invalidate();
      })
      .catch((error) => console.error("[globo] falha ao carregar as nuvens", error));
    return () => {
      alive = false;
      texture?.dispose();
    };
  }, [gl, material, invalidate]);

  useEffect(() => {
    worldSunDirection(sun.direction, material.uniforms.uSunDirection.value);
    invalidate();
  }, [material, sun.direction, sun.timestamp, invalidate]);
  // Acompanha a rotação do globo no Cosmos (D21).
  useFrame(() => {
    worldSunDirection(sun.direction, material.uniforms.uSunDirection.value);
  });

  useEffect(() => () => material.dispose(), [material]);

  const target = cloudOpacityTarget(enabled, geological, studyLighting);
  useEffect(() => invalidate(), [target, invalidate]);

  // Transição suave (só renderiza enquanto anima; o frameloop é sob demanda).
  useFrame((_, delta) => {
    const u = material.uniforms.uOpacity;
    if (Math.abs(u.value - target) > 0.002) {
      u.value = THREE.MathUtils.lerp(u.value, target, Math.min(delta * 4, 1));
      invalidate();
    } else if (u.value !== target) {
      u.value = target;
      invalidate();
    }
  });

  return (
    <mesh material={material} raycast={() => null} renderOrder={1} visible={material.uniforms.uClouds.value !== null || enabled}>
      <sphereGeometry args={[CLOUD_RADIUS, 96, 64]} />
    </mesh>
  );
};
