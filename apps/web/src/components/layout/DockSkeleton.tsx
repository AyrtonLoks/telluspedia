"use client";

import React from "react";
import { PanelSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import { useRightDock } from "./useRightDock";
import { DOCK_FRAME_CLASSES, dockMotionClasses } from "./dockFrame";

/** Ocupa o lugar do dock enquanto o código dele carrega — só quando há painel para mostrar. */
export const DockSkeleton: React.FC = () => {
  const dock = useRightDock();
  if (!dock.visible) return null;
  return (
    <section aria-label="Painel lateral" className={cn(DOCK_FRAME_CLASSES, dockMotionClasses(false))}>
      <PanelSkeleton label="Carregando painel" rows={5} />
    </section>
  );
};
