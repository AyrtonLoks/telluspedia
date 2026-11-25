"use client";

import React from "react";
import {
  Crosshair,
  ExternalLink,
  Leaf,
  PawPrint,
  X,
} from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { speciesCacheKey, useSpeciesStore } from "@/stores/speciesStore";
import {
  IUCN_STATUS_META,
  TAXON_GROUP_META,
  getSpeciesById,
} from "@/lib/species-catalog";
import { getBiomeById } from "@/lib/biomes-catalog";
import type { BiomeId } from "@/lib/biomes-types";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { DataSourceBadge } from "./DataSourceBadge";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

/**
 * Overlay flutuante D14 do Mapa de Espécies & Biodiversidade (D32 / RN13.7):
 * - Pílula ao vivo no topo ao passar o cursor sobre qualquer marcador de espécie no globo.
 * - Ficha biológica flutuante no canto inferior esquerdo com ocorrências reais GBIF (selo T05),
 *   categoria oficial IUCN Red List, biomas D31 clicáveis e fontes diretas (RN02).
 */
export const SpeciesHudOverlay: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useSpeciesStore.getState() : null;

  const storeSelectedId = useSpeciesStore((s) => s.selectedSpeciesId);
  const storeHoveredId = useSpeciesStore((s) => s.hoveredSpeciesId);
  const storeOccurrences = useSpeciesStore((s) => s.occurrencesByKey);
  const storeMeta = useSpeciesStore((s) => s.metaByKey);
  const storeLoadingKey = useSpeciesStore((s) => s.loadingKey);
  const storeError = useSpeciesStore((s) => s.errorByKey);
  const selectSpecies = useSpeciesStore((s) => s.selectSpecies);

  const selectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const setLayerActive = useObservatoryStore((s) => s.setLayerActive);
  const setBiomeScope = useObservatoryStore((s) => s.setBiomeScope);
  const setBiomeFilterId = useObservatoryStore((s) => s.setBiomeFilterId);
  const setSelectedBiomeId = useObservatoryStore((s) => s.setSelectedBiomeId);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const selectedId = ssr ? ssr.selectedSpeciesId : storeSelectedId;
  const hoveredId = ssr ? ssr.hoveredSpeciesId : storeHoveredId;
  const occurrencesByKey = ssr ? ssr.occurrencesByKey : storeOccurrences;
  const metaByKey = ssr ? ssr.metaByKey : storeMeta;
  const loadingKey = ssr ? ssr.loadingKey : storeLoadingKey;
  const errorByKey = ssr ? ssr.errorByKey : storeError;

  const hoveredSpecies = getSpeciesById(hoveredId);
  const selectedSpecies = getSpeciesById(selectedId);

  const handleOpenBiome = (biomeId: BiomeId) => {
    const biome = getBiomeById(biomeId);
    if (!biome) return;
    setBiomeScope(biome.scope);
    setBiomeFilterId(biome.id);
    setSelectedBiomeId(biome.id);
    setLayerActive("BIOMES_MAP", true);
    flyTo(biome.centerLat, biome.centerLng, biome.zoomAltitude);
  };

  const cacheKey = selectedSpecies ? speciesCacheKey(selectedSpecies.id) : null;
  const occPayload = cacheKey ? occurrencesByKey[cacheKey] ?? null : null;
  const occMeta = cacheKey ? metaByKey[cacheKey] ?? null : null;
  const isOccLoading = cacheKey !== null && loadingKey === cacheKey;
  const isOccOffline = cacheKey !== null && Boolean(errorByKey[cacheKey]);

  return (
    <>
      {hoveredSpecies && (
        <div
          data-testid="species-hover-pill"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-[var(--map-tools-top)] z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-panel border border-line bg-surface/86 px-3 py-1.5 text-caption text-fg shadow-e1 backdrop-blur-md"
        >
          <Badge tone={IUCN_STATUS_META[hoveredSpecies.iucnStatus].tone}>
            {hoveredSpecies.iucnStatus}
          </Badge>
          <span className="truncate font-medium">
            {locale === "en" ? hoveredSpecies.commonNameEn : hoveredSpecies.commonNamePt}
          </span>
          <span className="truncate italic text-fg-muted">
            {hoveredSpecies.scientificName}
          </span>
        </div>
      )}

      {selectedSpecies && !selectedEntity && (
        <Panel
          data-testid="species-floating-card"
          className="fixed bottom-[var(--map-overlay-bottom)] left-3 z-30 max-h-[var(--map-overlay-height)] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto xl:left-6"
        >
          <PanelHeader
            headingLevel={3}
            title={
              locale === "en"
                ? selectedSpecies.commonNameEn
                : selectedSpecies.commonNamePt
            }
            subtitle={`${selectedSpecies.scientificName} · ${selectedSpecies.family}`}
            icon={<PawPrint className="text-accent" />}
            className="px-4 py-3"
            actions={
              <IconButton
                label={t("obs.species.closeCard", "Fechar ficha biológica")}
                icon={<X />}
                size="sm"
                onClick={() => selectSpecies(null)}
              />
            }
          />

          <div className="space-y-3 p-4">
            {/* Categoria oficial IUCN Red List + Grupo taxonômico */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                tone={IUCN_STATUS_META[selectedSpecies.iucnStatus].tone}
                data-testid="species-iucn-badge"
              >
                IUCN {selectedSpecies.iucnStatus} ·{" "}
                {locale === "en"
                  ? IUCN_STATUS_META[selectedSpecies.iucnStatus].labelEn
                  : IUCN_STATUS_META[selectedSpecies.iucnStatus].labelPt}
              </Badge>
              <Badge tone="neutral">
                {locale === "en"
                  ? TAXON_GROUP_META[selectedSpecies.taxonGroup].labelEn
                  : TAXON_GROUP_META[selectedSpecies.taxonGroup].labelPt}
              </Badge>
            </div>

            {/* Ocorrências reais georreferenciadas GBIF + selo T05 */}
            <div
              data-testid="species-gbif-status"
              className="space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5 text-caption"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg">
                  {t("obs.species.gbifTitle", "Registros georreferenciados (GBIF)")}
                </span>
                {occMeta && (
                  <DataSourceBadge
                    testId="species-gbif-source-badge"
                    meta={occMeta}
                    isLoading={isOccLoading}
                    isOffline={isOccOffline}
                  />
                )}
              </div>
              {isOccLoading ? (
                <p className="text-fg-muted">
                  {t("obs.species.gbifLoading", "Consultando ocorrências na API do GBIF…")}
                </p>
              ) : occPayload && occPayload.points.length > 0 ? (
                <p className="font-mono tabular-nums text-fg-secondary">
                  {formatNumber(occPayload.totalGbifCount, locale)}{" "}
                  {t("obs.species.gbifTotal", "registros globais")} ·{" "}
                  {formatNumber(occPayload.sampledCount, locale)}{" "}
                  {t("obs.species.gbifPlotted", "no globo")}
                </p>
              ) : (
                <p className="text-warning">
                  {t(
                    "obs.species.gbifUnavailable",
                    "Ocorrências GBIF indisponíveis no momento; exibindo distribuição e ficha oficial IUCN."
                  )}
                </p>
              )}
            </div>

            {/* Ação rápida de foco na espécie */}
            <button
              type="button"
              data-testid="species-floating-focus"
              onClick={() =>
                flyTo(selectedSpecies.centerLat, selectedSpecies.centerLng, 2.05)
              }
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-control border border-line bg-surface-raised px-2.5 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:border-accent/40 hover:text-accent"
            >
              <Crosshair aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{t("obs.species.focusSpecies", "Focar espécie no globo")}</span>
            </button>

            {/* Ficha biológica bilíngue */}
            <dl className="space-y-2 rounded-card border border-line bg-surface-raised p-3 text-caption">
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.species.conservation", "População e conservação")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en"
                    ? selectedSpecies.populationNoteEn
                    : selectedSpecies.populationNotePt}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.species.habitat", "Habitat")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en"
                    ? selectedSpecies.habitatEn
                    : selectedSpecies.habitatPt}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.species.threats", "Principais ameaças")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en"
                    ? selectedSpecies.threatsEn
                    : selectedSpecies.threatsPt}
                </dd>
              </div>
            </dl>

            {/* Biomas associados (integração direta com D31) */}
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1 text-caption font-medium text-fg-secondary">
                <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                {t("obs.species.biomesLinked", "Biomas associados (ver no globo)")}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedSpecies.biomeIds.slice(0, 4).map((bId) => {
                  const biome = getBiomeById(bId);
                  if (!biome) return null;
                  return (
                    <button
                      key={bId}
                      type="button"
                      data-testid={`species-open-biome-${bId}`}
                      onClick={() => handleOpenBiome(bId)}
                      className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-0.5 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:border-accent/40 hover:text-accent"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: biome.hex }}
                      />
                      <span>{locale === "en" ? biome.nameEn : biome.namePt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Links diretos oficiais IUCN Red List + GBIF (RN02) */}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-caption text-fg-muted">
              <a
                href={selectedSpecies.iucnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <span>IUCN Red List</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
              </a>
              <a
                href={occPayload?.gbifSearchUrl ?? selectedSpecies.gbifUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <span>GBIF #{selectedSpecies.gbifTaxonKey}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
};
