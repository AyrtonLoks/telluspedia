"use client";

import React, { useEffect, useMemo } from "react";
import { Check, ExternalLink, Layers, SlidersHorizontal, X } from "lucide-react";
import { buildChoroplethDataset } from "@/lib/choropleth-dataset";
import {
  buildPaletteGradientCss,
  CHOROPLETH_FIRMS_ZERO_COLOR,
  CHOROPLETH_INDICATOR_LIST,
  CHOROPLETH_MISSING_SWATCH_CSS,
  type ChoroplethCountryEntry,
  type ChoroplethDataset,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { restoreContemporaryTimeline } from "@/stores/actions";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";

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
            {entry.nameCommon}
          </span>
          <span className="shrink-0 font-mono text-caption text-fg-muted">
            {entry.isoCode}
          </span>
        </div>
        <span className="shrink-0 text-caption text-fg-muted">
          {isHovered ? "Sob o cursor" : "Selecionado"}
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
            {entry.formattedValue}
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
              #{entry.rank} de {entry.rankTotal}
            </span>
          </Badge>
        ) : !entry.available ? (
          <Badge tone="neutral" data-testid="choropleth-tooltip-missing">
            Sem dado
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
  onOpenSelector: () => void;
  onClose: () => void;
}

export const ChoroplethLegendView: React.FC<ChoroplethLegendViewProps> = ({
  dataset,
  isLoadingFirms = false,
  onOpenSelector,
  onClose,
}) => {
  const { indicator, ticks, availableCount, activeCount, totalCountries, isSourceUnavailable } =
    dataset;
  const isFirms = indicator.id === "NASA_FIRMS";
  const missingCount = Math.max(0, totalCountries - availableCount);

  return (
    <Panel
      role="region"
      aria-label={`Legenda do mapa temático: ${indicator.label}`}
      data-testid="choropleth-legend"
      className="pointer-events-auto flex flex-col gap-2 px-3 py-2.5 shadow-e2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
            <h2 className="truncate text-label font-semibold text-fg">{indicator.label}</h2>
          </div>
          <p className="text-caption text-fg-muted">
            {indicator.scaleLabel} ·{" "}
            <span className="font-mono tabular-nums">
              {isFirms
                ? isSourceUnavailable
                  ? isLoadingFirms
                    ? "Carregando focos…"
                    : "Contagem indisponível"
                  : `${activeCount}/${totalCountries} países com focos`
                : `${availableCount}/${totalCountries} países`}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            size="sm"
            label="Trocar indicador coroplético"
            icon={<SlidersHorizontal />}
            onClick={onOpenSelector}
          />
          <IconButton
            size="sm"
            label="Desativar mapa temático"
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
              ? "Consultando focos de calor NASA FIRMS…"
              : "Sem escala ativa — aguardando dados do servidor."}
          </p>
        )}
      </div>

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
              Dado indisponível
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
              <span>0 focos (24h)</span>
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

export interface ChoroplethSelectorViewProps {
  activeIndicator: ChoroplethIndicatorId | null;
  opacity: number;
  isGlobeEligible: boolean;
  onSelect: (id: ChoroplethIndicatorId) => void;
  onClear: () => void;
  onOpacityChange: (opacity: number) => void;
  onReturnToContemporaryEarth: () => void;
  onClose: () => void;
}

export const ChoroplethSelectorView: React.FC<ChoroplethSelectorViewProps> = ({
  activeIndicator,
  opacity,
  isGlobeEligible,
  onSelect,
  onClear,
  onOpacityChange,
  onReturnToContemporaryEarth,
  onClose,
}) => {
  return (
    <Panel
      role="dialog"
      aria-label="Seletor de mapa temático coroplético"
      data-testid="choropleth-selector"
      className="pointer-events-auto flex max-h-[var(--map-overlay-height)] w-[min(calc(100vw-1.5rem),22rem)] flex-col overflow-hidden shadow-e2"
    >
      <div className="flex items-start justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="text-label font-semibold text-fg">Mapa temático coroplético</h2>
          </div>
          <p className="text-caption text-fg-muted">
            Colore os 177 países no globo por indicador real.
          </p>
        </div>
        <IconButton
          size="sm"
          label="Fechar seletor de mapa temático"
          icon={<X />}
          onClick={onClose}
        />
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-3">
        {!isGlobeEligible && (
          <div className="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/10 p-2.5 text-caption text-fg-secondary">
            <span>
              A camada coroplética é exibida na Terra contemporânea. Volte ao mapa atual para visualizar o preenchimento.
            </span>
            <div>
              <Button size="sm" variant="secondary" onClick={onReturnToContemporaryEarth}>
                Voltar à Terra contemporânea
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Indicadores coropléticos">
          {CHOROPLETH_INDICATOR_LIST.map((item) => {
            const isSelected = activeIndicator === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`choropleth-option-${item.id}`}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-card border px-3 py-2 text-left transition-colors duration-fast ease-out",
                  isSelected
                    ? "border-accent/60 bg-accent/10 text-fg"
                    : "border-line bg-surface-raised/60 text-fg-secondary hover:border-line-strong hover:bg-surface-hover hover:text-fg"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label font-medium text-fg">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1 text-caption text-fg-muted">
                    {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
                    <span>{item.unit}</span>
                  </span>
                </div>
                <p className="text-caption text-fg-muted">{item.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 flex-1 rounded-full border border-line"
                    style={{ backgroundImage: buildPaletteGradientCss(item.palette) }}
                  />
                  <span className="shrink-0 text-caption text-fg-muted">{item.sourcePrimary}</span>
                </div>
              </button>
            );
          })}
        </div>

        {activeIndicator !== null && (
          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-2.5">
            <div className="flex items-center justify-between gap-2 text-caption">
              <label htmlFor="choropleth-opacity-range" className="text-fg-secondary">
                Opacidade da camada
              </label>
              <span className="font-mono text-fg tabular-nums">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              id="choropleth-opacity-range"
              type="range"
              min={40}
              max={100}
              step={5}
              value={Math.round(opacity * 100)}
              onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
              className="h-1.5 w-full cursor-pointer accent-accent"
            />
            <Button
              size="sm"
              variant="ghost"
              data-testid="choropleth-clear-button"
              onClick={onClear}
              className="w-full justify-center text-fg-secondary hover:text-fg"
            >
              Desativar mapa temático
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};

export const ChoroplethHud: React.FC = () => {
  const activeIndicator = useChoroplethStore((s) => s.activeIndicator);
  const opacity = useChoroplethStore((s) => s.opacity);
  const isSelectorOpen = useChoroplethStore((s) => s.isSelectorOpen);
  const setIndicator = useChoroplethStore((s) => s.setIndicator);
  const clearIndicator = useChoroplethStore((s) => s.clearIndicator);
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

  const isGlobeEligible = epoch.isContemporary && !isCosmicMode;

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
      activeIndicator === "NASA_FIRMS" ? firmsByCountry : undefined
    );
  }, [activeIndicator, firmsByCountry]);

  const focusedIso = hoveredIso ?? selectedIso;
  const focusedEntry =
    dataset && focusedIso ? (dataset.entries[focusedIso] ?? null) : null;

  const handleSelectIndicator = (id: ChoroplethIndicatorId) => {
    setIndicator(id);
    if (isCosmicMode) exitToEarthView();
    if (!epoch.isContemporary) restoreContemporaryTimeline();
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
            opacity={opacity}
            isGlobeEligible={isGlobeEligible}
            onSelect={handleSelectIndicator}
            onClear={() => {
              clearIndicator();
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
              indicatorLabel={dataset.indicator.shortLabel}
              isHovered={Boolean(hoveredIso)}
            />
          )}
          <ChoroplethLegendView
            dataset={dataset}
            isLoadingFirms={isFirmsLoading}
            onOpenSelector={() => setSelectorOpen(true)}
            onClose={clearIndicator}
          />
        </div>
      )}
    </>
  );
};
