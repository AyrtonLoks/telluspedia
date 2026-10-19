"use client";

import React, { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Wind, Droplets } from "lucide-react";
import { fetchWeather, WeatherData } from "@/lib/api-client";

interface LiveWeatherWidgetProps {
  lat: number;
  lng: number;
}

export const LiveWeatherWidget: React.FC<LiveWeatherWidgetProps> = ({ lat, lng }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  const getWeatherIcon = (code?: number) => {
    if (code === undefined) return <Sun className="w-4 h-4 text-amber-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 text-slate-300" />;
    return <Sun className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs">
      <div className="flex items-center gap-2">
        {getWeatherIcon(weather?.weather_code)}
        <div>
          <div className="font-semibold text-slate-100 text-sm">
            {loading ? "..." : weather ? `${Math.round(weather.temperature)}°C` : "N/D"}
          </div>
          <div className="text-[10px] text-slate-400">
            {weather ? `Sensação ${Math.round(weather.apparent_temperature)}°C` : "Clima local"}
          </div>
        </div>
      </div>

      {weather && (
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1" title="Umidade Relativa">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>{Math.round(weather.relative_humidity)}%</span>
          </div>
          <div className="flex items-center gap-1" title="Velocidade do Vento">
            <Wind className="w-3 h-3 text-slate-400" />
            <span>{Math.round(weather.wind_speed)} km/h</span>
          </div>
        </div>
      )}
    </div>
  );
};
