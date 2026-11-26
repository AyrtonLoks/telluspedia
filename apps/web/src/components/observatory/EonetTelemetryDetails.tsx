"use client";

import React from "react";
import { Crosshair, ExternalLink } from "lucide-react";
import { EONET_CATEGORIES, formatEonetDate, observationLocation, type ObservatoryEntity } from "@/lib/observatory-data";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";

const FIELD_GRID = "grid grid-cols-1 gap-3 rounded-card border border-line bg-surface-raised p-3";

export function EonetTelemetryDetails({
  entity,
  onFocus,
  onSelect,
}: {
  entity: Extract<ObservatoryEntity, { type: "EONET" }>;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
  onSelect: (entity: ObservatoryEntity) => void;
}) {
  const { locale, t } = useI18n();
  const { data, observationIndex } = entity;
  const geometry = data.geometry ?? [];
  const observation = geometry[observationIndex ?? geometry.length - 1];
  const { lat, lng } = observation ? observationLocation(observation) : data;
  const { date, magnitudeValue, magnitudeUnit, magnitudeDescription } = observation ?? data;
  const showTrack = data.category === "severeStorms" && geometry.length > 1;

  return (
    <>
      <div className="space-y-0.5">
        <div className="text-label font-medium text-fg">{data.title}</div>
        <p className="text-caption text-fg-muted">
          {t(`obs.eonet.${data.category}`, EONET_CATEGORIES[data.category])} · {formatEonetDate(date)}
        </p>
      </div>
      <div className={cn(FIELD_GRID)}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-caption text-fg-muted">
            {t("telemetry.observedMagnitude", "Magnitude observada")}
          </span>
          <span className="truncate font-mono text-label tabular-nums text-fg">
            {magnitudeValue == null
              ? t("common.unavailable", "Indisponível")
              : `${formatNumber(magnitudeValue, locale)} ${magnitudeUnit ?? ""}`}
          </span>
        </div>
        {magnitudeDescription && (
          <span className="text-caption text-fg-muted">{magnitudeDescription}</span>
        )}
      </div>
      {showTrack && (
        <div className="space-y-1">
          <p className="text-caption font-medium text-fg">
            {t("telemetry.trackObservations", "Observações da trajetória")}
          </p>
          <ul
            className="flex max-h-24 flex-wrap gap-1 overflow-auto"
            aria-label={t("telemetry.trackObservations", "Observações da trajetória")}
          >
            {geometry.map((point, index) => (
              <li key={`${point.date}-${index}`}>
                <button
                  type="button"
                  aria-pressed={point === observation}
                  className="rounded-control border border-line px-2 py-1 text-caption text-fg-secondary aria-pressed:bg-surface-raised aria-pressed:text-fg"
                  onClick={() => onSelect({ type: "EONET", data, observationIndex: index })}
                >
                  {formatEonetDate(point.date)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button variant="primary" size="sm" className="w-full" onClick={() => onFocus(lat, lng, 1.8)}>
        <Crosshair aria-hidden="true" className="h-4 w-4" />
        {t("telemetry.focusEvent", "Focar Evento")}
      </Button>
      {data.sources.length > 0 && (
        <ul
          aria-label={t("telemetry.eventSources", "Fontes do evento")}
          className="flex flex-wrap gap-1"
        >
          {data.sources.map(({ id, url }, index) => (
            <li key={`${url}-${index}`}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "sm")}
              >
                {id}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
