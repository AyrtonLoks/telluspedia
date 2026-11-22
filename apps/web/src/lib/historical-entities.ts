import type { HistoricalEntity } from "./historical-entity-types";
import { EMPIRE_ENTITIES } from "./historical-entities-empires";
import { COLD_WAR_ENTITIES } from "./historical-entities-cold-war";
import {
  HISTORICAL_ERAS,
  resolveHistoricalEra,
  resolveEffectiveHistoricalYear,
  HISTORICAL_ENTITY_IDS,
  type HistoricalEraId,
  type HistoricalEraDefinition,
} from "./historical-eras";

export { HISTORICAL_ERAS, resolveHistoricalEra, resolveEffectiveHistoricalYear, HISTORICAL_ENTITY_IDS };
export type { HistoricalEraId, HistoricalEraDefinition };
export type { HistoricalEntity };

export const HISTORICAL_ENTITIES: Record<string, HistoricalEntity> = {
  PRU: EMPIRE_ENTITIES.PRU,
  SUN: COLD_WAR_ENTITIES.SUN,
  AHU: EMPIRE_ENTITIES.AHU,
  GDR: COLD_WAR_ENTITIES.GDR,
  FRG: COLD_WAR_ENTITIES.FRG,
  TUR_HIST: EMPIRE_ENTITIES.TUR_HIST,
  YUG: COLD_WAR_ENTITIES.YUG,
  CSK: COLD_WAR_ENTITIES.CSK,
};

const NUMERIC_ISO_LOOKUP: Record<string, string> = {
  "276": "DEU", "643": "RUS", "040": "AUT", "348": "HUN", "792": "TUR",
  "826": "GBR", "250": "FRA", "392": "JPN", "380": "ITA", "616": "POL",
  "703": "SVK", "203": "CZE", "688": "SRB", "191": "HRV", "705": "SVN",
  "070": "BIH", "807": "MKD", "499": "MNE", "076": "BRA", "840": "USA",
  "124": "CAN", "156": "CHN", "356": "IND", "036": "AUS", "032": "ARG",
};

export function resolveHistoricalEntity(iso: string, year: number | null | undefined): string {
  let upper = (iso || "").trim().toUpperCase();
  if (!upper) return "";

  if (NUMERIC_ISO_LOOKUP[upper]) {
    upper = NUMERIC_ISO_LOOKUP[upper];
  }

  const era = resolveHistoricalEra(year);

  // If already an explicit historical entity:
  if (HISTORICAL_ENTITIES[upper]) {
    const h = HISTORICAL_ENTITIES[upper];
    // In contemporary era, extinct entity smoothly resolves to modern sovereign successor
    if (era.id === "CONTEMPORARY") {
      return h.successorIsos?.[0] || upper;
    }

    const y = year ?? era.representativeYear;
    // Entity is active during the requested historical year / era
    if (y >= h.startYear && y <= h.endYear) {
      return upper;
    }

    // Historical year is after entity's dissolution: resolve forward through successor
    if (y > h.endYear) {
      const succ = h.successorIsos?.[0] || upper;
      return resolveHistoricalEntity(succ, year);
    }

    // Historical year is before entity's creation: resolve backward through predecessor
    if (y < h.startYear) {
      const pred = h.predecessorIsos?.[0] || h.successorIsos?.[0] || upper;
      return resolveHistoricalEntity(pred, year);
    }

    return upper;
  }

  if (era.id === "CONTEMPORARY") {
    return upper;
  }

  if (era.id === "PRUSSIA_1870") {
    if (upper === "DEU") return "PRU";
    if (["AUT", "HUN", "CZE", "SVK", "SVN", "HRV", "BIH"].includes(upper)) return "AHU";
    if (["TUR", "SYR", "IRQ", "JOR", "LBN", "ISR", "PSE", "CYP", "CYN"].includes(upper)) return "TUR_HIST";
    if ([
      "RUS", "UKR", "BLR", "FIN", "EST", "LVA", "LTU", "POL",
      "KAZ", "UZB", "TKM", "KGZ", "TJK", "GEO", "ARM", "AZE", "MDA"
    ].includes(upper)) return "RUS";
    if (upper === "IRL") return "GBR";
    return upper;
  }

  if (era.id === "WW1_1914") {
    if (["AUT", "HUN", "CZE", "SVK", "SVN", "HRV", "BIH"].includes(upper)) return "AHU";
    if (["TUR", "SYR", "IRQ", "JOR", "LBN", "ISR", "PSE"].includes(upper)) return "TUR_HIST";
    if ([
      "RUS", "UKR", "BLR", "FIN", "EST", "LVA", "LTU", "POL",
      "KAZ", "UZB", "TKM", "KGZ", "TJK", "GEO", "ARM", "AZE", "MDA"
    ].includes(upper)) return "RUS";
    if (upper === "IRL") return "GBR";
    return upper;
  }

  if (era.id === "WW2_1939") {
    if (["AUT", "CZE"].includes(upper)) return "DEU";
    if (upper === "ALB") return "ITA";
    if (["KOR", "PRK", "TWN"].includes(upper)) return "JPN";
    if ([
      "RUS", "UKR", "BLR", "KAZ", "UZB", "TKM", "KGZ", "TJK",
      "GEO", "ARM", "AZE"
    ].includes(upper)) {
      return "SUN";
    }
    return upper;
  }

  if (era.id === "COLD_WAR_1969") {
    if ([
      "RUS", "UKR", "BLR", "KAZ", "UZB", "TKM", "KGZ", "TJK",
      "GEO", "ARM", "AZE", "MDA", "EST", "LVA", "LTU"
    ].includes(upper)) {
      return "SUN";
    }
    if (["SRB", "HRV", "SVN", "BIH", "MKD", "MNE", "XKX"].includes(upper)) {
      return "YUG";
    }
    if (["CZE", "SVK"].includes(upper)) {
      return "CSK";
    }
    if (upper === "DEU") return "FRG";
    return upper;
  }

  return upper;
}

export function findHistoricalEntity(id: string): HistoricalEntity | undefined {
  const upper = (id || "").toUpperCase();
  return HISTORICAL_ENTITIES[upper];
}

