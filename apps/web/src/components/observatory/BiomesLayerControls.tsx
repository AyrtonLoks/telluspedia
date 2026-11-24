"use client";

import React from "react";
import {
  Crosshair,
  ExternalLink,
  Flame,
  Leaf,
  Satellite,
  Trees,
} from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import {
  BIOME_SCOPE_CITATIONS,
  getBiomeById,
  getBiomesForScope,
} from "@/lib/biomes-catalog";
import type { BiomeId, BiomeScope } from "@/lib/biomes-types";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

const SCOPES: readonly BiomeScope[] = ["global", "brazil"];

/**
 * Controles D14 do Mapa dos Biomas (Global 14 WWF/RESOLVE + Brasil 6 IBGE — D31).
 * Carregado sob demanda via `next/dynamic` dentro de `ObservatoryPanel`.
 */
export const BiomesLayerControls: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const storeScope = useObservatoryStore((s) => s.biomeScope);
  const storeFilterId = useObservatoryStore((s) => s.biomeFilterId);
  const storeSelectedId = useObservatoryStore((s) => s.selectedBiomeId);
  const storePickMode = useObservatoryStore((s) => s.biomePickMode);
  const storeActiveLayers = useObservatoryStore((s) => s.activeLayers);
  const storeFireSource = useObservatoryStore((s) => s.fireSource);
  const storeGibsProduct = useObservatoryStore((s) => s.gibsProduct);

  const setBiomeScope = useObservatoryStore((s) => s.setBiomeScope);
  const setBiomeFilterId = useObservatoryStore((s) => s.setBiomeFilterId);
  const setSelectedBiomeId = useObservatoryStore((s) => s.setSelectedBiomeId);
  const setBiomePickMode = useObservatoryStore((s) => s.setBiomePickMode);
  const setLayerActive = useObservatoryStore((s) => s.setLayerActive);
  const setFireSource = useObservatoryStore((s) => s.setFireSource);
  const setProdesBiome = useObservatoryStore((s) => s.setProdesBiome);
  const setGibsRequest = useObservatoryStore((s) => s.setGibsRequest);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const scope = ssr?.biomeScope ?? storeScope;
  const filterId = ssr ? ssr.biomeFilterId : storeFilterId;
  const selectedId = ssr ? ssr.selectedBiomeId : storeSelectedId;
  const pickMode = ssr ? ssr.biomePickMode : storePickMode;
  const activeLayers = ssr ? ssr.activeLayers : storeActiveLayers;
  const fireSource = ssr ? ssr.fireSource : storeFireSource;
  const gibsProduct = ssr ? ssr.gibsProduct : storeGibsProduct;

  const biomes = getBiomesForScope(scope);
  const citation = BIOME_SCOPE_CITATIONS[scope];
  const activeBiome =
    getBiomeById(selectedId) ?? getBiomeById(filterId) ?? biomes[0];

  const handleSelectScope = (next: BiomeScope) => {
    setBiomeScope(next);
    if (next === "brazil") {
      flyTo(-14.5, -52.0, 2.05);
    }
  };

  const handleSelectBiome = (id: BiomeId | null) => {
    if (id === null || filterId === id) {
      setBiomeFilterId(null);
      if (id === null) setSelectedBiomeId(null);
      return;
    }
    setBiomeFilterId(id);
    setSelectedBiomeId(id);
    const target = getBiomeById(id);
    if (target) {
      flyTo(target.centerLat, target.centerLng, target.zoomAltitude);
    }
  };

  const handleCrossInpeFires = () => {
    setFireSource("inpe");
    setLayerActive("NASA_FIRMS", true);
    if (scope !== "brazil") {
      flyTo(-12.5, -53.0, 2.05);
    }
  };

  const handleCrossProdes = () => {
    if (activeBiome.inpeBiomeId) {
      setProdesBiome(activeBiome.inpeBiomeId);
    }
    setLayerActive("INPE_DEFORESTATION", true);
  };

  const handleCrossGibsNdvi = () => {
    setGibsRequest({ product: "ndvi" });
    setLayerActive("NASA_GIBS", true);
  };

  const isInpeFiresActive =
    activeLayers.includes("NASA_FIRMS") && fireSource === "inpe";
  const isProdesActive = activeLayers.includes("INPE_DEFORESTATION");
  const isNdviActive =
    activeLayers.includes("NASA_GIBS") && gibsProduct === "ndvi";

  return (
    <div data-testid="biomes-layer-controls" className="space-y-3">
      {/* Seletor de escopo: 14 biomas globais WWF/RESOLVE ou 6 Biomas Brasileiros IBGE */}
      <div
        role="group"
        aria-label={t("obs.biomes.scopeAria", "Escopo do mapa de biomas")}
        className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface p-0.5"
      >
        {SCOPES.map((id) => {
          const active = scope === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`biomes-scope-${id}`}
              aria-pressed={active}
              onClick={() => handleSelectScope(id)}
              className={cn(
                "h-7 rounded-control px-2 text-caption font-medium transition-colors duration-fast ease-out",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
              )}
            >
              {id === "global"
                ? t("obs.biomes.scopeGlobal", "Global (14 WWF)")
                : t("obs.biomes.scopeBrazil", "Brasil (6 IBGE)")}
            </button>
          );
        })}
      </div>

      {/* Modo de inspeção direta no globo 3D */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="biomes-pick-mode"
          aria-pressed={pickMode}
          onClick={() => setBiomePickMode(!pickMode)}
          className={cn(
            "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-control border px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
            pickMode
              ? "border-accent/50 bg-accent/15 text-accent"
              : "border-line bg-surface text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
          )}
        >
          <Crosshair aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span>
            {pickMode
              ? t("obs.biomes.pickActive", "Clique no globo para ler a ficha")
              : t("obs.biomes.pickIdle", "Inspecionar bioma no globo")}
          </span>
        </button>
      </div>

      {/* Legenda interativa e filtro por bioma */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-caption text-fg-secondary">
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            {t("obs.biomes.legendTitle", "Legenda e filtro")}
          </span>
          <span className="font-mono tabular-nums text-fg-muted">
            {biomes.length}{" "}
            {t("obs.biomes.biomesUnit", "biomas")}
          </span>
        </div>

        <div
          role="group"
          aria-label={t("obs.biomes.filterAria", "Filtrar bioma no globo")}
          className="flex max-h-36 flex-wrap gap-1 overflow-y-auto rounded-card border border-line bg-surface p-1.5"
        >
          <button
            type="button"
            data-testid="biome-chip-ALL"
            aria-pressed={filterId === null}
            onClick={() => handleSelectBiome(null)}
            className={cn(
              "inline-flex items-center rounded-control border px-2 py-1 text-caption transition-colors duration-fast ease-out",
              filterId === null
                ? "border-accent/50 bg-accent/15 font-medium text-accent"
                : "border-line bg-surface-raised/60 text-fg-secondary hover:text-fg"
            )}
          >
            {t("obs.biomes.all", "Todos")}
          </button>

          {biomes.map((entry) => {
            const isActive = filterId === entry.id || selectedId === entry.id;
            const label = locale === "en" ? entry.nameEn : entry.namePt;
            return (
              <button
                key={entry.id}
                type="button"
                data-testid={`biome-chip-${entry.id}`}
                aria-pressed={filterId === entry.id}
                onClick={() => handleSelectBiome(entry.id)}
                title={label}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-control border px-2 py-1 text-left text-caption transition-colors duration-fast ease-out",
                  isActive
                    ? "border-accent/50 bg-accent/15 font-medium text-fg"
                    : "border-line bg-surface-raised/60 text-fg-secondary hover:text-fg"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: entry.hex }}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ficha ecológica bilíngue do bioma selecionado (RN02) */}
      <div
        data-testid="biome-ecological-card"
        className="space-y-2 rounded-card border border-line bg-surface p-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 rounded-full border border-line"
              style={{ backgroundColor: activeBiome.hex }}
            />
            <div className="min-w-0">
              <p className="text-label font-semibold leading-snug text-fg">
                {locale === "en" ? activeBiome.nameEn : activeBiome.namePt}
              </p>
              <p className="font-mono text-caption tabular-nums text-fg-muted">
                {activeBiome.code} · {formatNumber(activeBiome.areaKm2, locale)} km²
                {activeBiome.brazilSharePct !== undefined && (
                  <>
                    {" "}
                    · {formatNumber(activeBiome.brazilSharePct, locale, { maximumFractionDigits: 1 })}%{" "}
                    {t("obs.biomes.brazilShare", "do Brasil")}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <dl className="space-y-1.5 text-caption">
          <div>
            <dt className="font-medium text-fg">
              {t("obs.biomes.climate", "Clima")}
            </dt>
            <dd className="text-fg-secondary">
              {locale === "en" ? activeBiome.climateEn : activeBiome.climatePt}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg">
              {t("obs.biomes.soils", "Solos")}
            </dt>
            <dd className="text-fg-secondary">
              {locale === "en" ? activeBiome.soilsEn : activeBiome.soilsPt}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg">
              {t("obs.biomes.vegetation", "Vegetação típica")}
            </dt>
            <dd className="text-fg-secondary">
              {locale === "en" ? activeBiome.vegetationEn : activeBiome.vegetationPt}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg">
              {t("obs.biomes.threats", "Principais ameaças")}
            </dt>
            <dd className="text-fg-secondary">
              {locale === "en" ? activeBiome.threatsEn : activeBiome.threatsPt}
            </dd>
          </div>
        </dl>

        <div className="border-t border-line pt-1.5 text-caption text-fg-muted">
          <a
            href={activeBiome.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <span>{activeBiome.sourceLabel}</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
          </a>
        </div>
      </div>

      {/* Cruzamento ambiental em 1 clique: INPE BDQueimadas, PRODES e NASA GIBS NDVI */}
      <div data-testid="biomes-cross-layers" className="space-y-1.5">
        <p className="text-caption font-medium text-fg-secondary">
          {t("obs.biomes.crossLayers", "Cruzar com camadas ambientais")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(scope === "brazil" || activeBiome.inpeBiomeId) && (
            <button
              type="button"
              data-testid="biomes-cross-inpe-fires"
              aria-pressed={isInpeFiresActive}
              onClick={handleCrossInpeFires}
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
          {activeBiome.inpeBiomeId && (
            <button
              type="button"
              data-testid="biomes-cross-prodes"
              aria-pressed={isProdesActive}
              onClick={handleCrossProdes}
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
            data-testid="biomes-cross-gibs-ndvi"
            aria-pressed={isNdviActive}
            onClick={handleCrossGibsNdvi}
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
      </div>

      {/* Referência institucional do escopo ativo */}
      <p className="text-caption text-fg-muted">
        {locale === "en" ? citation.labelEn : citation.labelPt} · {citation.license}
      </p>
    </div>
  );
};
