import * as THREE from "three";
import { latLngToVector3 } from "../geo-spatial";
import { getMoonScenePosition } from "../astronomy";
import type { SceneTrajectory } from "./schema";

/**
 * Geometria genérica das trajetórias Terra–Lua (D12c). Recebe os locais de lançamento e pouso de
 * uma cena `cislunar` e a posição real da Lua (efeméride de Meeus no instante do pouso) e devolve
 * os pontos de controle da spline: subida, órbita de espera, injeção translunar, cruzeiro,
 * inserção em órbita lunar pelo lado oeste, volta pelo lado oculto, descida e pouso.
 */

/** Raio da Lua e do ponto de lançamento em unidades de cena (Terra = 1). */
export const MOON_RADIUS_SCENE = 0.27;
export const LAUNCH_PAD_RADIUS_SCENE = 1.002;

type Cislunar = Extract<SceneTrajectory, { kind: "cislunar" }>;
export interface CislunarSites {
  launchSite: { lat: number; lng: number };
  landingSite?: { lat: number; lng: number };
}

/**
 * Base selenográfica em `moonPos`: `nearDir` (0°, 0°) aponta para a Terra (rotação travada),
 * `upDir` é o norte projetado e `eastDir` o leste lunar.
 */
function selenographicBasis(moonPos: THREE.Vector3) {
  const nearDir = moonPos.clone().negate().normalize();
  const worldNorth = new THREE.Vector3(0, 1, 0);
  const upDir = worldNorth.clone().addScaledVector(nearDir, -worldNorth.dot(nearDir));
  if (upDir.lengthSq() < 1e-6) upDir.set(0, 0, 1);
  upDir.normalize();
  const eastDir = new THREE.Vector3().crossVectors(upDir, nearDir).normalize();
  return { nearDir, upDir, eastDir };
}

/** Coordenada selenográfica → cena, com o lado visível voltado para a Terra (origem). */
export function selenographicToScene(lat: number, lng: number, radius: number, moonPos: THREE.Vector3): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const { nearDir, upDir, eastDir } = selenographicBasis(moonPos);
  const cosLat = Math.cos(latRad);
  return moonPos
    .clone()
    .addScaledVector(nearDir, radius * cosLat * Math.cos(lngRad))
    .addScaledVector(upDir, radius * Math.sin(latRad))
    .addScaledVector(eastDir, radius * cosLat * Math.sin(lngRad));
}

// Perfis relativos calibrados na Apollo 11 (Mission Report SP-238): subida ~2° ao sul e ~12,6° a
// leste do lançamento; descida motorizada começando ~26,5° a leste do ponto de pouso.
const ASCENT_DLAT = 26.5 - 28.5721;
const ASCENT_DLNG = -68.0 - -80.648;
const PDI_DLAT = 2 - 0.674;
const PDI_DLNG = 50 - 23.4729;
const APPROACH_DLAT = 1 - 0.674;
const APPROACH_DLNG = 28 - 23.4729;

export function cislunarControlPoints(sites: CislunarSites, moonPos: THREE.Vector3): THREE.Vector3[] {
  const { launchSite, landingSite } = sites;
  const p0 = latLngToVector3(launchSite.lat, launchSite.lng, LAUNCH_PAD_RADIUS_SCENE);

  const moonDist = moonPos.length();
  const moonDir = moonPos.clone().divideScalar(moonDist || 1);
  const { upDir, eastDir } = selenographicBasis(moonPos);
  const westDir = eastDir.clone().negate(); // aproximação pelo lado oeste (retorno livre)

  // Subida atmosférica e órbita de espera voltando-se para o plano translunar
  const p1 = latLngToVector3(launchSite.lat + ASCENT_DLAT, launchSite.lng + ASCENT_DLNG, 1.08);
  const p2 = p1.clone().normalize().lerp(moonDir.clone().addScaledVector(westDir, 0.55).normalize(), 0.45).normalize().multiplyScalar(1.24);
  // Injeção translunar, cruzeiro e chegada à esfera de influência lunar
  const p3 = moonDir.clone().multiplyScalar(moonDist * 0.42).addScaledVector(westDir, 0.78).addScaledVector(upDir, 0.28);
  const p4 = moonDir.clone().multiplyScalar(moonDist * 0.64).addScaledVector(westDir, 0.64).addScaledVector(upDir, 0.22);
  const p5 = moonDir.clone().multiplyScalar(moonDist * 0.84).addScaledVector(westDir, 0.48).addScaledVector(upDir, 0.14);
  // Órbita lunar: entrada a oeste, lado oculto, saída a leste
  const pLoiEntry = selenographicToScene(15, -120, 0.44, moonPos);
  const pLoiBehind = selenographicToScene(10, 180, 0.42, moonPos);
  const pLoiExit = selenographicToScene(5, 100, 0.38, moonPos);
  const points = [p0, p1, p2, p3, p4, p5, pLoiEntry, pLoiBehind, pLoiExit];
  if (!landingSite) return points; // missão orbital: termina em órbita lunar

  // Descida motorizada e pouso no local da cena
  points.push(
    selenographicToScene(landingSite.lat + PDI_DLAT, landingSite.lng + PDI_DLNG, 0.33, moonPos),
    selenographicToScene(landingSite.lat + APPROACH_DLAT, landingSite.lng + APPROACH_DLNG, 0.295, moonPos),
    selenographicToScene(landingSite.lat, landingSite.lng, MOON_RADIUS_SCENE, moonPos)
  );
  return points;
}

/** Instante de referência da Lua: o pouso, ou a última fase da missão. */
export function cislunarReferenceDate(traj: Cislunar): Date {
  const landing = traj.phases.find((p) => p.id === "landing") ?? traj.phases[traj.phases.length - 1];
  return new Date(landing.time);
}

/** Posição da Lua (cena, referencial da Terra) no instante de referência da missão. */
export function cislunarMoonPosition(traj: Cislunar): THREE.Vector3 {
  return getMoonScenePosition(cislunarReferenceDate(traj), "earth");
}

export function createCislunarCurve(traj: Cislunar, moonPos: THREE.Vector3 = cislunarMoonPosition(traj)): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(cislunarControlPoints(traj, moonPos), false, "centripetal", 0.5);
}

