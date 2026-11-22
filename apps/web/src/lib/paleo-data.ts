/**
 * TellusPedia — Datasets Paleogeográficos & Deriva Continental (RN11)
 *
 * Catálogo canônico de eras geológicas (Pangeia 250 Ma, Fragmentação 200 Ma,
 * Gondwana & Laurásia 150 Ma, Cretáceo K-Pg 66 Ma), metadados paleoclimáticos,
 * indicadores científicos quantitativos, placas tectônicas e utilitários geodésicos.
 *
 * Fontes primárias:
 * - Scotese, C. R. (2021) PALEOMAP Project
 * - Müller et al. (2016) GPlates / EarthByte Project
 * - Blackburn et al. (2013) Science
 * - Alvarez et al. (1980) / Schulte et al. (2010) Science
 */

import { PALEO_ERAS, GEOLOGICAL_ERAS } from "./paleo-eras";
import type { PaleoEraDefinition } from "./paleo-eras";
export { PALEO_ERAS, GEOLOGICAL_ERAS, PANGAEA_TECTONIC_PLATES } from "./paleo-eras";
export type { PaleoEraId, GeologicalEraCode, PaleoIndicator, PaleoCitation, TectonicPlateDefinition, PaleoEraDefinition, GeologicalEra } from "./paleo-eras";
export { PANGAEA_PLATE_ARCS, generatePaleoPangeaCanvas, generatePaleoGondwanaCanvas, generatePaleoCanvas } from "./paleo-canvas";
export type { PaleoPlateArc } from "./paleo-canvas";

/**
 * Resolução canônica de era paleogeográfica a partir da datação em Milhões de Anos (Ma).
 * Retorna null para a história humana (< 0.3 Ma = 300 mil anos atrás).
 */
export function resolvePaleoEra(ma: number | null): PaleoEraDefinition | null {
  if (ma === null || typeof ma !== "number" || !Number.isFinite(ma) || ma < 0.3) {
    return null;
  }

  if (ma >= 225) {
    return PALEO_ERAS["PANGEA_250MA"];
  }
  if (ma >= 175) {
    return PALEO_ERAS["BREAKUP_200MA"];
  }
  if (ma >= 100) {
    return PALEO_ERAS["GONDWANA_150MA"];
  }
  return PALEO_ERAS["KPG_66MA"];
}

/**
 * Alias direto para suporte ao plano técnico (retorna PaleoEraDefinition para qualquer Ma).
 */
export function resolveGeologicalEra(ageMa: number): PaleoEraDefinition {
  const era = resolvePaleoEra(ageMa);
  if (era) return era;
  if (typeof ageMa === "number" && ageMa > 250) return PALEO_ERAS["PANGEA_250MA"];
  return PALEO_ERAS["KPG_66MA"];
}

/**
 * Verifica se a escala geológica (paleogeográfica) está ativa.
 * Verdadeiro para idades superiores a 300.000 anos (0.3 Ma).
 */
export function isPaleoActive(ma: number | null): boolean {
  return typeof ma === "number" && Number.isFinite(ma) && ma >= 0.3;
}

/**
 * Recupera uma era paleogeográfica diretamente pelo seu identificador ou código.
 */
export function getPaleoEra(id: string | null | undefined): PaleoEraDefinition | null {
  if (!id) return null;
  const upper = id.toUpperCase().replace(/-/g, "_");
  if (upper in GEOLOGICAL_ERAS) {
    return GEOLOGICAL_ERAS[upper];
  }
  const lower = id.toLowerCase().replace(/_/g, "-");
  if (lower in PALEO_ERAS) {
    return PALEO_ERAS[lower];
  }
  // Resilient prefix / substring fallback
  if (upper.includes("PANGEA") || upper.includes("PANGAEA")) return PALEO_ERAS["PANGEA_250MA"];
  if (upper.includes("BREAKUP")) return PALEO_ERAS["BREAKUP_200MA"];
  if (upper.includes("GONDWANA") || upper.includes("LAURASIA")) return PALEO_ERAS["GONDWANA_150MA"];
  if (upper.includes("KPG") || upper.includes("CRETACEOUS")) return PALEO_ERAS["KPG_66MA"];
  return null;
}

