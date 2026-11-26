"use client";

import React from "react";
import Link from "next/link";
import { Crosshair, Eclipse, ExternalLink, Orbit, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import {
  ECLIPSES_LIST,
  sanitizeEclipseNasaUrl,
} from "@/lib/eclipses-catalog";
import { computeEclipseGeometry } from "@/lib/eclipses-geometry";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { selectEclipseEvent } from "@/stores/actions";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";

/**
 * Painel interativo de Eclipses Solares & Lunares (D41):
 * - Seleção rápida de eclipses históricos e futuros (1919 Sobral, 2024 América do Norte, 2025 Lunar, 2026 Espanha, 2027 Luxor);
 * - Controle deslizante de fase temporal em minutos para acompanhar a varredura da umbra sobre os continentes;
 * - Alternância entre observação terrestre (faixa de totalidade) e visão orbital no Modo Cosmos.
 */
export const EclipseHud: React.FC = () => {
  const { locale, t } = useI18n();
  const storeActiveEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const storeOffsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const storeIsMenuOpen = useCosmicStore((s) => s.isEclipseMenuOpen);
  const storeIsCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isServer = typeof window === "undefined";
  const activeEclipseId = isServer ? useCosmicStore.getState().activeEclipseId : storeActiveEclipseId;
  const offsetMinutes = isServer ? useCosmicStore.getState().eclipseOffsetMinutes : storeOffsetMinutes;
  const isMenuOpen = isServer ? useCosmicStore.getState().isEclipseMenuOpen : storeIsMenuOpen;
  const isCosmicMode = isServer ? useCosmicStore.getState().isCosmicMode : storeIsCosmicMode;
  const setOffset = useCosmicStore((s) => s.setEclipseOffsetMinutes);
  const setMenuOpen = useCosmicStore((s) => s.setEclipseMenuOpen);

  if (!isMenuOpen && !activeEclipseId) return null;

  const selectedId = activeEclipseId ?? "sobral-1919";
  const geom = computeEclipseGeometry(selectedId, activeEclipseId ? offsetMinutes : 0);
  const entry = geom.eclipse;
  const title = locale === "en" ? entry.titleEn : entry.titlePt;
  const dateLabel = locale === "en" ? entry.dateLabelEn : entry.dateLabelPt;
  const region = locale === "en" ? entry.regionEn : entry.regionPt;
  const summary = locale === "en" ? entry.summaryEn : entry.summaryPt;
  const maxDuration = locale === "en" ? entry.maxDurationEn : entry.maxDurationPt;
  const safeUrl = sanitizeEclipseNasaUrl(entry.nasaUrl);
  const [minM, maxM] = entry.windowMinutes;

  const handleClose = () => {
    selectEclipseEvent(null);
    setMenuOpen(false);
  };

  return (
    <aside
      data-testid="eclipse-hud"
      className="fixed left-3 top-[calc(var(--map-tools-top)+3rem)] z-20 w-[min(24.5rem,calc(100vw-1.5rem))] xl:left-6"
    >
      <Panel className="max-h-[min(34rem,calc(100dvh-11rem))] overflow-y-auto p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-caption font-medium text-warning">
              <Eclipse aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{t("eclipse.kicker", "Efemérides de Sizígia · NASA GSFC")}</span>
            </div>
            <h2 className="mt-0.5 text-label font-semibold text-fg">{title}</h2>
            <p className="font-mono text-caption tabular-nums text-fg-muted">{dateLabel}</p>
          </div>
          <IconButton
            label={t("eclipse.closeAria", "Encerrar simulação de eclipse")}
            icon={<X />}
            size="sm"
            onClick={handleClose}
          />
        </div>

        {/* Pílulas dos 5 eclipses curados */}
        <div className="flex flex-wrap gap-1">
          {ECLIPSES_LIST.map((item) => {
            const isActive = activeEclipseId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`eclipse-option-${item.id}`}
                aria-pressed={isActive}
                onClick={() =>
                  selectEclipseEvent(item.id, {
                    lat: item.greatestLat,
                    lng: item.greatestLng,
                    keepCosmicMode: isCosmicMode,
                  })
                }
                className={cn(
                  "rounded-control border px-2 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                  isActive
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {locale === "en" ? item.shortLabelEn : item.shortLabelPt}
              </button>
            );
          })}
        </div>

        {!activeEclipseId && (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            data-testid="eclipse-activate-current"
            onClick={() =>
              selectEclipseEvent(selectedId, {
                lat: entry.greatestLat,
                lng: entry.greatestLng,
                keepCosmicMode: isCosmicMode,
              })
            }
          >
            <Eclipse aria-hidden="true" className="h-4 w-4" />
            <span>{t("eclipse.projectShadow", "Projetar Umbra & Totalidade no Globo")}</span>
          </Button>
        )}

        {activeEclipseId && (
          <div className="space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5">
            <div className="flex items-center justify-between gap-2 text-caption">
              <span className="font-medium text-fg-secondary">
                {t("eclipse.phaseSlider", "Varredura da umbra")}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold tabular-nums text-accent">
                  {offsetMinutes > 0 ? `+${offsetMinutes}` : offsetMinutes} min
                </span>
                {offsetMinutes !== 0 && (
                  <button
                    type="button"
                    onClick={() => setOffset(0)}
                    title={t("eclipse.resetPeak", "Voltar ao máximo do eclipse (0 min)")}
                    className="rounded-control border border-line bg-surface px-1.5 py-0.5 text-caption text-fg-muted hover:text-fg"
                  >
                    <RotateCcw aria-hidden="true" className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={minM}
              max={maxM}
              step={5}
              value={offsetMinutes}
              data-testid="eclipse-offset-slider"
              aria-label={t("eclipse.phaseSlider", "Varredura da umbra")}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between font-mono text-caption tabular-nums text-fg-muted">
              <span>{minM} min</span>
              <span>{geom.targetDate.toISOString().slice(11, 16)} UTC</span>
              <span>+{maxM} min</span>
            </div>
          </div>
        )}

        {/* Métricas físicas da sizígia */}
        <div className="grid grid-cols-2 gap-2 rounded-card border border-line bg-surface-raised p-2.5 text-caption">
          <div>
            <span className="block text-fg-muted">{t("eclipse.maxDuration", "Duração máxima")}</span>
            <span className="font-mono font-semibold tabular-nums text-fg">{maxDuration}</span>
          </div>
          <div>
            <span className="block text-fg-muted">Saros · Gamma</span>
            <span className="font-mono tabular-nums text-fg">
              #{entry.saros} · {entry.gamma > 0 ? `+${entry.gamma}` : entry.gamma}
            </span>
          </div>
          <div>
            <span className="block text-fg-muted">
              {entry.kind === "solar_total"
                ? t("eclipse.umbraWidth", "Largura da umbra")
                : t("eclipse.umbraMag", "Magnitude umbral")}
            </span>
            <span className="font-mono tabular-nums text-fg">
              {entry.kind === "solar_total"
                ? `${formatNumber(entry.umbraWidthKm, locale)} km`
                : entry.magnitude.toFixed(3)}
            </span>
          </div>
          <div>
            <span className="block text-fg-muted">
              {t("eclipse.lunarDist", "Distância lunar")}
            </span>
            <span className="font-mono tabular-nums text-fg">
              {formatNumber(Math.round(geom.lunarDistanceKm), locale)} km
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={entry.kind === "solar_total" ? "warning" : "danger"}>
            {entry.kind === "solar_total"
              ? t("eclipse.kindSolar", "Solar Total")
              : t("eclipse.kindLunar", "Lunar Total (Lua de Sangue)")}
          </Badge>
          <span className="text-caption text-fg-muted">{region}</span>
        </div>

        <p className="text-caption leading-relaxed text-fg-secondary">{summary}</p>

        {entry.dossierSlug && (
          <Link
            href={`/dossies/${entry.dossierSlug}`}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            <span>
              {t("eclipse.openEinsteinDossier", "Ler Dossiê Científico: Albert Einstein & Sobral (1919)")}
            </span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            data-testid="eclipse-focus-earth"
            onClick={() => {
              selectEclipseEvent(entry.id, {
                lat: geom.shadowLat,
                lng: geom.shadowLng,
                offsetMinutes: activeEclipseId ? offsetMinutes : 0,
                keepCosmicMode: false,
              });
              useGlobeStore.getState().flyTo(geom.shadowLat, geom.shadowLng, 1.95);
            }}
          >
            <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("eclipse.focusTotality", "Focar Totalidade")}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            data-testid="eclipse-view-cosmos"
            onClick={() => {
              selectEclipseEvent(entry.id, {
                offsetMinutes: activeEclipseId ? offsetMinutes : 0,
                keepCosmicMode: true,
              });
              useCosmicStore.getState().enterCosmicView(
                entry.kind === "lunar_total" ? "MOON" : "EARTH"
              );
            }}
          >
            <Orbit aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Cosmos</span>
          </Button>

          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="eclipse-nasa-link"
            className={buttonClasses("secondary", "sm")}
          >
            <span>NASA</span>
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </Panel>
    </aside>
  );
};
