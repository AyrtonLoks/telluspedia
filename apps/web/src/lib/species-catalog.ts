import { SOUTH_AMERICA_SPECIES } from "./species-catalog-brazil";
import { GLOBAL_SPECIES } from "./species-catalog-global";
import type { BiomeId } from "./biomes-types";
import type { IucnStatus, SpeciesCatalogEntry, TaxonGroup } from "./species-types";

export const SPECIES_CATALOG: readonly SpeciesCatalogEntry[] = [
  ...SOUTH_AMERICA_SPECIES,
  ...GLOBAL_SPECIES,
];

export const SPECIES_BY_ID: Readonly<Record<string, SpeciesCatalogEntry>> = Object.fromEntries(
  SPECIES_CATALOG.map((item) => [item.id, item])
);

export const SPECIES_BY_TAXON_KEY: ReadonlyMap<number, SpeciesCatalogEntry> = new Map(
  SPECIES_CATALOG.map((item) => [item.gbifTaxonKey, item])
);

export interface IucnStatusMeta {
  code: IucnStatus;
  labelPt: string;
  labelEn: string;
  /** Cor acessível para marcador 3D WebGL (D14 usa tokens semânticos na UI). */
  hex: string;
  tone: "danger" | "warning" | "accent" | "success" | "neutral";
}

export const IUCN_STATUS_META: Record<IucnStatus, IucnStatusMeta> = {
  CR: {
    code: "CR",
    labelPt: "Criticamente em Perigo",
    labelEn: "Critically Endangered",
    hex: "#ef4444",
    tone: "danger",
  },
  EN: {
    code: "EN",
    labelPt: "Em Perigo",
    labelEn: "Endangered",
    hex: "#f97316",
    tone: "warning",
  },
  VU: {
    code: "VU",
    labelPt: "Vulnerável",
    labelEn: "Vulnerable",
    hex: "#eab308",
    tone: "warning",
  },
  NT: {
    code: "NT",
    labelPt: "Quase Ameaçada",
    labelEn: "Near Threatened",
    hex: "#84cc16",
    tone: "accent",
  },
  LC: {
    code: "LC",
    labelPt: "Pouco Preocupante",
    labelEn: "Least Concern",
    hex: "#10b981",
    tone: "success",
  },
};

export const TAXON_GROUP_META: Record<TaxonGroup, { labelPt: string; labelEn: string }> = {
  mammals: { labelPt: "Mamíferos", labelEn: "Mammals" },
  birds: { labelPt: "Aves", labelEn: "Birds" },
  reptiles: { labelPt: "Répteis", labelEn: "Reptiles" },
  amphibians: { labelPt: "Anfíbios", labelEn: "Amphibians" },
  marine: { labelPt: "Marinhos / Aquáticos", labelEn: "Marine / Aquatic" },
};

export interface SpeciesFilters {
  taxonGroup?: TaxonGroup | "all";
  iucnStatus?: IucnStatus | "all";
  biomeId?: BiomeId | "all";
  countryIso3?: string | "all";
}

export function filterSpeciesCatalog(filters: SpeciesFilters): SpeciesCatalogEntry[] {
  const {
    taxonGroup = "all",
    iucnStatus = "all",
    biomeId = "all",
    countryIso3 = "all",
  } = filters;
  const isoUpper = countryIso3 !== "all" ? countryIso3.toUpperCase() : "all";

  return SPECIES_CATALOG.filter((sp) => {
    if (taxonGroup !== "all" && sp.taxonGroup !== taxonGroup) return false;
    if (iucnStatus !== "all" && sp.iucnStatus !== iucnStatus) return false;
    if (biomeId !== "all" && !sp.biomeIds.includes(biomeId)) return false;
    if (isoUpper !== "all" && !sp.countries.includes(isoUpper)) return false;
    return true;
  });
}

export function getSpeciesById(id: string | null | undefined): SpeciesCatalogEntry | null {
  if (!id) return null;
  return SPECIES_BY_ID[id] ?? null;
}

export function getSpeciesForCountry(iso3: string | null | undefined): SpeciesCatalogEntry[] {
  if (!iso3) return [];
  const code = iso3.toUpperCase();
  return SPECIES_CATALOG.filter((sp) => sp.countries.includes(code));
}

export function getSpeciesForBiome(biomeId: BiomeId): SpeciesCatalogEntry[] {
  return SPECIES_CATALOG.filter((sp) => sp.biomeIds.includes(biomeId));
}
