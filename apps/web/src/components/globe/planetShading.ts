import * as THREE from "three";

/**
 * Sombras analíticas entre Saturno e seus anéis (D21), injetadas no `MeshStandardMaterial`.
 *
 * Não há shadow map no Cosmos (a luz é um ponto no Sol, a ~1 000 unidades): as sombras saem de
 * geometria pura, por fragmento, em coordenadas de mundo.
 *  - No planeta: o raio do fragmento até o Sol cruza o plano dos anéis; se o cruzamento cai entre
 *    os raios interno e externo, a luz direta é atenuada pelo alfa do anel naquele raio.
 *  - No anel: o raio até o Sol passa perto do centro do planeta; se passa a menos de um raio, o
 *    anel está na sombra (com uma borda suave de ±3 %).
 * Só a luz direta é afetada; a ambiente continua, como na penumbra real iluminada pelo céu.
 */
export interface RingShadowUniforms {
  uSunPos: { value: THREE.Vector3 };
  uBodyCenter: { value: THREE.Vector3 };
  uBodyRadius: { value: number };
  uRingNormal: { value: THREE.Vector3 };
  uRingInner: { value: number };
  uRingOuter: { value: number };
  uRingMap: { value: THREE.Texture | null };
}

export function createRingShadowUniforms(): RingShadowUniforms {
  return {
    uSunPos: { value: new THREE.Vector3() },
    uBodyCenter: { value: new THREE.Vector3() },
    uBodyRadius: { value: 1 },
    uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
    uRingInner: { value: 1 },
    uRingOuter: { value: 2 },
    uRingMap: { value: null },
  };
}

/** Fração de luz direta que passa pelo anel (1 − 0,85 × alfa): o anel A é translúcido, não opaco. */
export const RING_SHADOW_STRENGTH = 0.85;

const FRAGMENT_FUNCTIONS = /* glsl */ `
uniform vec3 uSunPos;
uniform vec3 uBodyCenter;
uniform float uBodyRadius;
uniform vec3 uRingNormal;
uniform float uRingInner;
uniform float uRingOuter;
uniform sampler2D uRingMap;
varying vec3 vShadowWorld;

float ringShadowFactor(vec3 P) {
  vec3 L = normalize(uSunPos - P);
#ifdef SHADOW_ON_PLANET
  float denom = dot(L, uRingNormal);
  if (abs(denom) < 1e-5) return 1.0;
  float t = dot(uBodyCenter - P, uRingNormal) / denom;
  if (t <= 0.0) return 1.0;
  float r = length(P + L * t - uBodyCenter);
  if (r < uRingInner || r > uRingOuter) return 1.0;
  float a = texture2D(uRingMap, vec2((r - uRingInner) / (uRingOuter - uRingInner), 0.5)).a;
  return 1.0 - ${RING_SHADOW_STRENGTH.toFixed(2)} * a;
#else
  vec3 oc = P - uBodyCenter;
  float b = dot(oc, L);
  if (b > 0.0) return 1.0;
  float d = sqrt(max(dot(oc, oc) - b * b, 0.0));
  return smoothstep(uBodyRadius * 0.97, uBodyRadius * 1.03, d);
#endif
}
`;

/**
 * Liga as sombras a um material. `target` diz quem recebe a sombra: o planeta (sombra dos anéis)
 * ou o anel (sombra do planeta). Os uniforms são compartilhados e atualizados a cada quadro.
 */
export function applyRingShadow(
  material: THREE.MeshStandardMaterial,
  uniforms: RingShadowUniforms,
  target: "planet" | "ring"
): THREE.MeshStandardMaterial {
  material.defines = { ...(material.defines ?? {}), ...(target === "planet" ? { SHADOW_ON_PLANET: "" } : {}) };
  material.customProgramCacheKey = () => `ring-shadow-${target}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vShadowWorld;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvShadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_FUNCTIONS}`)
      .replace(
        "#include <lights_fragment_end>",
        "#include <lights_fragment_end>\nfloat ringShadow = ringShadowFactor(vShadowWorld);\nreflectedLight.directDiffuse *= ringShadow;\nreflectedLight.directSpecular *= ringShadow;"
      );
  };
  return material;
}

/**
 * Anel plano no XZ local (o equador do corpo orientado) com UV radial: u = 0 na borda interna e
 * u = 1 na externa, que é como a faixa do anel de Saturno está desenhada.
 */
export function createRadialRingGeometry(inner: number, outer: number, segments = 128): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(inner, outer, segments, 1);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
