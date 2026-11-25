"use client";

import React from "react";
import { CalendarClock, Link2, Pause, Play, RotateCcw } from "lucide-react";
import { CHOROPLETH_MAX_YEAR, CHOROPLETH_MIN_YEAR } from "@/lib/choropleth-ids";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

export interface ChoroplethTimelineControlsProps {
  year: number | null;
  isPlaying: boolean;
  isLoadingTimeseries: boolean;
  hasTimeseriesError: boolean;
  syncTimeline: boolean;
  onYearChange: (year: number | null) => void;
  onTogglePlay: () => void;
  onToggleSyncTimeline: () => void;
  onPreloadTimeseries?: () => void;
}

export const ChoroplethTimelineControls: React.FC<ChoroplethTimelineControlsProps> = ({
  year,
  isPlaying,
  isLoadingTimeseries,
  hasTimeseriesError,
  syncTimeline,
  onYearChange,
  onTogglePlay,
  onToggleSyncTimeline,
  onPreloadTimeseries,
}) => {
  const { t } = useI18n();
  const sliderValue = year ?? CHOROPLETH_MAX_YEAR;
  const isTemporalMode = year !== null;

  return (
    <div
      data-testid="choropleth-temporal-controls"
      onMouseEnter={onPreloadTimeseries}
      onFocus={onPreloadTimeseries}
      className="flex flex-col gap-1.5 border-t border-line pt-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="choropleth-play-toggle"
            aria-label={
              isPlaying
                ? t("choropleth.temporal.pauseAria", "Pausar animação anual 1990–2024")
                : t("choropleth.temporal.playAria", "Reproduzir evolução anual 1990–2024")
            }
            aria-pressed={isPlaying}
            onClick={onTogglePlay}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control border transition-colors duration-fast ease-out",
              isPlaying
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-line bg-surface-raised text-fg-secondary hover:border-line-strong hover:text-fg"
            )}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="flex items-center gap-1">
            <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <span
              data-testid="choropleth-year-display"
              className="font-mono text-label font-semibold text-fg tabular-nums"
            >
              {isTemporalMode
                ? String(year)
                : t("choropleth.temporal.latest", "Mais recente")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isTemporalMode && (
            <button
              type="button"
              data-testid="choropleth-reset-latest"
              onClick={() => onYearChange(null)}
              title={t("choropleth.temporal.latestTitle", "Voltar ao snapshot mais recente")}
              className="inline-flex h-7 items-center gap-1 rounded-control border border-line bg-surface-raised px-2 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
            >
              <RotateCcw aria-hidden="true" className="h-3 w-3" />
              <span>{t("choropleth.temporal.latestShort", "Atual")}</span>
            </button>
          )}

          <button
            type="button"
            data-testid="choropleth-sync-timeline"
            aria-pressed={syncTimeline}
            onClick={onToggleSyncTimeline}
            title={t(
              "choropleth.temporal.syncTitle",
              "Sincronizar o ano do mapa coroplético com a Linha do Tempo"
            )}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-control border px-2 text-caption transition-colors duration-fast ease-out",
              syncTimeline
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-line bg-surface-raised text-fg-secondary hover:border-line-strong hover:text-fg"
            )}
          >
            <Link2 aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span>{t("choropleth.temporal.syncShort", "Timeline")}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-caption text-fg-muted tabular-nums">
          {CHOROPLETH_MIN_YEAR}
        </span>
        <input
          type="range"
          data-testid="choropleth-year-slider"
          aria-label={t("choropleth.temporal.sliderAria", "Ano do mapa coroplético (1990–2024)")}
          min={CHOROPLETH_MIN_YEAR}
          max={CHOROPLETH_MAX_YEAR}
          step={1}
          value={sliderValue}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-accent"
        />
        <span className="font-mono text-caption text-fg-muted tabular-nums">
          {CHOROPLETH_MAX_YEAR}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-caption text-fg-muted">
        <span>
          {isLoadingTimeseries
            ? t("choropleth.temporal.loading", "Carregando série 1990–2024…")
            : hasTimeseriesError
              ? t("choropleth.temporal.error", "Série histórica indisponível; exibindo leitura atual.")
              : isTemporalMode
                ? t("choropleth.temporal.fixedScale", "Escala fixa 1990–2024 · sem interpolação")
                : t("choropleth.temporal.hint", "Arraste o ano ou clique ▶ para animar 1990–2024")}
        </span>
      </div>
    </div>
  );
};
