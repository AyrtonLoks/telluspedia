"use client";

import React, { useState } from "react";
import { BookOpen, Check, ExternalLink, Radio, Rocket, RotateCw, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";
import {
  calculateProbePosition,
  DEEP_SPACE_PROBE_IDS,
  DEEP_SPACE_PROBES_CATALOG,
  formatLightTime,
  sanitizeNasaMissionUrl,
  type DeepSpaceProbeId,
} from "@/lib/deep-space-probes";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { clearCelestialFocus, focusDeepSpaceProbe } from "@/stores/actions";
import { useCosmicStore } from "@/stores/cosmicStore";

export interface CosmicProbeInspectorCardProps {
  probeId: DeepSpaceProbeId;
  selectedYear: number;
}

/**
 * Ficha astrofísica e de telemetria DSN para sondas do espaço profundo no `RightDock` (D41).
 * Respeita estritamente os tokens D14 e o HTML5 Phrasing Content Invariant (zero `<div>` em `<p>`).
 */
export const CosmicProbeInspectorCard: React.FC<CosmicProbeInspectorCardProps> = ({
  probeId,
  selectedYear,
}) => {
  const { locale, t } = useI18n();
  const scaleMode = useCosmicStore((s) => s.scaleMode);
  const [copied, setCopied] = useState(false);

  const meta = DEEP_SPACE_PROBES_CATALOG[probeId];
  const telemetry = calculateProbePosition(probeId, selectedYear, scaleMode);
  const name = locale === "en" ? meta.nameEn : meta.namePt;
  const regime = locale === "en" ? meta.regimeEn : meta.regimePt;
  const summary = locale === "en" ? meta.summaryEn : meta.summaryPt;
  const power = locale === "en" ? meta.powerSourceEn : meta.powerSourcePt;
  const safeNasaUrl = sanitizeNasaMissionUrl(meta.nasaUrl);
  const safeJplUrl = sanitizeNasaMissionUrl(meta.jplUrl);
  const auUnit = t("cosmic.au", "UA");
  const mkmUnit = t("cosmic.mkm", "mi km");

  const handleCopyCitation = () => {
    const text =
      locale === "en"
        ? `NASA / JPL Horizons (${Math.floor(selectedYear)}). ${meta.nameEn} Ephemeris & Mission Fact Sheet. Accessed on TellusPedia. Available at: <${safeNasaUrl}>.`
        : `NASA / JPL Horizons (${Math.floor(selectedYear)}). ${meta.namePt} — Efemérides e Ficha da Missão. Consultado no TellusPedia. Disponível em: <${safeNasaUrl}>.`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      data-testid="cosmic-inspector-hud"
      className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4"
    >
      <div
        data-testid="cosmic-probe-inspector"
        className="flex items-start justify-between gap-2 border-b border-line pb-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card font-mono text-label font-semibold text-accent-on"
            style={{ backgroundColor: meta.color }}
          >
            {meta.shortCode}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-title font-semibold text-fg">{name}</h2>
              <Badge tone="accent">{meta.agency}</Badge>
            </div>
            <p className="mt-0.5 text-caption text-fg-muted">{regime}</p>
          </div>
        </div>
        <IconButton
          label={t("cosmic.closeAria", "Fechar painel e deselecionar")}
          icon={<X />}
          size="sm"
          onClick={clearCelestialFocus}
        />
      </div>

      {/* Seletor rápido entre as 4 sondas */}
      <div className="grid grid-cols-4 gap-1">
        {DEEP_SPACE_PROBE_IDS.map((id) => {
          const item = DEEP_SPACE_PROBES_CATALOG[id];
          const active = id === probeId;
          return (
            <button
              key={id}
              type="button"
              data-testid={`probe-switch-${id}`}
              aria-pressed={active}
              onClick={() => focusDeepSpaceProbe(id)}
              className={cn(
                "rounded-control border px-2 py-1 text-center font-mono text-caption font-medium transition-colors duration-fast ease-out",
                active
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
              )}
            >
              {item.shortCode}
            </button>
          );
        })}
      </div>

      {!telemetry.isLaunched && (
        <div className="rounded-card border border-warning/40 bg-warning/10 p-2.5 text-caption text-fg">
          {t(
            "probe.preLaunchNote",
            "Época anterior ao lançamento oficial da missão — posição ancorada na órbita terrestre de partida."
          )}{" "}
          ({meta.launchDateIso})
        </div>
      )}

      {/* Grade de Telemetria Heliocêntrica & Atraso de Sinal DSN */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">
            {t("cosmic.distSun", "Distância até o Sol")}
          </span>
          <span
            data-testid="probe-dist-sun"
            className="mt-0.5 block font-mono text-body font-semibold tabular-nums text-warning"
          >
            {formatNumber(telemetry.distanceSunAu, locale)} {auUnit}
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {formatNumber(telemetry.distanceSunMkm, locale)} {mkmUnit}
          </span>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">
            {t("cosmic.distEarth", "Distância até a Terra")}
          </span>
          <span
            data-testid="probe-dist-earth"
            className="mt-0.5 block font-mono text-body font-semibold tabular-nums text-fg"
          >
            {formatNumber(telemetry.distanceEarthAu, locale)} {auUnit}
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {formatNumber(telemetry.distanceEarthMkm, locale)} {mkmUnit}
          </span>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="flex items-center gap-1 text-caption text-fg-secondary">
            <Radio aria-hidden="true" className="h-3 w-3 text-accent" />
            <span>{t("probe.lightTime", "Sinal (tempo-luz 1 via)")}</span>
          </span>
          <span
            data-testid="probe-light-time"
            className="mt-0.5 block font-mono text-body font-semibold tabular-nums text-accent"
          >
            {formatLightTime(telemetry.oneWayLightSeconds, locale)}
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            2× DSN: {formatLightTime(telemetry.roundTripLightSeconds, locale)}
          </span>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-2.5">
          <span className="block text-caption text-fg-secondary">
            {t("probe.heliocentricSpeed", "Velocidade heliocêntrica")}
          </span>
          <span className="mt-0.5 block font-mono text-body font-semibold tabular-nums text-fg">
            {formatNumber(telemetry.velocityKmS, locale)} km/s
          </span>
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            {formatNumber(telemetry.velocityAuPerYear, locale)} {auUnit}/{t("probe.yearShort", "ano")}
          </span>
        </div>
      </div>

      <p className="text-caption leading-relaxed text-fg-secondary">{summary}</p>

      {/* Ficha de Engenharia */}
      <div className="divide-y divide-line rounded-card border border-line bg-surface-raised p-2.5 text-caption">
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-fg-secondary">{t("probe.launchDate", "Lançamento")}</span>
          <span className="font-mono tabular-nums text-fg">
            {meta.launchDateIso} · {meta.launchVehicle}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-fg-secondary">{t("cosmic.mass", "Massa")}</span>
          <span className="font-mono tabular-nums text-fg">
            {formatNumber(meta.massKg, locale)} kg
          </span>
        </div>
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-fg-secondary">{t("probe.powerSource", "Energia & Térmica")}</span>
          <span className="text-fg">{power}</span>
        </div>
      </div>

      {/* Marcos Científicos da Missão */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-caption font-medium text-fg-muted">
          <Rocket aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{t("probe.milestonesTitle", "Marcos da trajetória")}</span>
        </div>
        <div className="space-y-1.5">
          {meta.milestones.map((ms) => (
            <div
              key={`${probeId}-${ms.year}`}
              className="rounded-card border border-line bg-surface-raised p-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-label">
                <span className="font-medium text-fg">
                  {locale === "en" ? ms.titleEn : ms.titlePt}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    import("@/stores/timelineStore").then(({ useTimelineStore }) => {
                      useTimelineStore.getState().selectYear(ms.year);
                    });
                  }}
                  className="shrink-0 rounded-control border border-line bg-surface px-1.5 py-0.5 font-mono text-caption tabular-nums text-accent hover:border-accent/50"
                >
                  {ms.year}
                </button>
              </div>
              <p className="mt-0.5 text-caption text-fg-secondary">
                {locale === "en" ? ms.detailEn : ms.detailPt}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Ações e Fontes Primárias NASA / JPL */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button variant="secondary" className="flex-1" onClick={clearCelestialFocus}>
          <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{t("cosmic.overview", "Visão Geral")}</span>
        </Button>

        <Button variant="secondary" size="sm" onClick={handleCopyCitation}>
          {copied ? (
            <>
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
              <span>{t("common.copiedBang", "Copiado!")}</span>
            </>
          ) : (
            <>
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("cosmic.citation", "Citação")}</span>
            </>
          )}
        </Button>

        <a
          href={safeNasaUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="probe-nasa-link"
          className={buttonClasses("secondary", "sm")}
        >
          <span>NASA</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>

        <a
          href={safeJplUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="probe-jpl-link"
          className={buttonClasses("secondary", "sm")}
        >
          <span>JPL</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
};
