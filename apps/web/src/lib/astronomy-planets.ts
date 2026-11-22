import type { CelestialBodyId } from "./celestial-bodies";
import * as THREE from "three";
export { KEPLERIAN_DATA, ASTROPHYSICAL_CATALOG } from "./astronomy-catalog";
export type { KeplerianElements, PlanetaryPosition, SpaceMission, AstrophysicalMetadata } from "./astronomy-catalog";
export { COSMIC_SCALE_A, COSMIC_SCALE_GAMMA, mapDistanceToSceneRadius, solveKeplerEquation } from "./kepler";
export { calculatePlanetaryPosition, computeAllPlanetaryPositions, generateOrbitalPathPoints } from "./planet-orbits";
export { HALLEY_ORBITAL_ELEMENTS, HALLEY_TAIL_ACTIVATION_AU, calculateHalleyPosition, generateHalleyOrbitalPath } from "./halley-orbit";
export type { HalleyPosition } from "./halley-orbit";

/**
 * TellusPedia — Celestial Mechanics & Keplerian Ephemerides
 * Analytical planetary ephemerides based on Standish (1992) / NASA JPL formulation.
 * Valid for high-speed client-side calculation (60 FPS, <0.05ms per frame)
 * spanning 3000 BC to 3000 AD.
 */

/**
 * Dynamic real-time world position of the Moon, updated continuously
 * by OrbitingMoon to reflect realistic tidal locking and orbital progress.
 */
export const currentMoonWorldPos = new THREE.Vector3(3.6, 0.4, 0);

export type { CelestialBodyId };

