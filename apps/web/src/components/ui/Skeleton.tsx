import React from "react";
import { cn } from "./cn";

/**
 * Bloco de carregamento (D17): ocupa o lugar do conteúdo que ainda vai chegar, sem inventar valor.
 * Decorativo para leitores de tela — quem o usa marca a região com `aria-busy` e um rótulo.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <span aria-hidden="true" data-skeleton="true" className={cn("block animate-pulse rounded-control bg-line", className)} />
);

/** Esqueleto de um painel em carregamento: cabeçalho e algumas linhas. */
export const PanelSkeleton: React.FC<{ label: string; rows?: number; className?: string }> = ({ label, rows = 4, className }) => (
  <div role="status" aria-busy="true" aria-label={label} className={cn("flex flex-col gap-3 p-4", className)}>
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-card" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <Skeleton key={i} className={cn("h-12 rounded-card", i % 2 ? "w-full" : "w-11/12")} />
    ))}
  </div>
);

/** Esqueleto de modal enquanto o código do modal carrega (painéis sob demanda — T25). */
export const ModalSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 backdrop-blur-sm animate-fade-in">
    <div className="w-[min(92vw,32rem)] rounded-panel border border-line bg-surface shadow-e2 animate-pop-in">
      <PanelSkeleton label={label} rows={3} />
    </div>
  </div>
);
