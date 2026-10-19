"use client";

import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { latLngToVector3, slerpVectors } from "@/lib/geo-spatial";
import { useGlobeStore, MIN_CAMERA_ALTITUDE } from "@/stores/globeStore";

/**
 * Smooth cubic ease-in-out easing for natural cinematic camera flights.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Resets OrbitControls delta states to eliminate residual damping,
 * pan, or zoom inertia from interfering with camera flights.
 */
function resetControlsDeltas(ctrl: any) {
  if (!ctrl) return;
  if (ctrl.target) ctrl.target.set(0, 0, 0);
  if (ctrl.state !== undefined) ctrl.state = -1;
  if (ctrl._sphericalDelta?.set) ctrl._sphericalDelta.set(0, 0, 0);
  if (ctrl._panOffset?.set) ctrl._panOffset.set(0, 0, 0);
  if (ctrl._scale !== undefined) ctrl._scale = 1;
}

export const CameraFlyToController: React.FC = () => {
  const { camera } = useThree();
  const controlsHook = useThree((state) => (state as any).controls);

  const flyToTrigger = useGlobeStore((s) => s.flyToTrigger);
  const cameraLat = useGlobeStore((s) => s.cameraLat);
  const cameraLng = useGlobeStore((s) => s.cameraLng);
  const cameraAltitude = useGlobeStore((s) => s.cameraAltitude);

  // Animation state references
  const isAnimating = useRef<boolean>(false);
  const startTime = useRef<number>(0);
  const duration = useRef<number>(1.2);

  const startDir = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1));
  const targetDir = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1));
  const startAltitude = useRef<number>(2.5);
  const targetAltitude = useRef<number>(2.5);
  const angleRad = useRef<number>(0);
  const finalPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 2.5));

  // Clean up controls on unmount
  useEffect(() => {
    return () => {
      if (controlsHook) {
        resetControlsDeltas(controlsHook);
        controlsHook.enabled = true;
      }
    };
  }, [controlsHook]);

  useEffect(() => {
    if (flyToTrigger > 0) {
      // 1. Calculate safe destination coordinates (min altitude 1.5)
      const safeTargetAltitude = Math.max(MIN_CAMERA_ALTITUDE, cameraAltitude || 2.0);
      const targetVec = latLngToVector3(cameraLat, cameraLng, safeTargetAltitude);
      finalPosition.current.copy(targetVec);

      // 2. Read starting camera position safely
      const currentPos = camera.position.clone();
      const currentDist = currentPos.length();

      // Guard against corrupt / uninitialized camera position
      if (!Number.isFinite(currentDist) || currentDist < 0.5) {
        currentPos.set(0, 0, 2.5);
      }

      const safeStartAltitude = Math.max(MIN_CAMERA_ALTITUDE, currentPos.length());
      startAltitude.current = safeStartAltitude;
      targetAltitude.current = safeTargetAltitude;

      // 3. Unit direction vectors for spherical interpolation
      const vStart = currentPos.clone().normalize();
      const vTarget = targetVec.clone().normalize();
      startDir.current.copy(vStart);
      targetDir.current.copy(vTarget);

      // 4. Compute angular distance on the unit sphere
      const dot = Math.max(-1.0, Math.min(1.0, vStart.dot(vTarget)));
      const angle = Math.acos(dot);
      angleRad.current = angle;

      const altitudeDelta = Math.abs(safeTargetAltitude - safeStartAltitude);

      // Fast-path: if already at the target within minimal threshold, settle immediately
      if (angle < 0.002 && altitudeDelta < 0.02) {
        camera.position.copy(finalPosition.current);
        camera.lookAt(0, 0, 0);
        if (controlsHook) {
          resetControlsDeltas(controlsHook);
          controlsHook.enabled = true;
          controlsHook.update();
        }
        isAnimating.current = false;
        return;
      }

      // 5. Dynamic duration calibrated to angular distance and altitude change
      const computedDuration = Math.max(
        0.7,
        Math.min(1.8, 0.7 + 0.9 * (angle / Math.PI) + 0.25 * altitudeDelta)
      );
      duration.current = computedDuration;
      startTime.current = -1; // Marks first frame of new animation
      isAnimating.current = true;

      // 6. Disable user drag inputs during flyTo and reset deltas to prevent jitter
      if (controlsHook) {
        controlsHook.enabled = false;
        resetControlsDeltas(controlsHook);
      }
    }
  }, [flyToTrigger, cameraLat, cameraLng, cameraAltitude, camera, controlsHook]);

  useFrame((state) => {
    if (!isAnimating.current) return;

    const activeControls = (state as any).controls || controlsHook;

    const clockTime = state.clock.getElapsedTime();
    if (startTime.current < 0) {
      startTime.current = clockTime;
    }

    const elapsed = clockTime - startTime.current;
    const rawProgress = Math.min(1.0, elapsed / duration.current);
    const easedProgress = easeInOutCubic(rawProgress);

    if (rawProgress >= 1.0) {
      // Animation complete: lock onto exact destination
      camera.position.copy(finalPosition.current);
      camera.lookAt(0, 0, 0);

      if (activeControls) {
        resetControlsDeltas(activeControls);
        activeControls.enabled = true;
        activeControls.update();
      }

      isAnimating.current = false;
      return;
    }

    // Spherical Arc Interpolation (SLERP along great circle arc via slerpVectors)
    const currentDir = slerpVectors(startDir.current, targetDir.current, easedProgress);

    // Altitude arc: interpolate radius and add gentle parabolic orbital elevation
    const baseAltitude = THREE.MathUtils.lerp(
      startAltitude.current,
      targetAltitude.current,
      easedProgress
    );
    // Slight orbital lift for long distances, peaking midway
    const arcLift = Math.sin(Math.PI * easedProgress) * Math.min(0.5, angleRad.current * 0.2);
    const currentAltitude = Math.max(MIN_CAMERA_ALTITUDE, baseAltitude + arcLift);

    // Position camera along spherical shell — altitude is strictly >= 1.5
    camera.position.copy(currentDir.multiplyScalar(currentAltitude));
    camera.lookAt(0, 0, 0);

    // Keep OrbitControls target aligned with Earth center and clear residual deltas every frame
    if (activeControls) {
      resetControlsDeltas(activeControls);
      activeControls.update();
    }
  });

  return null;
};
