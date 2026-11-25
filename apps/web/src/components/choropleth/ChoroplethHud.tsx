"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Layers, SlidersHorizontal, X } from "lucide-react";
import { buildChoroplethDataset } from "@/lib/choropleth-dataset";
import {
  buildPaletteGradientCss,
  CHOROPLETH_FIRMS_ZERO_COLOR,
  CHOROPLETH_MISSING_SWATCH_CSS,
  isTemporalChoroplethIndicator,
  type ChoroplethCountryEntry,
  type ChoroplethDataset,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth";
import {
  getWorldBankTimeseriesSync,
  loadWorldBankTimeseries,
  type WorldBankTimeseriesDataset,
} from "@/lib/worldbank-timeseries";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { restoreContemporaryTimeline } from "@/stores/actions";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import type { CriticalGeoLensId } from "@/lib/critical-geo-ids";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { ChoroplethSelectorView, type ChoroplethSelectorViewProps } from "./ChoroplethSelectorView";
import { ChoroplethTimelineControls } from "./ChoroplethTimelineControls";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { formatCountryName } from "@/lib/i18n/format";
import { useI18n, type TranslateFn } from "@/lib/i18n/useT";
import type { EnMessageKey } from "@/lib/i18n/en";

export { ChoroplethSelectorView, type ChoroplethSelectorViewProps };

function indLabel(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  return t(`choropleth.ind.${id}.label` as EnMessageKey, fallback);
}
function indShort(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  return t(`choropleth.ind.${id}.short` as EnMessageKey, fallback);
}
function indScale(t: TranslateFn, id: ChoroplethIndicatorId, fallback: string) {
  return t(`choropleth.ind.${id}.scale` as EnMessageKey, fallback);
}

export interface ChoroplethTooltipViewProps {
  entry: ChoroplethCountryEntry;
  indicatorLabel: string;
  isHovered: boolean;
}

export const ChoroplethTooltipView: React.FC<ChoroplethTooltipViewProps> = ({
  entry,
  indicatorLabel,
  isHovered,
}) => {
  const { locale, t } = useI18n();
  const iso2 = WORLD_COUNTRIES_CATALOG[entry.isoCode]?.iso2;
  const localizedCountry = formatCountryName(iso2, entry.nameCommon, locale);
  const swatchStyle: React.CSSProperties = !entry.available
    ? { backgroundImage: CHOROPLETH_MISSING_SWATCH_CSS }
    : { backgroundColor: entry.color };

  return (
    <Panel
      role="status"
      aria-live="polite"
      data-testid="choropleth-tooltip"
      className="pointer-events-auto flex flex-col gap-1.5 px-3 py-2.5 shadow-e2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 rounded-sm border border-line-strong"
            style={swatchStyle}
          />
          <span className="truncate text-label font-semibold text-fg">
            {localizedCountry}
          </span>
          <span className="shrink-0 font-mono text-caption text-fg-muted">
            {entry.isoCode}
          </span>
        </div>
        <span className="shrink-0 text-caption text-fg-muted">
          {isHovered ? t("choropleth.hovered", "Sob o cursor") : t("choropleth.selected", "Selecionado")}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <span
            data-testid="choropleth-tooltip-value"
            className={cn(
              "font-mono text-body font-semibold tabular-nums",
              entry.available ? "text-fg" : "text-fg-muted"
            )}
          >
            {entry.available ? entry.formattedValue : t("choropleth.noData", entry.formattedValue)}
          </span>
          {entry.year !== null && (
            <span className="font-mono text-caption text-fg-muted tabular-nums">
              ({entry.year})
            </span>
          )}
        </div>

        {entry.rank !== null && entry.rankTotal > 0 ? (
          <Badge tone="accent" data-testid="choropleth-tooltip-rank">
            <span className="font-mono tabular-nums">
              #{entry.rank} {t("choropleth.rankOf", "de")} {entry.rankTotal}
            </span>
          </Badge>
        ) : !entry.available ? (
          <Badge tone="neutral" data-testid="choropleth-tooltip-missing">
            {t("choropleth.noData", "Sem dado")}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-fg-muted">
        <span className="truncate">
          {entry.extraDetail ? `${indicatorLabel} · ${entry.extraDetail}` : indicatorLabel}
        </span>
        <span className="truncate">{entry.sourcePrimary}</span>
      </div>
    </Panel>
  );
};

export interface ChoroplethLegendViewProps {
  dataset: ChoroplethDataset;
  isLoadingFirms?: boolean;
  temporalControls?: React.ReactNode;
  onOpenSelector: () => void;
  onClose: () => void;
}

export const ChoroplethLegendView: React.FC<ChoroplethLegendViewProps> = ({
  dataset,
  isLoadingFirms = false,
  temporalControls,
  onOpenSelector,
  onClose,
}) => {
  const { t } = useI18n();
  const { indicator, ticks, availableCount, activeCount, totalCountries, isSourceUnavailable } =
    dataset;
  const isFirms = indicator.id === "NASA_FIRMS";
  const missingCount = Math.max(0, totalCountries - availableCount);
  const label = indLabel(t, indicator.id, indicator.label);
  const scaleLabel = indScale(t, indicator.id, indicator.scaleLabel);

  return (
    <Panel
      role="region"
      aria-label={`${t("choropleth.legendAria", "Legenda do mapa temático")}: ${label}`}
      data-testid="choropleth-legend"
      className="pointer-events-auto flex flex-col gap-2 px-3 py-2.5 shadow-e2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
            <h2 className="truncate text-label font-semibold text-fg">{label}</h2>
          </div>
          <p className="text-caption text-fg-muted">
            {scaleLabel} ·{" "}
            <span className="font-mono tabular-nums">
              {isFirms
                ? isSourceUnavailable
                  ? isLoadingFirms
                    ? t("choropleth.loadingFirms", "Carregando focos…")
                    : t("choropleth.countUnavailable", "Contagem indisponível")
                  : `${activeCount}/${totalCountries} ${t("choropleth.countriesWithFires", "países com focos")}`
                : `${availableCount}/${totalCountries} ${t("choropleth.countries", "países")}`}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            size="sm"
            label={t("choropleth.changeIndicator", "Trocar indicador coroplético")}
            icon={<SlidersHorizontal />}
            onClick={onOpenSelector}
          />
          <IconButton
            size="sm"
            label={t("choropleth.disable", "Desativar mapa temático")}
            icon={<X />}
            onClick={onClose}
          />
        </div>
      </div>

      {/* Barra contínua perceptualmente uniforme */}
      <div className="flex flex-col gap-1">
        <div
          aria-hidden="true"
          data-testid="choropleth-gradient-bar"
          className="h-2.5 w-full rounded-full border border-line"
          style={{ backgroundImage: buildPaletteGradientCss(indicator.palette) }}
        />
        {ticks.length > 0 ? (
          <div className="flex items-center justify-between font-mono text-caption text-fg-secondary tabular-nums">
            {ticks.map((tick) => (
              <span key={`${tick.position}-${tick.label}`}>{tick.label}</span>
            ))}
          </div>
        ) : (
          <p className="text-caption text-fg-muted">
            {isLoadingFirms
              ? t("choropleth.queryingFirms", "Consultando focos de calor NASA FIRMS…")
              : t("choropleth.noScale", "Sem escala ativa — aguardando dados do servidor.")}
          </p>
        )}
      </div>

      {temporalControls}

      {/* Swatches explícitos (Dado indisponível nunca é confundido com zero) + Fonte primária RN02 */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line pt-2 text-caption text-fg-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5" data-testid="choropleth-missing-swatch">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-sm border border-line-strong"
              style={{ backgroundImage: CHOROPLETH_MISSING_SWATCH_CSS }}
            />
            <span>
              {t("choropleth.missingData", "Dado indisponível")}
              {!isFirms && missingCount > 0 ? ` (${missingCount})` : ""}
            </span>
          </span>

          {isFirms && !isSourceUnavailable && (
            <span className="inline-flex items-center gap-1.5" data-testid="choropleth-firms-zero-swatch">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm border border-line-strong"
                style={{ backgroundColor: CHOROPLETH_FIRMS_ZERO_COLOR }}
              />
              <span>{t("choropleth.zeroFires", "0 focos (24h)")}</span>
            </span>
          )}
        </div>

        <a
          href={indicator.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent transition-colors duration-fast ease-out hover:text-accent-hover hover:underline"
        >
          <span>{indicator.sourcePrimary}</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
        </a>
      </div>
    </Panel>
  );
};

export const ChoroplethHud: React.FC = () => {
  const { t } = useI18n();
  const activeIndicator = useChoroplethStore((s) => s.activeIndicator);
  const choroplethYear = useChoroplethStore((s) => s.year);
  const isPlaying = useChoroplethStore((s) => s.isPlaying);
  const syncTimeline = useChoroplethStore((s) => s.syncTimeline);
  const opacity = useChoroplethStore((s) => s.opacity);
  const isSelectorOpen = useChoroplethStore((s) => s.isSelectorOpen);
  const setIndicator = useChoroplethStore((s) => s.setIndicator);
  const clearIndicator = useChoroplethStore((s) => s.clearIndicator);
  const setYear = useChoroplethStore((s) => s.setYear);
  const togglePlaying = useChoroplethStore((s) => s.togglePlaying);
  const stepYear = useChoroplethStore((s) => s.stepYear);
  const setSyncTimeline = useChoroplethStore((s) => s.setSyncTimeline);
  const setOpacity = useChoroplethStore((s) => s.setOpacity);
  const setSelectorOpen = useChoroplethStore((s) => s.setSelectorOpen);

  const hoveredIso = useGlobeStore((s) => s.hoveredIso);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const exitToEarthView = useCosmicStore((s) => s.exitToEarthView);
  const firmsByCountry = useObservatoryStore((s) => s.firmsByCountry);
  const isFirmsLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);
  const loadLayerData = useObservatoryStore((s) => s.loadLayerData);
  const epoch = useEpochState();

  const [timeseries, setTimeseries] = useState<WorldBankTimeseriesDataset | null>(() =>
    getWorldBankTimeseriesSync()
  );
  const [isLoadingTimeseries, setIsLoadingTimeseries] = useState(false);
  const [hasTimeseriesError, setHasTimeseriesError] = useState(false);

  const isGlobeEligible = epoch.isContemporary && !isCosmicMode;
  const isTemporalIndicator = isTemporalChoroplethIndicator(activeIndicator);

  const ensureTimeseriesLoaded = useCallback(() => {
    if (timeseries || isLoadingTimeseries) return;
    const cached = getWorldBankTimeseriesSync();
    if (cached) {
      setTimeseries(cached);
      return;
    }
    setIsLoadingTimeseries(true);
    setHasTimeseriesError(false);
    void loadWorldBankTimeseries()
      .then((loaded) => setTimeseries(loaded))
      .catch(() => setHasTimeseriesError(true))
      .finally(() => setIsLoadingTimeseries(false));
  }, [timeseries, isLoadingTimeseries]);

  useEffect(() => {
    if ((choroplethYear !== null || isPlaying) && isTemporalIndicator) {
      ensureTimeseriesLoaded();
    }
  }, [choroplethYear, isPlaying, isTemporalIndicator, ensureTimeseriesLoaded]);

  // Reprodução animada suave 1990 → 2024 (D34)
  useEffect(() => {
    if (!isPlaying || !isTemporalIndicator || !timeseries) return;
    const timer = setInterval(() => stepYear(), 450);
    return () => clearInterval(timer);
  }, [isPlaying, isTemporalIndicator, timeseries, stepYear]);

  // Sincronização opcional com a Linha do Tempo (D34)
  useEffect(() => {
    if (!syncTimeline || choroplethYear === null || !isTemporalIndicator) return;
    const tl = useTimelineStore.getState();
    const needsRange = tl.startYear > choroplethYear || tl.endYear < choroplethYear;
    if (tl.selectedYear !== choroplethYear || needsRange || tl.geologicalMa !== null) {
      useTimelineStore.setState({
        geologicalMa: null,
        selectedYear: choroplethYear,
        ...(needsRange
          ? {
              startYear: Math.min(tl.startYear, 1990),
              endYear: Math.max(tl.endYear, 2024),
            }
          : {}),
      });
    }
  }, [syncTimeline, choroplethYear, isTemporalIndicator]);

  useEffect(() => {
    if (!isSelectorOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectorOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSelectorOpen, setSelectorOpen]);

  useEffect(() => {
    if (activeIndicator !== "NASA_FIRMS") return;
    if (firmsByCountry === null && !isFirmsLoading) {
      void loadLayerData("NASA_FIRMS");
    }
  }, [activeIndicator, firmsByCountry, isFirmsLoading, loadLayerData]);

  const dataset = useMemo(() => {
    if (!activeIndicator) return null;
    return buildChoroplethDataset(
      activeIndicator,
      activeIndicator === "NASA_FIRMS" ? firmsByCountry : undefined,
      { year: choroplethYear, timeseries }
    );
  }, [activeIndicator, firmsByCountry, choroplethYear, timeseries]);

  const focusedIso = hoveredIso ?? selectedIso;
  const focusedEntry =
    dataset && focusedIso ? (dataset.entries[focusedIso] ?? null) : null;

  const activeCriticalLens = useCriticalGeoStore((s) => s.activeLens);
  const setCriticalLens = useCriticalGeoStore((s) => s.setLens);
  const clearCriticalLens = useCriticalGeoStore((s) => s.clearLens);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const handleSelectIndicator = (id: ChoroplethIndicatorId) => {
    clearCriticalLens();
    setIndicator(id);
    if (isCosmicMode) exitToEarthView();
    if (!epoch.isContemporary) restoreContemporaryTimeline();
    setSelectorOpen(false);
  };

  const handleSelectCriticalLens = (id: CriticalGeoLensId) => {
    clearIndicator();
    if (isCosmicMode) exitToEarthView();
    if (!epoch.isContemporary) restoreContemporaryTimeline();
    setCriticalLens(id);
    if (id === "FOUR_BRAZILS") {
      flyTo(-14.2, -51.9, 1.95);
    }
    setSelectorOpen(false);
  };

  const handleReturnToContemporaryEarth = () => {
    if (isCosmicMode) exitToEarthView();
    if (!epoch.isContemporary) restoreContemporaryTimeline();
  };

  return (
    <>
      {isSelectorOpen && (
        <div className="pointer-events-none fixed left-3 top-[var(--map-annotation-top)] z-30 xl:left-6">
          <ChoroplethSelectorView
            activeIndicator={activeIndicator}
            activeCriticalLens={activeCriticalLens}
            opacity={opacity}
            isGlobeEligible={isGlobeEligible}
            onSelect={handleSelectIndicator}
            onSelectCriticalLens={handleSelectCriticalLens}
            onClear={() => {
              clearIndicator();
              clearCriticalLens();
              setSelectorOpen(false);
            }}
            onOpacityChange={setOpacity}
            onReturnToContemporaryEarth={handleReturnToContemporaryEarth}
            onClose={() => setSelectorOpen(false)}
          />
        </div>
      )}

      {dataset && isGlobeEligible && (
        <div
          className="pointer-events-none fixed bottom-[calc(var(--map-overlay-bottom)+0.75rem)] left-3 z-20 flex w-[min(calc(100vw-1.5rem),21rem)] flex-col gap-2 xl:left-6"
        >
          {focusedEntry && (
            <ChoroplethTooltipView
              entry={focusedEntry}
              indicatorLabel={indShort(t, dataset.indicator.id, dataset.indicator.shortLabel)}
              isHovered={Boolean(hoveredIso)}
            />
          )}
          <ChoroplethLegendView
            dataset={dataset}
            isLoadingFirms={isFirmsLoading}
            temporalControls={
              isTemporalIndicator ? (
                <ChoroplethTimelineControls
                  year={choroplethYear}
                  isPlaying={isPlaying}
                  isLoadingTimeseries={isLoadingTimeseries}
                  hasTimeseriesError={hasTimeseriesError}
                  syncTimeline={syncTimeline}
                  onYearChange={(nextYear) => {
                    if (isPlaying) togglePlaying();
                    setYear(nextYear);
                  }}
                  onTogglePlay={() => {
                    ensureTimeseriesLoaded();
                    togglePlaying();
                  }}
                  onToggleSyncTimeline={() => setSyncTimeline(!syncTimeline)}
                  onPreloadTimeseries={ensureTimeseriesLoaded}
                />
              ) : undefined
            }
            onOpenSelector={() => setSelectorOpen(true)}
            onClose={clearIndicator}
          />
        </div>
      )}
    </>
  );
};
