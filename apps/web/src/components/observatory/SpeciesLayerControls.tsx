"use client";

import React, { useMemo } from "react";
import { Filter, Globe, PawPrint, RotateCcw } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useSpeciesStore } from "@/stores/speciesStore";
import {
  IUCN_STATUS_META,
  SPECIES_CATALOG,
  TAXON_GROUP_META,
  filterSpeciesCatalog,
} from "@/lib/species-catalog";
import {
  IUCN_STATUS_CODES,
  TAXON_GROUPS,
  type IucnStatus,
  type TaxonGroup,
} from "@/lib/species-types";
import { BRAZIL_BIOMES, getBiomeById } from "@/lib/biomes-catalog";
import type { BiomeId } from "@/lib/biomes-types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

const QUICK_BIOME_FILTERS: readonly BiomeId[] = [
  ...BRAZIL_BIOMES.map((b) => b.id),
  "WWF_01",
  "WWF_07",
  "WWF_10",
  "WWF_11",
];

/**
 * Controles D14 do Mapa de Espécies Animais & Biodiversidade (D32 / RN13.7):
 * - Filtros por grupo taxonômico, status oficial IUCN Red List, bioma (D31) e país selecionado.
 * - Lista interativa bilíngue que seleciona a espécie, consulta ocorrências reais GBIF e foca a câmera.
 */
export const SpeciesLayerControls: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useSpeciesStore.getState() : null;

  const storeSelectedId = useSpeciesStore((s) => s.selectedSpeciesId);
  const storeTaxon = useSpeciesStore((s) => s.taxonFilter);
  const storeIucn = useSpeciesStore((s) => s.iucnFilter);
  const storeBiome = useSpeciesStore((s) => s.biomeFilter);
  const storeCountry = useSpeciesStore((s) => s.countryFilter);

  const selectSpecies = useSpeciesStore((s) => s.selectSpecies);
  const setTaxonFilter = useSpeciesStore((s) => s.setTaxonFilter);
  const setIucnFilter = useSpeciesStore((s) => s.setIucnFilter);
  const setBiomeFilter = useSpeciesStore((s) => s.setBiomeFilter);
  const setCountryFilter = useSpeciesStore((s) => s.setCountryFilter);
  const resetSpecies = useSpeciesStore((s) => s.resetSpecies);

  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);

  const selectedId = ssr ? ssr.selectedSpeciesId : storeSelectedId;
  const taxonFilter = ssr ? ssr.taxonFilter : storeTaxon;
  const iucnFilter = ssr ? ssr.iucnFilter : storeIucn;
  const biomeFilter = ssr ? ssr.biomeFilter : storeBiome;
  const countryFilter = ssr ? ssr.countryFilter : storeCountry;

  const filtered = useMemo(
    () =>
      filterSpeciesCatalog({
        taxonGroup: taxonFilter,
        iucnStatus: iucnFilter,
        biomeId: biomeFilter,
        countryIso3: countryFilter,
      }),
    [taxonFilter, iucnFilter, biomeFilter, countryFilter]
  );

  const hasActiveFilter =
    taxonFilter !== "all" ||
    iucnFilter !== "all" ||
    biomeFilter !== "all" ||
    countryFilter !== "all";

  const handleToggleSpecies = (id: string) => {
    if (selectedId === id) {
      selectSpecies(null);
      return;
    }
    setSelectedEntity(null);
    selectSpecies(id);
    const sp = SPECIES_CATALOG.find((item) => item.id === id);
    if (sp) {
      flyTo(sp.centerLat, sp.centerLng, 2.05);
    }
  };

  return (
    <div data-testid="species-layer-controls" className="space-y-3">
      {/* Filtro por Grupo Taxonômico */}
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 text-caption font-medium text-fg">
          <Filter aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          {t("obs.species.taxonLabel", "Grupo taxonômico")}
        </span>
        <div
          role="group"
          aria-label={t("obs.species.taxonLabel", "Grupo taxonômico")}
          className="flex flex-wrap gap-1"
        >
          <button
            type="button"
            data-testid="species-taxon-all"
            aria-pressed={taxonFilter === "all"}
            onClick={() => setTaxonFilter("all")}
            className={cn(
              "rounded-control border px-2 py-0.5 text-caption transition-colors duration-fast ease-out",
              taxonFilter === "all"
                ? "border-accent/50 bg-accent/15 font-medium text-accent"
                : "border-line bg-surface text-fg-secondary hover:text-fg"
            )}
          >
            {t("obs.species.all", "Todos")}
          </button>
          {TAXON_GROUPS.map((group: TaxonGroup) => {
            const active = taxonFilter === group;
            return (
              <button
                key={group}
                type="button"
                data-testid={`species-taxon-${group}`}
                aria-pressed={active}
                onClick={() => setTaxonFilter(active ? "all" : group)}
                className={cn(
                  "rounded-control border px-2 py-0.5 text-caption transition-colors duration-fast ease-out",
                  active
                    ? "border-accent/50 bg-accent/15 font-medium text-accent"
                    : "border-line bg-surface text-fg-secondary hover:text-fg"
                )}
              >
                {locale === "en"
                  ? TAXON_GROUP_META[group].labelEn
                  : TAXON_GROUP_META[group].labelPt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtro por Status Oficial IUCN Red List */}
      <div className="space-y-1">
        <span className="block text-caption font-medium text-fg">
          {t("obs.species.iucnLabel", "Categoria IUCN Red List")}
        </span>
        <div
          role="group"
          aria-label={t("obs.species.iucnLabel", "Categoria IUCN Red List")}
          className="grid grid-cols-6 gap-1 rounded-control border border-line bg-surface p-0.5"
        >
          <button
            type="button"
            data-testid="species-iucn-all"
            aria-pressed={iucnFilter === "all"}
            onClick={() => setIucnFilter("all")}
            className={cn(
              "h-7 rounded-control text-caption font-medium transition-colors duration-fast ease-out",
              iucnFilter === "all"
                ? "bg-accent/15 text-accent"
                : "text-fg-secondary hover:text-fg"
            )}
          >
            {t("obs.species.allShort", "Tudo")}
          </button>
          {IUCN_STATUS_CODES.map((code: IucnStatus) => {
            const active = iucnFilter === code;
            const meta = IUCN_STATUS_META[code];
            return (
              <button
                key={code}
                type="button"
                data-testid={`species-iucn-${code}`}
                aria-pressed={active}
                title={locale === "en" ? meta.labelEn : meta.labelPt}
                onClick={() => setIucnFilter(active ? "all" : code)}
                className={cn(
                  "h-7 rounded-control font-mono text-caption font-semibold transition-colors duration-fast ease-out",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-fg-secondary hover:text-fg"
                )}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtro por Bioma (integração D31) + País selecionado */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="species-biome-select"
            className="text-caption font-medium text-fg"
          >
            {t("obs.species.biomeLabel", "Bioma (D31)")}
          </label>
          {selectedIso && (
            <button
              type="button"
              data-testid="species-country-filter-toggle"
              aria-pressed={countryFilter === selectedIso}
              onClick={() =>
                setCountryFilter(countryFilter === selectedIso ? "all" : selectedIso)
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-control border px-2 py-0.5 font-mono text-caption transition-colors duration-fast ease-out",
                countryFilter === selectedIso
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-secondary hover:text-fg"
              )}
            >
              <Globe aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span>{selectedIso}</span>
            </button>
          )}
        </div>
        <select
          id="species-biome-select"
          data-testid="species-biome-select"
          value={biomeFilter}
          onChange={(e) => setBiomeFilter(e.target.value as BiomeId | "all")}
          className="h-8 w-full rounded-control border border-line bg-surface px-2 text-caption text-fg focus:border-accent focus:outline-none"
        >
          <option value="all">
            {t("obs.species.allBiomes", "Todos os biomas (Global & Brasil)")}
          </option>
          {QUICK_BIOME_FILTERS.map((bId) => {
            const biome = getBiomeById(bId);
            if (!biome) return null;
            return (
              <option key={bId} value={bId}>
                {biome.scope === "brazil" ? "BR · " : "WWF · "}
                {locale === "en" ? biome.nameEn : biome.namePt}
              </option>
            );
          })}
        </select>
      </div>

      {/* Lista de espécies filtradas */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-caption text-fg-secondary">
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <PawPrint aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            {t("obs.species.catalogTitle", "Fauna catalogada")}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-fg-muted">
              {filtered.length}/{SPECIES_CATALOG.length}
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                data-testid="species-reset-filters"
                onClick={resetSpecies}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <RotateCcw aria-hidden="true" className="h-3 w-3" />
                <span>{t("obs.species.clearFilters", "Limpar")}</span>
              </button>
            )}
          </div>
        </div>

        <div
          data-testid="species-list"
          className="max-h-52 space-y-1 overflow-y-auto rounded-card border border-line bg-surface p-1.5"
        >
          {filtered.length === 0 ? (
            <p className="p-2 text-caption text-fg-muted">
              {t(
                "obs.species.emptyFilter",
                "Nenhuma espécie catalogada corresponde a esta combinação de filtros."
              )}
            </p>
          ) : (
            filtered.map((sp) => {
              const active = selectedId === sp.id;
              const iucn = IUCN_STATUS_META[sp.iucnStatus];
              return (
                <button
                  key={sp.id}
                  type="button"
                  data-testid={`species-item-${sp.id}`}
                  aria-pressed={active}
                  onClick={() => handleToggleSpecies(sp.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-control border px-2 py-1.5 text-left transition-colors duration-fast ease-out",
                    active
                      ? "border-accent/50 bg-accent/15 text-fg"
                      : "border-transparent bg-surface-raised/50 text-fg-secondary hover:border-line hover:text-fg"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-caption font-medium text-fg">
                      {locale === "en" ? sp.commonNameEn : sp.commonNamePt}
                    </p>
                    <p className="truncate text-caption italic text-fg-muted">
                      {sp.scientificName}
                    </p>
                  </div>
                  <Badge tone={iucn.tone}>{sp.iucnStatus}</Badge>
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="text-caption text-fg-muted">
        {t(
          "obs.species.sourceFootnote",
          "Ocorrências georreferenciadas: GBIF API v1 (CC0 / CC BY 4.0) · Status: IUCN Red List."
        )}
      </p>
    </div>
  );
};
