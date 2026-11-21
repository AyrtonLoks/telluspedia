/**
 * Eras históricas (T35): definição das eras e resolução do ano efetivo, sem as entidades
 * históricas (fronteiras, dossiês) de `historical-entities.ts`, que re-exporta tudo daqui.
 */
export type HistoricalEraId =
  | "CONTEMPORARY"
  | "COLD_WAR_1969"
  | "WW2_1939"
  | "WW1_1914"
  | "PRUSSIA_1870";

export interface HistoricalEraDefinition {
  id: HistoricalEraId;
  label: string;
  startYear: number;
  endYear: number;
  representativeYear: number;
  topoJsonPath: string;
  description: string;
}

export const HISTORICAL_ERAS: Record<HistoricalEraId, HistoricalEraDefinition> = {
  CONTEMPORARY: {
    id: "CONTEMPORARY",
    label: "Era Contemporânea",
    startYear: 1991,
    endYear: 2026,
    representativeYear: 2024,
    topoJsonPath: "",
    description: "Ordem geopolítica pós-Guerra Fria e globalização multipolar.",
  },
  COLD_WAR_1969: {
    id: "COLD_WAR_1969",
    label: "Guerra Fria & Corrida Espacial (1969)",
    startYear: 1946,
    endYear: 1990,
    representativeYear: 1969,
    topoJsonPath: "/data/history/borders-1969.json",
    description: "Bipolaridade ideológica, União Soviética, Alemanha dividida (RDA/RFA) e a missão Apollo 11 à Lua.",
  },
  WW2_1939: {
    id: "WW2_1939",
    label: "Segunda Guerra Mundial (1939)",
    startYear: 1926,
    endYear: 1945,
    representativeYear: 1939,
    topoJsonPath: "/data/history/borders-1939.json",
    description: "Auge do expansionismo totalitário, Terceiro Reich, União Soviética e a Segunda República Polonesa.",
  },
  WW1_1914: {
    id: "WW1_1914",
    label: "Primeira Guerra Mundial (1914)",
    startYear: 1891,
    endYear: 1925,
    representativeYear: 1914,
    topoJsonPath: "/data/history/borders-1914.json",
    description: "Choque dos grandes impérios europeus: Império Alemão, Áustria-Hungria, Império Russo e Império Otomano.",
  },
  PRUSSIA_1870: {
    id: "PRUSSIA_1870",
    label: "Unificação Alemã & Reino da Prússia (1870)",
    startYear: 1800,
    endYear: 1890,
    representativeYear: 1870,
    topoJsonPath: "/data/history/borders-1870.json",
    description: "Hegemonia do Reino da Prússia, Confederação da Alemanha do Norte, Guerra Franco-Prussiana e fundação do Império Alemão.",
  },
};

export function resolveHistoricalEra(year: number | null | undefined): HistoricalEraDefinition {
  if (year === null || year === undefined || year >= 1991) {
    return HISTORICAL_ERAS.CONTEMPORARY;
  }
  if (year >= 1946 && year <= 1990) {
    return HISTORICAL_ERAS.COLD_WAR_1969;
  }
  if (year >= 1926 && year <= 1945) {
    return HISTORICAL_ERAS.WW2_1939;
  }
  if (year >= 1891 && year <= 1925) {
    return HISTORICAL_ERAS.WW1_1914;
  }
  return HISTORICAL_ERAS.PRUSSIA_1870;
}

export function resolveEffectiveHistoricalYear(params: {
  selectedYear?: number | null;
  milestoneYear?: number | null;
  startYear?: number | null;
  endYear?: number | null;
}): number | null {
  const { selectedYear, milestoneYear, startYear, endYear } = params;

  if (selectedYear !== null && selectedYear !== undefined) {
    return selectedYear;
  }

  if (milestoneYear !== null && milestoneYear !== undefined) {
    return milestoneYear;
  }

  if (
    startYear !== null &&
    startYear !== undefined &&
    endYear !== null &&
    endYear !== undefined
  ) {
    // Prussia & 19th Century (<= 1890)
    if (endYear <= 1890) {
      return startYear <= 1870 ? 1870 : startYear;
    }
    // World Wars preset / interval: 1914 - 1945
    if (startYear <= 1914 && endYear <= 1945 && endYear >= 1939) {
      return 1939;
    }
    // WWI era
    if (endYear <= 1925 && startYear >= 1891) {
      return 1914;
    }
    // WWII era
    if (endYear <= 1945 && startYear >= 1926) {
      return 1939;
    }
    // Cold War preset / interval: 1946/1947 - 1990/1991
    if (endYear <= 1991 && startYear >= 1945) {
      return 1969;
    }
  }

  return null;
}

/** Ids das entidades históricas (as chaves de `HISTORICAL_ENTITIES`; um teste garante). */
export const HISTORICAL_ENTITY_IDS = ["PRU", "SUN", "AHU", "GDR", "FRG", "TUR_HIST", "YUG", "CSK"] as const;
