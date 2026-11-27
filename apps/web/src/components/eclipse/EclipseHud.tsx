"use client";

import React from "react";
import Link from "next/link";
import { Eclipse, ExternalLink, MapPin, Orbit, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { ECLIPSES_LIST, sanitizeEclipseNasaUrl } from "@/lib/eclipses-catalog";
import { computeEclipseGeometry } from "@/lib/eclipses-geometry";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import {
  focusCelestialBody,
  seekEclipseOffsetMinutes,
  selectEclipseEvent,
} from "@/stores/actions";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useLayoutStore } from "@/stores/layoutStore";

/**
 * Painel contextual da faixa de totalidade no Globo Terrestre (D41):
 * - Exibido apenas na visão do Globo quando há um eclipse ativo sem o inspetor da Lua aberto
 *   (evitando painéis duplicados ou trocas inesperadas de modo no Cosmos);
 * - Permite saltar entre estações geográficas reais (ex.: Sobral 12:00 UTC → Príncipe 14:13 UTC),
 *   varrer o minuto UTC ou subir para o Modo Cosmos / Lua.
 */
export const EclipseHud: React.FC = () => {
  const { locale, t } = useI18n();
  const isServer = typeof window === "undefined";
  const storeActiveEclipseId = useCosmicStore((s) => s.activeEclipseId);
  const storeOffsetMinutes = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const storeIsCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const storeFocusedBodyId = useCosmicStore((s) => s.focusedBodyId);
  const activeEclipseId = isServer
    ? useCosmicStore.getState().activeEclipseId
    : storeActiveEclipseId;
  const offsetMinutes = isServer
    ? useCosmicStore.getState().eclipseOffsetMinutes
    : storeOffsetMinutes;
  const isCosmicMode = isServer ? useCosmicStore.getState().isCosmicMode : storeIsCosmicMode;
  const focusedBodyId = isServer ? useCosmicStore.getState().focusedBodyId : storeFocusedBodyId;

  if (!activeEclipseId || isCosmicMode || focusedBodyId === "MOON") return null;

  const geom = computeEclipseGeometry(activeEclipseId, offsetMinutes);
  const entry = geom.eclipse;
  const title = locale === "en" ? entry.titleEn : entry.titlePt;
  const dateLabel = locale === "en" ? entry.dateLabelEn : entry.dateLabelPt;
  const activeLoc = locale === "en" ? geom.activeLocationEn : geom.activeLocationPt;
  const summary = locale === "en" ? entry.summaryEn : entry.summaryPt;
  const maxDuration = locale === "en" ? entry.maxDurationEn : entry.maxDurationPt;
  const safeUrl = sanitizeEclipseNasaUrl(entry.nasaUrl);
  const [minM, maxM] = entry.windowMinutes;

  const handleClose = () => {
    selectEclipseEvent(null);
    useCosmicStore.getState().setEclipseMenuOpen(false);
  };

  return (
    <aside
      data-testid="eclipse-hud"
      className="fixed left-3 top-[calc(var(--map-tools-top)+3rem)] z-20 w-[min(24.5rem,calc(100vw-1.5rem))] xl:left-6"
    >
      <Panel className="max-h-[min(34rem,calc(100dvh-11rem))] space-y-3 overflow-y-auto p-3.5">
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

        {/* Troca rápida entre os eclipses na superfície terrestre */}
        <div className="flex flex-wrap gap-1">
          {ECLIPSES_LIST.filter((e) => e.kind === "solar_total").map((item) => {
            const isActive = activeEclipseId === item.id;
            const itemDefaultGeom = computeEclipseGeometry(item.id, item.defaultOffsetMinutes);
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`eclipse-globe-option-${item.id}`}
                aria-pressed={isActive}
                onClick={() =>
                  selectEclipseEvent(item.id, {
                    lat: itemDefaultGeom.shadowLat,
                    lng: itemDefaultGeom.shadowLng,
                    offsetMinutes: item.defaultOffsetMinutes,
                    targetMode: "earth",
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

        {/* Estações geográficas clicáveis ao longo da faixa de totalidade */}
        <div className="space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5 text-caption">
          <div className="flex items-start gap-1.5">
            <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <span className="block text-fg-muted">
                {t("eclipse.umbraNowAt", "Eixo da umbra neste instante:")}
              </span>
              <span className="font-medium text-fg">{activeLoc}</span>
              <span className="ml-1.5 font-mono tabular-nums text-fg-muted">
                ({geom.shadowLat.toFixed(2)}°, {geom.shadowLng.toFixed(2)}°)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.stations.map((st) => {
              const isNear = Math.abs(offsetMinutes - st.offsetMinutes) <= 4;
              return (
                <button
                  key={st.id}
                  type="button"
                  data-testid={`eclipse-hud-station-${st.id}`}
                  aria-pressed={isNear}
                  onClick={() =>
                    seekEclipseOffsetMinutes(st.offsetMinutes, { lat: st.lat, lng: st.lng })
                  }
                  className={cn(
                    "rounded-control border px-2 py-0.5 text-caption transition-colors duration-fast ease-out",
                    isNear
                      ? "border-accent/50 bg-accent/15 font-medium text-accent"
                      : "border-line bg-surface text-fg-secondary hover:text-fg"
                  )}
                >
                  {locale === "en" ? st.labelEn : st.labelPt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controle deslizante da varredura */}
        <div className="space-y-1.5 rounded-card border border-line bg-surface-raised p-2.5">
          <div className="flex items-center justify-between gap-2 text-caption">
            <span className="font-medium text-fg-secondary">
              {t("eclipse.phaseSlider", "Varredura da umbra")}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold tabular-nums text-accent">
                {geom.targetDate.toISOString().slice(11, 16)} UTC (
                {offsetMinutes > 0 ? `+${offsetMinutes}` : offsetMinutes}m)
              </span>
              {offsetMinutes !== entry.defaultOffsetMinutes && (
                <button
                  type="button"
                  onClick={() => {
                    const defGeom = computeEclipseGeometry(entry.id, entry.defaultOffsetMinutes);
                    seekEclipseOffsetMinutes(entry.defaultOffsetMinutes, {
                      lat: defGeom.shadowLat,
                      lng: defGeom.shadowLng,
                    });
                  }}
                  title={t("eclipse.resetPeak", "Voltar à estação principal")}
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
            step={1}
            value={offsetMinutes}
            data-testid="eclipse-offset-slider"
            aria-label={t("eclipse.phaseSlider", "Varredura da umbra")}
            onChange={(e) => seekEclipseOffsetMinutes(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between font-mono text-caption tabular-nums text-fg-muted">
            <span>{minM} min</span>
            <span>
              {maxDuration} · {formatNumber(entry.umbraWidthKm, locale)} km
            </span>
            <span>+{maxM} min</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="warning">{t("eclipse.kindSolar", "Solar Total")}</Badge>
          <span className="text-caption text-fg-muted">Saros #{entry.saros}</span>
        </div>

        <p className="text-caption leading-relaxed text-fg-secondary">{summary}</p>

        {entry.dossierSlug && (
          <Link
            href={`/dossies/${entry.dossierSlug}`}
            className="inline-flex items-center gap-1.5 text-caption font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            <span>
              {t(
                "eclipse.openEinsteinDossier",
                "Ler Dossiê Científico: Albert Einstein & Sobral (1919)"
              )}
            </span>
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            data-testid="eclipse-open-moon-inspector"
            onClick={() => {
              focusCelestialBody("MOON");
              useLayoutStore.getState().setActiveRightPanel("cosmos");
            }}
          >
            <Eclipse aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("eclipse.inspectMoon", "Inspecionar Lua")}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            data-testid="eclipse-view-cosmos"
            onClick={() =>
              selectEclipseEvent(entry.id, {
                offsetMinutes,
                targetMode: "cosmos",
              })
            }
          >
            <Orbit aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("eclipse.viewInCosmos", "Ver no Cosmos")}</span>
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
