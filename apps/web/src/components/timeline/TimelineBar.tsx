"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, Clock, Eclipse, Play, Pause, FastForward, GitBranch } from "lucide-react";

const StudyContext = dynamic(
  () => import("@/components/tellus-bridge/StudyContext").then((m) => m.StudyContext),
  { ssr: false }
);
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useTransversalStore } from "@/stores/transversalStore";
import { PresetSelector } from "./PresetSelector";
import { CategoryFilterPills } from "./CategoryFilterPills";
import { TimelineAxis } from "./TimelineAxis";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { resolveEraStudyEntityId } from "@/lib/timeline/era-study";
import { TIMELINE_INPUT_MAX_YEAR } from "@/lib/timeline/current-year";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import { useTimelineExpanded } from "./useTimelineExpanded";
import { useShellObstruction } from "@/components/layout/useShellObstruction";
import { useRightDock } from "@/components/layout/useRightDock";
import { useI18n } from "@/lib/i18n/useT";

const YEAR_INPUT = "w-16 rounded-control border border-line bg-surface-sunken px-1.5 py-1 text-center font-mono text-label tabular-nums text-fg";

export const TimelineBar: React.FC = () => {
  const { locale, t } = useI18n();
  const activeTransversal = useTransversalStore((s) => s.activeEntity);
  const activeTransversalId = useTransversalStore((s) => s.activeEntityId);
  const isTransversalSelectorOpen = useTransversalStore((s) => s.isSelectorOpen);
  const toggleTransversalSelector = useTransversalStore((s) => s.toggleSelector);
  const { expanded: isExpanded, automatic } = useTimelineExpanded();
  const setExpanded = useTimelineStore((s) => s.setExpanded);
  const footer = useRef<HTMLElement>(null);
  const compactToggle = useRef<HTMLButtonElement>(null);
  const fullToggle = useRef<HTMLButtonElement>(null);
  const readerOpen = useGlobeStore((s) => s.isReaderOpen);
  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const selectYear = useTimelineStore((s) => s.selectYear);
  const setYearRange = useTimelineStore((s) => s.setYearRange);

  const storeIsPlaying = useCosmicStore((s) => s.isPlaying);
  const storePlaybackSpeed = useCosmicStore((s) => s.playbackSpeed);
  const activeEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const isEclipseMenuOpen = useCosmicStore((s) => s.isEclipseMenuOpen);
  const toggleEclipseMenu = useCosmicStore((s) => s.toggleEclipseMenu);
  const setPlayback = useCosmicStore((s) => s.setPlayback);
  const setPlaybackSpeed = useCosmicStore((s) => s.setPlaybackSpeed);

  const isServer = typeof window === "undefined";
  const startYear = isServer ? useTimelineStore.getState().startYear : storeStartYear;
  const endYear = isServer ? useTimelineStore.getState().endYear : storeEndYear;
  const isReaderOpen = isServer ? useGlobeStore.getState().isReaderOpen : readerOpen;
  const isPlaying = isServer ? useCosmicStore.getState().isPlaying : storeIsPlaying;
  const playbackSpeed = isServer ? useCosmicStore.getState().playbackSpeed : storePlaybackSpeed;

  // Época ativa: fonte única (T12)
  const epoch = useEpochState();
  const isGeological = epoch.mode === "GEOLOGICAL";
  const eraStudyEntityId = resolveEraStudyEntityId(epoch);

  // Layout (D15): com o dock direito aberto, a timeline fica à esquerda dele (lg+) e some em telas
  // estreitas, onde o dock vira bottom sheet — nunca fica sob um painel.
  const hasRightSidePanel = useRightDock().visible;

  // Playback timer loop: increments timeline year smoothly when isPlaying is active
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 100;
    // Advance increment per interval based on speed:
    // 365x: 1 year per second -> 0.1 year per 100ms
    // 30x: ~1 month (0.083 yr) per second -> ~0.0083 yr per 100ms
    // 1x: 1 day per second -> ~0.00027 yr per 100ms
    const step =
      playbackSpeed === 365 ? 0.1 : playbackSpeed === 30 ? 0.015 : 0.003;

    const timer = setInterval(() => {
      const currentYear =
        useTimelineStore.getState().selectedYear ??
        useTimelineStore.getState().startYear;
      const curEnd = useTimelineStore.getState().endYear;
      const curStart = useTimelineStore.getState().startYear;

      let next = currentYear + step;
      if (next > curEnd) {
        next = curStart;
      }
      selectYear(Number(next.toFixed(2)));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, selectYear]);

  useShellObstruction(footer, "--timeline-obstruction", !isReaderOpen);
  if (isReaderOpen) return null;

  const changeExpansion = (event: React.MouseEvent<HTMLButtonElement>, expanded: boolean) => {
    setExpanded(expanded);
    if (event.detail === 0) {
      requestAnimationFrame(() => {
        const compact = compactToggle.current;
        (compact?.offsetParent ? compact : fullToggle.current)?.focus({ preventScroll: true });
      });
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val < endYear) {
      setYearRange(val, endYear);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val > startYear) {
      setYearRange(startYear, val);
    }
  };

  return (
    <footer
      ref={footer}
      data-expanded={isExpanded}
      data-timeline-bar="true"
      data-side-panel-open={hasRightSidePanel ? "true" : "false"}
      className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 lg:bottom-4 rounded-panel border border-line bg-surface/86 px-3 py-2 shadow-e2 lg:px-4 lg:py-3 backdrop-blur-md transition-[left,right,max-width] duration-slow ease-out md:px-5 ${
        hasRightSidePanel
          ? "max-lg:hidden left-4 right-4 lg:left-6 lg:right-[26.5rem] max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-28rem)] translate-x-0"
          : "left-1/2 -translate-x-1/2 right-auto w-[calc(100vw-2rem)] max-w-6xl"
      }`}
    >
      {/* Header bar: Zone A (Title + Scrollable Presets) & Zone B (Fixed Controls always accessible) */}
      <div
        data-testid="timeline-header"
        className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2", (automatic || !isExpanded) && "max-lg:hidden")}
      >
        {/* Zone A: Title & Horizontally Scrollable Presets */}
        <div
          data-testid="timeline-presets-zone"
          className="flex items-center gap-2 min-w-0 flex-1 basis-[280px] max-w-full"
        >
          <div className="flex shrink-0 items-center gap-1.5 text-label font-semibold text-fg">
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="hidden whitespace-nowrap md:inline">{t("timeline.title", "Linha do Tempo")}</span>
          </div>

          <button
            type="button"
            data-testid="timeline-transversal-button"
            aria-label={t("transversal.buttonAria", "Abrir linha do tempo transversal de personalidade ou tema")}
            aria-pressed={activeTransversalId !== null || isTransversalSelectorOpen}
            onClick={toggleTransversalSelector}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
              activeTransversalId !== null || isTransversalSelectorOpen
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            <GitBranch aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>
              {activeTransversal
                ? locale === "en"
                  ? activeTransversal.shortLabelEn
                  : activeTransversal.shortLabelPt
                : t("transversal.buttonLabel", "Transversal")}
            </span>
          </button>

          <button
            type="button"
            data-testid="timeline-eclipses-button"
            aria-label={t("eclipse.buttonAria", "Abrir simulador de eclipses solares e lunares")}
            aria-pressed={activeEclipseId !== null || isEclipseMenuOpen}
            onClick={toggleEclipseMenu}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 text-caption font-medium transition-colors duration-fast ease-out",
              activeEclipseId !== null || isEclipseMenuOpen
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
            )}
          >
            <Eclipse aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{t("eclipse.buttonLabel", "Eclipses")}</span>
          </button>

          <PresetSelector />
        </div>

        {/* Zone B: Fixed Controls (Playback, Year Range, Category Filters, Collapse) */}
        <div
          data-testid="timeline-controls-zone"
          className="flex items-center justify-end gap-2 flex-wrap shrink-0 ml-auto min-w-0 max-w-full"
        >
          {/* Orbital / Chronological Playback Controls */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setPlayback(!isPlaying)}
              data-testid="timeline-play-toggle"
              aria-label={
                isPlaying
                  ? t("timeline.pauseAria", "Pausar reprodução orbital")
                  : t("timeline.playAria", "Reproduzir evolução orbital")
              }
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-fast ease-out",
                isPlaying ? "bg-accent text-accent-on hover:bg-accent-hover" : "bg-surface-raised text-fg hover:bg-surface-hover"
              )}
              title={
                isPlaying
                  ? t("timeline.pauseAria", "Pausar reprodução orbital")
                  : t("timeline.playAria", "Reproduzir evolução orbital")
              }
            >
              {isPlaying ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextSpeed = playbackSpeed === 1 ? 30 : playbackSpeed === 30 ? 365 : 1;
                setPlaybackSpeed(nextSpeed);
              }}
              data-testid="timeline-speed-toggle"
              className="flex h-8 items-center gap-1 whitespace-nowrap rounded-control px-2 font-mono text-caption font-medium tabular-nums text-fg-secondary transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
              title={t("timeline.speedTitle", "Velocidade de reprodução (1x, 30x, 365x)")}
            >
              <FastForward aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>

          {/* Year Range Inputs or Geological Deep-Time Range */}
          {isGeological ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="flex items-center gap-2 rounded-control border border-line bg-surface-raised px-2.5 py-1 text-label text-fg">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <span className="whitespace-nowrap font-mono font-medium tabular-nums">300 Ma — 0 Ma</span>
                <span className="hidden whitespace-nowrap text-caption text-fg-muted xl:inline">
                  {t("timeline.deepTime", "(Tempo Geológico Profundo)")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                aria-label={t("timeline.startYear", "Ano inicial")}
                value={startYear}
                onChange={handleStartChange}
                className={YEAR_INPUT}
                min={1400}
                max={endYear - 1}
              />
              <span aria-hidden="true" className="text-fg-muted">–</span>
              <input
                type="number"
                aria-label={t("timeline.endYear", "Ano final")}
                value={endYear}
                onChange={handleEndChange}
                className={YEAR_INPUT}
                min={startYear + 1}
                max={TIMELINE_INPUT_MAX_YEAR}
              />
              <span className="hidden whitespace-nowrap text-caption text-fg-muted 2xl:inline">
                ({endYear - startYear} {t("timeline.yearsSuffix", "anos")})
              </span>
            </div>
          )}

          {!isGeological && <CategoryFilterPills />}

          <IconButton
            label={
              isExpanded
                ? t("timeline.collapseAria", "Recolher linha do tempo")
                : t("timeline.expandAria", "Expandir linha do tempo")
            }
            icon={isExpanded ? <ChevronDown /> : <ChevronUp />}
            size="sm"
            ref={fullToggle}
            aria-expanded={isExpanded}
            onClick={(event) => changeExpansion(event, !isExpanded)}
          />
        </div>
      </div>

      {(automatic || !isExpanded) && (
        <button
          ref={compactToggle}
          type="button"
          aria-expanded={false}
          onClick={(event) => changeExpansion(event, true)}
          className="flex min-h-9 w-full items-center gap-2 rounded-control px-1.5 text-label text-fg lg:hidden"
        >
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-secondary" />
          <span className="sr-only">{t("timeline.expand", "Expandir")}</span>
          <span className="font-semibold">{t("timeline.title", "Linha do Tempo")}</span>
          <span className="ml-auto font-mono text-caption tabular-nums text-fg-secondary">
            {isGeological ? "300–0 Ma" : `${startYear}–${endYear}`}
          </span>
          <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>
      )}

      {/* Axis and Milestone Markers (collapsible) */}
      {isExpanded && (
        <div className={cn("contents", automatic && "max-lg:hidden")}>
          <TimelineAxis />
          {eraStudyEntityId && <div className="max-w-xs"><StudyContext entityId={eraStudyEntityId} /></div>}
        </div>
      )}
    </footer>
  );
};
