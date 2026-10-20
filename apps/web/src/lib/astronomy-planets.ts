import * as THREE from "three";

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

export type CelestialBodyId =
  | "SUN"
  | "MERCURY"
  | "VENUS"
  | "EARTH"
  | "MARS"
  | "JUPITER"
  | "SATURN"
  | "URANUS"
  | "NEPTUNE"
  | "PLUTO"
  | "MOON"
  | "HALLEY";

export interface KeplerianElements {
  /** Semi-major axis in AU */
  a0: number;
  aRate: number;
  /** Eccentricity */
  e0: number;
  eRate: number;
  /** Inclination in degrees */
  I0: number;
  IRate: number;
  /** Mean longitude in degrees */
  L0: number;
  LRate: number;
  /** Longitude of perihelion in degrees */
  varpi0: number;
  varpiRate: number;
  /** Longitude of ascending node in degrees */
  Omega0: number;
  OmegaRate: number;
}

export interface PlanetaryPosition {
  id: CelestialBodyId;
  name: string;
  namePt: string;
  /** Heliocentric Cartesian position in AU */
  heliocentricAu: { x: number; y: number; z: number };
  /** Distance from Sun in Astronomical Units (AU) */
  distanceSunAu: number;
  /** Distance from Sun in millions of kilometers */
  distanceSunMkm: number;
  /** Distance from Earth in Astronomical Units (AU) */
  distanceEarthAu: number;
  /** Distance from Earth in millions of kilometers */
  distanceEarthMkm: number;
  /** True anomaly in degrees */
  trueAnomalyDeg: number;
  /** Scaled 3D position in Three.js coordinate space */
  scenePosition: THREE.Vector3;
  /** Visual radius for pedagogical scale */
  visualRadius: number;
  color: string;
}

export interface SpaceMission {
  name: string;
  year: number;
  agency: string;
  type: "FLYBY" | "ORBITER" | "LANDER" | "ROVER" | "SAMPLE_RETURN";
  description: string;
}

export interface AstrophysicalMetadata {
  id: CelestialBodyId;
  name: string;
  namePt: string;
  category: "STAR" | "TERRESTRIAL" | "GAS_GIANT" | "ICE_GIANT" | "DWARF_PLANET" | "NATURAL_SATELLITE" | "COMET";
  equatorialRadiusKm: number;
  massKg: string;
  surfaceGravityMs2: number;
  orbitalPeriodDays: number;
  rotationPeriodHours: number;
  meanTemperatureC: number;
  confirmedMoons: number;
  atmosphere: string[];
  visualColor: string;
  accentColor: string;
  hasRings: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  axialTiltDeg: number;
  missions: SpaceMission[];
  citationSource: string;
  citationUrl: string;
}

/**
 * Standish (1992) J2000.0 baseline elements and century rates.
 * Rates are per Julian Century (36525 days).
 */
export const KEPLERIAN_DATA: Record<
  Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
  KeplerianElements
> = {
  MERCURY: {
    a0: 0.38709927,
    aRate: 0.00000037,
    e0: 0.20563593,
    eRate: 0.00001906,
    I0: 7.00497902,
    IRate: -0.00594749,
    L0: 252.2503235,
    LRate: 149472.67411175,
    varpi0: 77.45779628,
    varpiRate: 0.16047689,
    Omega0: 48.33076593,
    OmegaRate: -0.12534081,
  },
  VENUS: {
    a0: 0.72333566,
    aRate: 0.0000039,
    e0: 0.00677672,
    eRate: -0.00004107,
    I0: 3.39467605,
    IRate: -0.0007889,
    L0: 181.9790995,
    LRate: 58517.81538729,
    varpi0: 131.60246718,
    varpiRate: 0.00268329,
    Omega0: 76.67984255,
    OmegaRate: -0.27769418,
  },
  EARTH: {
    a0: 1.00000261,
    aRate: 0.00000562,
    e0: 0.01671123,
    eRate: -0.00004392,
    I0: -0.00001531,
    IRate: -0.01294668,
    L0: 100.46457166,
    LRate: 35999.37244981,
    varpi0: 102.93768193,
    varpiRate: 0.32327364,
    Omega0: 0.0,
    OmegaRate: 0.0,
  },
  MARS: {
    a0: 1.52371034,
    aRate: 0.00001847,
    e0: 0.0933941,
    eRate: 0.00007882,
    I0: 1.84969142,
    IRate: -0.00813131,
    L0: -4.55343205,
    LRate: 19140.30268499,
    varpi0: -23.94362959,
    varpiRate: 0.44441088,
    Omega0: 49.55953891,
    OmegaRate: -0.29257343,
  },
  JUPITER: {
    a0: 5.202887,
    aRate: -0.00011607,
    e0: 0.04838624,
    eRate: -0.00013253,
    I0: 1.30439695,
    IRate: -0.00183714,
    L0: 34.39644051,
    LRate: 3034.74612775,
    varpi0: 14.72847983,
    varpiRate: 0.21252668,
    Omega0: 100.47390909,
    OmegaRate: 0.20469106,
  },
  SATURN: {
    a0: 9.53667594,
    aRate: -0.0012506,
    e0: 0.05386179,
    eRate: -0.00050991,
    I0: 2.48599187,
    IRate: 0.00193609,
    L0: 49.95424423,
    LRate: 1222.49362201,
    varpi0: 92.59887831,
    varpiRate: -0.41897216,
    Omega0: 113.66242448,
    OmegaRate: -0.28867794,
  },
  URANUS: {
    a0: 19.18916464,
    aRate: -0.0019615,
    e0: 0.04725744,
    eRate: -0.00004397,
    I0: 0.77263783,
    IRate: -0.00242939,
    L0: 313.23810451,
    LRate: 428.48202785,
    varpi0: 170.9542763,
    varpiRate: 0.40805281,
    Omega0: 74.01692503,
    OmegaRate: 0.04240589,
  },
  NEPTUNE: {
    a0: 30.06992276,
    aRate: 0.00026291,
    e0: 0.0086061,
    eRate: 0.00005105,
    I0: 1.77004347,
    IRate: 0.00035372,
    L0: -55.12002969,
    LRate: 218.45945325,
    varpi0: 44.96476227,
    varpiRate: -0.32241464,
    Omega0: 131.78422574,
    OmegaRate: -0.00508664,
  },
  PLUTO: {
    a0: 39.48211675,
    aRate: -0.00031596,
    e0: 0.2488273,
    eRate: 0.0000517,
    I0: 17.14001206,
    IRate: 0.00004818,
    L0: 238.92903833,
    LRate: 145.20780515,
    varpi0: 224.06876774,
    varpiRate: -0.04062942,
    Omega0: 110.30393608,
    OmegaRate: -0.01183482,
  },
};

export const ASTROPHYSICAL_CATALOG: Record<CelestialBodyId, AstrophysicalMetadata> = {
  SUN: {
    id: "SUN",
    name: "Sun",
    namePt: "Sol",
    category: "STAR",
    equatorialRadiusKm: 696340,
    massKg: "1.989 × 10³⁰",
    surfaceGravityMs2: 274.0,
    orbitalPeriodDays: 0,
    rotationPeriodHours: 609.12,
    meanTemperatureC: 5505,
    confirmedMoons: 0,
    atmosphere: ["74.9% Hidrogênio", "23.8% Hélio", "1.0% Oxigênio/Carbono"],
    visualColor: "#f59e0b",
    accentColor: "#fbbf24",
    hasRings: false,
    axialTiltDeg: 7.25,
    missions: [
      { name: "SOHO", year: 1995, agency: "ESA/NASA", type: "ORBITER", description: "Heliossismologia e observação contínua da corona solar." },
      { name: "Parker Solar Probe", year: 2018, agency: "NASA", type: "FLYBY", description: "Aproximação histórica a menos de 7 milhões de km da fotosfera." },
    ],
    citationSource: "NASA Sun Fact Sheet / JPL",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
  },
  MERCURY: {
    id: "MERCURY",
    name: "Mercury",
    namePt: "Mercúrio",
    category: "TERRESTRIAL",
    equatorialRadiusKm: 2439.7,
    massKg: "3.301 × 10²³",
    surfaceGravityMs2: 3.7,
    orbitalPeriodDays: 87.97,
    rotationPeriodHours: 1407.6,
    meanTemperatureC: 167,
    confirmedMoons: 0,
    atmosphere: ["42% Oxigênio", "29% Sódio", "22% Hidrogênio", "6% Hélio"],
    visualColor: "#9ca3af",
    accentColor: "#d1d5db",
    hasRings: false,
    axialTiltDeg: 0.034,
    missions: [
      { name: "Mariner 10", year: 1974, agency: "NASA", type: "FLYBY", description: "Primeiro sobrevoo com cartografia de 45% da superfície craterada." },
      { name: "MESSENGER", year: 2011, agency: "NASA", type: "ORBITER", description: "Mapeamento global orbital e confirmação de gelo de água em crateras polares." },
      { name: "BepiColombo", year: 2018, agency: "ESA/JAXA", type: "ORBITER", description: "Sonda dupla em rota orbital para caracterização magnetosférica." },
    ],
    citationSource: "NASA Mercury Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html",
  },
  VENUS: {
    id: "VENUS",
    name: "Venus",
    namePt: "Vênus",
    category: "TERRESTRIAL",
    equatorialRadiusKm: 6051.8,
    massKg: "4.867 × 10²⁴",
    surfaceGravityMs2: 8.87,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5832.5,
    meanTemperatureC: 464,
    confirmedMoons: 0,
    atmosphere: ["96.5% Dióxido de Carbono", "3.5% Nitrogênio", "Nuvens de H₂SO₄"],
    visualColor: "#fde047",
    accentColor: "#eab308",
    hasRings: false,
    axialTiltDeg: 177.36,
    missions: [
      { name: "Venera 7", year: 1970, agency: "URSS", type: "LANDER", description: "Primeira aterrissagem bem-sucedida e transmissão direta do solo venusiano." },
      { name: "Magellan", year: 1990, agency: "NASA", type: "ORBITER", description: "Mapeamento por radar de abertura sintética (SAR) de 98% da topografia." },
      { name: "Venus Express", year: 2005, agency: "ESA", type: "ORBITER", description: "Estudo da super-rotação atmosférica e vulcanismo ativo." },
    ],
    citationSource: "NASA Venus Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html",
  },
  EARTH: {
    id: "EARTH",
    name: "Earth",
    namePt: "Terra",
    category: "TERRESTRIAL",
    equatorialRadiusKm: 6378.1,
    massKg: "5.972 × 10²⁴",
    surfaceGravityMs2: 9.807,
    orbitalPeriodDays: 365.256,
    rotationPeriodHours: 23.934,
    meanTemperatureC: 15,
    confirmedMoons: 1,
    atmosphere: ["78.1% Nitrogênio", "20.9% Oxigênio", "0.93% Argônio", "0.04% CO₂"],
    visualColor: "#38bdf8",
    accentColor: "#0284c7",
    hasRings: false,
    axialTiltDeg: 23.44,
    missions: [
      { name: "Apollo 11", year: 1969, agency: "NASA", type: "LANDER", description: "Primeiro pouso humano extraterrestre na Lua." },
      { name: "ISS", year: 1998, agency: "Internacional", type: "ORBITER", description: "Estação Espacial Internacional com presença humana ininterrupta em LEO." },
    ],
    citationSource: "NASA Earth Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html",
  },
  MARS: {
    id: "MARS",
    name: "Mars",
    namePt: "Marte",
    category: "TERRESTRIAL",
    equatorialRadiusKm: 3389.5,
    massKg: "6.417 × 10²³",
    surfaceGravityMs2: 3.72,
    orbitalPeriodDays: 686.98,
    rotationPeriodHours: 24.623,
    meanTemperatureC: -65,
    confirmedMoons: 2,
    atmosphere: ["95.3% Dióxido de Carbono", "2.6% Nitrogênio", "1.9% Argônio"],
    visualColor: "#f87171",
    accentColor: "#ef4444",
    hasRings: false,
    axialTiltDeg: 25.19,
    missions: [
      { name: "Viking 1 & 2", year: 1976, agency: "NASA", type: "LANDER", description: "Primeiras análises in situ de biologia e química do solo marciano." },
      { name: "Curiosity", year: 2012, agency: "NASA", type: "ROVER", description: "Exploração da Cratera Gale e comprovação de antigos lagos habitáveis." },
      { name: "Perseverance", year: 2021, agency: "NASA", type: "ROVER", description: "Amostragem em Jezero Crater e testes do drone atmosférico Ingenuity." },
    ],
    citationSource: "NASA Mars Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
  },
  JUPITER: {
    id: "JUPITER",
    name: "Jupiter",
    namePt: "Júpiter",
    category: "GAS_GIANT",
    equatorialRadiusKm: 71492,
    massKg: "1.898 × 10²⁷",
    surfaceGravityMs2: 24.79,
    orbitalPeriodDays: 4332.59,
    rotationPeriodHours: 9.925,
    meanTemperatureC: -110,
    confirmedMoons: 95,
    atmosphere: ["89.8% Hidrogênio", "10.2% Hélio", "Metano, Amônia"],
    visualColor: "#fdba74",
    accentColor: "#f97316",
    hasRings: true,
    axialTiltDeg: 3.13,
    missions: [
      { name: "Voyager 1 & 2", year: 1979, agency: "NASA", type: "FLYBY", description: "Descoberta dos anéis de Júpiter e vulcanismo ativo em Io." },
      { name: "Galileo", year: 1995, agency: "NASA", type: "ORBITER", description: "Primeira órbita prolongada e evidências de oceano subsuperficial em Europa." },
      { name: "Juno", year: 2016, agency: "NASA", type: "ORBITER", description: "Sondagem da estrutura interna profunda e tempestades polares ciclônicas." },
    ],
    citationSource: "NASA Jupiter Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html",
  },
  SATURN: {
    id: "SATURN",
    name: "Saturn",
    namePt: "Saturno",
    category: "GAS_GIANT",
    equatorialRadiusKm: 60268,
    massKg: "5.683 × 10²⁶",
    surfaceGravityMs2: 10.44,
    orbitalPeriodDays: 10759.22,
    rotationPeriodHours: 10.656,
    meanTemperatureC: -140,
    confirmedMoons: 146,
    atmosphere: ["96.3% Hidrogênio", "3.25% Hélio", "0.45% Metano"],
    visualColor: "#fde68a",
    accentColor: "#eab308",
    hasRings: true,
    ringInnerRadius: 3.3,
    ringOuterRadius: 6.2,
    axialTiltDeg: 26.73,
    missions: [
      { name: "Voyager 1 & 2", year: 1980, agency: "NASA", type: "FLYBY", description: "Imagens detalhadas dos milhares de anéis finos e atmosfera de Titã." },
      { name: "Cassini-Huygens", year: 2004, agency: "NASA/ESA/ASI", type: "ORBITER", description: "13 anos em órbita; pouso em Titã e plumas de água salgada em Encélado." },
    ],
    citationSource: "NASA Saturn Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html",
  },
  URANUS: {
    id: "URANUS",
    name: "Uranus",
    namePt: "Urano",
    category: "ICE_GIANT",
    equatorialRadiusKm: 25559,
    massKg: "8.681 × 10²⁵",
    surfaceGravityMs2: 8.69,
    orbitalPeriodDays: 30685.4,
    rotationPeriodHours: -17.24,
    meanTemperatureC: -195,
    confirmedMoons: 28,
    atmosphere: ["82.5% Hidrogênio", "15.2% Hélio", "2.3% Metano"],
    visualColor: "#a5f3fc",
    accentColor: "#06b6d4",
    hasRings: true,
    ringInnerRadius: 2.2,
    ringOuterRadius: 3.2,
    axialTiltDeg: 97.77,
    missions: [
      { name: "Voyager 2", year: 1986, agency: "NASA", type: "FLYBY", description: "Único sobrevoo próximo da história, revelando 10 novas luas e anéis escuros." },
    ],
    citationSource: "NASA Uranus Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html",
  },
  NEPTUNE: {
    id: "NEPTUNE",
    name: "Neptune",
    namePt: "Netuno",
    category: "ICE_GIANT",
    equatorialRadiusKm: 24764,
    massKg: "1.024 × 10²⁶",
    surfaceGravityMs2: 11.15,
    orbitalPeriodDays: 60189.0,
    rotationPeriodHours: 16.11,
    meanTemperatureC: -200,
    confirmedMoons: 16,
    atmosphere: ["80.0% Hidrogênio", "19.0% Hélio", "1.5% Metano"],
    visualColor: "#60a5fa",
    accentColor: "#2563eb",
    hasRings: true,
    ringInnerRadius: 2.1,
    ringOuterRadius: 2.8,
    axialTiltDeg: 28.32,
    missions: [
      { name: "Voyager 2", year: 1989, agency: "NASA", type: "FLYBY", description: "Registro da Grande Mancha Escura e dos gêiseres criovulcânicos de Tritão." },
    ],
    citationSource: "NASA Neptune Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html",
  },
  PLUTO: {
    id: "PLUTO",
    name: "Pluto",
    namePt: "Plutão",
    category: "DWARF_PLANET",
    equatorialRadiusKm: 1188.3,
    massKg: "1.303 × 10²²",
    surfaceGravityMs2: 0.62,
    orbitalPeriodDays: 90560,
    rotationPeriodHours: -153.29,
    meanTemperatureC: -225,
    confirmedMoons: 5,
    atmosphere: ["Nitrogênio", "Metano", "Monóxido de Carbono"],
    visualColor: "#fed7aa",
    accentColor: "#fb923c",
    hasRings: false,
    axialTiltDeg: 122.53,
    missions: [
      { name: "New Horizons", year: 2015, agency: "NASA", type: "FLYBY", description: "Imagens históricas de alta resolução da planície de gelo Sputnik Planitia." },
    ],
    citationSource: "NASA Pluto Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html",
  },
  MOON: {
    id: "MOON",
    name: "Moon",
    namePt: "Lua",
    category: "NATURAL_SATELLITE",
    equatorialRadiusKm: 1737.4,
    massKg: "7.342 × 10²²",
    surfaceGravityMs2: 1.62,
    orbitalPeriodDays: 27.32,
    rotationPeriodHours: 655.7,
    meanTemperatureC: -20,
    confirmedMoons: 0,
    atmosphere: ["Exosfera tênue (Hélio, Neon, Hidrogênio)"],
    visualColor: "#e2e8f0",
    accentColor: "#94a3b8",
    hasRings: false,
    axialTiltDeg: 6.68,
    missions: [
      { name: "Apollo 11", year: 1969, agency: "NASA", type: "LANDER", description: "Primeira caminhada lunar por Neil Armstrong e Buzz Aldrin." },
      { name: "Chang'e 5", year: 2020, agency: "CNSA", type: "SAMPLE_RETURN", description: "Coleta e retorno de 1.7 kg de amostras jovens de basalto lunar." },
      { name: "Artemis I", year: 2022, agency: "NASA/ESA", type: "ORBITER", description: "Voo de qualificação não-tripulado da cápsula Orion ao redor da Lua." },
    ],
    citationSource: "NASA Moon Fact Sheet",
    citationUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
  },
  HALLEY: {
    id: "HALLEY",
    name: "1P/Halley",
    namePt: "Cometa 1P/Halley",
    category: "COMET",
    equatorialRadiusKm: 5.5,
    massKg: "2.2 × 10¹⁴",
    surfaceGravityMs2: 0.002,
    orbitalPeriodDays: 27500,
    rotationPeriodHours: 52.8,
    meanTemperatureC: -150,
    confirmedMoons: 0,
    atmosphere: ["Coma de sublimação (H₂O, CO, CO₂, CH₄)"],
    visualColor: "#38bdf8",
    accentColor: "#0284c7",
    hasRings: false,
    axialTiltDeg: 162.26,
    missions: [
      { name: "Giotto", year: 1986, agency: "ESA", type: "FLYBY", description: "Aproximação a 596 km do núcleo, fotografando jatos escuros de poeira." },
      { name: "Vega 1 & 2", year: 1986, agency: "URSS/CNES", type: "FLYBY", description: "Caracterização da coma e temperatura superficial de 300-400 K." },
    ],
    citationSource: "NASA Small-Body Database / JPL Horizons 1P/Halley",
    citationUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1P",
  },
};

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
 * Uses high-precision Newton-Raphson iteration with rapid convergence.
 */
export function solveKeplerEquation(Mrad: number, e: number): number {
  // Normalize M into [-PI, PI]
  let M = Mrad % (2 * Math.PI);
  if (M < -Math.PI) M += 2 * Math.PI;
  if (M > Math.PI) M -= 2 * Math.PI;

  let E = M + e * Math.sin(M) * (1.0 + e * Math.cos(M));
  for (let iter = 0; iter < 12; iter++) {
    const deltaM = E - e * Math.sin(E) - M;
    const fPrime = 1.0 - e * Math.cos(E);
    const step = deltaM / fPrime;
    E -= step;
    if (Math.abs(step) < 1e-11) break;
  }
  return E;
}

/**
 * Calculates the heliocentric ecliptic coordinates and 3D scene position
 * for a planet on a given decimal year or Date.
 */
export function calculatePlanetaryPosition(
  bodyId: Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
  dateOrYear: Date | number
): PlanetaryPosition {
  const elements = KEPLERIAN_DATA[bodyId];
  const meta = ASTROPHYSICAL_CATALOG[bodyId];

  let decimalYear: number;
  if (typeof dateOrYear === "number") {
    decimalYear = dateOrYear;
  } else {
    const year = dateOrYear.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1)).getTime();
    const end = new Date(Date.UTC(year + 1, 0, 1)).getTime();
    const frac = (dateOrYear.getTime() - start) / (end - start);
    decimalYear = year + frac;
  }

  // Centuries from J2000.0 (January 1, 2000, 12:00 TT)
  const T = (decimalYear - 2000.0) / 100.0;

  // Compute osculating elements at epoch T
  const a = elements.a0 + elements.aRate * T;
  const e = elements.e0 + elements.eRate * T;
  const I = (elements.I0 + elements.IRate * T) * (Math.PI / 180.0);
  const L = (elements.L0 + elements.LRate * T) * (Math.PI / 180.0);
  const varpi = (elements.varpi0 + elements.varpiRate * T) * (Math.PI / 180.0);
  const Omega = (elements.Omega0 + elements.OmegaRate * T) * (Math.PI / 180.0);

  const omega = varpi - Omega; // Argument of perihelion
  const M = L - varpi; // Mean anomaly

  // Solve Kepler's equation for Eccentric Anomaly E
  const E = solveKeplerEquation(M, e);

  // Position in orbital plane
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(Math.max(0, 1.0 - e * e)) * Math.sin(E);

  const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  const trueAnomalyRad = Math.atan2(yPrime, xPrime);
  const trueAnomalyDeg = ((trueAnomalyRad * 180.0) / Math.PI + 360.0) % 360.0;

  // Rotate orbital coordinates into heliocentric ecliptic coordinates
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  // Basis vectors
  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const xEcl = Px * xPrime + Qx * yPrime;
  const yEcl = Py * xPrime + Qy * yPrime;
  const zEcl = Pz * xPrime + Qz * yPrime;

  // Convert to Three.js coordinate space with power-law scale:
  // Scene coordinates: X = xEcl, Y = zEcl (ecliptic latitude), Z = -yEcl
  const sceneRadius = mapDistanceToSceneRadius(rAu);
  const scale = sceneRadius / rAu;

  const scenePos = new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale);

  // Distances
  const kmPerAu = 149597870.7;
  const distanceSunMkm = Number(((rAu * kmPerAu) / 1e6).toFixed(2));

  // Visual radii mapping
  const visualRadii: Record<string, number> = {
    MERCURY: 0.45,
    VENUS: 0.95,
    EARTH: 1.0,
    MARS: 0.55,
    JUPITER: 3.2,
    SATURN: 2.7,
    URANUS: 1.8,
    NEPTUNE: 1.75,
    PLUTO: 0.35,
  };

  return {
    id: bodyId,
    name: meta.name,
    namePt: meta.namePt,
    heliocentricAu: { x: xEcl, y: yEcl, z: zEcl },
    distanceSunAu: Number(rAu.toFixed(4)),
    distanceSunMkm,
    distanceEarthAu: 0, // computed below in computeAllPlanetaryPositions
    distanceEarthMkm: 0,
    trueAnomalyDeg: Number(trueAnomalyDeg.toFixed(2)),
    scenePosition: scenePos,
    visualRadius: visualRadii[bodyId] || 1.0,
    color: meta.visualColor,
  };
}

/**
 * Computes all 8 planets + Pluto positions at once, linking Earth distance to each body.
 */
export function computeAllPlanetaryPositions(
  dateOrYear: Date | number
): Record<Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">, PlanetaryPosition> {
  const planetIds: Array<Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">> = [
    "MERCURY",
    "VENUS",
    "EARTH",
    "MARS",
    "JUPITER",
    "SATURN",
    "URANUS",
    "NEPTUNE",
    "PLUTO",
  ];

  const results = {} as Record<
    Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
    PlanetaryPosition
  >;

  for (const id of planetIds) {
    results[id] = calculatePlanetaryPosition(id, dateOrYear);
  }

  const earth = results.EARTH;
  const kmPerAu = 149597870.7;

  for (const id of planetIds) {
    const p = results[id];
    const dx = p.heliocentricAu.x - earth.heliocentricAu.x;
    const dy = p.heliocentricAu.y - earth.heliocentricAu.y;
    const dz = p.heliocentricAu.z - earth.heliocentricAu.z;
    const distAu = Math.sqrt(dx * dx + dy * dy + dz * dz);
    p.distanceEarthAu = Number(distAu.toFixed(4));
    p.distanceEarthMkm = Number(((distAu * kmPerAu) / 1e6).toFixed(2));
  }

  return results;
}

/**
 * Generates smooth 3D Keplerian orbital loop points for a given planet.
 */
export function generateOrbitalPathPoints(
  bodyId: Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
  segments = 180,
  referenceYear = 2000
): THREE.Vector3[] {
  const elements = KEPLERIAN_DATA[bodyId];
  const T = (referenceYear - 2000.0) / 100.0;

  const a = elements.a0 + elements.aRate * T;
  const e = elements.e0 + elements.eRate * T;
  const I = (elements.I0 + elements.IRate * T) * (Math.PI / 180.0);
  const varpi = (elements.varpi0 + elements.varpiRate * T) * (Math.PI / 180.0);
  const Omega = (elements.Omega0 + elements.OmegaRate * T) * (Math.PI / 180.0);
  const omega = varpi - Omega;

  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const b = a * Math.sqrt(Math.max(0, 1.0 - e * e));
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const xPrime = a * (Math.cos(theta) - e);
    const yPrime = b * Math.sin(theta);
    const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);

    const xEcl = Px * xPrime + Qx * yPrime;
    const yEcl = Py * xPrime + Qy * yPrime;
    const zEcl = Pz * xPrime + Qz * yPrime;

    const sceneRadius = mapDistanceToSceneRadius(rAu);
    const scale = sceneRadius / rAu;

    points.push(new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale));
  }

  return points;
}

/**
 * Computes 1P/Halley orbital position, distance and ion tail direction.
 */
export function calculateHalleyPosition(dateOrYear: Date | number) {
  let decimalYear: number;
  if (typeof dateOrYear === "number") {
    decimalYear = dateOrYear;
  } else {
    const year = dateOrYear.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1)).getTime();
    const end = new Date(Date.UTC(year + 1, 0, 1)).getTime();
    decimalYear = year + (dateOrYear.getTime() - start) / (end - start);
  }

  const a = 17.834144;
  const e = 0.96714;
  const I = 162.2627 * (Math.PI / 180.0);
  const Omega = 58.42 * (Math.PI / 180.0);
  const varpi = 111.332 * (Math.PI / 180.0);
  const omega = varpi - Omega;

  // Reference perihelion 1986.11 (February 9, 1986)
  const periodYears = 75.32;
  const elapsed = decimalYear - 1986.11;
  const meanAnomaly = ((elapsed / periodYears) * 2 * Math.PI) % (2 * Math.PI);

  const E = solveKeplerEquation(meanAnomaly, e);
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1.0 - e * e) * Math.sin(E);
  const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);

  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const xEcl = Px * xPrime + Qx * yPrime;
  const yEcl = Py * xPrime + Qy * yPrime;
  const zEcl = Pz * xPrime + Qz * yPrime;

  const sceneRadius = mapDistanceToSceneRadius(rAu);
  const scale = sceneRadius / rAu;
  const scenePos = new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale);

  // Tail direction points strictly away from the Sun (origin)
  const tailDirection = scenePos.clone().normalize();

  // Tail length and glow intensity are strongest near perihelion (rAu < 2.0 AU)
  const proximityFactor = Math.max(0, 1.0 - rAu / 4.0);
  const tailLength = 2.0 + proximityFactor * 12.0;
  const tailOpacity = Math.min(0.9, 0.15 + proximityFactor * 0.75);

  const isPerihelionPassage = rAu <= 1.5;

  return {
    heliocentricAu: { x: xEcl, y: yEcl, z: zEcl },
    distanceSunAu: Number(rAu.toFixed(4)),
    distanceSunMkm: Number(((rAu * 149597870.7) / 1e6).toFixed(2)),
    scenePosition: scenePos,
    tailDirection,
    tailLength,
    tailOpacity,
    isPerihelionPassage,
  };
}

/**
 * Generates smooth 3D orbital trajectory loop for 1P/Halley.
 */
export function generateHalleyOrbitalPath(segments = 240): THREE.Vector3[] {
  const a = 17.834144;
  const e = 0.96714;
  const I = 162.2627 * (Math.PI / 180.0);
  const Omega = 58.42 * (Math.PI / 180.0);
  const varpi = 111.332 * (Math.PI / 180.0);
  const omega = varpi - Omega;

  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const b = a * Math.sqrt(Math.max(0, 1.0 - e * e));
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const xPrime = a * (Math.cos(theta) - e);
    const yPrime = b * Math.sin(theta);
    const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);

    const xEcl = Px * xPrime + Qx * yPrime;
    const yEcl = Py * xPrime + Qy * yPrime;
    const zEcl = Pz * xPrime + Qz * yPrime;

    const sceneRadius = mapDistanceToSceneRadius(rAu);
    const scale = sceneRadius / rAu;

    points.push(new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale));
  }

  return points;
}
