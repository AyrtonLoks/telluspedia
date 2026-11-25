import { create } from "zustand";
import { isObservatoryEnvelope, type ObservatoryMeta } from "@/lib/observatory-source";
import type { BiomeId } from "@/lib/biomes-types";
import type {
  IucnStatus,
  SpeciesOccurrencesPayload,
  TaxonGroup,
} from "@/lib/species-types";

export interface SpeciesState {
  selectedSpeciesId: string | null;
  hoveredSpeciesId: string | null;
  taxonFilter: TaxonGroup | "all";
  iucnFilter: IucnStatus | "all";
  biomeFilter: BiomeId | "all";
  countryFilter: string | "all";
  occurrencesByKey: Record<string, SpeciesOccurrencesPayload>;
  metaByKey: Record<string, ObservatoryMeta>;
  loadingKey: string | null;
  errorByKey: Record<string, boolean>;

  selectSpecies: (speciesId: string | null, countryIso2?: string | null) => void;
  setHoveredSpeciesId: (speciesId: string | null) => void;
  setTaxonFilter: (taxon: TaxonGroup | "all") => void;
  setIucnFilter: (status: IucnStatus | "all") => void;
  setBiomeFilter: (biome: BiomeId | "all") => void;
  setCountryFilter: (iso3: string | "all") => void;
  loadOccurrences: (speciesId: string, countryIso2?: string | null) => Promise<void>;
  resetSpecies: () => void;
}

export function speciesCacheKey(speciesId: string, countryIso2: string | null = null): string {
  return countryIso2 ? `${speciesId}:${countryIso2.toUpperCase()}` : speciesId;
}

export const useSpeciesStore = create<SpeciesState>((set, get) => ({
  selectedSpeciesId: null,
  hoveredSpeciesId: null,
  taxonFilter: "all",
  iucnFilter: "all",
  biomeFilter: "all",
  countryFilter: "all",
  occurrencesByKey: {},
  metaByKey: {},
  loadingKey: null,
  errorByKey: {},

  selectSpecies: (speciesId, countryIso2 = null) => {
    set({ selectedSpeciesId: speciesId });
    if (speciesId) {
      void get().loadOccurrences(speciesId, countryIso2);
    }
  },

  setHoveredSpeciesId: (hoveredSpeciesId) => set({ hoveredSpeciesId }),
  setTaxonFilter: (taxonFilter) => set({ taxonFilter }),
  setIucnFilter: (iucnFilter) => set({ iucnFilter }),
  setBiomeFilter: (biomeFilter) => set({ biomeFilter }),
  setCountryFilter: (countryFilter) => set({ countryFilter }),

  loadOccurrences: async (speciesId, countryIso2 = null) => {
    const key = speciesCacheKey(speciesId, countryIso2);
    const cur = get();
    if (cur.occurrencesByKey[key] && !cur.errorByKey[key]) return;
    if (cur.loadingKey === key) return;

    set({ loadingKey: key });
    try {
      const qs = new URLSearchParams({ speciesId });
      if (countryIso2) qs.set("country", countryIso2.toUpperCase());
      const res = await fetch(`/api/observatory/species?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: unknown = await res.json();
      if (
        isObservatoryEnvelope(body) &&
        body.data &&
        typeof body.data === "object" &&
        Array.isArray((body.data as SpeciesOccurrencesPayload).points)
      ) {
        const data = body.data as SpeciesOccurrencesPayload;
        set((s) => ({
          occurrencesByKey: { ...s.occurrencesByKey, [key]: data },
          metaByKey: { ...s.metaByKey, [key]: body.meta },
          errorByKey: { ...s.errorByKey, [key]: false },
        }));
      } else {
        throw new Error("Resposta GBIF inválida");
      }
    } catch {
      set((s) => ({
        errorByKey: { ...s.errorByKey, [key]: true },
        metaByKey: {
          ...s.metaByKey,
          [key]: {
            source: "fallback",
            provider: "GBIF indisponível (catálogo curado IUCN)",
            fetchedAt: new Date().toISOString(),
            stale: false,
            reason: "Servidor GBIF temporariamente inacessível; exibindo apenas dados curados IUCN.",
          },
        },
      }));
    } finally {
      if (get().loadingKey === key) {
        set({ loadingKey: null });
      }
    }
  },

  resetSpecies: () =>
    set({
      selectedSpeciesId: null,
      hoveredSpeciesId: null,
      taxonFilter: "all",
      iucnFilter: "all",
      biomeFilter: "all",
      countryFilter: "all",
    }),
}));
