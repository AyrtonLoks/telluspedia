import * as THREE from "three";
import { ASTROPHYSICAL_CATALOG, type CelestialBodyId } from "@/lib/astronomy-planets";

/**
 * Orientação e rotação dos planetas no Cosmos (D21).
 *
 * O eixo de cada corpo é o polo de rotação real em J2000 (ascensão reta e declinação equatoriais),
 * convertido para a eclíptica e depois para a cena, que usa `(x, z, −y)` da eclíptica (o norte da
 * eclíptica é +Y). Guardamos o polo **positivo** (regra da mão direita, o do momento angular), então
 * todo corpo gira no sentido direto em torno dele: Vênus, Urano e Plutão ficam "de cabeça para
 * baixo" e a rotação retrógrada aparece sozinha. O ângulo entre esse polo e a normal da órbita é a
 * obliquidade do catálogo (`axialTiltDeg`); o teste `planet-orientation.test.ts` confere isso.
 *
 * Fontes: NASA Planetary Fact Sheets (polo norte em J2000) e IAU WGCCRE. Para Vênus e Urano o
 * polo norte da IAU foi invertido; para Plutão foi usado o polo da ficha da NASA (obliquidade
 * 122,53°, a do catálogo).
 */
export type PlanetId = Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY" | "EARTH">;

/** Polo positivo de rotação em J2000: [ascensão reta, declinação] em graus. */
export const POSITIVE_POLE_J2000: Record<PlanetId | "EARTH", readonly [number, number]> = {
  MERCURY: [281.0103, 61.4155],
  VENUS: [92.76, -67.16],
  EARTH: [0, 90],
  MARS: [317.68143, 52.8865],
  JUPITER: [268.056595, 64.495303],
  SATURN: [40.589, 83.537],
  URANUS: [77.311, 15.175],
  NEPTUNE: [299.36, 43.46],
  PLUTO: [133.02, -9.09],
};

/** Obliquidade média da eclíptica em J2000 (IAU 2006), em graus. */
const OBLIQUITY_J2000 = 23.4392911;
const DEG = Math.PI / 180;

/** Polo positivo em coordenadas eclípticas J2000 (vetor unitário). */
export function poleEcliptic(id: PlanetId | "EARTH"): THREE.Vector3 {
  const [ra, dec] = POSITIVE_POLE_J2000[id];
  const x = Math.cos(dec * DEG) * Math.cos(ra * DEG);
  const y = Math.cos(dec * DEG) * Math.sin(ra * DEG);
  const z = Math.sin(dec * DEG);
  const e = OBLIQUITY_J2000 * DEG;
  return new THREE.Vector3(x, y * Math.cos(e) + z * Math.sin(e), -y * Math.sin(e) + z * Math.cos(e));
}

/** Eclíptica → cena (mesma convenção de `calculatePlanetaryPosition`). */
export function eclipticToScene(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, -v.y);
}

/** Rotação que leva o +Y local (eixo da esfera do three) ao polo positivo do corpo na cena. */
export function planetOrientation(id: PlanetId): THREE.Quaternion {
  const pole = eclipticToScene(poleEcliptic(id)).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole);
}

/** Velocidade angular de referência (rad/s) de um corpo com dia de 24 h, parado. */
export const SPIN_BASE_RAD_S = 0.12;
/** Teto para não haver efeito estroboscópico (≈ 1 volta a cada 2 s). */
export const SPIN_MAX_RAD_S = Math.PI;

/**
 * Velocidade de rotação visual (rad/s, sempre ≥ 0, em torno do polo positivo).
 *
 * A rotação real não cabe na tela (a 365×, Júpiter daria ~880 voltas por segundo), então a
 * velocidade é proporcional à real numa escala comprimida: ω ∝ (24 h / |P|)^0,5. A ordem entre os
 * corpos se mantém (Júpiter o mais rápido, Vênus o mais lento) e a reprodução da linha do tempo
 * acelera todos pelo mesmo fator logarítmico da Lua (`stepOrbitalPosition`). Com movimento
 * reduzido, nada gira.
 */
export function planetSpinRate(
  rotationPeriodHours: number,
  options: { isPlaying: boolean; playbackSpeed: number; reducedMotion?: boolean }
): number {
  if (options.reducedMotion || !Number.isFinite(rotationPeriodHours) || rotationPeriodHours === 0) return 0;
  const relative = Math.sqrt(24 / Math.abs(rotationPeriodHours));
  const playback = options.isPlaying ? 1 + Math.log10(Math.max(1, options.playbackSpeed)) * 0.9 : 1;
  return Math.min(SPIN_MAX_RAD_S, SPIN_BASE_RAD_S * relative * playback);
}

/** Período de rotação do catálogo (horas; negativo = retrógrado em relação ao norte da IAU). */
export function rotationPeriodHours(id: PlanetId): number {
  return ASTROPHYSICAL_CATALOG[id].rotationPeriodHours;
}
