"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { getCountryData } from "@/lib/country-data";

const WINDOW_TEXT: Record<number, string> = { 1: "nas últimas 24 h", 2: "nas últimas 48 h", 5: "nos últimos 5 dias" };

/**
 * Focos de calor no país selecionado (D05): contagem de TODOS os focos da janela que caem no
 * polígono do país (Natural Earth 110m, mesmo índice do picking), FRP total e maior foco.
 */
export const FirmsCountrySummary: React.FC<{ iso: string }> = ({ iso }) => {
  const storeByCountry = useObservatoryStore((s) => s.firmsByCountry);
  const storeWindow = useObservatoryStore((s) => s.firmsWindow);
  const isServer = typeof window === "undefined";
  const byCountry = isServer ? useObservatoryStore.getState().firmsByCountry : storeByCountry;
  const firmsWindow = isServer ? useObservatoryStore.getState().firmsWindow : storeWindow;

  const isLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);
  const name = getCountryData(iso)?.nameCommon ?? iso;
  // null = contagem indisponível (não confundir com zero focos).
  const stats = byCountry ? byCountry[iso] : undefined;
  const period = WINDOW_TEXT[firmsWindow.days] ?? "";

  return (
    <div data-testid="firms-country-summary" className="rounded-card border border-line bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-caption text-fg-muted">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          {name} · {period}
        </span>
      </div>
      {byCountry === null ? (
        <p className="text-label text-fg-secondary">
          {isLoading ? "Contando focos no território…" : "Contagem por país indisponível no momento."}
        </p>
      ) : stats && stats.count > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">{stats.count.toLocaleString("pt-BR")}</span>
            <span className="text-caption text-fg-muted">focos</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">
              {Math.round(stats.frpSum).toLocaleString("pt-BR")}
            </span>
            <span className="text-caption text-fg-muted">MW somados</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">
              {stats.frpMax.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </span>
            <span className="text-caption text-fg-muted">MW no maior</span>
          </div>
        </div>
      ) : (
        <p className="text-label text-fg-secondary">Nenhum foco detectado no território neste período.</p>
      )}
    </div>
  );
};
