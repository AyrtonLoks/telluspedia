"use client";

import React from "react";
import { Crosshair, ExternalLink } from "lucide-react";
import { OPEN_METEO_AQI_DOCS_URL } from "@/lib/air-quality-data";
import type { AirQualityStation, AqiHealthBand } from "@/lib/air-quality-types";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import { sanitizeTeleGeographyUrl } from "@/lib/submarine-cables-data";
import type { CableChokePoint, SubmarineCableSystem } from "@/lib/submarine-cables-types";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { formatNumber } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";
import { AQI_BAND_TONE } from "./AirQualityControls";
import { DataSourceBadge } from "./DataSourceBadge";

const FIELD_GRID = "grid grid-cols-2 gap-3 rounded-card border border-line bg-surface-raised p-3";

function bandLabel(band: AqiHealthBand, t: ReturnType<typeof useI18n>["t"]): string {
  switch (band) {
    case "good":
      return t("aqi.band.good", "Bom");
    case "moderate":
      return t("aqi.band.moderate", "Moderado");
    case "sensitive":
      return t("aqi.band.sensitive", "Sensíveis");
    case "unhealthy":
      return t("aqi.band.unhealthy", "Insalubre");
    case "very_unhealthy":
      return t("aqi.band.veryUnhealthy", "Muito insalubre");
    case "hazardous":
      return t("aqi.band.hazardous", "Perigoso");
  }
}

export const SubmarineCableTelemetryDetails: React.FC<{
  cable: SubmarineCableSystem;
  landingName?: string;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
}> = ({ cable, landingName, onFocus }) => {
  const { locale, t } = useI18n();
  const safeUrl = sanitizeTeleGeographyUrl(cable.officialUrl);
  const anchorLanding =
    cable.landingPoints.find((lp) => lp.name === landingName) ?? cable.landingPoints[0];

  return (
    <div data-testid="submarine-cable-telemetry" className="space-y-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-label font-semibold text-fg">{cable.name}</div>
          <Badge tone="accent">RFS {cable.rfsYear}</Badge>
        </div>
        {landingName && (
          <p className="text-caption text-fg-secondary">
            {t("telemetry.cable.landingSelected", "Estação selecionada")}:{" "}
            <strong className="font-medium text-fg">{landingName}</strong>
          </p>
        )}
      </div>

      <div className={FIELD_GRID}>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">
            {t("telemetry.cable.capacity", "Capacidade de projeto")}
          </span>
          <span className="font-mono text-label font-semibold tabular-nums text-fg">
            {formatNumber(cable.designCapacityTbps, locale)} Tbps
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">
            {t("telemetry.cable.length", "Extensão submarina")}
          </span>
          <span className="font-mono text-label tabular-nums text-fg">
            {formatNumber(cable.lengthKm, locale)} km
          </span>
        </div>
      </div>

      <div className="space-y-1 rounded-card border border-line bg-surface-raised p-3">
        <span className="text-caption font-medium text-fg-muted">
          {t("telemetry.cable.owners", "Consórcio / Operadores")}
        </span>
        <p className="text-caption leading-relaxed text-fg">{cable.owners}</p>
      </div>

      <div className="space-y-1">
        <span className="text-caption font-medium text-fg-muted">
          {t("telemetry.cable.landings", "Estações de aterramento")} ({cable.landingPoints.length})
        </span>
        <div className="flex flex-wrap gap-1">
          {cable.landingPoints.map((lp) => (
            <button
              key={`${lp.name}-${lp.countryIso}`}
              type="button"
              onClick={() => onFocus(lp.lat, lp.lng, 1.85)}
              className="rounded-control border border-line bg-surface-raised px-2 py-0.5 text-caption text-fg-secondary hover:border-line-strong hover:text-fg"
            >
              {lp.name} ({lp.countryIso})
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {anchorLanding && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onFocus(anchorLanding.lat, anchorLanding.lng, 1.9)}
          >
            <Crosshair aria-hidden="true" className="h-4 w-4" />
            <span>{t("telemetry.cable.focus", "Focar sistema")}</span>
          </Button>
        )}
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="submarine-cable-source-link"
          className={buttonClasses("secondary", "sm")}
        >
          <span>TeleGeography</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

export const CableChokePointTelemetryDetails: React.FC<{
  chokePoint: CableChokePoint;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
}> = ({ chokePoint, onFocus }) => {
  const { locale, t } = useI18n();
  return (
    <div data-testid="cable-choke-telemetry" className="space-y-3">
      <div className="space-y-1">
        <div className="text-label font-semibold text-fg">
          {locale === "en" ? chokePoint.nameEn : chokePoint.namePt}
        </div>
        <Badge tone="warning">
          ~{chokePoint.cableCount} {t("telemetry.cable.systemsCount", "sistemas submarinos")}
        </Badge>
      </div>
      <p className="text-caption leading-relaxed text-fg-secondary">
        {locale === "en" ? chokePoint.summaryEn : chokePoint.summaryPt}
      </p>
      <Button
        variant="primary"
        size="sm"
        className="w-full"
        onClick={() => onFocus(chokePoint.lat, chokePoint.lng, 1.8)}
      >
        <Crosshair aria-hidden="true" className="h-4 w-4" />
        <span>{t("telemetry.cable.focusChoke", "Focar gargalo estratégico")}</span>
      </Button>
    </div>
  );
};

export const AirQualityTelemetryDetails: React.FC<{
  station: AirQualityStation;
  meta: ObservatoryMeta;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
}> = ({ station, meta, onFocus }) => {
  const { locale, t } = useI18n();
  const city = locale === "en" ? station.cityEn : station.cityPt;

  return (
    <div data-testid="air-quality-telemetry" className="space-y-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-label font-semibold text-fg">
            {city} ({station.countryIso})
          </div>
          <Badge tone={AQI_BAND_TONE[station.bandUs]}>{bandLabel(station.bandUs, t)}</Badge>
        </div>
        <DataSourceBadge meta={meta} />
      </div>

      <div className={FIELD_GRID}>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">US AQI (EPA)</span>
          <span className="font-mono text-label font-semibold tabular-nums text-fg">
            {station.usAqi ?? "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">European AQI</span>
          <span className="font-mono text-label font-semibold tabular-nums text-fg">
            {station.europeanAqi ?? "—"} ({bandLabel(station.bandEu, t)})
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">PM2.5</span>
          <span className="font-mono text-label tabular-nums text-fg">
            {station.pm25 != null ? `${formatNumber(station.pm25, locale)} µg/m³` : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-fg-muted">PM10</span>
          <span className="font-mono text-label tabular-nums text-fg">
            {station.pm10 != null ? `${formatNumber(station.pm10, locale)} µg/m³` : "—"}
          </span>
        </div>
      </div>

      <p className="text-caption text-fg-muted">
        {t(
          "telemetry.aqi.whoGuideline",
          "Diretriz OMS 24 h para PM2.5: ≤ 15 µg/m³. Dados atmosféricos: Open-Meteo Air Quality API (CAMS)."
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => onFocus(station.lat, station.lng, 1.85)}
        >
          <Crosshair aria-hidden="true" className="h-4 w-4" />
          <span>{t("telemetry.aqi.focusStation", "Focar estação")}</span>
        </Button>
        <a
          href={OPEN_METEO_AQI_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="air-quality-source-link"
          className={buttonClasses("secondary", "sm")}
        >
          <span>Open-Meteo</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
