"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Cloud, CloudRain, Sun, Wind, Droplets } from "lucide-react";
import { fetchWeather, WeatherData } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/useT";

interface LiveWeatherWidgetProps {
  lat: number | null;
  lng: number | null;
  referenceName?: string | null;
}

function formatMeasurement(value: number | null | undefined, unit: string) {
  return value == null ? "—" : `${Math.round(value)}${unit}`;
}

export const LiveWeatherWidget: React.FC<LiveWeatherWidgetProps> = ({ lat, lng, referenceName }) => {
  const { locale, t } = useI18n();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const referenceTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "UTC",
      }),
    [locale]
  );

  const hasCoords =
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    (lat !== 0 || lng !== 0);

  useEffect(() => {
    if (!hasCoords || lat === null || lng === null) {
      setWeather(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchWeather(lat, lng)
      .then((data) => {
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWeather(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lng, hasCoords]);

  const current = loading ? null : weather;
  const referenceTime = current?.reference_time == null ? null : new Date(current.reference_time * 1000);
  const hasReferenceTime = referenceTime !== null && Number.isFinite(referenceTime.getTime());

  const getWeatherIcon = (code: number | null | undefined) => {
    if (code == null) return null;
    if (code >= 51 && code <= 67) return <CloudRain aria-hidden="true" className="h-4 w-4 text-fg-secondary" />;
    if (code >= 1 && code <= 3) return <Cloud aria-hidden="true" className="h-4 w-4 text-fg-secondary" />;
    return <Sun aria-hidden="true" className="h-4 w-4 text-fg-secondary" />;
  };

  if (!hasCoords) {
    return (
      <div className="flex items-center justify-between rounded-card border border-line bg-surface-raised px-3 py-2">
        <div className="flex items-center gap-2">
          <Cloud aria-hidden="true" className="h-4 w-4 text-fg-muted" />
          <div>
            <div className="text-label font-medium text-fg-secondary">{t("common.dataUnavailable", "Dado indisponível")}</div>
            <div className="text-caption text-fg-muted">{t("weather.localWeather", "Clima local")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div aria-busy={loading} className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface-raised px-3 py-2">
      <div>
        <div className="text-caption font-medium text-fg-secondary">
          {t("weather.localWeather", "Clima local")} · {referenceName ?? t("weather.referencePoint", "Ponto de referência")}
        </div>
        <div className="font-mono text-caption tabular-nums text-fg-muted" title={t("weather.coordsTitle", "Latitude e longitude do ponto consultado")}>
          {lat?.toFixed(4)}, {lng?.toFixed(4)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {getWeatherIcon(current?.weather_code)}
        <div>
          <div className="font-mono text-body font-medium tabular-nums text-fg">
            {loading ? <Skeleton className="my-1 h-4 w-12" /> : formatMeasurement(current?.temperature, "°C")}
          </div>
          <div className="text-caption text-fg-muted">
            {current
              ? `${t("weather.feelsLike", "Sensação")} ${formatMeasurement(current.apparent_temperature, "°C")}`
              : t("weather.localWeather", "Clima local")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-caption tabular-nums text-fg-secondary">
        <div className="flex items-center gap-1" title={t("weather.humidityTitle", "Umidade Relativa")}>
          <Droplets aria-hidden="true" className="h-3 w-3 text-fg-muted" />
          {loading ? <Skeleton className="h-3 w-8" /> : <span>{formatMeasurement(current?.relative_humidity, "%")}</span>}
        </div>
        <div className="flex items-center gap-1" title={t("weather.windTitle", "Velocidade do Vento")}>
          <Wind aria-hidden="true" className="h-3 w-3 text-fg-muted" />
          {loading ? <Skeleton className="h-3 w-12" /> : <span>{formatMeasurement(current?.wind_speed, " km/h")}</span>}
        </div>
      </div>
      <p className="text-caption text-fg-muted">
        {t("weather.estimate", "Estimativa")}{" "}
        <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer" className="text-accent underline hover:text-accent-hover">
          Open-Meteo
        </a>
        {hasReferenceTime && (
          <time className="block" dateTime={referenceTime.toISOString()}>
            {referenceTimeFormat.format(referenceTime)} UTC
          </time>
        )}
      </p>
    </div>
  );
};
