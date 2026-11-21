"use client";

import React, { useEffect, useMemo } from "react";
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Eye, MapPin, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { historicalRouteActions, selectHistoricalRoute } from "@/stores/actions";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { useApollo11Store } from "@/stores/apollo11Store";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { EPOCH_SCENE_DATA_IDS } from "@/lib/epoch/constants";
import { getScene } from "@/lib/scenes/catalog";
import type { Scene, SceneTrajectory } from "@/lib/scenes/schema";
import { cislunarTelemetry } from "@/lib/scenes/cislunar";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

/**
 * Painel genérico do player de cenas (D12c, parte 2). Mostra a cena ativa com os textos e as
 * estatísticas definidos nos dados (`hud`), o passo atual (ponto da rota ou fase da missão),
 * a citação, os controles de reprodução e a barra de progresso. Substitui os
 * painéis antigos, feitos à mão para cada evento.
 */

type Surface = Extract<SceneTrajectory, { kind: "surface" }>;
type Cislunar = Extract<SceneTrajectory, { kind: "cislunar" }>;

/** Estado de reprodução por tipo de trajetória (stores existentes; a D12d unifica a ativação). */
function usePlayback(kind: SceneTrajectory["kind"]) {
  const isServer = typeof window === "undefined";
  const surface = {
    isPlaying: useHistoricalRouteStore((s) => s.isPlaying),
    progress: useHistoricalRouteStore((s) => s.progress),
    index: useHistoricalRouteStore((s) => s.currentWaypointIndex),
    speed: useHistoricalRouteStore((s) => s.playbackSpeed),
    minimized: useHistoricalRouteStore((s) => s.isMinimized),
  };
  const cis = {
    isPlaying: useApollo11Store((s) => s.isPlaying),
    progress: useApollo11Store((s) => s.progress),
    speed: useApollo11Store((s) => s.playbackSpeed),
    minimized: useApollo11Store((s) => s.isMinimized),
  };
  if (kind === "surface") {
    const st = isServer ? useHistoricalRouteStore.getState() : null;
    return {
      isPlaying: st ? st.isPlaying : surface.isPlaying,
      progress: st ? st.progress : surface.progress,
      index: st ? st.currentWaypointIndex : surface.index,
      speed: st ? st.playbackSpeed : surface.speed,
      minimized: st ? st.isMinimized : surface.minimized,
      togglePlay: () => historicalRouteActions.togglePlay(),
      seek: (p: number) => historicalRouteActions.seek(p),
      prev: () => historicalRouteActions.prevWaypoint(),
      next: () => historicalRouteActions.nextWaypoint(),
      reset: () => historicalRouteActions.reset(),
      setSpeed: (v: number) => useHistoricalRouteStore.getState().setPlaybackSpeed(v),
      toggleMinimized: () => useHistoricalRouteStore.getState().toggleMinimized(),
    };
  }
  const st = isServer ? useApollo11Store.getState() : null;
  return {
    isPlaying: st ? st.isPlaying : cis.isPlaying,
    progress: st ? st.progress : cis.progress,
    index: -1,
    speed: st ? st.playbackSpeed : cis.speed,
    minimized: st ? st.isMinimized : cis.minimized,
    togglePlay: () => useApollo11Store.getState().togglePlay(),
    seek: (p: number) => useApollo11Store.getState().setProgress(p),
    prev: () => undefined,
    next: () => undefined,
    reset: () => useApollo11Store.getState().resetMission(),
    setSpeed: (v: number) => useApollo11Store.getState().setPlaybackSpeed(v),
    toggleMinimized: () => useApollo11Store.getState().toggleMinimized(),
  };
}

const fmtNumber = (v: number) => v.toLocaleString("pt-BR");
const fmtCoords = (lat: number, lng: number) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const ScenePlayerOverlay: React.FC<{ sceneId?: string }> = ({ sceneId }) => {
  const activeScene = useEpochState().activeScene;
  const id = sceneId ?? (activeScene ? EPOCH_SCENE_DATA_IDS[activeScene] : undefined);
  const scene = id ? getScene(id) : undefined;
  const trajectory = scene?.trajectories[0];
  if (!scene || !trajectory || !scene.hud) return null;
  return <SceneHud scene={scene} trajectory={trajectory} />;
};

const SceneHud: React.FC<{ scene: Scene; trajectory: SceneTrajectory }> = ({ scene, trajectory }) => {
  const hud = scene.hud!;
  const pb = usePlayback(trajectory.kind);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Reprodução das rotas de superfície (a missão Terra–Lua avança pelo quadro 3D).
  useEffect(() => {
    if (trajectory.kind !== "surface" || !pb.isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      historicalRouteActions.tick(Math.min((now - last) / 1000, 0.1));
      last = now;
      if (useHistoricalRouteStore.getState().isPlaying) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [trajectory.kind, pb.isPlaying, pb.speed]);

  const step = useMemo(() => {
    if (trajectory.kind === "surface") {
      const t = trajectory as Surface;
      const i = Math.max(0, Math.min(t.points.length - 1, pb.index));
      const p = t.points[i];
      return { kind: "surface" as const, index: i, total: t.points.length, title: p.name, facts: p.facts ?? {}, description: p.description, date: fmtDate(p.time), lat: p.lat, lng: p.lng, quoteText: (hud.quoteFact && p.facts?.[hud.quoteFact] !== undefined ? String(p.facts[hud.quoteFact]) : p.quote?.text) ?? null };
    }
    const t = trajectory as Cislunar;
    const tel = cislunarTelemetry(t, pb.progress);
    const ph = t.phases[tel.phaseIndex];
    return { kind: "cislunar" as const, index: tel.phaseIndex, total: t.phases.length, title: ph.label, facts: ph.facts ?? {}, description: ph.description, telemetry: tel, quoteText: null as string | null };
  }, [trajectory, pb.index, pb.progress, hud.quoteFact]);

  const pct = Math.round(pb.progress * 100);
  const closeScene = () => {
    if (trajectory.kind === "surface") selectHistoricalRoute(null);
    useTimelineStore.getState().selectMilestone(null);
  };

  return (
    <Panel
      data-scene-player-overlay="true"
      data-scene-id={scene.id}
      data-testid="scene-player-overlay"
      className={cn(
        "fixed left-3 top-[7.5rem] z-20 max-h-[calc(100vh-18.5rem)] max-w-[calc(100vw-1.5rem)] select-none overflow-y-auto p-4 text-fg",
        pb.minimized ? "w-80" : "w-96"
      )}
    >
      {/* Cabeçalho */}
      <div className={cn("flex items-center justify-between gap-2", !pb.minimized && "border-b border-line pb-3")}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-label font-semibold text-fg">{hud.badge}</span>
            {hud.period && <Badge tone="neutral">{hud.period}</Badge>}
          </div>
          {hud.subtitle && <p className="text-caption text-fg-muted">{hud.subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={pb.minimized ? "Expandir HUD" : "Minimizar HUD"} size="sm" icon={pb.minimized ? <Maximize2 /> : <Minimize2 />} onClick={pb.toggleMinimized} />
          <IconButton label="Fechar cena" size="sm" icon={<X />} onClick={closeScene} />
        </div>
      </div>

      {pb.minimized ? (
        <div className="flex items-center justify-between pt-2.5 text-caption text-fg-muted">
          <span className="max-w-[200px] truncate font-mono font-medium text-fg">
            {step.title} · {step.index + 1}/{step.total}
          </span>
          <span className="shrink-0 font-mono font-semibold tabular-nums text-warning">{pct}%</span>
        </div>
      ) : (
        <>
          {/* Estatísticas do passo atual (configuradas nos dados) */}
          {(hud.stepStats.length > 0 || step.kind === "cislunar") && (
            <div className="my-3 grid grid-cols-2 gap-2">
              {step.kind === "cislunar" && (
                <>
                  <Stat label="Distância da Terra" value={fmtNumber(step.telemetry.distanceKm)} unit="km" note="escala aproximada" />
                  <Stat label="Tempo de missão (GET)" value={step.telemetry.getFormatted} unit="HHH:MM:SS" />
                </>
              )}
              {hud.stepStats.map((s) => {
                const v = step.facts[s.fact];
                if (v === undefined) return null;
                return (
                  <Stat
                    key={s.fact}
                    label={s.label}
                    value={typeof v === "number" ? fmtNumber(v) : v}
                    unit={s.unit}
                    note={s.approx && typeof v === "number" ? `≈ ${(v * s.approx.factor).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${s.approx.unit}` : s.note}
                  />
                );
              })}
            </div>
          )}

          {/* Passo atual: ponto da rota ou fase da missão */}
          <div className="my-2 space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5">
            <div className="flex items-center justify-between gap-2 text-label">
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success" />
                <span className="truncate">{step.title}</span>
              </span>
              {step.kind === "surface" && (
                <Button variant="secondary" size="sm" className="shrink-0" onClick={() => flyTo(step.lat, step.lng, 2.5)} title="Centralizar câmera no veículo">
                  <Eye aria-hidden="true" className="h-3 w-3 text-accent" />
                  <span>Focar</span>
                </Button>
              )}
            </div>
            {step.kind === "surface" ? (
              <div className="flex items-center justify-between border-t border-line pt-1.5 font-mono text-caption tabular-nums text-fg-muted">
                <span className="flex items-center gap-1">
                  <Calendar aria-hidden="true" className="h-3 w-3 text-accent" />
                  {step.date}
                </span>
                <span className="text-fg-secondary">{fmtCoords(step.lat, step.lng)}</span>
              </div>
            ) : (
              step.description && <p className="border-t border-line pt-1.5 text-caption leading-snug text-fg-secondary">{step.description}</p>
            )}
          </div>

          {/* Fases (missões Terra–Lua): saltar para uma fase */}
          {trajectory.kind === "cislunar" && (
            <div role="group" aria-label="Fases da missão" className="my-3 grid grid-cols-2 gap-1.5">
              {(trajectory as Cislunar).phases.map((ph, i) => {
                const start = typeof ph.facts?.startProgress === "number" ? ph.facts.startProgress : i / (trajectory as Cislunar).phases.length;
                const active = i === step.index;
                return (
                  <button
                    key={ph.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      useApollo11Store.getState().setProgress(start);
                      useApollo11Store.getState().setPlaying(true);
                    }}
                    className={cn(
                      "flex flex-col items-start rounded-control border p-2 text-left transition-colors duration-fast ease-out",
                      active ? "border-accent/50 bg-accent/10" : "border-line bg-surface-raised hover:bg-surface-hover"
                    )}
                  >
                    <span className="flex items-center gap-1 font-mono text-caption font-medium text-accent">
                      {active && <ChevronRight aria-hidden="true" className="h-3 w-3" />}
                      {String(ph.facts?.badge ?? ph.id)}
                    </span>
                    <span className="truncate text-caption font-medium leading-tight text-fg">{ph.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Citação do passo */}
          {step.quoteText && (
            <div className="my-3 space-y-1.5 rounded-card border border-warning/30 bg-warning/10 p-3 text-caption">
              <div className="flex items-center gap-1.5 font-medium text-warning">
                <BookOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>{hud.quoteTitle ?? "Citação"}</span>
              </div>
              <blockquote className="my-1 border-l-2 border-warning/50 pl-2.5 font-serif italic leading-relaxed text-fg">&ldquo;{step.quoteText}&rdquo;</blockquote>
              {step.description && <p className="font-sans leading-snug text-fg-secondary">{step.description}</p>}
            </div>
          )}

          {/* Linha do tempo da cena */}
          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between font-mono text-caption tabular-nums text-fg-muted">
              <span>{hud.startLabel}</span>
              <span className="font-semibold text-accent">
                {pct}% ({step.index + 1}/{step.total})
              </span>
              <span>{hud.endLabel}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={pb.progress}
              onChange={(e) => pb.seek(parseFloat(e.target.value))}
              aria-label={hud.progressLabel}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-control accent-accent focus:outline-none"
            />
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {trajectory.kind === "surface" && <IconButton label="Passo anterior" size="sm" icon={<ChevronLeft />} onClick={pb.prev} />}
              <Button variant="primary" size="sm" onClick={pb.togglePlay} aria-label={pb.isPlaying ? "Pausar cena" : "Reproduzir cena"}>
                {pb.isPlaying ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
                <span>{pb.isPlaying ? "Pausar" : "Reproduzir"}</span>
              </Button>
              {trajectory.kind === "surface" && <IconButton label="Próximo passo" size="sm" icon={<ChevronRight />} onClick={pb.next} />}
              <IconButton label="Reiniciar cena" size="sm" icon={<RotateCcw />} onClick={pb.reset} />
            </div>
            <div role="group" aria-label="Velocidade da cena" className="flex items-center gap-1">
              {hud.speeds.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={pb.speed === v}
                  onClick={() => pb.setSpeed(v)}
                  className={cn(
                    "rounded-control border px-1.5 py-0.5 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                    pb.speed === v ? "border-accent/50 bg-accent/15 text-fg" : "border-line text-fg-muted hover:text-fg"
                  )}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>

          {hud.cameras.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
              {hud.cameras.map((c) => (
                <Button key={c.label} variant="secondary" size="sm" onClick={() => flyTo(c.lat, c.lng, c.altitude)}>
                  <Eye aria-hidden="true" className="h-3 w-3 text-accent" />
                  <span>{c.label}</span>
                </Button>
              ))}
            </div>
          )}

          {hud.finalQuote && pb.progress >= hud.finalQuote.minProgress && (
            <p className="mt-3 rounded-card border border-success/30 bg-success/10 p-2.5 text-caption italic text-fg">&ldquo;{hud.finalQuote.text}&rdquo;</p>
          )}

          <p className="mt-3 border-t border-line pt-2 text-caption text-fg-muted">
            Fonte: {scene.sources.map((s) => s.label).join(" · ")}
          </p>
        </>
      )}
    </Panel>
  );
};

const Stat: React.FC<{ label: string; value: string; unit?: string; note?: string }> = ({ label, value, unit, note }) => (
  <div className="flex min-w-0 flex-col rounded-card border border-line bg-surface-raised p-2.5">
    <span className="text-caption text-fg-muted">{label}</span>
    <span className="mt-0.5 truncate font-mono text-label font-semibold tabular-nums text-fg">
      {value} {unit && <span className="font-sans text-caption font-normal text-fg-muted">{unit}</span>}
    </span>
    {note && <span className="truncate text-caption text-fg-muted">{note}</span>}
  </div>
);
