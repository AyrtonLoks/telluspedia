"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useSunDirection } from "@/lib/epoch/useSunDirection";

/** Raio da casca de atmosfera (globo de raio 1). */
export const ATMOSPHERE_RADIUS = 1.025;

/**
 * Atmosfera (D02): casca externa com espalhamento aproximado — azul no limbo diurno (Rayleigh),
 * alaranjado no terminador e quase nada no lado noturno. Substitui o Fresnel simples do shader da
 * Terra (que fica reduzido a um toque de borda quando esta casca está ligada).
 * Normal e direção do Sol no espaço mundial (invariante do AGENTS.md §1).
 */
const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 sunDir = normalize(uSunDirection);

    // Casca vista por dentro (BackSide): o brilho cresce do disco do planeta para a borda e
    // some no limite externo da atmosfera.
    float facing = dot(n, -viewDir);
    float limb = pow(clamp(1.0 - facing, 0.0, 1.0), 2.4) * smoothstep(0.0, 0.18, facing);

    // Iluminação da atmosfera: dia azul, terminador laranja, noite escura.
    float sunAmount = dot(n, sunDir);
    float day = smoothstep(-0.15, 0.35, sunAmount);
    float twilight = smoothstep(-0.3, 0.0, sunAmount) * (1.0 - smoothstep(0.0, 0.3, sunAmount));
    vec3 rayleigh = vec3(0.30, 0.58, 1.0);
    vec3 sunset = vec3(1.0, 0.48, 0.18);
    vec3 color = rayleigh * day + sunset * twilight * 0.9;

    float alpha = limb * (0.15 + 0.85 * max(day, twilight)) * uIntensity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

export const Atmosphere: React.FC = () => {
  const sun = useSunDirection();
  const { invalidate } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
          uIntensity: { value: 0.9 },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useEffect(() => {
    material.uniforms.uSunDirection.value.copy(sun.direction);
    invalidate();
  }, [material, sun.direction, sun.timestamp, invalidate]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} raycast={() => null} renderOrder={-1}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, 96, 64]} />
    </mesh>
  );
};
