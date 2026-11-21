"use client";

import React, { useRef, useLayoutEffect } from "react";
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
  calculatePlanetaryPosition,
} from "@/lib/astronomy-planets";
import { bodySceneRadius, earthSystemScale, scaledViewDistance, SUN_CORONA_RATIO, type CosmicScaleMode } from "@/lib/cosmic-scale";
import {
  easeInOutCubic,
  interpolateOrbit,
  orbitTransition,
  orbitTransitionDuration,
  prefersReducedMotion,
  reanchorOrbit,
  type OrbitObstacle,
  type OrbitState,
} from "@/lib/camera-transition";

/** Teto do passo de tempo por quadro: um travamento (montagem, shaders) não consome o voo. */
const MAX_FRAME_STEP = 1 / 30;

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

/** Mínimos de distância da câmera ao alvo (AGENTS.md §1: Lua ≥ 0,4; Terra ≥ 1,5). */
function minimumViewDistance(id: CelestialBodyId | null): number {
  if (id === "EARTH") return 1.5;
  if (id === "MOON") return 0.4;
  return 0.3;
}

/**
 * Offset da câmera para o corpo focado na política de escala ativa (D11): o offset do modo visual
 * é multiplicado pela razão entre os raios, respeitando os mínimos acima. Sol (vista geral) e
 * Halley (sem corpo em escala) não mudam.
 */
export function getScaledBodyViewOffset(id: CelestialBodyId | null, mode: CosmicScaleMode): THREE.Vector3 {
  const base = getBodyViewOffset(id);
  if (!id || id === "SUN" || id === "HALLEY" || mode === "visual") return base;
  const km = ASTROPHYSICAL_CATALOG[id].equatorialRadiusKm;
  const distance = scaledViewDistance(base.length(), bodySceneRadius(km, "visual"), bodySceneRadius(km, mode), minimumViewDistance(id));
  return base.normalize().multiplyScalar(distance);
}

/** Zoom mínimo do OrbitControls no modo Cosmos: 1,0 no visual; perto do corpo no modo real. */
export function cosmicMinDistance(id: CelestialBodyId | null, mode: CosmicScaleMode): number {
  if (mode === "visual" || !id || id === "SUN" || id === "HALLEY") return 1.0;
  if (id === "EARTH") return 1.0;
  if (id === "MOON") return 0.4;
  return Math.max(0.1, bodySceneRadius(ASTROPHYSICAL_CATALOG[id].equatorialRadiusKm, mode) * 2.5);
}

export const CosmicCameraController: React.FC = () => {
  const { camera } = useThree();
  const controlsHook = useThree((state) => (state as any).controls);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();

  // Transição em andamento (D17): estados inicial/final, tempo e limites de zoom a aplicar no fim.
  const transition = useRef<{
    from: OrbitState;
    to: OrbitState;
    /** Esferas que a câmera não pode atravessar durante o voo (Sol e Terra). */
    obstacles: OrbitObstacle[];
    elapsed: number;
    duration: number;
    limits: { min: number; max: number };
  } | null>(null);
  const prevCosmicMode = useRef<boolean>(false);
  const prevFocusedId = useRef<CelestialBodyId | null>(null);
  const prevScaleMode = useRef<CosmicScaleMode>(scaleMode);

  // Layout effect: a reancoragem precisa acontecer antes do próximo quadro, senão a troca de
  // cena aparece por um quadro (o grupo da Terra já mudou de centro e de escala).
  useLayoutEffect(() => {
    if (!controlsHook) return;

    const cosmicModeChanged = prevCosmicMode.current !== isCosmicMode;
    const focusChanged = prevFocusedId.current !== focusedBodyId;
    // Trocar a escala com um corpo focado reenquadra a câmera no novo tamanho.
    const scaleChanged = prevScaleMode.current !== scaleMode && isCosmicMode && focusedBodyId !== null;
    const previousScale = prevScaleMode.current;
    prevScaleMode.current = scaleMode;
    if (!cosmicModeChanged && !focusChanged && !scaleChanged) return;
    prevCosmicMode.current = isCosmicMode;
    prevFocusedId.current = focusedBodyId;

    resetControlsDeltas(controlsHook);
    let from: OrbitState = { target: controlsHook.target.clone(), camera: camera.position.clone() };
    const obstacles: OrbitObstacle[] = [];

    // Terra ↔ Cosmos: o grupo da Terra troca de centro (origem ↔ órbita) e de escala no mesmo
    // quadro. Leva câmera e alvo junto, para a Terra continuar igual na tela — sem corte seco.
    if (cosmicModeChanged) {
      const home = { center: new THREE.Vector3(), scale: 1 };
      const orbit = {
        center: calculatePlanetaryPosition("EARTH", selectedYear).scenePosition.clone(),
        scale: earthSystemScale(isCosmicMode ? scaleMode : previousScale),
      };
      from = isCosmicMode ? reanchorOrbit(from, home, orbit) : reanchorOrbit(from, orbit, home);
    }
    // A Terra (onde estiver, na escala do momento) e, no Cosmos, o Sol são obstáculos do voo.
    if (isCosmicMode) {
      obstacles.push({ center: new THREE.Vector3(), radius: bodySceneRadius(ASTROPHYSICAL_CATALOG.SUN.equatorialRadiusKm, scaleMode) * SUN_CORONA_RATIO * 1.15 });
      obstacles.push({
        center: calculatePlanetaryPosition("EARTH", selectedYear).scenePosition.clone(),
        radius: earthSystemScale(scaleMode) * 1.5,
      });
    } else {
      obstacles.push({ center: new THREE.Vector3(), radius: MIN_CAMERA_ALTITUDE });
    }

    let to: OrbitState;
    let limits: { min: number; max: number };
    if (!isCosmicMode && !focusedBodyId) {
      // Volta à vista padrão da Terra
      limits = { min: MIN_CAMERA_ALTITUDE, max: MAX_CAMERA_ALTITUDE };
      to = { target: new THREE.Vector3(0, 0, 0), camera: new THREE.Vector3(0, 0, 2.5) };
    } else if (!isCosmicMode && focusedBodyId === "MOON") {
      // Modo normal: inspeção da Lua
      limits = { min: 0.4, max: 6.0 };
      const bodyPos = getBodyPosition("MOON", selectedYear, false);
      to = { target: bodyPos.clone(), camera: bodyPos.clone().add(getBodyViewOffset("MOON")) };
    } else {
      // Vista cósmica
      limits = { min: cosmicMinDistance(focusedBodyId, scaleMode), max: 1200.0 };
      const bodyPos = getBodyPosition(focusedBodyId, selectedYear, isCosmicMode);
      to = { target: bodyPos.clone(), camera: bodyPos.clone().add(getScaledBodyViewOffset(focusedBodyId, scaleMode)) };
    }

    const duration = prefersReducedMotion() ? 0 : orbitTransitionDuration(from, to);
    if (duration === 0) {
      controlsHook.minDistance = limits.min;
      controlsHook.maxDistance = limits.max;
      controlsHook.target.copy(to.target);
      camera.position.copy(to.camera);
      controlsHook.update();
      transition.current = null;
      orbitTransition.active = false;
      return;
    }

    // Durante o voo os limites de zoom ficam abertos, senão o OrbitControls puxaria a câmera.
    controlsHook.minDistance = 1e-3;
    controlsHook.maxDistance = Infinity;
    controlsHook.target.copy(from.target);
    camera.position.copy(from.camera);
    controlsHook.update();
    transition.current = { from, to, obstacles, elapsed: 0, duration, limits };
    orbitTransition.active = true;
  }, [isCosmicMode, focusedBodyId, scaleMode, controlsHook, camera, selectedYear]);

  useFrame((_, delta) => {
    if (!controlsHook) return;

    const tr = transition.current;
    if (tr) {
      tr.elapsed += Math.min(delta, MAX_FRAME_STEP);
      const t = Math.min(1, tr.elapsed / tr.duration);
      const state = interpolateOrbit(tr.from, tr.to, easeInOutCubic(t), { obstacles: tr.obstacles });
      controlsHook.target.copy(state.target);
      camera.position.copy(state.camera);
      resetControlsDeltas(controlsHook);
      if (t >= 1) {
        controlsHook.minDistance = tr.limits.min;
        controlsHook.maxDistance = tr.limits.max;
        transition.current = null;
        orbitTransition.active = false;
      }
      controlsHook.update();
    } else if (focusedBodyId && focusedBodyId !== "SUN") {
      // Acompanha o alvo em órbita em tempo real
      const currentTargetPos = getBodyPosition(focusedBodyId, selectedYear, isCosmicMode);
      const deltaTarget = currentTargetPos.clone().sub(controlsHook.target);
      controlsHook.target.copy(currentTargetPos);
      camera.position.add(deltaTarget);
      controlsHook.update();
    }
  });

  return null;
};
