"use client";

import React from "react";
import Link from "next/link";
import { Eclipse, ExternalLink, Globe, MapPin, Orbit, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ECLIPSES_LIST, sanitizeEclipseNasaUrl } from "@/lib/eclipses-catalog";
import { computeEclipseGeometry } from "@/lib/eclipses-geometry";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { seekEclipseOffsetMinutes, selectEclipseEvent } from "@/stores/actions";
import { useCosmicStore } from "@/stores/cosmicStore";

/**
 * Simulador de Eclipses Solares & Lunares integrado diretamente ao inspetor da Lua (`CosmicInspectorHUD`, D41):
 * - Preserva o modo ativo (no Modo Cosmos exibe o alinhamento 3D Sol–Lua–Terra e o cone de umbra;
 *   oferece ação explícita para descer ao globo terrestre e inspecionar as cidades na faixa de totalidade);
 * - Inclui estações calibradas por horário UTC real (Sobral 12:00 UTC, Príncipe 14:13 UTC, Luxor 10:08 UTC,
 *   Espanha 18:28 UTC, Nazas/Texas) e controle contínuo de varredura temporal.
 */
export const CosmicEclipseSection: React.FC = () => {
  const { locale, t } = useI18n();
  const isServer = typeof window === "undefined";
  const storeActiveId = useCosmicStore((s) => s.activeEclipseId);
  const storeOffset = useCosmicStore((s) => s.eclipseOffsetMinutes);
  const storeCosmic = useCosmicStore((s) => s.isCosmicMode);
  const activeEclipseId = isServer ? useCosmicStore.getState().activeEclipseId : storeActiveId;
  const offsetMinutes = isServer ? useCosmicStore.getState().eclipseOffsetMinutes : storeOffset;
  const isCosmicMode = isServer ? useCosmicStore.getState().isCosmicMode : storeCosmic;

  const previewId = activeEclipseId ?? "sobral-1919";
  const effectiveOffset = activeEclipseId
    ? offsetMinutes
    : ECLIPSES_LIST.find((e) => e.id === previewId)?.defaultOffsetMinutes ?? 0;
  const geom = computeEclipseGeometry(previewId, effectiveOffset);
  const entry = geom.eclipse;

  const title = locale === "en" ? entry.titleEn : entry.titlePt;
  const dateLabel = locale === "en" ? entry.dateLabelEn : entry.dateLabelPt;
  const activeLoc = locale === "en" ? geom.activeLocationEn : geom.activeLocationPt;
  const summary = locale === "en" ? entry.summaryEn : entry.summaryPt;
  const maxDuration = locale === "en" ? entry.maxDurationEn : entry.maxDurationPt;
  const safeUrl = sanitizeEclipseNasaUrl(entry.nasaUrl);
  const [minM, maxM] = entry.windowMinutes;

  return (
    <section
      data-testid="moon-eclipse-simulator"
      className="space-y-2.5 rounded-card border border-line bg-surface-raised p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-caption font-medium text-warning">
            <Eclipse aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span>{t("eclipse.moonSectionTitle", "Simulador de Eclipses (Sizígias)")}</span>
          </div>
          <p className="mt-0.5 text-caption text-fg-muted">
            {t(
              "eclipse.moonSectionHint",
              "Alinhamento orbital Sol–Lua–Terra e projeção real da umbra (NASA GSFC)"
            )}
          </p>
        </div>
        {activeEclipseId && (
          <button
            type="button"
            data-testid="eclipse-clear-button"
            onClick={() => selectEclipseEvent(null)}
            title={t("eclipse.closeAria", "Encerrar simulação de eclipse")}
            className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2 py-1 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:text-fg"
          >
            <X aria-hidden="true" className="h-3 w-3" />
            <span>{t("eclipse.clearShort", "Desativar")}</span>
          </button>
        )}
      </div>

      {/* Pílulas dos 5 eclipses curados (mantém o modo atual sem saltos inesperados) */}
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
                  offsetMinutes: item.defaultOffsetMinutes,
                  targetMode: "preserve",
                })
              }
              className={cn(
                "rounded-control border px-2 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                isActive
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg"
              )}
            >
              {locale === "en" ? item.shortLabelEn : item.shortLabelPt}
            </button>
          );
        })}
      </div>

      {!activeEclipseId ? (
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          data-testid="eclipse-activate-current"
          onClick={() =>
            selectEclipseEvent(previewId, {
              offsetMinutes: entry.defaultOffsetMinutes,
              targetMode: "preserve",
            })
          }
        >
          <Eclipse aria-hidden="true" className="h-4 w-4" />
          <span>{t("eclipse.simulateNow", "Ativar Alinhamento & Cone de Umbra")}</span>
        </Button>
      ) : (
        <div className="space-y-2.5 border-t border-line pt-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={entry.kind === "solar_total" ? "warning" : "danger"}>
                {entry.kind === "solar_total"
                  ? t("eclipse.kindSolar", "Solar Total")
                  : t("eclipse.kindLunar", "Lunar Total (Lua de Sangue)")}
              </Badge>
              <span className="font-mono text-caption tabular-nums text-fg-muted">{dateLabel}</span>
            </div>
            <h4 className="mt-1 text-label font-semibold text-fg">{title}</h4>
          </div>

          {/* Localização instantânea da umbra + atalhos de estações geográficas */}
          <div className="space-y-1.5 rounded-card border border-line bg-surface p-2.5 text-caption">
            <div className="flex items-start gap-1.5">
              <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <span className="block text-fg-muted">
                  {entry.kind === "solar_total"
                    ? t("eclipse.umbraNowAt", "Eixo da umbra neste instante:")
                    : t("eclipse.lunarZenithAt", "Fase / zênite sublunar:")}
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
                    data-testid={`eclipse-station-${st.id}`}
                    aria-pressed={isNear}
                    onClick={() =>
                      seekEclipseOffsetMinutes(st.offsetMinutes, { lat: st.lat, lng: st.lng })
                    }
                    className={cn(
                      "rounded-control border px-2 py-0.5 text-caption transition-colors duration-fast ease-out",
                      isNear
                        ? "border-accent/50 bg-accent/15 font-medium text-accent"
                        : "border-line bg-surface-raised text-fg-secondary hover:text-fg"
                    )}
                  >
                    {locale === "en" ? st.labelEn : st.labelPt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider temporal em minutos UTC */}
          <div className="space-y-1 rounded-card border border-line bg-surface p-2.5 text-caption">
            <div className="flex items-center justify-between gap-2">
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
                    onClick={() => seekEclipseOffsetMinutes(entry.defaultOffsetMinutes)}
                    title={t("eclipse.resetPeak", "Voltar à estação principal")}
                    className="rounded-control border border-line bg-surface-raised px-1.5 py-0.5 text-caption text-fg-muted hover:text-fg"
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
              <span>Saros #{entry.saros}</span>
              <span>+{maxM} min</span>
            </div>
          </div>

          {/* Métricas físicas */}
          <div className="grid grid-cols-2 gap-2 text-caption">
            <div className="rounded-control border border-line bg-surface p-2">
              <span className="block text-fg-muted">{t("eclipse.maxDuration", "Duração máxima")}</span>
              <span className="font-mono font-semibold tabular-nums text-fg">{maxDuration}</span>
            </div>
            <div className="rounded-control border border-line bg-surface p-2">
              <span className="block text-fg-muted">
                {entry.kind === "solar_total"
                  ? t("eclipse.umbraWidth", "Largura da umbra")
                  : t("eclipse.umbraMag", "Magnitude umbral")}
              </span>
              <span className="font-mono font-semibold tabular-nums text-fg">
                {entry.kind === "solar_total"
                  ? `${formatNumber(entry.umbraWidthKm, locale)} km`
                  : entry.magnitude.toFixed(3)}
              </span>
            </div>
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

          {/* Transição explícita e sem ambiguidade entre Globo Terrestre e Sistema Solar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {entry.kind === "solar_total" && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                data-testid="eclipse-inspect-earth"
                onClick={() =>
                  selectEclipseEvent(entry.id, {
                    lat: geom.shadowLat,
                    lng: geom.shadowLng,
                    offsetMinutes,
                    targetMode: "earth",
                  })
                }
              >
                <Globe aria-hidden="true" className="h-3.5 w-3.5" />
                <span>
                  {isCosmicMode
                    ? t("eclipse.inspectOnGlobe", "Descer ao Globo (Ver Faixa na Terra)")
                    : t("eclipse.flyToUmbra", "Voar até a Faixa no Globo")}
                </span>
              </Button>
            )}

            {!isCosmicMode && (
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
            )}

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
        </div>
      )}
    </section>
  );
};
