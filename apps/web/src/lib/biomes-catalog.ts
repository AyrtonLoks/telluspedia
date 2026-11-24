import { BRAZIL_BIOMES } from "./biomes-catalog-brazil";
import { GLOBAL_BIOMES, type BiomeEntry } from "./biomes-catalog-global";
import type { BiomeId, BiomeScope } from "./biomes-types";

export { GLOBAL_BIOMES, BRAZIL_BIOMES, type BiomeEntry };

export const ALL_BIOMES: readonly BiomeEntry<BiomeId>[] = [
  ...GLOBAL_BIOMES,
  ...BRAZIL_BIOMES,
];

export const BIOMES_BY_ID: Readonly<Record<BiomeId, BiomeEntry<BiomeId>>> = Object.fromEntries(
  ALL_BIOMES.map((entry) => [entry.id, entry])
) as Record<BiomeId, BiomeEntry<BiomeId>>;

export function getBiomesForScope(scope: BiomeScope): readonly BiomeEntry<BiomeId>[] {
  return scope === "brazil" ? BRAZIL_BIOMES : GLOBAL_BIOMES;
}

export function getBiomeById(id: BiomeId | null | undefined): BiomeEntry<BiomeId> | null {
  if (!id) return null;
  return BIOMES_BY_ID[id] ?? null;
}

export const BIOME_SCOPE_CITATIONS: Record<
  BiomeScope,
  { provider: string; labelPt: string; labelEn: string; url: string; license: string }
> = {
  global: {
    provider: "WWF / RESOLVE Ecoregions 2017",
    labelPt: "Dinerstein et al. (2017) · RESOLVE Ecoregions / WWF (14 biomas terrestres)",
    labelEn: "Dinerstein et al. (2017) · RESOLVE Ecoregions / WWF (14 terrestrial biomes)",
    url: "https://ecoregions.appspot.com/",
    license: "CC BY 4.0",
  },
  brazil: {
    provider: "IBGE — Biomas do Brasil (2019)",
    labelPt: "IBGE (2019) · Biomas e Sistema Costeiro-Marinho do Brasil (1:250.000)",
    labelEn: "IBGE (2019) · Biomes and Coastal-Marine System of Brazil (1:250,000)",
    url: "https://www.ibge.gov.br/geociencias/informacoes-ambientais/estudos-ambientais/15842-biomas.html",
    license: "Dados abertos IBGE",
  },
};
