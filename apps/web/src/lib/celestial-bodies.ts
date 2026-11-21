export const CELESTIAL_BODY_IDS = [
  "SUN", "MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS",
  "NEPTUNE", "PLUTO", "MOON", "HALLEY",
] as const;

export type CelestialBodyId = typeof CELESTIAL_BODY_IDS[number];
