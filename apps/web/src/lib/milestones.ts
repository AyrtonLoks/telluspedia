/**
 * Marcos da linha do tempo (T35): o que a barra inicial precisa, sem os dossiês e indicadores de
 * `country-data.ts`. Os marcos vêm das cenas em `src/data/scenes/` (D12b); `country-data.ts`
 * re-exporta tudo daqui para manter os imports antigos.
 */
import { countryMilestones, globalMilestones } from "./scenes/catalog";

export interface MilestoneItem {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: "POLITICS_REGIMES" | "ECONOMY" | "WAR_MILITARY" | "SCIENCE_CULTURE" | "HEALTH_PANDEMICS";
  sourcePrimary: string;
  latitude?: number;
  longitude?: number;
  countryIso?: string;
  blocIsos?: string[];
  preferredAltitude?: number;
}

/** Países piloto, com dossiê e marcos próprios (as chaves de `PILOT_COUNTRIES`; um teste garante). */
export const PILOT_COUNTRY_ISOS = ["BRA", "DEU", "USA", "JPN", "ZAF", "EGY"] as const;

/** Marcos globais — sempre na linha do tempo. */
export const GLOBAL_MILESTONES: MilestoneItem[] = globalMilestones();

const countryCache = new Map<string, MilestoneItem[]>();

/** Marcos de um país piloto (vazio para os demais). */
export function getCountryMilestones(iso: string): MilestoneItem[] {
  if (!(PILOT_COUNTRY_ISOS as readonly string[]).includes(iso)) return [];
  let list = countryCache.get(iso);
  if (!list) countryCache.set(iso, (list = countryMilestones(iso)));
  return list;
}

export function findMilestoneById(id: string): MilestoneItem | undefined {
  const global = GLOBAL_MILESTONES.find((m) => m.id === id);
  if (global) return global;
  for (const iso of PILOT_COUNTRY_ISOS) {
    const found = getCountryMilestones(iso).find((m) => m.id === id);
    if (found) return { ...found, countryIso: found.countryIso || iso };
  }
  return undefined;
}
