"use client";

import React from "react";
import { GeodesicRulerPanel } from "./GeodesicRulerPanel";
import { StudyPinsPanel } from "./StudyPinsPanel";

export interface StudioToolsHudProps {
  immutable?: boolean;
  onUnlockDraftFork?: () => void;
}

/**
 * Empilha os cartões flutuantes das Ferramentas de Estúdio (D37: Régua Geodésica + Pinos Anotados)
 * logo abaixo da barra `map-tools`, sem obstruir a `TopNavBar`, o `RightDock` ou a `TimelineBar`.
 */
export const StudioToolsHud: React.FC<StudioToolsHudProps> = ({
  immutable = false,
  onUnlockDraftFork,
}) => {
  return (
    <div
      data-testid="studio-tools-hud"
      className="pointer-events-none fixed left-3 top-[calc(var(--map-tools-top)+3rem)] z-20 flex max-h-[calc(100dvh-11rem)] w-[min(calc(100vw-1.5rem),22.5rem)] flex-col gap-2 overflow-y-auto xl:left-6"
    >
      <GeodesicRulerPanel />
      <StudyPinsPanel immutable={immutable} onUnlockDraftFork={onUnlockDraftFork} />
    </div>
  );
};
