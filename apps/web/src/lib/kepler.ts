/** Equação de Kepler e escala de distâncias da cena cósmica (T36). */
/**
 * Astronomical scaling constant:
 * Power-law mapping R_scene = A * (r_AU)^gamma
 * Calibrated: A = 28.0, gamma = 0.55
 * Prevents z-fighting while maintaining relative orbital hierarchy.
 */
export const COSMIC_SCALE_A = 28.0;
export const COSMIC_SCALE_GAMMA = 0.55;

export function mapDistanceToSceneRadius(rAu: number): number {
  if (rAu <= 0) return 0;
  return COSMIC_SCALE_A * Math.pow(rAu, COSMIC_SCALE_GAMMA);
}

/**
 * Solves Kepler's Equation for Eccentric Anomaly E:
 * M = E - e * sin(E)
 * Uses Newton-Raphson iteration with a globally convergent initial guess
 * for high-eccentricity orbits (e.g., 1P/Halley with e = 0.967).
 */
export function solveKeplerEquation(Mrad: number, e: number): number {
  const TWO_PI = 2 * Math.PI;
  // Normalize M into (-PI, PI]
  let M = ((Mrad % TWO_PI) + TWO_PI) % TWO_PI;
  if (M > Math.PI) M -= TWO_PI;

  if (M === 0) return 0;

  let E =
    e > 0.8
      ? Math.sign(M) * Math.PI
      : M + e * Math.sin(M) * (1.0 + e * Math.cos(M));

  for (let iter = 0; iter < 30; iter++) {
    const deltaM = E - e * Math.sin(E) - M;
    const fPrime = 1.0 - e * Math.cos(E);
    const step = deltaM / fPrime;
    E -= step;
    if (Math.abs(step) < 1e-11) break;
  }
  return E;
}
