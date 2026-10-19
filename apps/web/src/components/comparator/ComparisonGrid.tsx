"use client";

import React from "react";
import { X, Globe, Users, Maximize2, DollarSign, Award, Landmark } from "lucide-react";
import { useComparatorStore } from "@/stores/comparatorStore";
import { PILOT_COUNTRIES } from "@/lib/country-data";

export const ComparisonGrid: React.FC = () => {
  const selectedIsos = useComparatorStore((s) => s.selectedIsos);
  const removeCountry = useComparatorStore((s) => s.removeCountry);

  const countries = selectedIsos.map((iso) => PILOT_COUNTRIES[iso]).filter(Boolean);

  if (countries.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Nenhum país selecionado para comparação. Adicione até 4 países para visualizar os dados lado a lado.
      </div>
    );
  }

  const formatPop = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} bi`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mi`;
    return num.toLocaleString("pt-BR");
  };

  const formatGdp = (val?: number) => {
    if (!val) return "N/D";
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} tri`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} bi`;
    return `$ ${val.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-3 min-w-[600px]"
        style={{
          gridTemplateColumns: `repeat(${countries.length}, minmax(180px, 1fr))`,
        }}
      >
        {countries.map((c) => {
          const gdp = c.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD")?.value;
          const hdi = c.indicators.find((i) => i.indicatorCode === "UNDP.HDI")?.value;
          const lifeExp = c.indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN")?.value;

          return (
            <div
              key={c.isoCode}
              className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800 relative space-y-3"
            >
              {/* Header with remove button */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <img
                    src={c.flagSvgUrl}
                    alt=""
                    className="w-6 h-4 object-cover rounded shadow"
                  />
                  <div>
                    <h5 className="font-bold text-slate-100 text-xs line-clamp-1">{c.nameCommon}</h5>
                    <span className="text-[10px] text-cyan-400 font-mono">{c.isoCode}</span>
                  </div>
                </div>

                <button
                  onClick={() => removeCountry(c.isoCode)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remover país"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Data Rows */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Capital</span>
                  <span className="font-medium text-slate-200">{c.capital}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">População</span>
                  <span className="font-semibold text-cyan-300">{formatPop(c.population)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Área Territorial</span>
                  <span className="font-medium text-slate-200">{c.areaKm2.toLocaleString("pt-BR")} km²</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">PIB Nominal</span>
                  <span className="font-semibold text-amber-300">{formatGdp(gdp)}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">IDH</span>
                  <span className="font-semibold text-purple-300">{hdi ? hdi.toFixed(3) : "N/D"}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Expectativa de Vida</span>
                  <span className="font-medium text-slate-200">{lifeExp ? `${lifeExp} anos` : "N/D"}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Sistema de Governo</span>
                  <span className="text-[11px] text-slate-300 line-clamp-2">{c.governmentType}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
