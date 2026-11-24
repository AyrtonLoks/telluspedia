/**
 * Catálogo científico observado dos 5 grandes giros oceânicos subtropicais e pontos costeiros
 * de lançamento educativo para a camada de Lixo Marítimo & Microplásticos (D29 / RN17).
 *
 * Fontes primárias: NOAA Marine Debris Program, NOAA/AOML Global Drifter Program,
 * Eriksen et al. (2014, PLOS ONE) e Lebreton et al. (2018, Scientific Reports).
 */

import type { OceanGyreId } from "./marine-debris-types";
export {
  DEFAULT_DEBRIS_HORIZON_MONTHS,
  DEFAULT_DEBRIS_WINDAGE,
  type DebrisReleasePoint,
  type MarineDebrisHorizonMonths,
  type MarineDebrisWindage,
  type OceanGyreId,
} from "./marine-debris-types";

export interface DebrisColorStop {
  at: number;
  rgb: readonly [number, number, number];
  hex: string;
}

/** Rampa perceptual de concentração superficial (partículas/km² — escala logarítmica). */
export const DEBRIS_DENSITY_STOPS: readonly DebrisColorStop[] = [
  { at: 0.0, rgb: [0.09, 0.64, 0.72], hex: "#17a3b8" }, // baixa (~10³)
  { at: 0.35, rgb: [0.96, 0.76, 0.16], hex: "#f5c229" }, // moderada (~10⁴)
  { at: 0.7, rgb: [0.97, 0.45, 0.19], hex: "#f77330" }, // alta (~10⁵)
  { at: 1.0, rgb: [0.92, 0.22, 0.42], hex: "#eb386b" }, // núcleo crítico (~10⁶)
];

export interface OceanGyre {
  id: OceanGyreId;
  namePt: string;
  nameEn: string;
  subtitlePt: string;
  subtitleEn: string;
  /** Centro observado do núcleo de acumulação (graus). */
  centerLat: number;
  centerLng: number;
  /** Semi-eixos aproximados da zona de concentração (graus). */
  radiusLat: number;
  radiusLng: number;
  /** Sentido de circulação superficial (horário no HN, anti-horário no HS). */
  rotation: "clockwise" | "counterclockwise";
  /** Densidade máxima observada (partículas/km², Eriksen et al. 2014 / Lebreton et al. 2018). */
  peakParticlesPerKm2: number;
  /** Massa flutuante estimada na zona do giro (toneladas métricas). */
  estimatedMassTonnes: number;
  /** Peso relativo de intensidade visual [0.45..1.0]. */
  intensity: number;
  summaryPt: string;
  summaryEn: string;
  sourceCitation: string;
  sourceUrl: string;
}

export const OCEAN_GYRES: readonly OceanGyre[] = [
  {
    id: "north-pacific",
    namePt: "Giro do Pacífico Norte",
    nameEn: "North Pacific Gyre",
    subtitlePt: "Grande Mancha de Lixo do Pacífico (GPGP)",
    subtitleEn: "Great Pacific Garbage Patch (GPGP)",
    centerLat: 34.0,
    centerLng: -145.0,
    radiusLat: 9.5,
    radiusLng: 24.0,
    rotation: "clockwise",
    peakParticlesPerKm2: 1_000_000,
    estimatedMassTonnes: 79_000,
    intensity: 1.0,
    summaryPt:
      "Maior zona de acumulação oceânica conhecida, entre a Califórnia e o Havaí, alimentada pelas correntes de Kuroshio e da Califórnia.",
    summaryEn:
      "Largest known oceanic accumulation zone, between California and Hawaii, fed by the Kuroshio and California currents.",
    sourceCitation: "NOAA Marine Debris Program · Lebreton et al. (2018, Sci. Rep.)",
    sourceUrl: "https://marinedebris.noaa.gov/info/patch.html",
  },
  {
    id: "north-atlantic",
    namePt: "Giro do Atlântico Norte",
    nameEn: "North Atlantic Gyre",
    subtitlePt: "Convergência do Mar dos Sargaços",
    subtitleEn: "Sargasso Sea Convergence",
    centerLat: 30.5,
    centerLng: -48.0,
    radiusLat: 8.5,
    radiusLng: 17.5,
    rotation: "clockwise",
    peakParticlesPerKm2: 203_000,
    estimatedMassTonnes: 56_500,
    intensity: 0.82,
    summaryPt:
      "Alta concentração de microplásticos retidos entre a Corrente do Golfo, a Corrente das Canárias e os alísios de nordeste.",
    summaryEn:
      "High microplastic concentration trapped between the Gulf Stream, Canary Current, and northeast trade winds.",
    sourceCitation: "NOAA Marine Debris Program · Eriksen et al. (2014, PLOS ONE)",
    sourceUrl: "https://www.aoml.noaa.gov/phod/gdp/",
  },
  {
    id: "indian-ocean",
    namePt: "Giro do Oceano Índico",
    nameEn: "Indian Ocean Gyre",
    subtitlePt: "Convergência Subtropical do Índico Sul",
    subtitleEn: "South Indian Subtropical Convergence",
    centerLat: -27.5,
    centerLng: 78.0,
    radiusLat: 8.5,
    radiusLng: 16.5,
    rotation: "counterclockwise",
    peakParticlesPerKm2: 59_100,
    estimatedMassTonnes: 59_100,
    intensity: 0.72,
    summaryPt:
      "Acumulação modulada pelas monções do Índico, Corrente das Agulhas e Corrente da Austrália Ocidental.",
    summaryEn:
      "Accumulation modulated by Indian Ocean monsoons, the Agulhas Current, and the West Australian Current.",
    sourceCitation: "Eriksen et al. (2014, PLOS ONE) · NOAA Global Drifter Program",
    sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0111913",
  },
  {
    id: "south-pacific",
    namePt: "Giro do Pacífico Sul",
    nameEn: "South Pacific Gyre",
    subtitlePt: "Convergência Subtropical Leste (Ilha de Páscoa)",
    subtitleEn: "Eastern Subtropical Convergence (Easter Island)",
    centerLat: -28.5,
    centerLng: -108.0,
    radiusLat: 9.0,
    radiusLng: 20.0,
    rotation: "counterclockwise",
    peakParticlesPerKm2: 26_900,
    estimatedMassTonnes: 21_000,
    intensity: 0.62,
    summaryPt:
      "Giro mais remoto do planeta, cercado pelas correntes de Humboldt, Sul-Equatorial e Circumpolar Antártica.",
    summaryEn:
      "Most remote subtropical gyre on Earth, bounded by the Humboldt, South Equatorial, and Antarctic Circumpolar currents.",
    sourceCitation: "Eriksen et al. (2014, PLOS ONE) · NOAA Marine Debris Program",
    sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0111913",
  },
  {
    id: "south-atlantic",
    namePt: "Giro do Atlântico Sul",
    nameEn: "South Atlantic Gyre",
    subtitlePt: "Convergência entre Corrente do Brasil e Benguela",
    subtitleEn: "Brazil–Benguela Subtropical Convergence",
    centerLat: -30.0,
    centerLng: -18.0,
    radiusLat: 8.0,
    radiusLng: 16.5,
    rotation: "counterclockwise",
    peakParticlesPerKm2: 12_800,
    estimatedMassTonnes: 12_800,
    intensity: 0.56,
    summaryPt:
      "Retém resíduos escoados das bacias atlânticas da América do Sul e África Austral entre as correntes do Brasil e de Benguela.",
    summaryEn:
      "Retains debris exported from South American and Southern African Atlantic basins between the Brazil and Benguela currents.",
    sourceCitation: "Eriksen et al. (2014, PLOS ONE) · NOAA Global Drifter Program",
    sourceUrl: "https://www.aoml.noaa.gov/phod/gdp/",
  },
];

export interface DebrisLaunchPreset {
  id: string;
  labelPt: string;
  labelEn: string;
  lat: number;
  lng: number;
}

export const DEBRIS_LAUNCH_PRESETS: readonly DebrisLaunchPreset[] = [
  { id: "santos", labelPt: "Santos (Brasil)", labelEn: "Santos (Brazil)", lat: -24.5, lng: -45.5 },
  { id: "tokyo", labelPt: "Tóquio (Japão)", labelEn: "Tokyo (Japan)", lat: 34.5, lng: 141.5 },
  { id: "lisbon", labelPt: "Atlântico / Canárias", labelEn: "Canary Current (NE Atlantic)", lat: 32.0, lng: -18.5 },
  { id: "lima", labelPt: "Lima (Humboldt)", labelEn: "Lima (Humboldt)", lat: -20.0, lng: -76.5 },
  { id: "cape-town", labelPt: "Cidade do Cabo", labelEn: "Cape Town", lat: -32.5, lng: 14.0 },
  { id: "perth", labelPt: "Perth (Índico)", labelEn: "Perth (Indian)", lat: -31.8, lng: 113.8 },
];

export function getOceanGyre(id: OceanGyreId | null | undefined): OceanGyre | null {
  if (!id) return null;
  return OCEAN_GYRES.find((g) => g.id === id) ?? null;
}
