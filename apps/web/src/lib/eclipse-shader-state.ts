/**
 * Estado imperativo leve de sombreamento solar por eclipse compartilhado entre `EclipseShadowLayer`,
 * `EarthSphere` (`EarthShaderMaterial`) e `CloudLayer` sem inflar o bundle inicial de `/`.
 *
 * Mantém a direção da umbra no referencial fixo da Terra e a projeta para o espaço mundial via
 * `earthOrientation` (AGENTS.md §1), escurecendo fisicamente tanto a superfície diurna quanto as
 * nuvens MODIS exatamente sob a umbra e a penumbra lunares.
 */

import * as THREE from "three";
import { earthOrientation } from "./earth-orientation";

export const eclipseShaderState = {
  /** Direção unitária no referencial fixo da Terra apontando para o centro da sombra solar. */
  bodyShadowDir: new THREE.Vector3(1, 0, 0),
  umbraRad: 0.028,
  penumbraRad: 0.45,
  /** `0` quando inativo ou em eclipse lunar; `1` em eclipse solar total ativo. */
  strength: 0,
};

export function setEclipseSurfaceShadow(
  bodyDir: THREE.Vector3,
  umbraRad: number,
  penumbraRad: number,
  strength: number
): void {
  eclipseShaderState.bodyShadowDir.copy(bodyDir).normalize();
  eclipseShaderState.umbraRad = umbraRad;
  eclipseShaderState.penumbraRad = penumbraRad;
  eclipseShaderState.strength = strength;
}

export function clearEclipseSurfaceShadow(): void {
  eclipseShaderState.strength = 0;
}

export function syncEclipseShaderUniforms(uniforms: {
  uEclipseDir?: { value: THREE.Vector3 };
  uEclipseRadii?: { value: THREE.Vector2 };
  uEclipseStrength?: { value: number };
}): void {
  if (!uniforms.uEclipseStrength) return;
  uniforms.uEclipseStrength.value = eclipseShaderState.strength;
  if (eclipseShaderState.strength <= 0.001) return;
  if (uniforms.uEclipseDir) {
    uniforms.uEclipseDir.value
      .copy(eclipseShaderState.bodyShadowDir)
      .applyQuaternion(earthOrientation)
      .normalize();
  }
  if (uniforms.uEclipseRadii) {
    uniforms.uEclipseRadii.value.set(
      eclipseShaderState.umbraRad,
      eclipseShaderState.penumbraRad
    );
  }
}
