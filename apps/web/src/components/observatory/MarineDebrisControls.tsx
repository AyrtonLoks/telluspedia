"use client";

import React, { useMemo } from "react";
import { Compass, Crosshair, ExternalLink, RotateCcw } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { getContemporarySpatialIndex } from "@/lib/historical-topology";
import {
  DEBRIS_DENSITY_STOPS,
  DEBRIS_LAUNCH_PRESETS,
  OCEAN_GYRES,
  getOceanGyre,
  simulateDriftTrajectories,
  type MarineDebrisHorizonMonths,
  type MarineDebrisWindage,
} from "@/lib/marine-debris-data";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";
import { formatNumber } from "@/lib/i18n/format";

const WINDAGE_OPTIONS: readonly MarineDebrisWindage[] = [0.01, 0.02, 0.03];
const HORIZON_OPTIONS: readonly MarineDebrisHorizonMonths[] = [12, 24, 36];

const DENSITY_GRADIENT = `linear-gradient(90deg, ${DEBRIS_DENSITY_STOPS.map(
  (s) => `${s.hex} ${Math.round(s.at * 100)}%`
).join(", ")})`;

/**
 * Controles D14 da camada de Lixo Marítimo, Giros Oceânicos & Microplásticos (D29 / RN17).
 * Carregado sob demanda via `next/dynamic` dentro de `ObservatoryPanel`.
 */
export const MarineDebrisControls: React.FC = () => {
  const { locale, t } = useI18n();
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;

  const storeWindage = useObservatoryStore((s) => s.marineDebrisWindage);
  const storeHorizon = useObservatoryStore((s) => s.marineDebrisHorizonMonths);
  const storePickMode = useObservatoryStore((s) => s.marineDebrisPickMode);
  const storeReleasePoint = useObservatoryStore((s) => s.marineDebrisReleasePoint);
  const storeSelectedGyreId = useObservatoryStore((s) => s.selectedGyreId);
  const storeCurrents = useObservatoryStore((s) => s.currents);
  const storeWinds = useObservatoryStore((s) => s.winds);
  const storeCurrentsMeta = useObservatoryStore((s) => s.currentsMeta);
  const storeWindsMeta = useObservatoryStore((s) => s.layerMeta.GLOBAL_WINDS);

  const windage = ssr?.marineDebrisWindage ?? storeWindage;
  const horizonMonths = ssr?.marineDebrisHorizonMonths ?? storeHorizon;
  const pickMode = ssr?.marineDebrisPickMode ?? storePickMode;
  const releasePoint = ssr ? ssr.marineDebrisReleasePoint : storeReleasePoint;
  const selectedGyreId = ssr ? ssr.selectedGyreId : storeSelectedGyreId;
  const currents = ssr ? ssr.currents : storeCurrents;
  const winds = ssr ? ssr.winds : storeWinds;
  const currentsMeta = ssr ? ssr.currentsMeta : storeCurrentsMeta;
  const windsMeta = ssr ? ssr.layerMeta.GLOBAL_WINDS : storeWindsMeta;

  const setWindage = useObservatoryStore((s) => s.setMarineDebrisWindage);
  const setHorizon = useObservatoryStore((s) => s.setMarineDebrisHorizonMonths);
  const setPickMode = useObservatoryStore((s) => s.setMarineDebrisPickMode);
  const setReleasePoint = useObservatoryStore((s) => s.setMarineDebrisReleasePoint);
  const setSelectedGyreId = useObservatoryStore((s) => s.setSelectedGyreId);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const spatialIndex = useMemo(() => getContemporarySpatialIndex(), []);
  const simulation = useMemo(() => {
    if (!releasePoint) return null;
    return simulateDriftTrajectories({
      origin: releasePoint,
      currents,
      surfaceWind: winds?.surface ?? null,
      windage,
      horizonMonths,
      spatialIndex,
    });
  }, [releasePoint, currents, winds, windage, horizonMonths, spatialIndex]);

  const activeGyre = getOceanGyre(selectedGyreId ?? simulation?.destinationGyre.id ?? "north-pacific");
  const isLiveCoupled = currentsMeta.source === "live" || windsMeta.source === "live";

  const handleSelectGyre = (id: (typeof OCEAN_GYRES)[number]["id"]) => {
    const gyre = getOceanGyre(id);
    setSelectedGyreId(id);
    if (gyre) flyTo(gyre.centerLat, gyre.centerLng, 2.25);
  };

  const handleLaunchPreset = (preset: (typeof DEBRIS_LAUNCH_PRESETS)[number]) => {
    const label = locale === "en" ? preset.labelEn : preset.labelPt;
    setReleasePoint({ lat: preset.lat, lng: preset.lng, label });
    flyTo(preset.lat, preset.lng, 2.35);
  };

  return (
    <div data-testid="marine-debris-controls" className="space-y-3">
      {/* Selo explícito T05: observado vs. modelo Lagrangiano acoplado */}
      <div
        data-testid="debris-provenance-note"
        className="rounded-card border border-line bg-surface p-2 text-caption text-fg-secondary"
      >
        <p>
          <strong className="font-medium text-fg">
            {t("obs.debris.observedLabel", "Giros observados:")}
          </strong>{" "}
          NOAA Marine Debris · Eriksen (2014) · Lebreton (2018).
        </p>
        <p className="mt-1">
          <strong className="font-medium text-fg">
            {t("obs.debris.modelLabel", "Advecção Lagrangiana:")}
          </strong>{" "}
          {isLiveCoupled
            ? t("obs.debris.modelLive", "Correntes + ventos D27 ao vivo com convergência de Ekman.")
            : t(
                "obs.debris.modelFallback",
                "Climatologia de correntes + ventos de referência com convergência de Ekman."
              )}
        </p>
      </div>

      {/* Legenda cromática de densidade observada */}
      <div
        className="space-y-1"
        aria-label={t("obs.debris.legendAria", "Densidade estimada de microplásticos em partículas por km²")}
      >
        <div className="flex items-center justify-between text-caption text-fg-muted">
          <span>{t("obs.debris.densityTitle", "Densidade observada (part./km²)")}</span>
          <span className="font-mono tabular-nums">10³ → 10⁶</span>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-full rounded-full"
          style={{ backgroundImage: DENSITY_GRADIENT }}
        />
      </div>

      {/* Seletor dos 5 giros subtropicais */}
      <div className="space-y-1.5">
        <span className="text-caption font-medium text-fg-secondary">
          {t("obs.debris.gyresTitle", "5 giros oceânicos subtropicais")}
        </span>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("obs.debris.gyresAria", "Selecionar giro oceânico")}>
          {OCEAN_GYRES.map((gyre) => {
            const selected = activeGyre?.id === gyre.id;
            return (
              <button
                key={gyre.id}
                type="button"
                data-testid={`gyre-btn-${gyre.id}`}
                aria-pressed={selected}
                onClick={() => handleSelectGyre(gyre.id)}
                className={cn(
                  "rounded-control border px-2 py-1 text-caption transition-colors duration-fast ease-out",
                  selected
                    ? "border-accent/40 bg-accent/15 font-medium text-accent"
                    : "border-line bg-surface text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                )}
              >
                {locale === "en" ? gyre.nameEn.replace(" Gyre", "") : gyre.namePt.replace("Giro do ", "")}
              </button>
            );
          })}
        </div>

        {activeGyre && (
          <div data-testid="debris-gyre-card" className="space-y-1.5 rounded-card border border-line bg-surface p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-label font-medium text-fg">
                  {locale === "en" ? activeGyre.nameEn : activeGyre.namePt}
                </p>
                <p className="text-caption text-fg-muted">
                  {locale === "en" ? activeGyre.subtitleEn : activeGyre.subtitlePt}
                </p>
              </div>
              <span className="shrink-0 rounded-control border border-line px-1.5 py-0.5 font-mono text-caption tabular-nums text-fg-secondary">
                {activeGyre.rotation === "clockwise"
                  ? t("obs.debris.cw", "Horário")
                  : t("obs.debris.ccw", "Anti-horário")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-caption">
              <div>
                <span className="block text-fg-muted">{t("obs.debris.peakDensity", "Pico observado")}</span>
                <span className="font-mono font-medium tabular-nums text-fg">
                  {formatNumber(activeGyre.peakParticlesPerKm2, locale)} {t("obs.debris.unitPartKm2", "part./km²")}
                </span>
              </div>
              <div>
                <span className="block text-fg-muted">{t("obs.debris.estimatedMass", "Massa estimada")}</span>
                <span className="font-mono font-medium tabular-nums text-fg">
                  ~{formatNumber(activeGyre.estimatedMassTonnes, locale)} t
                </span>
              </div>
            </div>

            <p className="text-caption text-fg-secondary">
              {locale === "en" ? activeGyre.summaryEn : activeGyre.summaryPt}
            </p>
            <a
              href={activeGyre.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-caption text-accent hover:underline"
            >
              <span>{activeGyre.sourceCitation}</span>
              <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
            </a>
          </div>
        )}
      </div>

      {/* Simulador educativo de deriva Lagrangiana */}
      <div className="space-y-2 border-t border-line pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-fg">
            <Compass aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            {t("obs.debris.simTitle", "Simulador de deriva (Ekman)")}
          </span>
          {releasePoint && (
            <button
              type="button"
              data-testid="debris-clear-sim"
              onClick={() => setReleasePoint(null)}
              className="inline-flex items-center gap-1 text-caption text-fg-muted transition-colors duration-fast ease-out hover:text-fg"
            >
              <RotateCcw aria-hidden="true" className="h-3 w-3" />
              {t("obs.debris.clearSim", "Limpar")}
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="debris-pick-ocean"
          aria-pressed={pickMode}
          onClick={() => setPickMode(!pickMode)}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-control border px-2.5 py-1.5 text-caption font-medium transition-colors duration-fast ease-out",
            pickMode
              ? "border-accent bg-accent/15 text-accent"
              : "border-line bg-surface text-fg hover:bg-surface-hover/60"
          )}
        >
          <Crosshair aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {pickMode
            ? t("obs.debris.pickActive", "Clique em um ponto oceânico no globo…")
            : t("obs.debris.pickIdle", "Lançar traçadores clicando no oceano")}
        </button>

        {/* Pontos costeiros rápidos */}
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("obs.debris.presetsAria", "Pontos costeiros de lançamento")}>
          {DEBRIS_LAUNCH_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`debris-preset-${preset.id}`}
              onClick={() => handleLaunchPreset(preset)}
              className="rounded-control border border-line bg-surface px-2 py-0.5 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:bg-surface-hover/60 hover:text-fg"
            >
              {locale === "en" ? preset.labelEn : preset.labelPt}
            </button>
          ))}
        </div>

        {/* Controles físicos: windage (1–3%) e horizonte (12–36 meses) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label={t("obs.debris.windageAria", "Fator de deriva pelo vento")}>
            <span className="text-caption text-fg-muted">{t("obs.debris.windage", "Vento")}:</span>
            {WINDAGE_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                data-testid={`debris-windage-${Math.round(w * 100)}`}
                aria-pressed={windage === w}
                onClick={() => setWindage(w)}
                className={cn(
                  "h-6 rounded-control px-1.5 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                  windage === w
                    ? "bg-surface-hover font-medium text-fg"
                    : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                )}
              >
                {Math.round(w * 100)}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1" role="group" aria-label={t("obs.debris.horizonAria", "Horizonte da simulação")}>
            <span className="text-caption text-fg-muted">{t("obs.debris.horizon", "Prazo")}:</span>
            {HORIZON_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`debris-horizon-${m}`}
                aria-pressed={horizonMonths === m}
                onClick={() => setHorizon(m)}
                className={cn(
                  "h-6 rounded-control px-1.5 font-mono text-caption tabular-nums transition-colors duration-fast ease-out",
                  horizonMonths === m
                    ? "bg-surface-hover font-medium text-fg"
                    : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                )}
              >
                {m}{t("obs.debris.monthsShort", "m")}
              </button>
            ))}
          </div>
        </div>

        {/* Leitura da simulação ativa */}
        {simulation && (
          <div
            data-testid="debris-simulation-result"
            className="space-y-1 rounded-card border border-accent/35 bg-accent/10 p-2.5 text-caption"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-fg">
                {simulation.origin.label ??
                  `${simulation.origin.lat.toFixed(1)}°, ${simulation.origin.lng.toFixed(1)}°`}
              </span>
              <span className="font-mono tabular-nums text-fg-secondary">
                {formatNumber(simulation.distanceKm, locale)} km
              </span>
            </div>
            <p className="text-fg-secondary">
              {t("obs.debris.convergesTo", "Convergência estimada:")}{" "}
              <strong className="font-medium text-accent">
                {locale === "en" ? simulation.destinationGyre.nameEn : simulation.destinationGyre.namePt}
              </strong>
              {" · "}
              {simulation.arrivalMonths !== null
                ? `~${simulation.arrivalMonths} ${t("obs.debris.monthsUnit", "meses")}`
                : t("obs.debris.inTransit", "em trânsito no horizonte selecionado")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
