"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from "@/stores/globeStore";
import {
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  ASTROPHYSICAL_CATALOG,
  CelestialBodyId,
  currentMoonWorldPos,
} from "@/lib/astronomy-planets";

function resetControlsDeltas(ctrl: any) {
  if (!ctrl) return;
  if (ctrl.state !== undefined) ctrl.state = -1;
  if (ctrl._sphericalDelta?.set) ctrl._sphericalDelta.set(0, 0, 0);
  if (ctrl._panOffset?.set) ctrl._panOffset.set(0, 0, 0);
  if (ctrl._scale !== undefined) ctrl._scale = 1;
}

// Helper to obtain current 3D position of celestial body
function getBodyPosition(
  id: CelestialBodyId | null,
  year: number,
  isCosmic: boolean
): THREE.Vector3 {
  if (!id || id === "SUN") return new THREE.Vector3(0, 0, 0);
  if (id === "HALLEY") {
    const h = calculateHalleyPosition(year);
    return h.scenePosition;
  }
  if (id === "MOON") {
    // Moon's current world position (handles both Normal and Cosmic modes dynamically)
    return currentMoonWorldPos.clone();
  }
  if (id === "EARTH") {
    if (!isCosmic) return new THREE.Vector3(0, 0, 0);
    const planets = computeAllPlanetaryPositions(year);
    return planets.EARTH.scenePosition.clone();
  }
  const planets = computeAllPlanetaryPositions(year);
  if (id in planets) {
    return (planets as any)[id].scenePosition;
  }
  return new THREE.Vector3(0, 0, 0);
}

// Helper to obtain appropriate camera offset distance for focused body
function getBodyViewOffset(id: CelestialBodyId | null): THREE.Vector3 {
  if (!id || id === "SUN") {
    return new THREE.Vector3(0, 90, 160);
  }
  if (id === "HALLEY") {
    return new THREE.Vector3(0, 3, 7);
  }
  if (id === "EARTH") {
    return new THREE.Vector3(0, 1.8, 3.6);
  }
  if (id === "MOON") {
    return new THREE.Vector3(0, 0.35, 0.95);
  }
  const meta = ASTROPHYSICAL_CATALOG[id];
  let distance = 6.0;
  if (id === "JUPITER") distance = 14.0;
  else if (id === "SATURN") distance = 16.0;
  else if (id === "URANUS" || id === "NEPTUNE") distance = 10.0;
  else if (id === "VENUS") distance = 5.0;
  else if (id === "MARS" || id === "MERCURY" || id === "PLUTO") distance = 3.5;

  return new THREE.Vector3(0, distance * 0.45, distance * 0.9);
}

export const CosmicCameraController: React.FC = () => {
  const { camera } = useThree();
  const controlsHook = useThree((state) => (state as any).controls);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  // Animation state
  const isTransitioning = useRef<boolean>(false);
  const startCameraPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const startControlsTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetControlsTarget = useRef<THREE.Vector3>(new THREE.Vector3());
  const transitionProgress = useRef<number>(1.0);
  const transitionDuration = useRef<number>(1.5); // seconds
  const prevCosmicMode = useRef<boolean>(false);
  const prevFocusedId = useRef<CelestialBodyId | null>(null);

  // Detect state transitions
  useEffect(() => {
    if (!controlsHook) return;

    const cosmicModeChanged = prevCosmicMode.current !== isCosmicMode;
    const focusChanged = prevFocusedId.current !== focusedBodyId;

    if (cosmicModeChanged || focusChanged) {
      prevCosmicMode.current = isCosmicMode;
      prevFocusedId.current = focusedBodyId;

      resetControlsDeltas(controlsHook);

      startCameraPos.current.copy(camera.position);
      startControlsTarget.current.copy(controlsHook.target);

      if (!isCosmicMode && !focusedBodyId) {
        // Returning to default Earth view
        controlsHook.minDistance = MIN_CAMERA_ALTITUDE;
        controlsHook.maxDistance = MAX_CAMERA_ALTITUDE;
        targetControlsTarget.current.set(0, 0, 0);
        targetCameraPos.current.set(0, 0, 2.5);
      } else if (!isCosmicMode && focusedBodyId === "MOON") {
        // Normal Mode: Moon inspection focus
        controlsHook.minDistance = 0.4;
        controlsHook.maxDistance = 6.0;

        const bodyPos = getBodyPosition("MOON", selectedYear, false);
        const offset = getBodyViewOffset("MOON");

        targetControlsTarget.current.copy(bodyPos);
        targetCameraPos.current.copy(bodyPos).add(offset);
      } else {
        // In Cosmic View
        controlsHook.minDistance = 1.0;
        controlsHook.maxDistance = 1200.0;

        const bodyPos = getBodyPosition(focusedBodyId, selectedYear, isCosmicMode);
        const offset = getBodyViewOffset(focusedBodyId);

        targetControlsTarget.current.copy(bodyPos);
        targetCameraPos.current.copy(bodyPos).add(offset);
      }

      transitionProgress.current = 0.0;
      isTransitioning.current = true;
    }
  }, [isCosmicMode, focusedBodyId, controlsHook, camera.position, selectedYear]);

  // Frame update
  useFrame((_, delta) => {
    if (!controlsHook) return;

    if (isTransitioning.current) {
      transitionProgress.current += delta / transitionDuration.current;
      const t = Math.min(1.0, transitionProgress.current);
      // Smooth cubic easing
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Interpolate controls.target smoothly
      controlsHook.target.lerpVectors(startControlsTarget.current, targetControlsTarget.current, ease);

      // Interpolate camera.position smoothly
      camera.position.lerpVectors(startCameraPos.current, targetCameraPos.current, ease);

      if (t >= 1.0) {
        isTransitioning.current = false;
        resetControlsDeltas(controlsHook);
      }
      controlsHook.update();
    } else if (focusedBodyId && focusedBodyId !== "SUN") {
      // Smoothly track orbiting target in real time
      const currentTargetPos = getBodyPosition(focusedBodyId, selectedYear, isCosmicMode);
      const deltaTarget = currentTargetPos.clone().sub(controlsHook.target);

      // Move target and camera in tandem with orbital motion
      controlsHook.target.copy(currentTargetPos);
      camera.position.add(deltaTarget);
      controlsHook.update();
    }
  });

  return null;
};
