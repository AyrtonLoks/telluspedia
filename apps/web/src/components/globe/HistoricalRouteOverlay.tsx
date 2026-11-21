"use client";

import { historicalRouteActions, selectHistoricalRoute } from "@/stores/actions";

import React, { useMemo, useEffect } from "react";
import {
  Anchor,
  Compass,
  Ship,
  MapPin,
  Calendar,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Eye,
} from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { MAGELLAN_ROUTE } from "@/lib/historical-routes";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

export interface HistoricalRouteOverlayProps {
  forceActive?: boolean;
}

export const HistoricalRouteOverlay: React.FC<HistoricalRouteOverlayProps> = ({
  forceActive = false,
}) => {
  const epochScene = useEpochState().activeScene;
  const storeIsPlaying = useHistoricalRouteStore((s) => s.isPlaying);
  const storeProgress = useHistoricalRouteStore((s) => s.progress);
  const storeWaypointIndex = useHistoricalRouteStore((s) => s.currentWaypointIndex);
  const storeIsMinimized = useHistoricalRouteStore((s) => s.isMinimized);
  const storeSpeed = useHistoricalRouteStore((s) => s.playbackSpeed);

  // SSR / Node test runner fallback
  const isPlaying =
    typeof window === "undefined"
      ? useHistoricalRouteStore.getState().isPlaying
      : storeIsPlaying;
  const progress =
    typeof window === "undefined"
      ? useHistoricalRouteStore.getState().progress
      : storeProgress;
  const currentWaypointIndex =
    typeof window === "undefined"
      ? useHistoricalRouteStore.getState().currentWaypointIndex
      : storeWaypointIndex;
  const isMinimized =
    typeof window === "undefined"
      ? useHistoricalRouteStore.getState().isMinimized
      : storeIsMinimized;
  const playbackSpeed =
    typeof window === "undefined"
      ? useHistoricalRouteStore.getState().playbackSpeed
      : storeSpeed;

  const { togglePlay, seek, nextWaypoint, prevWaypoint, reset } = historicalRouteActions;
  const setPlaybackSpeed = useHistoricalRouteStore((s) => s.setPlaybackSpeed);
  const toggleMinimized = useHistoricalRouteStore((s) => s.toggleMinimized);

  const flyTo = useGlobeStore((s) => s.flyTo);

  // Playback animation loop advancing progress based on speed
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const safeDt = Math.min(dt, 0.1);
      historicalRouteActions.tick(safeDt);
      if (useHistoricalRouteStore.getState().isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  // Cena de Magalhães: fonte única (T12)
  const isVisible = forceActive || epochScene === "MAGELLAN";

  const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
  const currentWaypoint = useMemo(() => {
    const idx = Math.max(0, Math.min(totalWaypoints - 1, currentWaypointIndex));
    return MAGELLAN_ROUTE.waypoints[idx] || MAGELLAN_ROUTE.waypoints[0];
  }, [currentWaypointIndex, totalWaypoints]);

  const leaguesNavigated: number =
    typeof currentWaypoint.leaguesNavigated === "number"
      ? currentWaypoint.leaguesNavigated
      : Math.round(((currentWaypointIndex + 1) / totalWaypoints) * 14450);

  const daysAtSea: number =
    typeof currentWaypoint.daysAtSea === "number"
      ? currentWaypoint.daysAtSea
      : typeof currentWaypoint.dayOfVoyage === "number"
      ? currentWaypoint.dayOfVoyage
      : 0;

  const vessel: string =
    currentWaypoint.vessel ||
    (currentWaypointIndex >= 11 ? "Nau Victoria" : "Nau Trinidad (Capitânia)");

  const commander: string =
    currentWaypoint.commander ||
    (currentWaypointIndex >= 11 ? "Juan Sebastián Elcano" : "Fernão de Magalhães");

  const pigafettaDiary: string | null =
    currentWaypoint.pigafettaDiary || currentWaypoint.quoteFromPigafetta || null;

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    selectHistoricalRoute(null);
  };

  const handleFlyToShip = () => {
    if (currentWaypoint) {
      flyTo(currentWaypoint.lat, currentWaypoint.lng, 2.5);
    }
  };

  const formattedCoordinates = `${Math.abs(currentWaypoint.lat).toFixed(2)}°${
    currentWaypoint.lat >= 0 ? "N" : "S"
  }, ${Math.abs(currentWaypoint.lng).toFixed(2)}°${
    currentWaypoint.lng >= 0 ? "E" : "W"
  }`;

  return (
    <Panel
      data-historical-route-overlay="true"
      data-testid="historical-route-overlay"
      className={cn(
        "fixed left-3 top-[7.5rem] z-20 max-h-[calc(100vh-18.5rem)] max-w-[calc(100vw-1.5rem)] select-none overflow-y-auto p-4 text-fg animate-in fade-in slide-in-from-left-4 duration-slow sm:left-6 sm:max-w-[calc(100vw-3rem)]",
        isMinimized ? "w-80" : "w-96"
      )}
    >
      {/* 1. Header Bar */}
      <div className={cn("flex items-center justify-between", !isMinimized && "border-b border-line pb-3")}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-card border border-success/40 bg-success/15 text-success">
            <Anchor aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-label font-semibold text-fg">CIRCUM-NAVEGAÇÃO</span>
              <Badge tone="neutral">1519–1522</Badge>
            </div>
            <p className="text-caption text-fg-muted">Telemetria náutica e diário de bordo</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label={isMinimized ? "Expandir HUD" : "Minimizar HUD"}
            size="sm"
            icon={isMinimized ? <Maximize2 /> : <Minimize2 />}
            onClick={toggleMinimized}
          />
          <IconButton
            label="Fechar diário de bordo"
            size="sm"
            icon={<X />}
            onClick={handleClose}
          />
        </div>
      </div>

      {isMinimized && (
        <div className="flex items-center justify-between pt-2.5 text-caption text-fg-muted">
          <span className="max-w-[200px] truncate font-mono font-medium text-fg">
            {vessel} · WP {currentWaypointIndex + 1}/{totalWaypoints}
          </span>
          <span className="shrink-0 font-mono font-semibold tabular-nums text-warning">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}

      {!isMinimized && (
        <>
          {/* 2. Grid de Telemetria Naval da Expedição */}
          <div className="my-3 grid grid-cols-2 gap-2">
            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2.5">
              <span className="flex items-center gap-1 text-caption text-fg-muted">
                <Ship aria-hidden="true" className="h-3 w-3 text-success" /> Embarcação ativa
              </span>
              <span className="mt-1 truncate text-label font-semibold text-fg">{vessel}</span>
              <span className="mt-0.5 text-caption text-fg-muted">Armada das Molucas</span>
            </div>

            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2.5">
              <span className="flex items-center gap-1 text-caption text-fg-muted">
                <Compass aria-hidden="true" className="h-3 w-3 text-warning" /> Comandante
              </span>
              <span className="mt-1 truncate text-label font-semibold text-fg">{commander}</span>
              <span className="mt-0.5 text-caption text-fg-muted">Bandeira de Castela</span>
            </div>

            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2.5">
              <span className="text-caption text-fg-muted">Léguas navegadas</span>
              <span className="mt-0.5 font-mono text-label font-semibold tabular-nums text-fg">
                {leaguesNavigated.toLocaleString("pt-BR")}{" "}
                <span className="font-sans text-caption font-normal text-success">léguas</span>
              </span>
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                ≈ {(leaguesNavigated * 4.18).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km
              </span>
            </div>

            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2.5">
              <span className="text-caption text-fg-muted">Tempo em mar</span>
              <span className="mt-0.5 font-mono text-label font-semibold tabular-nums text-fg">
                {daysAtSea}{" "}
                <span className="font-sans text-caption font-normal text-warning">dias</span>
              </span>
              <span className="text-caption text-fg-muted">de 1.082 dias totais</span>
            </div>
          </div>

          {/* 3. Localização Geográfica e Data Histórica */}
          <div className="my-2 space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5">
            <div className="flex items-center justify-between gap-2 text-label">
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate">{currentWaypoint.name}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={handleFlyToShip}
                title="Centralizar câmera no navio"
              >
                <Eye aria-hidden="true" className="h-3 w-3 text-accent" />
                <span>Focar</span>
              </Button>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-1.5 font-mono text-caption tabular-nums text-fg-muted">
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="h-3 w-3 text-accent" />
                {currentWaypoint.date}
              </span>
              <span className="text-fg-secondary">{formattedCoordinates}</span>
            </div>
          </div>

          {/* 4. Extrato Autêntico do Diário de Bordo de Antonio Pigafetta */}
          {pigafettaDiary && (
            <div className="my-3 space-y-1.5 rounded-card border border-warning/30 bg-warning/10 p-3 text-caption">
              <div className="flex items-center gap-1.5 font-medium text-warning">
                <BookOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>Diário de Bordo — Antonio Pigafetta (1524)</span>
              </div>
              <blockquote className="my-1 border-l-2 border-warning/50 pl-2.5 font-serif italic leading-relaxed text-fg">
                &ldquo;{pigafettaDiary}&rdquo;
              </blockquote>
              <p className="font-sans leading-snug text-fg-secondary">
                {currentWaypoint.description}
              </p>
            </div>
          )}

          {/* 5. Slider de Progresso da Viagem (0% a 100%) */}
          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between font-mono text-caption tabular-nums text-fg-muted">
              <span>Sanlúcar (1519)</span>
              <span className="font-semibold text-accent">
                {Math.round(progress * 100)}% ({currentWaypointIndex + 1}/{totalWaypoints})
              </span>
              <span>Retorno (1522)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label="Progresso da circum-navegação de Magalhães"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-control accent-accent focus:outline-none"
            />
          </div>

          {/* 6. Controles de Reprodução e Stepper */}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <div className="flex items-center gap-1.5">
              <IconButton
                label="Waypoint anterior"
                size="sm"
                icon={<ChevronLeft />}
                disabled={currentWaypointIndex <= 0}
                onClick={prevWaypoint}
              />

              <Button
                variant="primary"
                size="sm"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar navegação" : "Iniciar navegação"}
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <Play aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                <span>{isPlaying ? "Pausar" : "Navegar"}</span>
              </Button>

              <IconButton
                label="Próximo waypoint"
                size="sm"
                icon={<ChevronRight />}
                disabled={currentWaypointIndex >= totalWaypoints - 1}
                onClick={nextWaypoint}
              />

              <IconButton
                label="Reiniciar circum-navegação"
                size="sm"
                icon={<RotateCcw />}
                onClick={reset}
              />
            </div>

            {/* Velocidade de Reprodução */}
            <div role="group" aria-label="Velocidade da navegação" className="flex items-center gap-1">
              {[0.5, 1.0, 2.0, 5.0].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={playbackSpeed === speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(
                    "rounded-control border px-1.5 py-0.5 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                    playbackSpeed === speed
                      ? "border-accent/60 bg-accent/15 font-semibold text-accent"
                      : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
};
