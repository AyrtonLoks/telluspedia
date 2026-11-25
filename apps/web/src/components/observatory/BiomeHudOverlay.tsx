"use client";

import React from "react";
import {
  Crosshair,
  ExternalLink,
  Eye,
  Flame,
  Leaf,
  Satellite,
  Trees,
  X,
} from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { getBiomeById } from "@/lib/biomes-catalog";
import { IconButton } from "@/components/ui/IconButton";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

/**
 * Overlay flutuante D14 do Mapa dos Biomas (D31):
 * 1. Pílula ao vivo no topo ao passar o cursor sobre qualquer bioma no globo (< 0,2 ms).
 * 2. Cartão ecológico flutuante (canto inferior esquerdo) ao clicar/inspecionar um bioma,
 *    sem exigir rolagem no painel lateral e cedendo espaço quando uma telemetria (ex.: FIRMS) está aberta.
 */
export const BiomeHudOverlay: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const storeSelectedId = useObservatoryStore((s) => s.selectedBiomeId);
  const storeHoveredId = useObservatoryStore((s) => s.hoveredBiomeId);
  const storeFilterId = useObservatoryStore((s) => s.biomeFilterId);
  const storeScope = useObservatoryStore((s) => s.biomeScope);
  const storeSelectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const storeActiveLayers = useObservatoryStore((s) => s.activeLayers);
  const storeFireSource = useObservatoryStore((s) => s.fireSource);
  const storeGibsProduct = useObservatoryStore((s) => s.gibsProduct);

  const setSelectedBiomeId = useObservatoryStore((s) => s.setSelectedBiomeId);
  const setBiomeFilterId = useObservatoryStore((s) => s.setBiomeFilterId);
  const setLayerActive = useObservatoryStore((s) => s.setLayerActive);
  const setFireSource = useObservatoryStore((s) => s.setFireSource);
  const setProdesBiome = useObservatoryStore((s) => s.setProdesBiome);
  const setGibsRequest = useObservatoryStore((s) => s.setGibsRequest);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const selectedId = ssr ? ssr.selectedBiomeId : storeSelectedId;
  const hoveredId = ssr ? ssr.hoveredBiomeId : storeHoveredId;
  const filterId = ssr ? ssr.biomeFilterId : storeFilterId;
  const scope = ssr ? ssr.biomeScope : storeScope;
  const selectedEntity = ssr ? ssr.selectedEntity : storeSelectedEntity;
  const activeLayers = ssr ? ssr.activeLayers : storeActiveLayers;
  const fireSource = ssr ? ssr.fireSource : storeFireSource;
  const gibsProduct = ssr ? ssr.gibsProduct : storeGibsProduct;

  const hoveredBiome = getBiomeById(hoveredId);
  const selectedBiome = getBiomeById(selectedId);

  const isFiltered = selectedBiome !== null && filterId === selectedBiome.id;
  const isInpeFiresActive = activeLayers.includes("NASA_FIRMS") && fireSource === "inpe";
  const isProdesActive = activeLayers.includes("INPE_DEFORESTATION");
  const isNdviActive = activeLayers.includes("NASA_GIBS") && gibsProduct === "ndvi";

  return (
    <>
      {/* Pílula ao vivo de hover sobre o globo */}
      {hoveredBiome && (
        <div
          data-testid="biome-hover-pill"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-[var(--map-tools-top)] z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-panel border border-line bg-surface/86 px-3 py-1.5 text-caption text-fg shadow-e1 backdrop-blur-md"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-line"
            style={{ backgroundColor: hoveredBiome.hex }}
          />
          <span className="truncate font-medium">
            {locale === "en" ? hoveredBiome.nameEn : hoveredBiome.namePt}
          </span>
          <span className="shrink-0 font-mono tabular-nums text-fg-muted">
            {hoveredBiome.code} · {formatNumber(hoveredBiome.areaKm2, locale)} km²
          </span>
        </div>
      )}

      {/* Cartão ecológico flutuante (cede posição quando há entidade de telemetria ativa, ex.: FIRMS) */}
      {selectedBiome && !selectedEntity && (
        <Panel
          data-testid="biome-floating-card"
          className="fixed bottom-[var(--map-overlay-bottom)] left-3 z-30 max-h-[var(--map-overlay-height)] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto xl:left-6"
        >
          <PanelHeader
            headingLevel={3}
            title={locale === "en" ? selectedBiome.nameEn : selectedBiome.namePt}
            subtitle={`${selectedBiome.code} · ${formatNumber(selectedBiome.areaKm2, locale)} km²${
              selectedBiome.brazilSharePct !== undefined
                ? ` · ${formatNumber(selectedBiome.brazilSharePct, locale, { maximumFractionDigits: 1 })}% ${t("obs.biomes.brazilShare", "do Brasil")}`
                : ""
            }`}
            icon={
              <span
                aria-hidden="true"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-line"
                style={{ backgroundColor: selectedBiome.hex }}
              >
                <Leaf className="h-2.5 w-2.5 text-fg" aria-hidden="true" />
              </span>
            }
            className="px-4 py-3"
            actions={
              <IconButton
                label={t("obs.biomes.closeCard", "Fechar ficha do bioma")}
                icon={<X />}
                size="sm"
                onClick={() => setSelectedBiomeId(null)}
              />
            }
          />

          <div className="space-y-3 p-4">
            {/* Ações rápidas de câmera e isolamento no mapa */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-testid="biome-floating-focus"
                onClick={() =>
                  flyTo(
                    selectedBiome.centerLat,
                    selectedBiome.centerLng,
                    selectedBiome.zoomAltitude
                  )
                }
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-control border border-line bg-surface-raised px-2.5 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:border-accent/40 hover:text-accent"
              >
                <Crosshair aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>{t("obs.biomes.focusBiome", "Focar no globo")}</span>
              </button>
              <button
                type="button"
                data-testid="biome-floating-isolate"
                aria-pressed={isFiltered}
                onClick={() =>
                  setBiomeFilterId(isFiltered ? null : selectedBiome.id)
                }
                className={cn(
                  "inline-flex h-8 items-center justify-center gap-1.5 rounded-control border px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
                  isFiltered
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-raised text-fg-secondary hover:text-fg"
                )}
              >
                <Eye aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isFiltered
                    ? t("obs.biomes.showAll", "Mostrar todos")
                    : t("obs.biomes.isolateBiome", "Isolar bioma")}
                </span>
              </button>
            </div>

            {/* Ficha ecológica estruturada */}
            <dl className="space-y-2 rounded-card border border-line bg-surface-raised p-3 text-caption">
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.biomes.climate", "Clima")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en" ? selectedBiome.climateEn : selectedBiome.climatePt}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.biomes.soils", "Solos")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en" ? selectedBiome.soilsEn : selectedBiome.soilsPt}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.biomes.vegetation", "Vegetação típica")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en"
                    ? selectedBiome.vegetationEn
                    : selectedBiome.vegetationPt}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-fg">
                  {t("obs.biomes.threats", "Principais ameaças")}
                </dt>
                <dd className="text-fg-secondary">
                  {locale === "en" ? selectedBiome.threatsEn : selectedBiome.threatsPt}
                </dd>
              </div>
            </dl>

            {/* Cruzamento ambiental em 1 clique */}
            <div className="flex flex-wrap gap-1.5">
              {(scope === "brazil" || selectedBiome.inpeBiomeId) && (
                <button
                  type="button"
                  aria-pressed={isInpeFiresActive}
                  onClick={() => {
                    setFireSource("inpe");
                    setLayerActive("NASA_FIRMS", true);
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-control border px-2 text-caption transition-colors duration-fast ease-out",
                    isInpeFiresActive
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-surface text-fg-secondary hover:text-fg"
                  )}
                >
                  <Flame aria-hidden="true" className="h-3 w-3 shrink-0" />
                  <span>INPE BDQueimadas</span>
                </button>
              )}
              {selectedBiome.inpeBiomeId && (
                <button
                  type="button"
                  aria-pressed={isProdesActive}
                  onClick={() => {
                    if (selectedBiome.inpeBiomeId) {
                      setProdesBiome(selectedBiome.inpeBiomeId);
                    }
                    setLayerActive("INPE_DEFORESTATION", true);
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-control border px-2 text-caption transition-colors duration-fast ease-out",
                    isProdesActive
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-surface text-fg-secondary hover:text-fg"
                  )}
                >
                  <Trees aria-hidden="true" className="h-3 w-3 shrink-0" />
                  <span>INPE PRODES</span>
                </button>
              )}
              <button
                type="button"
                aria-pressed={isNdviActive}
                onClick={() => {
                  setGibsRequest({ product: "ndvi" });
                  setLayerActive("NASA_GIBS", true);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-control border px-2 text-caption transition-colors duration-fast ease-out",
                  isNdviActive
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface text-fg-secondary hover:text-fg"
                )}
              >
                <Satellite aria-hidden="true" className="h-3 w-3 shrink-0" />
                <span>NASA GIBS NDVI</span>
              </button>
            </div>

            <div className="border-t border-line pt-2 text-caption text-fg-muted">
              <a
                href={selectedBiome.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <span>{selectedBiome.sourceLabel}</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
};
