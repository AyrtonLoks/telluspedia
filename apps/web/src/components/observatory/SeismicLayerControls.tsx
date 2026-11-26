"use client";

import React from "react";
import { AlertTriangle, ExternalLink, History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import {
  SEISMIC_MIN_MAGNITUDES,
  SEISMIC_WINDOWS,
  type SeismicMinMagnitude,
  type SeismicWindow,
} from "@/lib/seismic-types";
import { applyTimelinePreset } from "@/stores/actions";
import { useObservatoryStore } from "@/stores/observatoryStore";

export const SeismicLayerControls: React.FC = () => {
  const { locale, t } = useI18n();

  const storeWindow = useObservatoryStore((s) => s.seismicWindow);
  const storeMinMag = useObservatoryStore((s) => s.seismicMinMagnitude);
  const storeShowPlates = useObservatoryStore((s) => s.showTectonicPlates);
  const storePayload = useObservatoryStore((s) => s.earthquakes);

  const seismicWindow =
    typeof window === "undefined" ? useObservatoryStore.getState().seismicWindow : storeWindow;
  const seismicMinMagnitude =
    typeof window === "undefined" ? useObservatoryStore.getState().seismicMinMagnitude : storeMinMag;
  const showTectonicPlates =
    typeof window === "undefined"
      ? useObservatoryStore.getState().showTectonicPlates
      : storeShowPlates;
  const payload =
    typeof window === "undefined" ? useObservatoryStore.getState().earthquakes : storePayload;

  const setSeismicFilter = useObservatoryStore((s) => s.setSeismicFilter);
  const setShowTectonicPlates = useObservatoryStore((s) => s.setShowTectonicPlates);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const layerMeta = useObservatoryStore((s) => s.layerMeta.USGS_EARTHQUAKES);

  const windowLabels: Record<SeismicWindow, string> = {
    "24h": "24 h",
    "7d": t("obs.seismic.window7d", "7 dias"),
    "30d": t("obs.seismic.window30d", "30 dias"),
  };

  const magLabels: Record<SeismicMinMagnitude, string> = {
    "2.5": "M 2.5+",
    "4.5": "M 4.5+",
    "6.0": "M 6.0+",
  };

  const strongestEvent = payload?.events[0] ?? null;

  return (
    <div data-testid="seismic-layer-controls" className="space-y-3 text-caption">
      {/* Janela temporal USGS */}
      <div className="space-y-1">
        <span className="block font-medium text-fg-secondary">
          {t("obs.seismic.windowLabel", "Janela sísmica (USGS)")}
        </span>
        <div
          role="radiogroup"
          aria-label={t("obs.seismic.windowLabel", "Janela sísmica (USGS)")}
          data-testid="seismic-window-group"
          className="grid grid-cols-3 gap-1 rounded-control border border-line bg-surface p-0.5"
        >
          {SEISMIC_WINDOWS.map((w) => {
            const active = seismicWindow === w;
            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`seismic-window-${w}`}
                onClick={() => setSeismicFilter({ window: w })}
                className={cn(
                  "rounded-control px-2 py-1 text-center font-mono text-caption font-medium tabular-nums transition-colors duration-fast ease-out",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {windowLabels[w]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Magnitude mínima */}
      <div className="space-y-1">
        <span className="block font-medium text-fg-secondary">
          {t("obs.seismic.minMagLabel", "Magnitude mínima")}
        </span>
        <div
          role="radiogroup"
          aria-label={t("obs.seismic.minMagLabel", "Magnitude mínima")}
          data-testid="seismic-mag-group"
          className="grid grid-cols-3 gap-1 rounded-control border border-line bg-surface p-0.5"
        >
          {SEISMIC_MIN_MAGNITUDES.map((m) => {
            const active = seismicMinMagnitude === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`seismic-mag-${m}`}
                onClick={() => setSeismicFilter({ minMagnitude: m })}
                className={cn(
                  "rounded-control px-2 py-1 text-center font-mono text-caption font-medium tabular-nums transition-colors duration-fast ease-out",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {magLabels[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo estatístico da janela */}
      {payload && (
        <div className="space-y-1.5 rounded-card border border-line bg-surface p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-fg-secondary">
              <strong className="font-mono text-fg tabular-nums">
                {formatNumber(payload.totalCount, locale)}
              </strong>{" "}
              {t("obs.seismic.eventsCountLabel", "sismos catalogados")}
            </span>
            {payload.maxMagnitude !== null && (
              <Badge tone="warning">
                {t("obs.seismic.peakMag", "Pico")} M {payload.maxMagnitude.toFixed(1)}
              </Badge>
            )}
          </div>

          {payload.tsunamiCount > 0 && (
            <div className="flex items-center gap-1.5 text-danger">
              <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {payload.tsunamiCount}{" "}
                {t("obs.seismic.tsunamiAlerts", "evento(s) com alerta oceânico de tsunami")}
              </span>
            </div>
          )}

          {strongestEvent && (
            <button
              type="button"
              data-testid="seismic-focus-strongest"
              onClick={() =>
                setSelectedEntity({
                  type: "EARTHQUAKE",
                  data: strongestEvent,
                  meta: layerMeta,
                })
              }
              className="w-full truncate rounded-control border border-line bg-surface-raised px-2 py-1 text-left text-caption text-fg-secondary transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
            >
              <span className="font-mono font-semibold text-warning tabular-nums">
                M {strongestEvent.magnitude.toFixed(1)}
              </span>{" "}
              · {strongestEvent.place}
            </button>
          )}
        </div>
      )}

      {/* Legenda de profundidade hipocentral (Wadati–Benioff) */}
      <div
        aria-label={t("obs.seismic.depthLegendAria", "Legenda de profundidade sísmica")}
        className="space-y-1 rounded-card border border-line bg-surface p-2.5"
      >
        <span className="block font-medium text-fg-secondary">
          {t("obs.seismic.depthTitle", "Profundidade hipocentral")}
        </span>
        <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-layer-fires" />
            <span>{t("obs.seismic.depthShallow", "< 70 km")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
            <span>70–300 km</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
            <span>&gt; 300 km</span>
          </span>
        </div>
      </div>

      {/* Placas tectônicas contemporâneas (PB2002) */}
      <div className="space-y-2 rounded-card border border-line bg-surface p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block font-medium text-fg">
              {t("obs.seismic.platesTitle", "Placas tectônicas (PB2002)")}
            </span>
            <span className="block text-fg-muted">
              {t("obs.seismic.platesSub", "Limites ativos de Peter Bird (2003)")}
            </span>
          </div>
          <Switch
            data-testid="seismic-plates-switch"
            checked={showTectonicPlates}
            label={t("obs.seismic.platesTitle", "Placas tectônicas (PB2002)")}
            onCheckedChange={setShowTectonicPlates}
          />
        </div>

        {showTectonicPlates && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full bg-danger" />
              <span>{t("obs.seismic.boundConvergent", "Convergente")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full bg-warning" />
              <span>{t("obs.seismic.boundDivergent", "Divergente")}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full bg-accent" />
              <span>{t("obs.seismic.boundTransform", "Transformante")}</span>
            </span>
          </div>
        )}
      </div>

      {/* Ponte temporal com a Paleogeografia (Pangeia 250 Ma) + Fonte primária USGS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          data-testid="seismic-compare-pangea"
          onClick={() => applyTimelinePreset("PANGEA_250MA")}
          title={t(
            "obs.seismic.pangeaBridgeTitle",
            "Transicionar para Pangeia (250 Ma) e comparar as suturas paleogeográficas com as placas atuais"
          )}
        >
          <History aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
          <span>{t("obs.seismic.comparePangea", "Ver Pangeia (250 Ma)")}</span>
        </Button>

        <a
          href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
        >
          <span>USGS GeoJSON</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
