"use client";

import React from "react";
import { X, MapPin, Globe } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";

interface CountryHeaderProps {
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent: string;
  region: string;
  flagSvgUrl?: string;
  isoCode: string;
}

export const CountryHeader: React.FC<CountryHeaderProps> = ({
  nameCommon,
  nameOfficial,
  capital,
  continent,
  region,
  flagSvgUrl,
  isoCode,
}) => {
  const resetView = useGlobeStore((s) => s.resetView);

  return (
    <div className="relative pb-4 border-b border-slate-700/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {flagSvgUrl ? (
            <img
              src={flagSvgUrl}
              alt={`Bandeira de ${nameCommon}`}
              className="w-10 h-7 object-cover rounded shadow-md border border-slate-700/50"
            />
          ) : (
            <div className="w-10 h-7 rounded bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center font-bold text-xs text-cyan-300">
              {isoCode}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">{nameCommon}</h2>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                {isoCode}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">{nameOfficial}</p>
          </div>
        </div>

        <button
          onClick={resetView}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
          title="Fechar painel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Capital: <strong className="text-slate-100">{capital}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{region || continent}</span>
        </div>
      </div>
    </div>
  );
};
