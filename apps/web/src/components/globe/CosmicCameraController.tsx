"use client";

import React, { useRef, useLayoutEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls } from "@react-three/drei";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useCosmicExitStore } from "@/stores/cosmicExitStore";
import { MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from "@/stores/globeStore";
import {
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  ASTROPHYSICAL_CATALOG,
  CelestialBodyId,
  currentMoonWorldPos,
  calculatePlanetaryPosition,
} from "@/lib/astronomy-planets";
import {
  calculateProbePosition,
  computeProbeBasis,
  type DeepSpaceProbeId,
} from "@/lib/deep-space-probes";
import { ECLIPSE_KIND_BY_ID, resolveEclipseDecimalYear, type EclipseId } from "@/lib/eclipses-ids";
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

/** O OrbitControls do drei (three-stdlib). */
type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;
/** Campos internos do OrbitControls zerados ao assumir a câmera (não fazem parte da API pública). */
interface OrbitControlsInternals {
  state?: number;
  _sphericalDelta?: { set(x: number, y: number, z: number): unknown };
  _panOffset?: { set(x: number, y: number, z: number): unknown };
  _scale?: number;
}

function resetControlsDeltas(controls: OrbitControlsImpl | null) {
  const ctrl = controls as unknown as OrbitControlsInternals | null;
  if (!ctrl) return;
  if (ctrl.state !== undefined) ctrl.state = -1;
  if (ctrl._sphericalDelta?.set) ctrl._sphericalDelta.set(0, 0, 0);
  if (ctrl._panOffset?.set) ctrl._panOffset.set(0, 0, 0);
  if (ctrl._scale !== undefined) ctrl._scale = 1;
}

// Helper to obtain current 3D position of celestial body
function getBodyPosition(
  id: CelestialBodyId | null,
  epoch: Date | number,
  isCosmic: boolean
): THREE.Vector3 {
  const numericYear =
    typeof epoch === "number"
      ? epoch
      : epoch.getUTCFullYear() +
        (epoch.getTime() - Date.UTC(epoch.getUTCFullYear(), 0, 1)) /
          (Date.UTC(epoch.getUTCFullYear() + 1, 0, 1) - Date.UTC(epoch.getUTCFullYear(), 0, 1));
  if (!id || id === "SUN") return new THREE.Vector3(0, 0, 0);
  if (id === "HALLEY") {
    const h = calculateHalleyPosition(numericYear);
    return h.scenePosition;
  }
  if (id === "MOON") {
    // Moon's current world position (handles both Normal and Cosmic modes dynamically)
    return currentMoonWorldPos.clone();
  }
  if (id === "EARTH") {
    if (!isCosmic) return new THREE.Vector3(0, 0, 0);
    return calculatePlanetaryPosition("EARTH", epoch).scenePosition.clone();
  }
  const planets = computeAllPlanetaryPositions(numericYear);
  if (id in planets) {
    return planets[id as keyof typeof planets].scenePosition;
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

/**
 * Offset 3D seguro e enquadramento heroico em três-quartos para sondas do espaço profundo
 * (livre de vetor nulo / NaN — AGENTS.md §1):
 * - Voyager 1/2 e New Horizons: observa a parabólica HGA iluminada pelo Sol, o Disco de Ouro e as hastes;
 * - JWST: posiciona a câmera no lado frio anti-solar diante dos 18 hexágonos dourados e das 5 camadas
 *   de Kapton, mantendo a Terra e o Sol visíveis ao fundo atrás do escudo térmico.
 */
export function getProbeViewOffset(
  probeId: DeepSpaceProbeId,
  mode: CosmicScaleMode,
  epoch: Date | number = 2026
): THREE.Vector3 {
  const pos = calculateProbePosition(probeId, epoch, mode).scenePosition;
  const { xAxis, yAxis, zAxis } = computeProbeBasis(pos);

  if (probeId === "JWST") {
    const dist = mode === "real" ? 0.44 : 1.12;
    return new THREE.Vector3()
      .addScaledVector(zAxis, -0.74)
      .addScaledVector(xAxis, 0.56)
      .addScaledVector(yAxis, 0.36)
      .normalize()
      .multiplyScalar(dist);
  }

  const dist = mode === "real" ? 1.08 : 1.62;
  return new THREE.Vector3()
    .addScaledVector(zAxis, 0.32)
    .addScaledVector(xAxis, 0.84)
    .addScaledVector(yAxis, 0.44)
    .normalize()
    .multiplyScalar(dist);
}

/**
 * Enquadramento orbital determinístico do par Terra–Lua no Modo Cosmos durante um eclipse ativo:
 * - Eclipse solar: enquadra simultaneamente a Lua Nova, o cone estreito de sombra e a faixa de
 *   totalidade iluminada na superfície terrestre;
 * - Eclipse lunar: enquadra simultaneamente a Terra noturna, o cone avermelhado de umbra terrestre e
 *   a Lua de Sangue imersa no cone, sem depender de `currentMoonWorldPos` assíncrono.
 */
function getEclipseCosmicFraming(
  eclipseId: EclipseId,
  epoch: Date | number,
  mode: CosmicScaleMode
): { target: THREE.Vector3; offset: THREE.Vector3 } {
  const earthPos = calculatePlanetaryPosition("EARTH", epoch).scenePosition;
  const s = earthSystemScale(mode);
  const toSun =
    earthPos.lengthSq() > 1e-6
      ? earthPos.clone().negate().normalize()
      : new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(up, toSun);
  if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
  side.normalize();

  if (ECLIPSE_KIND_BY_ID[eclipseId] === "lunar_total") {
    const target = earthPos.clone().addScaledVector(toSun, -1.85 * s);
    const offset = new THREE.Vector3()
      .addScaledVector(toSun, 0.34)
      .addScaledVector(side, 0.88)
      .addScaledVector(up, 0.32)
      .normalize()
      .multiplyScalar(Math.max(0.75, 5.8 * s));
    return { target, offset };
  }

  const target = earthPos.clone().addScaledVector(toSun, 1.3 * s);
  const offset = new THREE.Vector3()
    .addScaledVector(toSun, 0.44)
    .addScaledVector(side, -0.83)
    .addScaledVector(up, 0.34)
    .normalize()
    .multiplyScalar(Math.max(1.5, 5.9 * s));
  return { target, offset };
}

/** Zoom mínimo do OrbitControls no modo Cosmos: seguro contra corte de plano near e NaN. */
export function cosmicMinDistance(
  id: CelestialBodyId | null,
  mode: CosmicScaleMode,
  probeId: DeepSpaceProbeId | null = null
): number {
  if (probeId) {
    if (probeId === "JWST") return mode === "real" ? 0.18 : 0.36;
    return mode === "real" ? 0.36 : 0.55;
  }
  if (mode === "visual" || !id || id === "SUN" || id === "HALLEY") return 1.0;
  if (id === "EARTH") return 1.0;
  if (id === "MOON") return 0.4;
  return Math.max(0.1, bodySceneRadius(ASTROPHYSICAL_CATALOG[id].equatorialRadiusKm, mode) * 2.5);
}

export const CosmicCameraController: React.FC = () => {
  const { camera } = useThree();
  const controlsHook = useThree((state) => state.controls as unknown as OrbitControlsImpl | null);

  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const focusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const focusedProbeId = useCosmicStore((s) => s.focusedProbeId);
  const activeEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const eclipseOffsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const selectedYear = useTimelineStore((s) => s.selectedYear) || new Date().getUTCFullYear();
  // Primitivo numérico estável (evita instanciar `new Date()` a cada render em dependências de layoutEffect)
  const effectiveEpoch: number = activeEclipseId
    ? resolveEclipseDecimalYear(activeEclipseId, eclipseOffsetMinutes)
    : selectedYear;

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
  const prevFocusedProbeId = useRef<DeepSpaceProbeId | null>(null);
  const prevEclipseId = useRef<EclipseId | null>(null);
  const prevScaleMode = useRef<CosmicScaleMode>(scaleMode);

  // Layout effect: a reancoragem precisa acontecer antes do próximo quadro, senão a troca de
  // cena aparece por um quadro (o grupo da Terra já mudou de centro e de escala).
  useLayoutEffect(() => {
    if (!controlsHook) return;

    const cosmicModeChanged = prevCosmicMode.current !== isCosmicMode;
    const focusChanged =
      prevFocusedId.current !== focusedBodyId || prevFocusedProbeId.current !== focusedProbeId;
    const eclipseChanged =
      prevEclipseId.current !== activeEclipseId && isCosmicMode && activeEclipseId !== null;
    // Trocar a escala com um corpo ou sonda focada reenquadra a câmera no novo tamanho.
    const scaleChanged =
      prevScaleMode.current !== scaleMode &&
      isCosmicMode &&
      (focusedBodyId !== null || focusedProbeId !== null);
    const previousScale = prevScaleMode.current;
    prevScaleMode.current = scaleMode;
    prevEclipseId.current = activeEclipseId;
    if (!cosmicModeChanged && !focusChanged && !scaleChanged && !eclipseChanged) return;
    prevCosmicMode.current = isCosmicMode;
    prevFocusedId.current = focusedBodyId;
    prevFocusedProbeId.current = focusedProbeId;

    resetControlsDeltas(controlsHook);
    let from: OrbitState = { target: controlsHook.target.clone(), camera: camera.position.clone() };
    const obstacles: OrbitObstacle[] = [];

    // Terra ↔ Cosmos: o grupo da Terra troca de centro (origem ↔ órbita) e de escala no mesmo
    // quadro. Leva câmera e alvo junto, para a Terra continuar igual na tela — sem corte seco.
    if (cosmicModeChanged) {
      const home = { center: new THREE.Vector3(), scale: 1 };
      const orbit = {
        center: calculatePlanetaryPosition("EARTH", effectiveEpoch).scenePosition.clone(),
        scale: earthSystemScale(isCosmicMode ? scaleMode : previousScale),
      };
      from = isCosmicMode ? reanchorOrbit(from, home, orbit) : reanchorOrbit(from, orbit, home);
      // Saindo: o sistema solar fica na tela durante a descida, com o mesmo reposicionamento.
      useCosmicExitStore
        .getState()
        .setExit(isCosmicMode || prefersReducedMotion() ? null : { center: orbit.center.toArray() as [number, number, number], scale: orbit.scale });
    } else if (useCosmicExitStore.getState().exit) {
      useCosmicExitStore.getState().setExit(null);
    }
    // A Terra (onde estiver, na escala do momento) e, no Cosmos, o Sol são obstáculos do voo.
    if (isCosmicMode) {
      obstacles.push({ center: new THREE.Vector3(), radius: bodySceneRadius(ASTROPHYSICAL_CATALOG.SUN.equatorialRadiusKm, scaleMode) * SUN_CORONA_RATIO * 1.15 });
      obstacles.push({
        center: calculatePlanetaryPosition("EARTH", effectiveEpoch).scenePosition.clone(),
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
      const bodyPos = getBodyPosition("MOON", effectiveEpoch, false);
      to = { target: bodyPos.clone(), camera: bodyPos.clone().add(getBodyViewOffset("MOON")) };
    } else if (isCosmicMode && focusedProbeId) {
      // Sonda do espaço profundo selecionada (Voyager 1/2, New Horizons, JWST)
      limits = { min: cosmicMinDistance(null, scaleMode, focusedProbeId), max: 1600.0 };
      const probePos = calculateProbePosition(focusedProbeId, effectiveEpoch, scaleMode).scenePosition;
      to = {
        target: probePos.clone(),
        camera: probePos.clone().add(getProbeViewOffset(focusedProbeId, scaleMode, effectiveEpoch)),
      };
    } else if (
      isCosmicMode &&
      activeEclipseId &&
      (focusedBodyId === "MOON" || focusedBodyId === "EARTH")
    ) {
      // Vista cósmica em eclipse: enquadra o sistema Terra + Cone de Sombra + Lua inteiro
      limits = { min: cosmicMinDistance(focusedBodyId, scaleMode), max: 1600.0 };
      const framing = getEclipseCosmicFraming(activeEclipseId, effectiveEpoch, scaleMode);
      to = {
        target: framing.target,
        camera: framing.target.clone().add(framing.offset),
      };
    } else {
      // Vista cósmica padrão
      limits = { min: cosmicMinDistance(focusedBodyId, scaleMode), max: 1600.0 };
      const bodyPos = getBodyPosition(focusedBodyId, effectiveEpoch, isCosmicMode);
      to = {
        target: bodyPos.clone(),
        camera: bodyPos.clone().add(getScaledBodyViewOffset(focusedBodyId, scaleMode)),
      };
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
    orbitTransition.progress = 0;
  }, [isCosmicMode, focusedBodyId, focusedProbeId, activeEclipseId, scaleMode, controlsHook, camera, effectiveEpoch]);

  useFrame((_, delta) => {
    if (!controlsHook) return;

    const tr = transition.current;
    if (tr) {
      tr.elapsed += Math.min(delta, MAX_FRAME_STEP);
      const t = Math.min(1, tr.elapsed / tr.duration);
      orbitTransition.progress = t;
      const state = interpolateOrbit(tr.from, tr.to, easeInOutCubic(t), { obstacles: tr.obstacles });
      controlsHook.target.copy(state.target);
      camera.position.copy(state.camera);
      resetControlsDeltas(controlsHook);
      if (t >= 1) {
        controlsHook.minDistance = tr.limits.min;
        controlsHook.maxDistance = tr.limits.max;
        transition.current = null;
        orbitTransition.active = false;
        if (useCosmicExitStore.getState().exit) useCosmicExitStore.getState().setExit(null);
      }
      controlsHook.update();
    } else if (isCosmicMode && focusedProbeId) {
      const probeTarget = calculateProbePosition(focusedProbeId, effectiveEpoch, scaleMode).scenePosition;
      const deltaTarget = probeTarget.clone().sub(controlsHook.target);
      controlsHook.target.copy(probeTarget);
      camera.position.add(deltaTarget);
      controlsHook.update();
    } else if (
      isCosmicMode &&
      activeEclipseId &&
      (focusedBodyId === "MOON" || focusedBodyId === "EARTH")
    ) {
      const framing = getEclipseCosmicFraming(activeEclipseId, effectiveEpoch, scaleMode);
      const deltaTarget = framing.target.clone().sub(controlsHook.target);
      controlsHook.target.copy(framing.target);
      camera.position.add(deltaTarget);
      controlsHook.update();
    } else if (focusedBodyId && focusedBodyId !== "SUN") {
      // Acompanha o alvo em órbita em tempo real
      const currentTargetPos = getBodyPosition(focusedBodyId, effectiveEpoch, isCosmicMode);
      const deltaTarget = currentTargetPos.clone().sub(controlsHook.target);
      controlsHook.target.copy(currentTargetPos);
      camera.position.add(deltaTarget);
      controlsHook.update();
    }
  });

  return null;
};
