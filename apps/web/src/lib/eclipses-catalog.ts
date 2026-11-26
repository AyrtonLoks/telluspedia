/**
 * Catálogo científico curado de eclipses solares e lunares emblemáticos (D41).
 * Fontes primárias: NASA GSFC Five Millennium Canon of Solar & Lunar Eclipses (Espenak & Meeus).
 */

import {
  ECLIPSE_GREATEST_UTC_ISO,
  type EclipseId,
  type EclipseKind,
} from "./eclipses-ids";

export interface EclipseCatalogEntry {
  id: EclipseId;
  kind: EclipseKind;
  year: number;
  dateLabelPt: string;
  dateLabelEn: string;
  greatestUtcIso: string;
  titlePt: string;
  titleEn: string;
  shortLabelPt: string;
  shortLabelEn: string;
  regionPt: string;
  regionEn: string;
  saros: number;
  gamma: number;
  magnitude: number;
  maxDurationPt: string;
  maxDurationEn: string;
  umbraWidthKm: number;
  /** Coordenada geográfica do ponto de máximo eclipse (GD / Greatest Eclipse, NASA GSFC). */
  greatestLat: number;
  greatestLng: number;
  /** Janela de varredura da umbra central sobre a superfície terrestre (minutos relativos ao máximo). */
  windowMinutes: readonly [min: number, max: number];
  /**
   * Pontos calibrados `(lat, lng)` ao longo da linha central de totalidade (ou sublunar no eclipse lunar).
   * Usados para traçar a faixa de totalidade 3D e interpolar o deslocamento da umbra no tempo.
   */
  centerline: ReadonlyArray<readonly [lat: number, lng: number]>;
  /** Índice em `centerline` correspondente ao instante exato de máximo eclipse (`offsetMinutes = 0`). */
  greatestCenterlineIndex: number;
  summaryPt: string;
  summaryEn: string;
  countryIsos: readonly string[];
  dossierSlug?: string;
  nasaUrl: string;
}

const ALLOWED_NASA_ECLIPSE_HOSTS = new Set([
  "eclipse.gsfc.nasa.gov",
  "science.nasa.gov",
  "svs.gsfc.nasa.gov",
]);

export function sanitizeEclipseNasaUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" && ALLOWED_NASA_ECLIPSE_HOSTS.has(parsed.hostname)) {
      parsed.hash = "";
      return parsed.toString();
    }
  } catch {
    // Fallback seguro
  }
  return "https://science.nasa.gov/eclipses/";
}

export const ECLIPSES_CATALOG: Readonly<Record<EclipseId, EclipseCatalogEntry>> = {
  "sobral-1919": {
    id: "sobral-1919",
    kind: "solar_total",
    year: 1919,
    dateLabelPt: "29 de maio de 1919 · 13:08 UTC",
    dateLabelEn: "May 29, 1919 · 13:08 UTC",
    greatestUtcIso: ECLIPSE_GREATEST_UTC_ISO["sobral-1919"],
    titlePt: "Eclipse Solar Total de Sobral & Príncipe (1919)",
    titleEn: "Total Solar Eclipse of Sobral & Príncipe (1919)",
    shortLabelPt: "1919 · Sobral",
    shortLabelEn: "1919 · Sobral",
    regionPt: "América do Sul · Sobral (CE) · Atlântico · Ilha do Príncipe · África",
    regionEn: "South America · Sobral (Brazil) · Atlantic · Príncipe · Africa",
    saros: 136,
    gamma: -0.2955,
    magnitude: 1.0719,
    maxDurationPt: "6 min 51 s",
    maxDurationEn: "6m 51s",
    umbraWidthKm: 244,
    greatestLat: 4.38,
    greatestLng: -16.7,
    windowMinutes: [-95, 95],
    centerline: [
      [-19.8, -71.2],
      [-14.6, -62.0],
      [-8.9, -51.4],
      [-3.69, -40.35], // Sobral, Ceará
      [1.2, -28.5],
      [4.38, -16.7],   // Greatest Eclipse (Atlântico Equatorial)
      [4.7, -4.2],
      [1.61, 7.4],     // Ilha do Príncipe
      [-3.2, 18.8],
      [-8.5, 30.2],
      [-13.4, 40.6],
    ],
    greatestCenterlineIndex: 5,
    summaryPt:
      "As expedições do Observatório Nacional (Henrique Morize) e da Royal Society (Crommelin em Sobral e Eddington no Príncipe) fotografaram estrelas do aglomerado das Híades próximas ao limbo solar e confirmaram a deflexão relativística da luz (~1,75\") prevista por Albert Einstein.",
    summaryEn:
      "Expeditions by Brazil's National Observatory (Henrique Morize) and the Royal Society (Crommelin in Sobral and Eddington on Príncipe) photographed Hyades stars near the solar limb, confirming the ~1.75\" gravitational light deflection predicted by Albert Einstein's General Relativity.",
    countryIsos: ["BRA", "PER", "BOL", "COD", "TZA", "MOZ"],
    dossierSlug: "einstein",
    nasaUrl: "https://science.nasa.gov/eclipses/history/",
  },
  "north-america-2024": {
    id: "north-america-2024",
    kind: "solar_total",
    year: 2024,
    dateLabelPt: "8 de abril de 2024 · 18:18 UTC",
    dateLabelEn: "April 8, 2024 · 18:18 UTC",
    greatestUtcIso: ECLIPSE_GREATEST_UTC_ISO["north-america-2024"],
    titlePt: "Grande Eclipse Solar Norte-Americano (2024)",
    titleEn: "Great North American Total Solar Eclipse (2024)",
    shortLabelPt: "2024 · América do Norte",
    shortLabelEn: "2024 · North America",
    regionPt: "Pacífico · México (Mazatlán/Nazas) · EUA (Texas–Maine) · Canadá",
    regionEn: "Pacific · Mexico (Mazatlán/Nazas) · USA (Texas–Maine) · Canada",
    saros: 139,
    gamma: 0.3431,
    magnitude: 1.0566,
    maxDurationPt: "4 min 28 s",
    maxDurationEn: "4m 28s",
    umbraWidthKm: 198,
    greatestLat: 25.29,
    greatestLng: -104.14,
    windowMinutes: [-85, 85],
    centerline: [
      [-2.5, -138.0],
      [7.8, -125.4],
      [16.5, -114.8],
      [23.24, -106.41], // Mazatlán
      [25.29, -104.14], // Nazas, Durango (Greatest Eclipse)
      [30.27, -97.74],  // Texas Hill Country
      [36.5, -89.8],
      [39.77, -86.16],  // Indianapolis
      [43.08, -79.08],  // Niagara
      [46.5, -67.8],    // Maine / New Brunswick
      [48.95, -54.61],  // Newfoundland
      [49.8, -36.0],
    ],
    greatestCenterlineIndex: 4,
    summaryPt:
      "Cruzou áreas densamente povoadas do México, 15 estados dos EUA e o leste do Canadá durante o máximo do Ciclo Solar 25, revelando proeminências cromosféricas intensas e uma coroa solar simétrica registrada por redes cidadãs e aviões WB-57 da NASA.",
    summaryEn:
      "Crossed densely populated regions of Mexico, 15 U.S. states, and eastern Canada near Solar Cycle 25 maximum, revealing vivid chromospheric prominences and a symmetric solar corona observed by NASA WB-57 jets and citizen-science arrays.",
    countryIsos: ["MEX", "USA", "CAN"],
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/eclipse-2024/",
  },
  "blood-moon-2025": {
    id: "blood-moon-2025",
    kind: "lunar_total",
    year: 2025,
    dateLabelPt: "14 de março de 2025 · 06:58 UTC",
    dateLabelEn: "March 14, 2025 · 06:58 UTC",
    greatestUtcIso: ECLIPSE_GREATEST_UTC_ISO["blood-moon-2025"],
    titlePt: "Eclipse Lunar Total das Américas & Atlântico (2025)",
    titleEn: "Total Lunar Eclipse of the Americas & Atlantic (2025)",
    shortLabelPt: "2025 · Lunar Total",
    shortLabelEn: "2025 · Total Lunar",
    regionPt: "Brasil · Américas · Oceano Pacífico · Europa Ocidental · África Ocidental",
    regionEn: "Brazil · Americas · Pacific · Western Europe · West Africa",
    saros: 123,
    gamma: 0.3485,
    magnitude: 1.178,
    maxDurationPt: "1 h 05 min (totalidade)",
    maxDurationEn: "1h 05m (totality)",
    umbraWidthKm: 9200,
    greatestLat: 1.8,
    greatestLng: -102.5,
    windowMinutes: [-110, 110],
    centerline: [
      [2.6, -74.5],
      [2.2, -88.5],
      [1.8, -102.5], // Sublunar zenith at Greatest Eclipse
      [1.4, -116.5],
      [1.0, -130.5],
    ],
    greatestCenterlineIndex: 2,
    summaryPt:
      "A Lua Cheia atravessa integralmente o cone de umbra terrestre: a luz azul é espalhada pela atmosfera da Terra (espalhamento de Rayleigh) enquanto os comprimentos de onda avermelhados dos crepúsculos terrestres refratam sobre o regolito lunar ('Lua de Sangue').",
    summaryEn:
      "The Full Moon passes completely through Earth's umbral cone: blue wavelengths scatter in Earth's atmosphere (Rayleigh scattering) while sunset-red wavelengths refract onto the lunar regolith, turning the Moon copper-red across the night hemisphere.",
    countryIsos: ["BRA", "ARG", "USA", "MEX", "CAN", "PRT", "ESP"],
    nasaUrl: "https://science.nasa.gov/solar-system/moon/what-you-need-to-know-about-the-march-2025-total-lunar-eclipse/",
  },
  "arctic-spain-2026": {
    id: "arctic-spain-2026",
    kind: "solar_total",
    year: 2026,
    dateLabelPt: "12 de agosto de 2026 · 17:47 UTC",
    dateLabelEn: "August 12, 2026 · 17:47 UTC",
    greatestUtcIso: ECLIPSE_GREATEST_UTC_ISO["arctic-spain-2026"],
    titlePt: "Eclipse Solar Total do Ártico, Islândia & Espanha (2026)",
    titleEn: "Arctic, Iceland & Spain Total Solar Eclipse (2026)",
    shortLabelPt: "2026 · Islândia/Espanha",
    shortLabelEn: "2026 · Iceland/Spain",
    regionPt: "Ártico Russo · Groenlândia · Oeste da Islândia · Atlântico · Espanha",
    regionEn: "Russian Arctic · Greenland · West Iceland · Atlantic · Spain",
    saros: 126,
    gamma: 0.8977,
    magnitude: 1.0386,
    maxDurationPt: "2 min 18 s",
    maxDurationEn: "2m 18s",
    umbraWidthKm: 294,
    greatestLat: 65.17,
    greatestLng: -25.22,
    windowMinutes: [-65, 65],
    centerline: [
      [76.2, 125.0],
      [83.5, 92.0],
      [86.0, -5.0],
      [77.8, -22.5],  // Leste da Groenlândia
      [65.17, -25.22], // Oeste da Islândia (Greatest Eclipse)
      [54.2, -16.8],
      [45.6, -9.8],
      [43.36, -8.41], // A Coruña, Espanha
      [41.65, -0.89], // Zaragoza / Burgos
      [39.57, 2.65],  // Palma de Mallorca (pôr do sol eclipsado)
    ],
    greatestCenterlineIndex: 4,
    summaryPt:
      "Primeiro eclipse solar total na Europa continental desde 1999: a umbra desce do Oceano Ártico pela Groenlândia oriental, atinge duração máxima na costa oeste da Islândia (Snæfellsnes/Reykjavík) e cruza o norte da Espanha e as Ilhas Baleares ao entardecer.",
    summaryEn:
      "First total solar eclipse across mainland Europe since 1999: the lunar umbra sweeps south from the High Arctic along eastern Greenland, peaks off western Iceland (Snæfellsnes/Reykjavík), and crosses northern Spain and Mallorca near sunset.",
    countryIsos: ["GRL", "ISL", "ESP", "PRT"],
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/eclipse-2026/",
  },
  "luxor-2027": {
    id: "luxor-2027",
    kind: "solar_total",
    year: 2027,
    dateLabelPt: "2 de agosto de 2027 · 10:07 UTC",
    dateLabelEn: "August 2, 2027 · 10:07 UTC",
    greatestUtcIso: ECLIPSE_GREATEST_UTC_ISO["luxor-2027"],
    titlePt: "Grande Eclipse do Norte da África & Luxor (2027)",
    titleEn: "Great North African & Luxor Total Solar Eclipse (2027)",
    shortLabelPt: "2027 · Egito/Luxor",
    shortLabelEn: "2027 · Egypt/Luxor",
    regionPt: "Estreito de Gibraltar · Magrebe · Luxor (Egito) · Mar Vermelho · Arábia",
    regionEn: "Strait of Gibraltar · Maghreb · Luxor (Egypt) · Red Sea · Arabia",
    saros: 136,
    gamma: 0.1421,
    magnitude: 1.079,
    maxDurationPt: "6 min 23 s",
    maxDurationEn: "6m 23s",
    umbraWidthKm: 258,
    greatestLat: 25.69,
    greatestLng: 32.64,
    windowMinutes: [-95, 95],
    centerline: [
      [31.0, -24.5],
      [35.95, -5.6],  // Estreito de Gibraltar (Tânger / Cádis)
      [36.4, 2.2],    // Norte da Argélia
      [34.74, 10.76], // Sfax, Tunísia
      [32.11, 20.07], // Benghazi, Líbia
      [25.69, 32.64], // Luxor, Egito (Greatest Eclipse — 6m 23s!)
      [21.49, 39.19], // Jidá / Meca, Arábia Saudita
      [15.35, 44.2],  // Sanaa, Iêmen
      [11.28, 49.18], // Chifre da África (Somália)
      [4.2, 58.5],
      [-2.5, 67.0],
    ],
    greatestCenterlineIndex: 5,
    summaryPt:
      "Membro do mesmo Saros 136 do eclipse de Sobral (1919): combina a Lua no perigeu com a Terra próxima ao afélio para produzir 6 min 23 s de totalidade diretamente sobre os templos de Luxor e Karnak sob céu desértico — o mais longo em terra firme no século XXI.",
    summaryEn:
      "Member of the same Saros 136 series as Sobral (1919): combines a perigee Moon with an aphelion Earth to deliver 6m 23s of totality directly above the temples of Luxor and Karnak under desert skies — the longest land totality of the 21st century.",
    countryIsos: ["ESP", "MAR", "DZA", "TUN", "LBY", "EGY", "SAU", "YEM", "SOM"],
    nasaUrl: "https://science.nasa.gov/eclipses/future-eclipses/",
  },
};

export const ECLIPSES_LIST: readonly EclipseCatalogEntry[] = Object.values(ECLIPSES_CATALOG);
