"use client";

import React, { useMemo } from "react";
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Eye, MapPin, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { useSceneStore } from "@/stores/sceneStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useEpochState } from "@/lib/epoch/useEpochState";
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

/** Estado de reprodução da cena aberta (store único, D12d). */
function usePlayback() {
  const isServer = typeof window === "undefined";
  const live = {
    isPlaying: useSceneStore((s) => s.isPlaying),
    progress: useSceneStore((s) => s.progress),
    index: useSceneStore((s) => s.stepIndex),
    speed: useSceneStore((s) => s.playbackSpeed),
    minimized: useSceneStore((s) => s.isMinimized),
  };
  const st = isServer ? useSceneStore.getState() : null;
  const store = () => useSceneStore.getState();
  return {
    isPlaying: st ? st.isPlaying : live.isPlaying,
    progress: st ? st.progress : live.progress,
    index: st ? st.stepIndex : live.index,
    speed: st ? st.playbackSpeed : live.speed,
    minimized: st ? st.isMinimized : live.minimized,
    togglePlay: () => store().togglePlay(),
    seek: (p: number) => store().seek(p),
    prev: () => store().prevStep(),
    next: () => store().nextStep(),
    jumpTo: (i: number) => {
      store().jumpToStep(i);
      store().play();
    },
    reset: () => store().reset(),
    setSpeed: (v: number) => store().setPlaybackSpeed(v),
    toggleMinimized: () => store().toggleMinimized(),
  };
}

const fmtNumber = (v: number) => v.toLocaleString("pt-BR");
const fmtCoords = (lat: number, lng: number) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const ScenePlayerOverlay: React.FC<{ sceneId?: string; closing?: boolean }> = ({ sceneId, closing = false }) => {
  const activeScene = useEpochState().activeScene;
  const id = sceneId ?? activeScene ?? undefined;
  const scene = id ? getScene(id) : undefined;
  const trajectory = scene?.trajectories[0];
  if (!scene || !trajectory || !scene.hud) return null;
  return <SceneHud scene={scene} trajectory={trajectory} closing={closing} />;
};

const SceneHud: React.FC<{ scene: Scene; trajectory: SceneTrajectory; closing: boolean }> = ({ scene, trajectory, closing }) => {
  const hud = scene.hud!;
  const pb = usePlayback();
  const flyTo = useGlobeStore((s) => s.flyTo);

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
  // Sair da cena restaura o estado de antes da abertura (timeline, país e câmera).
  const closeScene = () => useSceneStore.getState().closeScene();

  return (
    <Panel
      data-scene-player-overlay="true"
      data-scene-id={scene.id}
      data-testid="scene-player-overlay"
      data-state={closing ? "closed" : "open"}
      className={cn(
        closing ? "animate-rise-out" : "animate-rise-in",
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
                const active = i === step.index;
                return (
                  <button
                    key={ph.id}
                    type="button"
                    aria-pressed={active}
                    title={ph.label}
                    onClick={() => pb.jumpTo(i)}
                    className={cn(
                      "flex min-w-0 flex-col items-start rounded-control border p-2 text-left transition-colors duration-fast ease-out",
                      active ? "border-accent/50 bg-accent/10" : "border-line bg-surface-raised hover:bg-surface-hover"
                    )}
                  >
                    <span className="flex items-center gap-1 font-mono text-caption font-medium text-accent">
                      {active && <ChevronRight aria-hidden="true" className="h-3 w-3" />}
                      {String(ph.facts?.badge ?? ph.id)}
                    </span>
                    <span className="w-full truncate text-caption font-medium leading-tight text-fg">{ph.label}</span>
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
              <IconButton label="Passo anterior" size="sm" icon={<ChevronLeft />} onClick={pb.prev} />
              <Button variant="primary" size="sm" onClick={pb.togglePlay} aria-label={pb.isPlaying ? "Pausar cena" : "Reproduzir cena"}>
                {pb.isPlaying ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
                <span>{pb.isPlaying ? "Pausar" : "Reproduzir"}</span>
              </Button>
              <IconButton label="Próximo passo" size="sm" icon={<ChevronRight />} onClick={pb.next} />
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
