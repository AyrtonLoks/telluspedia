"use client";

import React from "react";
import { ExternalLink, Trees, TrendingDown, TrendingUp } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import {
  INPE_PRODES_CITATION,
  INPE_PRODES_SERIES,
  INPE_PRODES_SOURCE_URLS,
  INPE_TERRABRASILIS_PORTAL_URL,
  PRODES_MONITORING_REGIONS,
  computeProdesYoYChange,
} from "@/lib/inpe-data";
import type { ProdesBiomeId } from "@/lib/inpe-types";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

const PRODES_BIOMES: readonly ProdesBiomeId[] = ["amazonia", "cerrado"];

/**
 * Painel analítico D14 do INPE TerraBrasilis (PRODES 2015–2025 + alertas DETER — D30).
 * Carregado sob demanda via `next/dynamic` dentro de `ObservatoryPanel`.
 */
export const InpeDeforestationControls: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const storeBiome = useObservatoryStore((s) => s.prodesBiome);
  const storePayload = useObservatoryStore((s) => s.inpeDeforestation);
  const setProdesBiome = useObservatoryStore((s) => s.setProdesBiome);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const biome = ssr?.prodesBiome ?? storeBiome;
  const payload = ssr ? ssr.inpeDeforestation : storePayload;

  const series = payload?.prodes[biome] ?? INPE_PRODES_SERIES[biome];
  const latest = series[series.length - 1];
  const peak = series.reduce((best, cur) => (cur.km2 > best.km2 ? cur : best), series[0]);
  const maxKm2 = Math.max(1, peak.km2);
  const yoy = computeProdesYoYChange(series);
  const biomeAlerts = (payload?.deterAlerts ?? []).filter((a) => a.biome === biome);
  const biomeAlertArea =
    Math.round(biomeAlerts.reduce((acc, a) => acc + a.areaKm2, 0) * 100) / 100;

  const handleSelectBiome = (next: ProdesBiomeId) => {
    setProdesBiome(next);
    const region = PRODES_MONITORING_REGIONS[next];
    flyTo(region.centerLat, region.centerLng, 2.05);
  };

  const prodesUrl = payload?.prodesSourceUrls[biome] ?? INPE_PRODES_SOURCE_URLS[biome];
  const portalUrl = payload?.deterPortalUrl ?? INPE_TERRABRASILIS_PORTAL_URL;
  const citation = payload?.prodesCitation ?? INPE_PRODES_CITATION;

  return (
    <div data-testid="inpe-deforestation-controls" className="space-y-3">
      {/* Seletor de bioma monitorado pelo PRODES/DETER */}
      <div
        role="group"
        aria-label={t("obs.inpe.biomeAria", "Bioma monitorado pelo INPE")}
        className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface p-0.5"
      >
        {PRODES_BIOMES.map((id) => {
          const region = PRODES_MONITORING_REGIONS[id];
          const active = biome === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`inpe-biome-${id}`}
              aria-pressed={active}
              onClick={() => handleSelectBiome(id)}
              className={cn(
                "h-7 rounded-control px-2 text-caption font-medium transition-colors duration-fast ease-out",
                active
                  ? "bg-accent/15 text-accent"
                  : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
              )}
            >
              {locale === "en" ? region.nameEn : region.namePt}
            </button>
          );
        })}
      </div>

      {/* Cartões de leitura rápida PRODES (dados oficiais consolidados 2015–2025) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line bg-surface p-2">
          <span className="block text-caption text-fg-muted">
            PRODES {latest.year}
          </span>
          <span className="mt-0.5 block font-mono text-label font-semibold tabular-nums text-fg">
            {formatNumber(latest.km2, locale)} km²
          </span>
          {yoy !== null && (
            <span
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 font-mono text-caption tabular-nums",
                yoy <= 0 ? "text-success" : "text-danger"
              )}
            >
              {yoy <= 0 ? (
                <TrendingDown aria-hidden="true" className="h-3 w-3 shrink-0" />
              ) : (
                <TrendingUp aria-hidden="true" className="h-3 w-3 shrink-0" />
              )}
              {yoy > 0 ? `+${yoy}%` : `${yoy}%`} vs {latest.year - 1}
            </span>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface p-2">
          <span className="block text-caption text-fg-muted">
            {t("obs.inpe.peakYear", "Pico (2015–2025)")}
          </span>
          <span className="mt-0.5 block font-mono text-label font-semibold tabular-nums text-fg">
            {formatNumber(peak.km2, locale)} km²
          </span>
          <span className="mt-0.5 block font-mono text-caption tabular-nums text-fg-secondary">
            {peak.year}
          </span>
        </div>
      </div>

      {/* Série histórica anual oficial PRODES (barras CSS puras — zero peso extra no bundle) */}
      <div className="space-y-1.5" data-testid="prodes-chart">
        <div className="flex items-center justify-between text-caption text-fg-secondary">
          <span className="inline-flex items-center gap-1 font-medium text-fg">
            <Trees aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
            {t("obs.inpe.prodesSeries", "Série oficial PRODES (km²/ano)")}
          </span>
          <span className="font-mono tabular-nums text-fg-muted">2015–2025</span>
        </div>

        <div className="flex h-24 items-end gap-1 rounded-card border border-line bg-surface px-2 pb-1.5 pt-2">
          {series.map((point) => {
            const heightPct = Math.max(8, Math.round((point.km2 / maxKm2) * 100));
            const isPeak = point.year === peak.year;
            const isLatest = point.year === latest.year;
            return (
              <div
                key={point.year}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${point.year}: ${formatNumber(point.km2, locale)} km² (${point.status === "estimated" ? t("obs.inpe.estimated", "estimativa oficial") : t("obs.inpe.consolidated", "consolidado")})`}
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-base ease-out",
                    isPeak ? "bg-danger" : isLatest ? "bg-accent" : "bg-warning/75"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="font-mono text-caption tabular-nums text-fg-muted">
                  {String(point.year).slice(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloco de alertas DETER recentes (T03/T05 honesto: nunca exibe dados sintéticos) */}
      <div
        data-testid="inpe-deter-status"
        className="rounded-card border border-line bg-surface p-2 text-caption text-fg-secondary"
      >
        <p className="font-medium text-fg">
          {t("obs.inpe.deterTitle", "Alertas DETER (últimos 30 dias)")}
        </p>
        {payload?.deterAvailable ? (
          <p className="mt-0.5 font-mono tabular-nums text-fg-secondary">
            {formatNumber(biomeAlerts.length, locale)}{" "}
            {t("obs.inpe.alertsCount", "alertas no bioma")} ·{" "}
            {formatNumber(biomeAlertArea, locale, { maximumFractionDigits: 2 })} km²
          </p>
        ) : (
          <p className="mt-0.5 text-warning">
            {t(
              "obs.inpe.deterUnavailable",
              "WFS do INPE TerraBrasilis DETER indisponível no momento; exibindo apenas a série oficial PRODES (sem alertas sintéticos)."
            )}
          </p>
        )}
      </div>

      {/* Citação acadêmica e links oficiais INPE / MCTI (RN02) */}
      <div className="space-y-1 text-caption text-fg-muted">
        <p>{citation}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={prodesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <span>{t("obs.inpe.openProdes", "Painel PRODES (INPE)")}</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
          </a>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <span>TerraBrasilis</span>
            <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};
