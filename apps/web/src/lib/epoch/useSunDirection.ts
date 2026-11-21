"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sceneLockedInstant } from "../scenes/catalog";
import * as THREE from "three";
import {
  calculateSubsolarPoint,
  getSunDirectionVector,
  resolveAstronomicalDate,
  type SubsolarPoint,
} from "../astronomy";
import { findMilestoneById } from "../milestones";
import { useTimelineStore } from "../../stores/timelineStore";
import { getEpochState, useEpochState } from "./useEpochState";

/** Distance (in scene units) at which the scene's directional sunlight sits from Earth's origin. */
export const SUN_LIGHT_DISTANCE = 10;

/** Wall-clock refresh interval (ms) for real-time solar terminator & directional light sync. */
export const SOLAR_CLOCK_INTERVAL_MS = 60_000;

export interface SunDirectionInput {
  effectiveYear: number | null;
  selectedMilestoneId: string | null;
  activeScene: string | null;
  now?: Date;
}

export interface SunDirectionState {
  /** Canonical UTC Date driving Earth's terminator, directional light, and lunar phase. */
  targetDate: Date;
  /** ISO UTC timestamp of `targetDate` (stable change key for effects and `invalidate()`). */
  timestamp: string;
  /** NOAA subsolar point (latitude, longitude, timestamp). */
  subsolar: SubsolarPoint;
  /** Normalized world-space unit vector pointing toward the Sun (AGENTS.md §1). */
  direction: THREE.Vector3;
  /** World-space position tuple `[x, y, z]` for `<directionalLight>` at `SUN_LIGHT_DISTANCE`. */
  lightPosition: [number, number, number];
  /** True when bound to the live wall clock (contemporary present without explicit historical date). */
  isLiveClock: boolean;
}

// ---------------------------------------------------------------------------
// Shared reactive wall-clock store (single timer across all 3D consumers)
// ---------------------------------------------------------------------------
let clockNowMs = Date.now();
let clockOverrideMs: number | null = null;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;

function notifyClockListeners(): void {
  clockListeners.forEach((listener) => listener());
}

function getSolarClockSnapshot(): number {
  return clockOverrideMs ?? clockNowMs;
}

function getServerSolarClockSnapshot(): number {
  return clockOverrideMs ?? clockNowMs;
}

function subscribeSolarClock(listener: () => void): () => void {
  clockListeners.add(listener);

  if (typeof window !== "undefined" && clockTimer === null) {
    clockNowMs = Date.now();
    clockTimer = setInterval(() => {
      clockNowMs = Date.now();
      notifyClockListeners();
    }, SOLAR_CLOCK_INTERVAL_MS);
  }

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/**
 * Advances the shared solar clock and notifies all subscribed consumers simultaneously.
 * Primarily used by automated tests (or manual time-sync triggers) to verify zero drift
 * between directional light, Earth shader terminator, and Moon phase.
 */
export function tickSolarClock(nowMs: number = Date.now()): void {
  clockNowMs = nowMs;
  notifyClockListeners();
}

/**
 * Sets or clears a deterministic wall-clock override for tests.
 * Pass `null` to restore normal wall-clock operation.
 */
export function setSolarClockOverrideForTest(nowMs: number | null): void {
  clockOverrideMs = nowMs;
  if (nowMs !== null) {
    clockNowMs = nowMs;
  }
  notifyClockListeners();
}

/**
 * Pure, deterministic computation of the canonical solar direction for Earth's
 * directional light, EarthSphere's `uSunDirection` shader uniform, and OrbitingMoon's
 * lunar phase lighting.
 *
 * Date convention (documented in `docs/ARCHITECTURE.md` §2.2):
 * - Explicit Apollo 11 scene → `1969-07-20T20:17:40Z`
 * - Milestone with `exactDate` → exact UTC timestamp (`T12:00:00Z` if date-only)
 * - Historical year without exact calendar date → **June 21, 12:00 UTC**
 * - Contemporary present (no explicit historical year/milestone) → live shared wall clock
 */
export function computeSunDirection(input: SunDirectionInput): SunDirectionState {
  const now = input.now ?? new Date(getSolarClockSnapshot());
  const milestone = input.selectedMilestoneId
    ? findMilestoneById(input.selectedMilestoneId)
    : undefined;

  const targetDate = resolveAstronomicalDate({
    selectedYear: input.effectiveYear,
    selectedMilestoneExactDate: milestone?.exactDate ?? null,
    selectedMilestoneYear: milestone?.year ?? null,
    activeScene: input.activeScene,
    now,
  });

  const hasFractionalYear =
    typeof input.effectiveYear === "number" &&
    Math.abs(input.effectiveYear - Math.floor(input.effectiveYear)) >= 1e-4;
  const isCurrentIntegerYear =
    typeof input.effectiveYear === "number" &&
    !hasFractionalYear &&
    Math.floor(input.effectiveYear) === now.getUTCFullYear();

  const isLiveClock =
    sceneLockedInstant(input.activeScene) === null &&
    !milestone?.exactDate &&
    milestone?.year == null &&
    (input.effectiveYear === null || isCurrentIntegerYear);

  const subsolar = calculateSubsolarPoint(targetDate);
  const direction = getSunDirectionVector(subsolar.latitude, subsolar.longitude);
  const lightPosition: [number, number, number] = [
    direction.x * SUN_LIGHT_DISTANCE,
    direction.y * SUN_LIGHT_DISTANCE,
    direction.z * SUN_LIGHT_DISTANCE,
  ];

  return {
    targetDate,
    timestamp: subsolar.timestamp,
    subsolar,
    direction,
    lightPosition,
    isLiveClock,
  };
}

/**
 * Imperative snapshot of the canonical solar direction (SSR & test parity with `getEpochState`).
 */
export function getSunDirection(now?: Date): SunDirectionState {
  const epoch = getEpochState();
  const selectedMilestoneId = useTimelineStore.getState().selectedMilestoneId;
  return computeSunDirection({
    effectiveYear: epoch.effectiveYear,
    selectedMilestoneId,
    activeScene: epoch.activeScene,
    now,
  });
}

/**
 * Single source of truth hook for world-space solar direction across `GlobeCanvas`
 * (`<directionalLight>`), `EarthSphere` (`uSunDirection`), and `OrbitingMoon`.
 * Subscribes to `useEpochState()` + shared 60-second wall clock so all consumers
 * stay strictly synchronized over time without per-component timer drift.
 */
export function useSunDirection(): SunDirectionState {
  const epoch = useEpochState();
  const storeMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectedMilestoneId =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedMilestoneId
      : storeMilestoneId;

  const clockMs = useSyncExternalStore(
    subscribeSolarClock,
    getSolarClockSnapshot,
    getServerSolarClockSnapshot
  );

  return useMemo(
    () =>
      computeSunDirection({
        effectiveYear: epoch.effectiveYear,
        selectedMilestoneId,
        activeScene: epoch.activeScene,
        now: new Date(clockMs),
      }),
    [epoch.effectiveYear, selectedMilestoneId, epoch.activeScene, clockMs]
  );
}
