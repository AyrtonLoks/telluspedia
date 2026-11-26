"use client";

import React from "react";
import { Crosshair, ExternalLink, Wind } from "lucide-react";
import { OPEN_METEO_AQI_DOCS_URL } from "@/lib/air-quality-data";
import type { AqiHealthBand, AqiScaleMode } from "@/lib/air-quality-types";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { Tone } from "@/components/ui/tones";
import { useI18n } from "@/lib/i18n/useT";

export const AQI_BAND_TONE: Readonly<Record<AqiHealthBand, Tone>> = {
  good: "success",
  moderate: "warning",
  sensitive: "warning",
  unhealthy: "danger",
  very_unhealthy: "danger",
  hazardous: "danger",
};

export const AirQualityControls: React.FC = () => {
  const { locale, t } = useI18n();
  const payload = useObservatoryStore((s) => s.airQualityStations);
  const scaleMode = useObservatoryStore((s) => s.aqiScaleMode);
  const setAqiScaleMode = useObservatoryStore((s) => s.setAqiScaleMode);
  const layerMeta = useObservatoryStore((s) => s.layerMeta.AIR_QUALITY);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const stations = payload?.stations ?? [];
  const worstStation = [...stations].sort((a, b) => {
    const valA = scaleMode === "european_aqi" ? (a.europeanAqi ?? 0) : (a.usAqi ?? 0);
    const valB = scaleMode === "european_aqi" ? (b.europeanAqi ?? 0) : (b.usAqi ?? 0);
    return valB - valA;
  })[0];

  const scaleOptions: Array<{ id: AqiScaleMode; label: string }> = [
    { id: "us_aqi", label: "US AQI (EPA)" },
    { id: "european_aqi", label: "European AQI (EEA)" },
  ];

  const bands: Array<{ id: AqiHealthBand; label: string; rangeUs: string; rangeEu: string }> = [
    { id: "good", label: t("aqi.band.good", "Bom"), rangeUs: "0–50", rangeEu: "0–20" },
    { id: "moderate", label: t("aqi.band.moderate", "Moderado"), rangeUs: "51–100", rangeEu: "21–40" },
    { id: "sensitive", label: t("aqi.band.sensitive", "Sensíveis"), rangeUs: "101–150", rangeEu: "41–60" },
    { id: "unhealthy", label: t("aqi.band.unhealthy", "Insalubre"), rangeUs: "151+", rangeEu: "61+" },
  ];

  return (
    <div data-testid="air-quality-controls" className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-caption font-medium text-fg">
          {t("obs.aqi.scaleHeading", "Escala normativa de índice")}
        </span>
        <div role="group" data-testid="aqi-scale-group" className="flex flex-wrap gap-1.5">
          {scaleOptions.map((opt) => (
            <Chip
              key={opt.id}
              data-testid={`aqi-scale-${opt.id}`}
              pressed={scaleMode === opt.id}
              onClick={() => setAqiScaleMode(opt.id)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {bands.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-1 rounded-control border border-line bg-surface px-2 py-1 text-caption"
          >
            <Badge tone={AQI_BAND_TONE[b.id]}>{b.label}</Badge>
            <span className="font-mono tabular-nums text-fg-muted">
              {scaleMode === "european_aqi" ? b.rangeEu : b.rangeUs}
            </span>
          </div>
        ))}
      </div>

      {worstStation && (
        <Button
          variant="secondary"
          size="sm"
          data-testid="aqi-focus-worst"
          className="w-full justify-between"
          onClick={() => {
            setSelectedEntity({
              type: "AIR_QUALITY_STATION",
              data: worstStation,
              meta: layerMeta,
            });
            flyTo(worstStation.lat, worstStation.lng, 2.0);
          }}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            <Wind aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-warning" />
            <span className="truncate">
              {locale === "en" ? worstStation.cityEn : worstStation.cityPt} ({worstStation.countryIso})
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono tabular-nums text-fg">
            <span>
              {scaleMode === "european_aqi"
                ? `EAQI ${worstStation.europeanAqi ?? "—"}`
                : `AQI ${worstStation.usAqi ?? "—"}`}
            </span>
            <Crosshair aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          </span>
        </Button>
      )}

      <div className="flex items-center justify-between border-t border-line pt-2 text-caption text-fg-muted">
        <span>Open-Meteo · CAMS</span>
        <a
          href={OPEN_METEO_AQI_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
        >
          <span>Open-Meteo Air Quality</span>
          <ExternalLink aria-hidden="true" className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
