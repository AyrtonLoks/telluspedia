"use client";

import React, { useMemo } from "react";
import {
  Rocket,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Eye,
  Minimize2,
  Maximize2,
  ChevronRight,
  Gauge,
  Milestone,
} from "lucide-react";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useGlobeStore } from "@/stores/globeStore";
import { useApollo11Store } from "@/stores/apollo11Store";
import {
  APOLLO11_MOON_CAMERA,
  APOLLO11_PHASES,
  APOLLO11_WIDE_CAMERA,
  getMissionTelemetry,
} from "@/lib/apollo11";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

export interface Apollo11TelemetryOverlayProps {
  forceActive?: boolean;
}

export const Apollo11TelemetryOverlay: React.FC<Apollo11TelemetryOverlayProps> = ({
  forceActive = false,
}) => {
  // Cena Apollo 11 só por seleção explícita (marco/estudo), nunca pelo ano (T12).
  const isApolloScene = useEpochState().activeScene === "APOLLO11";

  const storeIsPlaying = useApollo11Store((s) => s.isPlaying);
  const isPlaying =
    typeof window === "undefined"
      ? (useApollo11Store.getState().isPlaying ?? storeIsPlaying)
      : storeIsPlaying;

  const storeProgress = useApollo11Store((s) => s.progress);
  const progress =
    typeof window === "undefined"
      ? (useApollo11Store.getState().progress ?? storeProgress)
      : storeProgress;

  const storePlaybackSpeed = useApollo11Store((s) => s.playbackSpeed);
  const playbackSpeed =
    typeof window === "undefined"
      ? (useApollo11Store.getState().playbackSpeed ?? storePlaybackSpeed)
      : storePlaybackSpeed;

  const storeIsMinimized = useApollo11Store((s) => s.isMinimized);
  const isMinimized =
    typeof window === "undefined"
      ? (useApollo11Store.getState().isMinimized ?? storeIsMinimized)
      : storeIsMinimized;

  const togglePlay = useApollo11Store((s) => s.togglePlay);
  const setProgress = useApollo11Store((s) => s.setProgress);
  const setPlaybackSpeed = useApollo11Store((s) => s.setPlaybackSpeed);
  const toggleMinimized = useApollo11Store((s) => s.toggleMinimized);
  const jumpToPhase = useApollo11Store((s) => s.jumpToPhase);
  const resetMission = useApollo11Store((s) => s.resetMission);

  const flyTo = useGlobeStore((s) => s.flyTo);

  const isVisible = forceActive || isApolloScene;

  const telemetry = useMemo(() => {
    return getMissionTelemetry(progress);
  }, [progress]);

  if (!isVisible) return null;

  const handleWideView = () => {
    flyTo(APOLLO11_WIDE_CAMERA.lat, APOLLO11_WIDE_CAMERA.lng, APOLLO11_WIDE_CAMERA.altitude);
  };

  const handleCanaveralView = () => {
    flyTo(28.5721, -80.648, 2.0);
  };

  const handleMoonView = () => {
    flyTo(APOLLO11_MOON_CAMERA.lat, APOLLO11_MOON_CAMERA.lng, APOLLO11_MOON_CAMERA.altitude);
  };

  return (
    <Panel
      data-apollo-telemetry-overlay="true"
      className="fixed left-6 top-[7.5rem] z-20 max-h-[calc(100vh-18.5rem)] w-88 max-w-[calc(100vw-3rem)] select-none overflow-y-auto p-4 text-fg animate-in fade-in slide-in-from-left-4 duration-slow"
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-card border border-accent/40 bg-accent/15 text-accent">
            <Rocket aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-label font-semibold text-fg">APOLLO 11</span>
              <Badge tone="neutral">1969</Badge>
            </div>
            <p className="text-caption text-fg-muted">Telemetria de Voo Espacial NASA</p>
          </div>
        </div>

        <IconButton
          label={isMinimized ? "Expandir HUD" : "Minimizar HUD"}
          size="sm"
          icon={isMinimized ? <Maximize2 /> : <Minimize2 />}
          onClick={toggleMinimized}
        />
      </div>

      {!isMinimized && (
        <>
          {/* 2. Real-time Telemetry Metrics Grid */}
          <div className="my-3 grid grid-cols-3 gap-2">
            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2">
              <span className="flex items-center gap-1 text-caption text-fg-muted">
                <Gauge aria-hidden="true" className="h-3 w-3 text-accent" /> Vel.
              </span>
              <span className="mt-1 font-mono text-label font-semibold tabular-nums text-fg">
                {telemetry.speedKmH.toLocaleString("pt-BR")}
              </span>
              <span className="font-mono text-caption text-fg-muted">km/h</span>
            </div>

            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2">
              <span className="flex items-center gap-1 text-caption text-fg-muted">
                <Milestone aria-hidden="true" className="h-3 w-3 text-accent" /> Dist.
              </span>
              <span className="mt-1 font-mono text-label font-semibold tabular-nums text-fg">
                {telemetry.distanceKm.toLocaleString("pt-BR")}
              </span>
              <span className="font-mono text-caption text-fg-muted">km</span>
            </div>

            <div className="flex flex-col rounded-card border border-line bg-surface-raised p-2">
              <span className="flex items-center gap-1 text-caption text-fg-muted">
                <Radio aria-hidden="true" className="h-3 w-3 text-warning" /> GET
              </span>
              <span className="mt-1 font-mono text-label font-semibold tabular-nums text-warning">
                {telemetry.getFormatted}
              </span>
              <span className="font-mono text-caption text-fg-muted">HHH:MM:SS</span>
            </div>
          </div>

          {/* 3. Mission Phase Stepper */}
          <div className="my-3 space-y-1.5">
            <span className="text-caption font-medium text-fg-muted">
              Fases da missão translunar
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {APOLLO11_PHASES.map((phase) => {
                const isActive = telemetry.phase.id === phase.id;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => jumpToPhase(phase.id)}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-card border p-2 text-left text-caption transition-colors duration-fast ease-out",
                      isActive
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-line bg-surface-raised text-fg-secondary hover:border-line-strong hover:text-fg"
                    )}
                  >
                    <span className="flex items-center gap-1 font-mono text-caption font-medium text-accent">
                      {isActive && <ChevronRight aria-hidden="true" className="h-3 w-3" />}
                      {phase.badge}
                    </span>
                    <span className="truncate text-caption font-medium leading-tight text-fg">
                      {phase.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Phase Description */}
            <div className="mt-2 flex items-start gap-2 rounded-card border border-line bg-surface-sunken p-2 text-caption text-fg-secondary">
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <p className="leading-snug">{telemetry.phase.description}</p>
            </div>
          </div>

          {/* 4. Scrubbable Mission Timeline Slider */}
          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between font-mono text-caption tabular-nums text-fg-muted">
              <span>0% (Canaveral)</span>
              <span className="font-semibold text-accent">{Math.round(progress * 100)}%</span>
              <span>100% (Tranquilidade)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.002"
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              aria-label="Progresso da missão Apollo 11"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-control accent-accent focus:outline-none"
            />
          </div>

          {/* 5. Playback Controls & Speed Multipliers */}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar voo orbital" : "Iniciar voo orbital"}
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <Play aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                <span>{isPlaying ? "Pausar" : "Reproduzir"}</span>
              </Button>

              <IconButton
                label="Reiniciar voo"
                size="sm"
                icon={<RotateCcw />}
                onClick={resetMission}
              />
            </div>

            {/* Speed Multipliers */}
            <div role="group" aria-label="Velocidade da missão" className="flex items-center gap-1">
              {[0.5, 1.0, 2.0].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={playbackSpeed === speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(
                    "rounded-control border px-2 py-1 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
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

          {/* 6. Cinematic Camera Presets */}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-caption">
            <span className="flex items-center gap-1 text-fg-muted">
              <Eye aria-hidden="true" className="h-3 w-3 text-accent" /> Câmera:
            </span>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={handleWideView}>
                Orbital Ampla
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCanaveralView}>
                Terra
              </Button>
              <Button variant="secondary" size="sm" onClick={handleMoonView}>
                Lua
              </Button>
            </div>
          </div>

          {/* 7. Historical Radio Transmission Pill */}
          {progress >= 0.96 && (
            <div className="mt-3 flex items-center gap-2 rounded-card border border-warning/40 bg-warning/10 p-2 font-mono text-caption text-warning animate-in fade-in">
              <Radio aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>&ldquo;Houston, Tranquility Base here. The Eagle has landed.&rdquo;</span>
            </div>
          )}
        </>
      )}
    </Panel>
  );
};

export default Apollo11TelemetryOverlay;
