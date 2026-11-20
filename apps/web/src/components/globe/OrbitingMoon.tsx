"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { focusCelestialBody } from "@/stores/actions";
import { findMilestoneById } from "@/lib/country-data";
import { slerpVectors } from "@/lib/geo-spatial";
import {
  calculateLunarPosition,
  calculateSubsolarPoint,
  getSunDirectionVector,
  resolveAstronomicalDate,
} from "@/lib/astronomy";
import { calculatePlanetaryPosition, currentMoonWorldPos } from "@/lib/astronomy-planets";

const MOON_RADIUS = 0.27;

const moonVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  // Invariant (AGENTS.md §1): World-space normal for solar direction dot product
  vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const moonFragmentShader = `
uniform sampler2D uMoonTexture;
uniform vec3 uSunDirection;
uniform vec3 uHighlightColor;
uniform float uHighlightStrength;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 sunDir = normalize(uSunDirection);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  float ndotl = dot(N, sunDir);
  // Realistic lunar regolith response: crisp terminator + slight opposition/Lommel-Seeliger lift
  float terminator = smoothstep(-0.04, 0.08, ndotl);
  float lit = pow(max(0.0, ndotl), 0.72) * terminator;

  vec3 albedo = texture2D(uMoonTexture, vUv).rgb;

  // Subtle cool earthshine on the night hemisphere so unlit lunar phase remains discernible
  vec3 earthshine = albedo * vec3(0.05, 0.06, 0.085);
  vec3 sunlit = albedo * lit * 1.18;

  // Soft selection/hover rim highlight without washing out the astronomical phase
  float fresnel = pow(1.0 - max(0.0, dot(N, viewDir)), 2.5);
  vec3 highlight = uHighlightColor * (uHighlightStrength * (0.18 + 0.55 * fresnel));

  gl_FragColor = vec4(earthshine + sunlit + highlight, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createPlaceholderMoonTexture(): THREE.DataTexture {
  const data = new Uint8Array([148, 150, 156, 255]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Computes the Moon's tidal-locking orientation quaternion so its near side (local +X,
 * center of equirectangular moon.jpg) always faces Earth at the local origin (0, 0, 0).
 */
export function computeTidalLockQuaternion(moonLocalPos: THREE.Vector3): THREE.Quaternion {
  const xAxis = moonLocalPos.clone().negate();
  if (xAxis.lengthSq() < 1e-8) {
    return new THREE.Quaternion();
  }
  xAxis.normalize();

  const worldNorth = new THREE.Vector3(0, 1, 0);
  const yAxis = worldNorth.clone().addScaledVector(xAxis, -worldNorth.dot(xAxis));
  if (yAxis.lengthSq() < 1e-6) {
    yAxis.set(0, 0, 1);
  }
  yAxis.normalize();

  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const rotMat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(rotMat);
}

/**
 * Advances the Moon smoothly along its spherical orbit around Earth without ever
 * teleporting or cutting through the planet:
 * - During rapid multi-year timeline playback (`isPlaying && !isApolloScene`), revolves
 *   smoothly prograde along the orbital sphere so discrete yearly ticks never strobe.
 * - When static, scrubbing, paused, or entering Apollo 11, glides smoothly via SLERP
 *   along the great-circle orbital arc to settle onto the exact Meeus Ch. 47 position.
 */
export function stepOrbitalPosition(
  current: THREE.Vector3,
  target: THREE.Vector3,
  delta: number,
  options: { isPlaying: boolean; playbackSpeed: number; isApolloScene: boolean }
): THREE.Vector3 {
  const safeDelta = Math.min(Math.max(delta, 0), 0.1);
  if (safeDelta <= 0) return current.clone();

  if (options.isPlaying && !options.isApolloScene) {
    const speedFactor = Math.max(
      0.5,
      Math.min(2.2, 0.55 + Math.log10(Math.max(1, options.playbackSpeed)) * 0.65)
    );
    const angularStep = speedFactor * safeDelta;
    const next = current.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angularStep);
    const nextR = THREE.MathUtils.damp(current.length(), target.length(), 3.0, safeDelta);
    next.y = THREE.MathUtils.damp(next.y, target.y * 0.65, 1.5, safeDelta);
    return next.normalize().multiplyScalar(nextR);
  }

  const cDir = current.clone().normalize();
  const tDir = target.clone().normalize();
  const dot = Math.max(-1, Math.min(1, cDir.dot(tDir)));
  const angle = Math.acos(dot);
  const radiusDelta = Math.abs(current.length() - target.length());

  if (angle < 1e-4 && radiusDelta < 1e-4) {
    return target.clone();
  }

  const dampRate = options.isApolloScene ? 9.0 : 5.0;
  const maxAngularSpeed = options.isApolloScene ? 6.5 : 2.2;
  const desiredStep = angle * (1 - Math.exp(-dampRate * safeDelta));
  const clampedStep = Math.min(angle, Math.min(desiredStep, maxAngularSpeed * safeDelta));
  const t =
    angle > 1e-5
      ? Math.min(1, clampedStep / angle)
      : 1 - Math.exp(-dampRate * safeDelta);

  return slerpVectors(current, target, t);
}

export const OrbitingMoon: React.FC = () => {
  const moonGroupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  const epoch = useEpochState();
  const isApolloScene = epoch.activeScene === "APOLLO11";
  const selectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isPlaying = useCosmicStore((s) => s.isPlaying);
  const playbackSpeed = useCosmicStore((s) => s.playbackSpeed);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const hoveredBodyId = useCosmicStore((s) => s.hoveredBodyId);
  const setHoveredBody = useCosmicStore((s) => s.setHoveredBody);

  const isFocused = focusedBodyId === "MOON";
  const isHovered = hoveredBodyId === "MOON";

  // Resolve exact UTC date from canonical epoch state (Apollo 11 -> 1969-07-20T20:17:40Z)
  const activeDate = useMemo(() => {
    const milestone = selectedMilestoneId ? findMilestoneById(selectedMilestoneId) : undefined;
    return resolveAstronomicalDate({
      selectedYear,
      selectedMilestoneExactDate: milestone?.exactDate ?? null,
      selectedMilestoneYear: milestone?.year ?? null,
      activeScene: epoch.activeScene,
    });
  }, [selectedYear, selectedMilestoneId, epoch.activeScene]);

  // Real geocentric lunar ephemeris (Meeus Ch. 47) & matching Earth-mode solar direction
  const { targetLocalPos, earthModeSunDir } = useMemo(() => {
    const lunar = calculateLunarPosition(activeDate);
    const localPos = isCosmicMode ? lunar.cosmicRelativePosition : lunar.scenePosition;
    const subsolar = calculateSubsolarPoint(activeDate);
    const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);

    return {
      targetLocalPos: localPos,
      earthModeSunDir: sunDir,
    };
  }, [activeDate, isCosmicMode]);

  // Imperative animated position state (prevents React re-render 1-frame snap flashes)
  const initializedRef = useRef<boolean>(false);
  const prevCosmicModeRef = useRef<boolean>(isCosmicMode);
  const currentLocalPosRef = useRef<THREE.Vector3>(targetLocalPos.clone());
  const currentSunDirRef = useRef<THREE.Vector3>(earthModeSunDir.clone());

  // GPU resources (geometry, world-space lunar phase shader, selection ring, placeholder texture)
  const { moonGeo, moonMat, placeholderTex, ringGeo, ringMat } = useMemo(() => {
    const pTex = createPlaceholderMoonTexture();
    const mGeo = new THREE.SphereGeometry(MOON_RADIUS, 48, 36);
    const mMat = new THREE.ShaderMaterial({
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      uniforms: {
        uMoonTexture: { value: pTex as THREE.Texture },
        uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
        uHighlightColor: { value: new THREE.Color("#38bdf8") },
        uHighlightStrength: { value: 0.0 },
      },
    });
    const rGeo = new THREE.RingGeometry(0.36, 0.42, 48);
    const rMat = new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    return {
      moonGeo: mGeo,
      moonMat: mMat,
      placeholderTex: pTex,
      ringGeo: rGeo,
      ringMat: rMat,
    };
  }, []);

  // Load real lunar albedo texture and dispose cleanly on unmount
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const loadedTex = loader.load("/textures/moon.jpg", () => {
      if (cancelled) return;
      loadedTex.colorSpace = THREE.SRGBColorSpace;
      moonMat.uniforms.uMoonTexture.value = loadedTex;
      moonMat.needsUpdate = true;
      invalidate();
    });
    loadedTex.colorSpace = THREE.SRGBColorSpace;

    return () => {
      cancelled = true;
      moonMat.uniforms.uMoonTexture.value = placeholderTex;
      loadedTex.dispose();
    };
  }, [moonMat, placeholderTex, invalidate]);

  // Dispose static GPU resources & restore cursor on unmount
  useEffect(() => {
    return () => {
      moonGeo.dispose();
      moonMat.dispose();
      placeholderTex.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, [moonGeo, moonMat, placeholderTex, ringGeo, ringMat]);

  // Place Moon at exact astronomical position on initial mount or coordinate-frame switch
  useEffect(() => {
    const modeChanged = prevCosmicModeRef.current !== isCosmicMode;
    prevCosmicModeRef.current = isCosmicMode;

    if (!initializedRef.current || modeChanged) {
      initializedRef.current = true;
      currentLocalPosRef.current.copy(targetLocalPos);
      currentSunDirRef.current.copy(earthModeSunDir);

      if (moonGroupRef.current) {
        moonGroupRef.current.position.copy(targetLocalPos);
      }
      if (moonRef.current) {
        moonRef.current.quaternion.copy(computeTidalLockQuaternion(targetLocalPos));
      }

      if (!isCosmicMode) {
        moonMat.uniforms.uSunDirection.value.copy(earthModeSunDir);
        currentMoonWorldPos.copy(targetLocalPos);
      } else {
        const earthPos = calculatePlanetaryPosition(
          "EARTH",
          selectedYear || new Date().getUTCFullYear()
        ).scenePosition;
        currentMoonWorldPos.copy(earthPos).add(targetLocalPos);
        if (currentMoonWorldPos.lengthSq() > 1e-6) {
          moonMat.uniforms.uSunDirection.value.copy(currentMoonWorldPos).negate().normalize();
        }
      }
    }

    moonMat.uniforms.uHighlightColor.value.set(isFocused ? "#38bdf8" : "#93c5fd");
    moonMat.uniforms.uHighlightStrength.value = isFocused ? 0.85 : isHovered ? 0.45 : 0.0;
    invalidate();
  }, [
    moonMat,
    isFocused,
    isHovered,
    isCosmicMode,
    earthModeSunDir,
    targetLocalPos,
    selectedYear,
    invalidate,
  ]);

  // Smooth orbital SLERP / playback revolution + tidal lock + world-space solar phase every frame
  useFrame((_, delta) => {
    if (!moonGroupRef.current || !moonRef.current) return;

    const nextLocalPos = stepOrbitalPosition(currentLocalPosRef.current, targetLocalPos, delta, {
      isPlaying,
      playbackSpeed,
      isApolloScene,
    });
    currentLocalPosRef.current.copy(nextLocalPos);

    moonGroupRef.current.position.copy(nextLocalPos);
    moonRef.current.quaternion.copy(computeTidalLockQuaternion(nextLocalPos));
    moonRef.current.getWorldPosition(currentMoonWorldPos);

    if (isCosmicMode && currentMoonWorldPos.lengthSq() > 1e-6) {
      moonMat.uniforms.uSunDirection.value.copy(currentMoonWorldPos).negate().normalize();
    } else {
      const sunStep = 1 - Math.exp(-Math.min(delta, 0.1) * 6.0);
      currentSunDirRef.current.lerp(earthModeSunDir, sunStep).normalize();
      moonMat.uniforms.uSunDirection.value.copy(currentSunDirRef.current);
    }
  });

  return (
    <group ref={moonGroupRef} name="orbiting-moon-group">
      <mesh
        ref={moonRef}
        name="orbiting-moon"
        geometry={moonGeo}
        material={moonMat}
        onClick={(e) => {
          e.stopPropagation();
          focusCelestialBody("MOON");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredBody("MOON");
          if (typeof document !== "undefined") {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          setHoveredBody(null);
          if (typeof document !== "undefined") {
            document.body.style.cursor = "auto";
          }
        }}
      />

      {/* Selection indicator halo around Moon */}
      {isFocused && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo} material={ringMat} />
      )}
    </group>
  );
};
