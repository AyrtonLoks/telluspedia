"use client";

import React from "react";
import { AlertTriangle, Crosshair, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import { sanitizeUsgsEventUrl } from "@/lib/seismic-data";
import type { SeismicEvent } from "@/lib/seismic-types";
import { DataSourceBadge } from "./DataSourceBadge";

export interface EarthquakeTelemetryDetailsProps {
  event: SeismicEvent;
  meta: ObservatoryMeta;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
}

export const EarthquakeTelemetryDetails: React.FC<EarthquakeTelemetryDetailsProps> = ({
  event,
  meta,
  onFocus,
}) => {
  const { locale, t } = useI18n();

  const depthLabel =
    event.depthBand === "shallow"
      ? t("telemetry.seismic.shallow", "Raso (< 70 km)")
      : event.depthBand === "intermediate"
        ? t("telemetry.seismic.intermediate", "Intermediário (70–300 km)")
        : t("telemetry.seismic.deep", "Profundo (> 300 km)");

  const formattedUtc = Number.isFinite(event.timestamp)
    ? `${new Date(event.timestamp).toLocaleString(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      })} UTC`
    : t("common.unavailable", "Indisponível");

  const safeUrl = sanitizeUsgsEventUrl(event.usgsUrl, event.id);

  return (
    <div data-testid="earthquake-telemetry" className="space-y-3">
      <div className="space-y-1">
        <div className="text-label font-semibold text-fg">{event.place}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <DataSourceBadge meta={meta} />
          {event.tsunamiAlert ? (
            <Badge tone="danger">
              <AlertTriangle aria-hidden="true" className="mr-1 h-3 w-3" />
              {t("telemetry.seismic.tsunamiAlert", "Alerta oceânico de tsunami")}
            </Badge>
          ) : (
            <Badge tone="neutral">
              {t("telemetry.seismic.noTsunami", "Sem alerta de tsunami")}
            </Badge>
          )}
        </div>
        <span className="block font-mono text-caption text-fg-muted tabular-nums">
          {formattedUtc}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface-raised p-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption text-fg-muted">
            {t("telemetry.seismic.magnitude", "Magnitude")}
          </span>
          <span className="font-mono text-title font-semibold text-warning tabular-nums">
            M {event.magnitude.toFixed(1)}{" "}
            <span className="text-caption font-normal text-fg-muted">
              ({event.magType.toUpperCase()})
            </span>
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption text-fg-muted">
            {t("telemetry.seismic.depth", "Profundidade")}
          </span>
          <span className="font-mono text-label text-fg tabular-nums">
            {formatNumber(event.depthKm, locale, { maximumFractionDigits: 1 })} km
          </span>
          <span className="truncate text-caption text-fg-muted">{depthLabel}</span>
        </div>

        <div className="col-span-2 flex min-w-0 flex-col gap-0.5 border-t border-line pt-2">
          <span className="text-caption text-fg-muted">
            {t("telemetry.seismic.epicenter", "Epicentro")}
          </span>
          <span className="font-mono text-label text-fg tabular-nums">
            {event.lat.toFixed(3)}°, {event.lng.toFixed(3)}°
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => onFocus(event.lat, event.lng, 1.75)}
        >
          <Crosshair aria-hidden="true" className="h-4 w-4" />
          <span>{t("telemetry.seismic.focusEpicenter", "Focar Epicentro")}</span>
        </Button>

        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="earthquake-usgs-link"
          title={t("telemetry.seismic.openUsgs", "Abrir boletim sismológico oficial na USGS")}
          className={buttonClasses("secondary", "sm")}
        >
          <span>USGS</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="text-caption text-fg-muted">
        {t(
          "telemetry.seismic.sourceFootnote",
          "Fonte: USGS Earthquake Hazards Program (ANSS ComCat) · Placas PB2002 (Bird, 2003)."
        )}
      </p>
    </div>
  );
};
