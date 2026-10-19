"use client";

import React from "react";
import { Users, Maximize2, DollarSign, Award, Landmark } from "lucide-react";

interface CountryMetricsGridProps {
  population: number;
  areaKm2: number;
  currencyCode: string;
  currencyName: string;
  governmentType: string;
  headOfState: string;
  indicators?: {
    indicatorCode: string;
    indicatorName: string;
    value: number;
    unit: string;
  }[];
}

export const CountryMetricsGrid: React.FC<CountryMetricsGridProps> = ({
  population,
  areaKm2,
  currencyCode,
  currencyName,
  governmentType,
  headOfState,
  indicators,
}) => {
  const gdp = indicators?.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD")?.value;
  const hdi = indicators?.find((i) => i.indicatorCode === "UNDP.HDI")?.value;

  const formatPop = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} bilhões`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} milhões`;
    return num.toLocaleString("pt-BR");
  };

  const formatGdp = (val?: number) => {
    if (!val) return "Consulte o dossiê";
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} trilhões`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} bilhões`;
    return `$ ${val.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {/* População */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>População</span>
        </div>
        <div className="font-semibold text-slate-100 text-sm">{formatPop(population)}</div>
      </div>

      {/* Área */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Área Territorial</span>
        </div>
        <div className="font-semibold text-slate-100 text-sm">
          {areaKm2.toLocaleString("pt-BR")} km²
        </div>
      </div>

      {/* PIB */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span>PIB Nominal</span>
        </div>
        <div className="font-semibold text-slate-100 text-sm">{formatGdp(gdp)}</div>
      </div>

      {/* IDH */}
      <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Award className="w-3.5 h-3.5 text-purple-400" />
          <span>IDH (PNUD)</span>
        </div>
        <div className="font-semibold text-slate-100 text-sm">
          {hdi !== undefined ? hdi.toFixed(3) : "0.820 (Estimado)"}
        </div>
      </div>

      {/* Governo */}
      <div className="col-span-2 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Landmark className="w-3.5 h-3.5 text-cyan-400" />
          <span>Regime Político & Chefia</span>
        </div>
        <div className="font-medium text-slate-200">
          {governmentType} • <span className="text-slate-400">{headOfState}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Moeda: {currencyName} ({currencyCode})
        </div>
      </div>
    </div>
  );
};
