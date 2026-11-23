"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { getCountryData } from "@/lib/country-data";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName, formatNumber } from "@/lib/i18n/format";

/**
 * Focos de calor no país selecionado (D05): contagem de TODOS os focos da janela que caem no
 * polígono do país (Natural Earth 110m, mesmo índice do picking), FRP total e maior foco.
 */
export const FirmsCountrySummary: React.FC<{ iso: string }> = ({ iso }) => {
  const { locale, t } = useI18n();
  const storeByCountry = useObservatoryStore((s) => s.firmsByCountry);
  const storeWindow = useObservatoryStore((s) => s.firmsWindow);
  const isServer = typeof window === "undefined";
  const byCountry = isServer ? useObservatoryStore.getState().firmsByCountry : storeByCountry;
  const firmsWindow = isServer ? useObservatoryStore.getState().firmsWindow : storeWindow;

  const isLoading = useObservatoryStore((s) => s.isLoading.NASA_FIRMS);
  const country = getCountryData(iso);
  const name = country ? formatCountryName(country.iso2, country.nameCommon, locale) : iso;
  // null = contagem indisponível (não confundir com zero focos).
  const stats = byCountry ? byCountry[iso] : undefined;
  const period =
    firmsWindow.days === 1
      ? t("obs.firms.w1", "nas últimas 24 h")
      : firmsWindow.days === 2
      ? t("obs.firms.w2", "nas últimas 48 h")
      : firmsWindow.days === 5
      ? t("obs.firms.w5", "nos últimos 5 dias")
      : "";

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
          {isLoading
            ? t("obs.firms.counting", "Contando focos no território…")
            : t("obs.firms.countUnavailable", "Contagem por país indisponível no momento.")}
        </p>
      ) : stats && stats.count > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">{formatNumber(stats.count, locale)}</span>
            <span className="text-caption text-fg-muted">{t("obs.firms.hotspotsLabel", "focos")}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">
              {formatNumber(Math.round(stats.frpSum), locale)}
            </span>
            <span className="text-caption text-fg-muted">{t("obs.firms.mwSum", "MW somados")}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-body font-medium tabular-nums text-fg">
              {formatNumber(stats.frpMax, locale, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-caption text-fg-muted">{t("obs.firms.mwMax", "MW no maior")}</span>
          </div>
        </div>
      ) : (
        <p className="text-label text-fg-secondary">{t("obs.firms.none", "Nenhum foco detectado no território neste período.")}</p>
      )}
    </div>
  );
};
