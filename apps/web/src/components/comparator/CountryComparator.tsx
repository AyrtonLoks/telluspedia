"use client";

import React from "react";
import { X, BarChart2, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useComparatorStore } from "@/stores/comparatorStore";
import { PILOT_COUNTRIES } from "@/lib/country-data";
import { ComparisonGrid } from "./ComparisonGrid";

const ComparisonCharts = dynamic(
  () => import("./ComparisonCharts").then((m) => m.ComparisonCharts),
  { ssr: false }
);

export const CountryComparator: React.FC = () => {
  const isOpen = useComparatorStore((s) => s.isOpen);
  const closeComparator = useComparatorStore((s) => s.closeComparator);
  const selectedIsos = useComparatorStore((s) => s.selectedIsos);
  const addCountry = useComparatorStore((s) => s.addCountry);

  if (!isOpen) return null;

  const availableCountries = Object.values(PILOT_COUNTRIES).filter(
    (c) => !selectedIsos.includes(c.isoCode)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in zoom-in-95">
      <div className="w-full max-w-5xl h-[88vh] glass-panel rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-700/60">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Comparador Multidimensional de Países (Até 4 Nações)
            </h3>
          </div>

          <button
            onClick={closeComparator}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader: Add country quick chips */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 text-xs shrink-0">Adicionar Nação:</span>
          {availableCountries.length > 0 && selectedIsos.length < 4 ? (
            availableCountries.map((c) => (
              <button
                key={c.isoCode}
                onClick={() => addCountry(c.isoCode)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700/60 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>{c.nameCommon}</span>
              </button>
            ))
          ) : (
            <span className="text-slate-500 text-xs italic">
              {selectedIsos.length >= 4 ? "Limite de 4 países atingido." : "Todos os países adicionados."}
            </span>
          )}
        </div>

        {/* Body: Grid and Recharts Charts */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <ComparisonGrid />
          <ComparisonCharts />
        </div>
      </div>
    </div>
  );
};
