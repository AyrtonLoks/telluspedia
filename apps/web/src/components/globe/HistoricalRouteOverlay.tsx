"use client";

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
import { useTimelineStore } from "@/stores/timelineStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { MAGELLAN_ROUTE } from "@/lib/historical-routes";

export interface HistoricalRouteOverlayProps {
  forceActive?: boolean;
}

export const HistoricalRouteOverlay: React.FC<HistoricalRouteOverlayProps> = ({
  forceActive = false,
}) => {
  const storeTimelineRouteId = useTimelineStore((s) => s.activeRouteId);
  const storeRouteId = useHistoricalRouteStore((s) => s.activeRouteId);
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

  const togglePlay = useHistoricalRouteStore((s) => s.togglePlay);
  const seek = useHistoricalRouteStore((s) => s.seek);
  const nextWaypoint = useHistoricalRouteStore((s) => s.nextWaypoint);
  const prevWaypoint = useHistoricalRouteStore((s) => s.prevWaypoint);
  const reset = useHistoricalRouteStore((s) => s.reset);
  const setPlaybackSpeed = useHistoricalRouteStore((s) => s.setPlaybackSpeed);
  const toggleMinimized = useHistoricalRouteStore((s) => s.toggleMinimized);
  const setActiveRouteId = useHistoricalRouteStore((s) => s.setActiveRouteId);

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
      useHistoricalRouteStore.getState().tick(safeDt);
      if (useHistoricalRouteStore.getState().isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  const activeRouteId =
    typeof window === "undefined"
      ? (useHistoricalRouteStore.getState().activeRouteId ||
         useTimelineStore.getState().activeRouteId)
      : (storeRouteId || storeTimelineRouteId);

  const isVisible = forceActive || activeRouteId === "magellan-1519";

  const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
  const currentWaypoint = useMemo(() => {
    const idx = Math.max(0, Math.min(totalWaypoints - 1, currentWaypointIndex));
    return MAGELLAN_ROUTE.waypoints[idx] || MAGELLAN_ROUTE.waypoints[0];
  }, [currentWaypointIndex, totalWaypoints]);

  const waypointAny = (currentWaypoint || {}) as any;
  const leaguesNavigated: number =
    typeof waypointAny.leaguesNavigated === "number"
      ? waypointAny.leaguesNavigated
      : Math.round(((currentWaypointIndex + 1) / totalWaypoints) * 14450);

  const daysAtSea: number =
    typeof waypointAny.daysAtSea === "number"
      ? waypointAny.daysAtSea
      : typeof waypointAny.dayOfVoyage === "number"
      ? waypointAny.dayOfVoyage
      : 0;

  const vessel: string =
    waypointAny.vessel ||
    (currentWaypointIndex >= 11 ? "Nau Victoria" : "Nau Trinidad (Capitânia)");

  const commander: string =
    waypointAny.commander ||
    (currentWaypointIndex >= 11 ? "Juan Sebastián Elcano" : "Fernão de Magalhães");

  const pigafettaDiary: string | null =
    waypointAny.pigafettaDiary ||
    waypointAny.quoteFromPigafetta ||
    null;

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    setActiveRouteId(null);
    useTimelineStore.getState().setActiveRouteId(null);
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
    <div
      data-historical-route-overlay="true"
      data-testid="historical-route-overlay"
      className={`fixed top-16 sm:top-20 left-3 sm:left-6 z-20 ${
        isMinimized ? "w-80" : "w-96"
      } max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-3rem)] glass-panel rounded-2xl p-4 shadow-2xl border border-emerald-500/40 bg-slate-950/90 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-left-4 text-slate-100 select-none`}
    >
      {/* 1. Header Bar: Título, Ícone Náutico, Minimizar & Fechar */}
      <div className={`flex items-center justify-between ${isMinimized ? "" : "pb-3 border-b border-slate-800"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
            <Anchor className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-emerald-400">
                CIRCUM-NAVEGAÇÃO
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono">
                1519–1522
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Telemetria Náutica & Diário de Bordo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimized}
            aria-label={isMinimized ? "Expandir HUD" : "Minimizar HUD"}
            title={isMinimized ? "Expandir HUD" : "Minimizar HUD"}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleClose}
            aria-label="Fechar diário de bordo"
            title="Fechar"
            className="p-1.5 rounded-lg hover:bg-red-950/40 hover:text-red-300 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMinimized && (
        <div className="flex items-center justify-between pt-2.5 text-[10px] text-slate-400">
          <span className="text-emerald-300 font-mono font-medium truncate max-w-[200px]">
            {vessel} • WP {currentWaypointIndex + 1}/{totalWaypoints}
          </span>
          <span className="text-amber-300 font-mono font-bold shrink-0">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}

      {!isMinimized && (
        <>
          {/* 2. Grid de Telemetria Naval da Expedição */}
          <div className="grid grid-cols-2 gap-2 my-3">
            {/* Navio Ativo */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Ship className="w-3 h-3 text-emerald-400" /> Embarcação Ativa
              </span>
              <span className="text-xs font-semibold text-emerald-300 mt-1 truncate">
                {vessel}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">
                Armada das Molucas
              </span>
            </div>

            {/* Comandante Ativo */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-400" /> Comandante
              </span>
              <span className="text-xs font-semibold text-amber-300 mt-1 truncate">
                {commander}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">
                Bandeira de Castela
              </span>
            </div>

            {/* Léguas Navegadas */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Léguas Navegadas
              </span>
              <span className="text-xs font-mono font-bold text-slate-100 mt-0.5">
                {leaguesNavigated.toLocaleString("pt-BR")}{" "}
                <span className="text-[9px] text-emerald-400 font-sans">
                  léguas
                </span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                ≈ {(leaguesNavigated * 4.18).toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}{" "}
                km
              </span>
            </div>

            {/* Dias de Viagem */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                Tempo em Mar
              </span>
              <span className="text-xs font-mono font-bold text-slate-100 mt-0.5">
                {daysAtSea}{" "}
                <span className="text-[9px] text-amber-400 font-sans">dias</span>
              </span>
              <span className="text-[9px] text-slate-400">
                de 1.082 dias totais
              </span>
            </div>
          </div>

          {/* 3. Localização Geográfica e Data Histórica */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 my-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{currentWaypoint.name}</span>
              </span>
              <button
                onClick={handleFlyToShip}
                title="Centralizar Câmera no Navio"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors shrink-0"
              >
                <Eye className="w-3 h-3" /> Focar
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                {currentWaypoint.date}
              </span>
              <span className="text-emerald-400/90">{formattedCoordinates}</span>
            </div>
          </div>

          {/* 4. Extrato Autêntico do Diário de Bordo de Antonio Pigafetta */}
          {pigafettaDiary && (
            <div className="my-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-100/90 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>Diário de Bordo — Antonio Pigafetta (1524)</span>
              </div>
              <blockquote className="italic leading-relaxed text-amber-200/95 font-serif border-l-2 border-amber-500/50 pl-2.5 my-1">
                &ldquo;{pigafettaDiary}&rdquo;
              </blockquote>
              <p className="text-[10px] text-slate-400 font-sans leading-tight">
                {currentWaypoint.description}
              </p>
            </div>
          )}

          {/* 5. Slider de Progresso da Viagem (0% a 100%) */}
          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Sanlúcar (1519)</span>
              <span className="text-emerald-300 font-bold">
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
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 focus:outline-none"
            />
          </div>

          {/* 6. Controles de Reprodução e Stepper */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevWaypoint}
                disabled={currentWaypointIndex <= 0}
                aria-label="Waypoint anterior"
                title="Waypoint anterior"
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar navegação" : "Iniciar navegação"}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isPlaying ? "Pausar" : "Navegar"}</span>
              </button>

              <button
                onClick={nextWaypoint}
                disabled={currentWaypointIndex >= totalWaypoints - 1}
                aria-label="Próximo waypoint"
                title="Próximo waypoint"
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={reset}
                aria-label="Reiniciar circum-navegação"
                title="Reiniciar rota"
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Velocidade de Reprodução */}
            <div className="flex items-center gap-1">
              {[0.5, 1.0, 2.0, 5.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono transition-colors ${
                    playbackSpeed === speed
                      ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
