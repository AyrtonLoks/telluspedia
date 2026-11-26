"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { calculateLunarPosition } from "@/lib/astronomy";
import { ECLIPSES_CATALOG } from "@/lib/eclipses-catalog";
import {
  buildTotalityCenterlinePoints,
  buildTotalityRibbonGeometry,
  computeEclipseGeometry,
  ECLIPSE_SHADOW_SHELL_RADIUS,
} from "@/lib/eclipses-geometry";
import { useCosmicStore } from "@/stores/cosmicStore";

const ignoreRaycast = () => null;

const shadowShellVertexShader = `
varying vec3 vLocalDir;

void main() {
  // Direção esférica no referencial fixo da Terra (filho de EarthOrientationGroup:
  // rotaciona solidariamente à Terra tanto na visão terrestre quanto no Modo Cosmos).
  vLocalDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const shadowShellFragmentShader = `
uniform vec3 uShadowDir;
uniform float uUmbraRad;
uniform float uPenumbraRad;
uniform float uIsSolar;
uniform float uActiveStrength;

varying vec3 vLocalDir;

void main() {
  if (uIsSolar < 0.5 || uActiveStrength <= 0.001) {
    discard;
  }

  vec3 pDir = normalize(vLocalDir);
  vec3 sDir = normalize(uShadowDir);
  float cosAng = clamp(dot(pDir, sDir), -1.0, 1.0);
  float ang = acos(cosAng);

  if (ang > uPenumbraRad) {
    discard;
  }

  // Penumbra suave da borda até o núcleo de umbra + anel coronal âmbar sutil na borda da umbra
  float penumbraT = 1.0 - smoothstep(uUmbraRad, uPenumbraRad, ang);
  float umbraCore = 1.0 - smoothstep(uUmbraRad * 0.45, uUmbraRad * 1.15, ang);
  float coronaRim = smoothstep(uUmbraRad * 0.65, uUmbraRad, ang)
    * (1.0 - smoothstep(uUmbraRad, uUmbraRad * 1.45, ang));

  float alpha = clamp((penumbraT * 0.52 + umbraCore * 0.40) * uActiveStrength, 0.0, 0.90);
  vec3 shadowTint = mix(vec3(0.015, 0.022, 0.048), vec3(0.005, 0.008, 0.02), umbraCore);
  vec3 coronaColor = vec3(1.0, 0.66, 0.24) * coronaRim * 0.42;

  gl_FragColor = vec4(shadowTint + coronaColor, alpha);
}
`;

/**
 * Camada 3D de Eclipses Solares & Lunares (D41):
 * - Projeta a sombra física de umbra e penumbra sobre a Terra (`ECLIPSE_SHADOW_SHELL_RADIUS`);
 * - Renderiza a faixa de totalidade geodésica e a linha central em 3D;
 * - Desenha o cone translúcido de sombra entre a Lua e a superfície terrestre (ou Terra → Lua no eclipse lunar);
 * - Nunca intercepta cliques sobre países (`raycast={() => null}`) e descarta 100% da GPU (`RN21`).
 */
export const EclipseShadowLayer: React.FC = () => {
  const activeEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const offsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const invalidate = useThree((s) => s.invalidate);

  const instant = useMemo(() => {
    if (!activeEclipseId) return null;
    return computeEclipseGeometry(activeEclipseId, offsetMinutes);
  }, [activeEclipseId, offsetMinutes]);

  const eclipseEntry = activeEclipseId ? ECLIPSES_CATALOG[activeEclipseId] : null;

  const { shellGeo, shellMat, ringGeo, ringMat, coneGeo, coneMat } = useMemo(() => {
    const sGeo = new THREE.SphereGeometry(ECLIPSE_SHADOW_SHELL_RADIUS, 72, 54);
    const sMat = new THREE.ShaderMaterial({
      vertexShader: shadowShellVertexShader,
      fragmentShader: shadowShellFragmentShader,
      uniforms: {
        uShadowDir: { value: new THREE.Vector3(1, 0, 0) },
        uUmbraRad: { value: 0.032 },
        uPenumbraRad: { value: 0.45 },
        uIsSolar: { value: 1.0 },
        uActiveStrength: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
    });
    const rGeo = new THREE.RingGeometry(0.022, 0.032, 36);
    const rMat = new THREE.MeshBasicMaterial({
      color: "#fbbf24",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });
    const cGeo = new THREE.CylinderGeometry(0.03, 0.27, 1.0, 24, 1, true);
    const cMat = new THREE.MeshBasicMaterial({
      color: "#0f172a",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    return {
      shellGeo: sGeo,
      shellMat: sMat,
      ringGeo: rGeo,
      ringMat: rMat,
      coneGeo: cGeo,
      coneMat: cMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      shellGeo.dispose();
      shellMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      coneGeo.dispose();
      coneMat.dispose();
    };
  }, [shellGeo, shellMat, ringGeo, ringMat, coneGeo, coneMat]);

  const totalityVisuals = useMemo(() => {
    if (!eclipseEntry || eclipseEntry.kind !== "solar_total") return null;
    const ribbonGeo = buildTotalityRibbonGeometry(
      eclipseEntry.centerline,
      eclipseEntry.umbraWidthKm
    );
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: "#090d1a",
      transparent: true,
      opacity: 0.56,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pts = buildTotalityCenterlinePoints(eclipseEntry.centerline);
    const linePos: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: "#f59e0b",
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      toneMapped: false,
    });
    return { ribbonGeo, ribbonMat, lineGeo, lineMat };
  }, [eclipseEntry]);

  useEffect(() => {
    invalidate();
    return () => {
      if (!totalityVisuals) return;
      totalityVisuals.ribbonGeo.dispose();
      totalityVisuals.ribbonMat.dispose();
      totalityVisuals.lineGeo.dispose();
      totalityVisuals.lineMat.dispose();
    };
  }, [totalityVisuals, invalidate]);

  useEffect(() => {
    if (!instant) return;
    shellMat.uniforms.uShadowDir.value.copy(instant.shadowDirection);
    shellMat.uniforms.uUmbraRad.value = instant.umbraAngularRad;
    shellMat.uniforms.uPenumbraRad.value = instant.penumbraAngularRad;
    shellMat.uniforms.uIsSolar.value = instant.eclipse.kind === "solar_total" ? 1.0 : 0.0;
    shellMat.uniforms.uActiveStrength.value = instant.isTotalityActive ? 1.0 : 0.45;
    coneMat.color.set(instant.eclipse.kind === "lunar_total" ? "#991b1b" : "#020617");
    coneMat.opacity = instant.eclipse.kind === "lunar_total" ? 0.22 : 0.16;
    invalidate();
  }, [instant, shellMat, coneMat, invalidate]);

  const coneTransform = useMemo(() => {
    if (!instant) return null;
    const lunar = calculateLunarPosition(instant.targetDate);
    const moonPos = isCosmicMode ? lunar.cosmicRelativePosition : lunar.scenePosition;
    const surfaceSpot = instant.shadowDirection.clone().multiplyScalar(1.003);
    const start = instant.eclipse.kind === "solar_total" ? surfaceSpot : new THREE.Vector3(0, 0, 0);
    const end = moonPos;
    const axis = end.clone().sub(start);
    const length = axis.length();
    if (length < 0.2) return null;
    const mid = start.clone().addScaledVector(axis, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.clone().normalize()
    );
    return { mid, quat, length };
  }, [instant, isCosmicMode]);

  if (!instant) return null;

  const markerPos = instant.shadowDirection.clone().multiplyScalar(1.0038);
  const markerQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    instant.shadowDirection
  );

  return (
    <group name="eclipse-shadow-layer">
      <mesh geometry={shellGeo} material={shellMat} raycast={ignoreRaycast} renderOrder={8} />

      {totalityVisuals && (
        <>
          <mesh
            geometry={totalityVisuals.ribbonGeo}
            material={totalityVisuals.ribbonMat}
            raycast={ignoreRaycast}
            renderOrder={9}
          />
          <lineSegments
            geometry={totalityVisuals.lineGeo}
            material={totalityVisuals.lineMat}
            raycast={ignoreRaycast}
            renderOrder={10}
          />
        </>
      )}

      {instant.eclipse.kind === "solar_total" && (
        <mesh
          position={markerPos}
          quaternion={markerQuat}
          geometry={ringGeo}
          material={ringMat}
          raycast={ignoreRaycast}
          renderOrder={11}
        />
      )}

      {coneTransform && (
        <mesh
          position={coneTransform.mid}
          quaternion={coneTransform.quat}
          scale={[1, coneTransform.length, 1]}
          geometry={coneGeo}
          material={coneMat}
          raycast={ignoreRaycast}
          renderOrder={7}
        />
      )}
    </group>
  );
};
