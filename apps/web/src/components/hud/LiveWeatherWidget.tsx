"use client";

import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets } from "lucide-react";
import { fetchWeather, WeatherData } from "@/lib/api-client";

interface LiveWeatherWidgetProps {
  lat: number | null;
  lng: number | null;
  referenceName?: string | null;
}

function formatMeasurement(value: number | null | undefined, unit: string) {
  return value == null ? "—" : `${Math.round(value)}${unit}`;
}

const referenceTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});

export const LiveWeatherWidget: React.FC<LiveWeatherWidgetProps> = ({ lat, lng, referenceName }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
    if (code >= 51 && code <= 67) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 text-slate-300" />;
    return <Sun className="w-4 h-4 text-amber-400" />;
  };

  if (!hasCoords) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-slate-500" />
          <div>
            <div className="font-semibold text-slate-400 text-xs">Dado indisponível</div>
            <div className="text-[10px] text-slate-500">Clima local</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-slate-700/40 bg-slate-900/60 px-3 py-2 text-xs">
      <div>
        <div className="font-medium text-slate-200">Clima local · {referenceName ?? "Ponto de referência"}</div>
        <div className="text-[10px] text-slate-400" title="Latitude e longitude do ponto consultado">
          {lat?.toFixed(4)}, {lng?.toFixed(4)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {getWeatherIcon(current?.weather_code)}
        <div>
          <div className="font-semibold text-slate-100 text-sm">
            {loading ? "..." : formatMeasurement(current?.temperature, "°C")}
          </div>
          <div className="text-[10px] text-slate-400">
            {current ? `Sensação ${formatMeasurement(current.apparent_temperature, "°C")}` : "Clima local"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
        <div className="flex items-center gap-1" title="Umidade Relativa">
          <Droplets className="w-3 h-3 text-cyan-400" />
          <span>{formatMeasurement(current?.relative_humidity, "%")}</span>
        </div>
        <div className="flex items-center gap-1" title="Velocidade do Vento">
          <Wind className="w-3 h-3 text-slate-400" />
          <span>{formatMeasurement(current?.wind_speed, " km/h")}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400">
        Estimativa{" "}
        <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer" className="text-cyan-300 underline">
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
