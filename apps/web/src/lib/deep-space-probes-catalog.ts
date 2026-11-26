/**
 * Catálogo astrofísico e de engenharia das Sondas do Espaço Profundo no Modo Cosmos (D41).
 * Re-exportado por `deep-space-probes.ts`.
 */

import { type DeepSpaceProbeId } from "./deep-space-probes-ids";

export interface ProbeTrajectoryWaypoint {
  year: number;
  rAu: number;
  eclLonDeg: number;
  eclLatDeg: number;
}

export interface ProbeMilestone {
  year: number;
  titlePt: string;
  titleEn: string;
  detailPt: string;
  detailEn: string;
}

export interface DeepSpaceProbeMetadata {
  id: DeepSpaceProbeId;
  shortCode: string;
  namePt: string;
  nameEn: string;
  regimePt: string;
  regimeEn: string;
  agency: string;
  launchDateIso: string;
  launchDecimalYear: number;
  launchVehicle: string;
  powerSourcePt: string;
  powerSourceEn: string;
  massKg: number;
  asymptoticSpeedKmS: number;
  asymptoticAuPerYear: number;
  color: string;
  summaryPt: string;
  summaryEn: string;
  milestones: readonly ProbeMilestone[];
  nasaUrl: string;
  jplUrl: string;
  /** Waypoints heliocêntricos calibrados (JPL Horizons, eclíptica J2000) para sondas hiperbólicas. */
  waypoints?: readonly ProbeTrajectoryWaypoint[];
}

const ALLOWED_MISSION_HOSTS = new Set([
  "science.nasa.gov",
  "voyager.jpl.nasa.gov",
  "ssd.jpl.nasa.gov",
  "pluto.jhuapl.edu",
  "webb.nasa.gov",
]);

export function sanitizeNasaMissionUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" && ALLOWED_MISSION_HOSTS.has(parsed.hostname)) {
      parsed.hash = "";
      return parsed.toString();
    }
  } catch {
    // Fallback seguro
  }
  return "https://science.nasa.gov/missions/";
}

export const DEEP_SPACE_PROBES_CATALOG: Readonly<
  Record<DeepSpaceProbeId, DeepSpaceProbeMetadata>
> = {
  VOYAGER_1: {
    id: "VOYAGER_1",
    shortCode: "V1",
    namePt: "Voyager 1",
    nameEn: "Voyager 1",
    regimePt: "Meio Interestelar (Ofiúco)",
    regimeEn: "Interstellar Medium (Ophiuchus)",
    agency: "NASA / JPL",
    launchDateIso: "1977-09-05",
    launchDecimalYear: 1977.677,
    launchVehicle: "Titan IIIE / Centaur",
    powerSourcePt: "3 × geradores termoelétricos de radioisótopos (RTG Pu-238)",
    powerSourceEn: "3 × Pu-238 radioisotope thermoelectric generators (RTGs)",
    massKg: 825.5,
    asymptoticSpeedKmS: 16.95,
    asymptoticAuPerYear: 3.575,
    color: "#38bdf8",
    summaryPt:
      "Objeto humano mais distante da Terra: após sobrevoar Júpiter (1979) e Saturno/Titã (1980), inclinou 35° acima do plano da eclíptica, cruzou a heliopausa em agosto de 2012 (121,6 UA) e mede diretamente o plasma e o campo magnético interestelares.",
    summaryEn:
      "Farthest human-made object from Earth: after flying by Jupiter (1979) and Saturn/Titan (1980), it climbed 35° north of the ecliptic plane, crossed the heliopause in August 2012 (121.6 AU), and directly samples interstellar plasma and magnetic fields.",
    milestones: [
      {
        year: 1979,
        titlePt: "Sobrevoo de Júpiter & vulcanismo em Io",
        titleEn: "Jupiter flyby & active volcanism on Io",
        detailPt: "5 de março de 1979 · assistência gravitacional rumo a Saturno",
        detailEn: "March 5, 1979 · gravity assist toward Saturn",
      },
      {
        year: 1980,
        titlePt: "Sobrevoo de Saturno & atmosfera densa de Titã",
        titleEn: "Saturn flyby & Titan's dense nitrogen atmosphere",
        detailPt: "12 de novembro de 1980 · deflexão 35° ao norte da eclíptica",
        detailEn: "November 12, 1980 · 35° northward deflection out of the ecliptic",
      },
      {
        year: 1990,
        titlePt: "Retrato 'Pálido Ponto Azul' (Pale Blue Dot)",
        titleEn: "'Pale Blue Dot' Solar System family portrait",
        detailPt: "14 de fevereiro de 1990 · Terra fotografada a 40,5 UA (6 bi km)",
        detailEn: "February 14, 1990 · Earth imaged from 40.5 AU (6 billion km)",
      },
      {
        year: 2012,
        titlePt: "Travessia da Heliopausa para o espaço interestelar",
        titleEn: "Heliopause crossing into interstellar space",
        detailPt: "25 de agosto de 2012 · 121,6 UA do Sol",
        detailEn: "August 25, 2012 · 121.6 AU from the Sun",
      },
    ],
    nasaUrl: "https://science.nasa.gov/mission/voyager/voyager-1/",
    jplUrl: "https://ssd.jpl.nasa.gov/horizons/",
    waypoints: [
      { year: 1977.677, rAu: 1.005, eclLonDeg: 343.0, eclLatDeg: 0.0 },
      { year: 1979.175, rAu: 5.203, eclLonDeg: 132.0, eclLatDeg: 1.2 },
      { year: 1980.866, rAu: 9.537, eclLonDeg: 184.5, eclLatDeg: 2.5 },
      { year: 1990.123, rAu: 40.47, eclLonDeg: 246.2, eclLatDeg: 31.5 },
      { year: 2012.649, rAu: 121.6, eclLonDeg: 254.4, eclLatDeg: 34.6 },
      { year: 2026.0, rAu: 169.8, eclLonDeg: 255.4, eclLatDeg: 34.9 },
    ],
  },
  VOYAGER_2: {
    id: "VOYAGER_2",
    shortCode: "V2",
    namePt: "Voyager 2",
    nameEn: "Voyager 2",
    regimePt: "Meio Interestelar Sul (Pavão)",
    regimeEn: "Southern Interstellar Medium (Pavo)",
    agency: "NASA / JPL",
    launchDateIso: "1977-08-20",
    launchDecimalYear: 1977.633,
    launchVehicle: "Titan IIIE / Centaur",
    powerSourcePt: "3 × geradores termoelétricos de radioisótopos (RTG Pu-238)",
    powerSourceEn: "3 × Pu-238 radioisotope thermoelectric generators (RTGs)",
    massKg: 825.5,
    asymptoticSpeedKmS: 15.37,
    asymptoticAuPerYear: 3.242,
    color: "#34d399",
    summaryPt:
      "Única sonda da história a completar o 'Grand Tour' dos quatro gigantes exteriores (Júpiter 1979, Saturno 1981, Urano 1986 e Netuno/Tritão 1989); mergulhou 48° ao sul da eclíptica e cruzou a heliopausa em novembro de 2018 (119,0 UA).",
    summaryEn:
      "Only spacecraft in history to complete the 'Grand Tour' of all four giant planets (Jupiter 1979, Saturn 1981, Uranus 1986, Neptune/Triton 1989); dived 48° south of the ecliptic and crossed the heliopause in November 2018 (119.0 AU).",
    milestones: [
      {
        year: 1986,
        titlePt: "Primeiro e único sobrevoo de Urano",
        titleEn: "First and only flyby of Uranus",
        detailPt: "24 de janeiro de 1986 · 10 novas luas e campo magnético inclinado",
        detailEn: "January 24, 1986 · 10 new moons and tilted magnetosphere",
      },
      {
        year: 1989,
        titlePt: "Primeiro e único sobrevoo de Netuno & gêiseres de Tritão",
        titleEn: "First and only flyby of Neptune & Triton's geysers",
        detailPt: "25 de agosto de 1989 · deflexão polar ao sul da eclíptica",
        detailEn: "August 25, 1989 · polar deflection south of the ecliptic",
      },
      {
        year: 2018,
        titlePt: "Travessia da Heliopausa no hemisfério sul",
        titleEn: "Southern-hemisphere Heliopause crossing",
        detailPt: "5 de novembro de 2018 · 119,0 UA com detector de plasma PLS ativo",
        detailEn: "November 5, 2018 · 119.0 AU with active PLS plasma instrument",
      },
    ],
    nasaUrl: "https://science.nasa.gov/mission/voyager/voyager-2/",
    jplUrl: "https://ssd.jpl.nasa.gov/horizons/",
    waypoints: [
      { year: 1977.633, rAu: 1.01, eclLonDeg: 327.0, eclLatDeg: 0.0 },
      { year: 1979.52, rAu: 5.203, eclLonDeg: 146.0, eclLatDeg: 1.1 },
      { year: 1981.65, rAu: 9.537, eclLonDeg: 196.0, eclLatDeg: 2.4 },
      { year: 1986.066, rAu: 19.19, eclLonDeg: 258.5, eclLatDeg: -0.8 },
      { year: 1989.649, rAu: 30.07, eclLonDeg: 281.4, eclLatDeg: -1.8 },
      { year: 2018.846, rAu: 119.0, eclLonDeg: 288.8, eclLatDeg: -46.5 },
      { year: 2026.0, rAu: 141.95, eclLonDeg: 289.6, eclLatDeg: -48.0 },
    ],
  },
  NEW_HORIZONS: {
    id: "NEW_HORIZONS",
    shortCode: "NH",
    namePt: "New Horizons",
    nameEn: "New Horizons",
    regimePt: "Cinturão de Kuiper (Sagitário)",
    regimeEn: "Kuiper Belt (Sagittarius)",
    agency: "NASA / JHU APL / SwRI",
    launchDateIso: "2006-01-19",
    launchDecimalYear: 2006.049,
    launchVehicle: "Atlas V 551 + Star 48B",
    powerSourcePt: "1 × gerador termoelétrico de radioisótopos (GPHS-RTG)",
    powerSourceEn: "1 × GPHS-RTG radioisotope thermoelectric generator",
    massKg: 478,
    asymptoticSpeedKmS: 13.68,
    asymptoticAuPerYear: 2.885,
    color: "#f59e0b",
    summaryPt:
      "Lançada com a maior velocidade de escape terrestre já registrada (16,26 km/s), realizou o primeiro reconhecimento de Plutão e Caronte em julho de 2015 (revelando a geleira de nitrogênio Sputnik Planitia) e do binário de contato primordial 486958 Arrokoth em 2019.",
    summaryEn:
      "Launched with the highest Earth-departure speed ever recorded (16.26 km/s), it achieved the first reconnaissance of Pluto and Charon in July 2015 (revealing the nitrogen glacier Sputnik Planitia) and the primordial Kuiper Belt contact binary 486958 Arrokoth in 2019.",
    milestones: [
      {
        year: 2007,
        titlePt: "Assistência gravitacional em Júpiter",
        titleEn: "Jupiter gravity assist",
        detailPt: "28 de fevereiro de 2007 · ganho de +4 km/s rumo a Plutão",
        detailEn: "February 28, 2007 · +4 km/s velocity boost toward Pluto",
      },
      {
        year: 2015,
        titlePt: "Sobrevoo histórico de Plutão & Caronte",
        titleEn: "Historic flyby of Pluto & Charon",
        detailPt: "14 de julho de 2015 · 12.500 km acima da superfície (32,9 UA)",
        detailEn: "July 14, 2015 · 12,500 km above Pluto's surface (32.9 AU)",
      },
      {
        year: 2019,
        titlePt: "Sobrevoo de 486958 Arrokoth no Cinturão de Kuiper",
        titleEn: "Kuiper Belt flyby of 486958 Arrokoth",
        detailPt: "1º de janeiro de 2019 · objeto mais distante já visitado (43,4 UA)",
        detailEn: "January 1, 2019 · most distant object ever explored up close (43.4 AU)",
      },
    ],
    nasaUrl: "https://science.nasa.gov/mission/new-horizons/",
    jplUrl: "https://pluto.jhuapl.edu/",
    waypoints: [
      { year: 2006.049, rAu: 0.984, eclLonDeg: 119.0, eclLatDeg: 0.0 },
      { year: 2007.16, rAu: 5.203, eclLonDeg: 256.5, eclLatDeg: 1.5 },
      { year: 2015.534, rAu: 32.91, eclLonDeg: 284.2, eclLatDeg: 1.85 },
      { year: 2019.003, rAu: 43.38, eclLonDeg: 289.1, eclLatDeg: 2.0 },
      { year: 2026.0, rAu: 63.85, eclLonDeg: 291.8, eclLatDeg: 2.1 },
    ],
  },
  JWST: {
    id: "JWST",
    shortCode: "JW",
    namePt: "James Webb (JWST · L2)",
    nameEn: "James Webb (JWST · L2)",
    regimePt: "Ponto de Lagrange Sol–Terra L2 (1,5 mi km)",
    regimeEn: "Sun–Earth Lagrange Point L2 (1.5M km)",
    agency: "NASA / ESA / CSA",
    launchDateIso: "2021-12-25",
    launchDecimalYear: 2021.981,
    launchVehicle: "Ariane 5 ECA",
    powerSourcePt: "Painel solar de 2 kW + escudo térmico kapton de 5 camadas (50 K)",
    powerSourceEn: "2 kW solar array + 5-layer Kapton sunshield (50 K)",
    massKg: 6161,
    asymptoticSpeedKmS: 29.8,
    asymptoticAuPerYear: 6.284,
    color: "#fbbf24",
    summaryPt:
      "Maior observatório espacial infravermelho já construído (espelho primário segmentado de berílio folheado a ouro de 6,5 m): orbita em halo ao redor do ponto de Lagrange Sol–Terra L2 a 1,5 milhão de km no lado antissolar da Terra, mantendo Sol, Terra e Lua atrás do escudo térmico.",
    summaryEn:
      "Largest infrared space observatory ever built (6.5 m gold-coated segmented beryllium primary mirror): orbits in a wide halo around the Sun–Earth L2 Lagrange point 1.5 million km anti-solar of Earth, keeping the Sun, Earth, and Moon permanently behind its sunshield.",
    milestones: [
      {
        year: 2021,
        titlePt: "Lançamento em Kourou (Guiana Francesa)",
        titleEn: "Ariane 5 launch from Kourou (French Guiana)",
        detailPt: "25 de dezembro de 2021 · precisão orbital duplicou a vida útil (> 20 anos)",
        detailEn: "December 25, 2021 · injection accuracy doubled fuel life (> 20 years)",
      },
      {
        year: 2022,
        titlePt: "Inserção em órbita de halo L2 & Primeiras Imagens Profundas",
        titleEn: "L2 halo insertion & First Deep Field release",
        detailPt: "Janeiro / Julho de 2022 · SMACS 0723, Carina e espectros de exoplanetas",
        detailEn: "January / July 2022 · SMACS 0723, Carina Cliffs, and exoplanet spectra",
      },
    ],
    nasaUrl: "https://science.nasa.gov/mission/webb/",
    jplUrl: "https://webb.nasa.gov/",
  },
};
