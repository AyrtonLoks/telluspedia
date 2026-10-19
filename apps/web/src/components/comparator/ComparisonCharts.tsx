"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useComparatorStore } from "@/stores/comparatorStore";
import { PILOT_COUNTRIES } from "@/lib/country-data";

const COUNTRY_COLORS = ["#06b6d4", "#f59e0b", "#10b981", "#ec4899"];

export const ComparisonCharts: React.FC = () => {
  const selectedIsos = useComparatorStore((s) => s.selectedIsos);
  const activeMetric = useComparatorStore((s) => s.activeMetric);
  const setActiveMetric = useComparatorStore((s) => s.setActiveMetric);

  // Build time series dataset (1990 to 2023)
  const chartData = useMemo(() => {
    const years = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2023];
    return years.map((year) => {
      const point: Record<string, any> = { year };

      selectedIsos.forEach((iso) => {
        const country = PILOT_COUNTRIES[iso];
        if (!country) return;

        let baseVal = 1.0;
        if (activeMetric === "GDP") {
          const gdp = country.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD")?.value || 1e12;
          // Normalized historical curve approximation
          const growthFactor = (year - 1990) / 33.0;
          point[country.nameCommon] = Math.round((gdp / 1e12) * (0.35 + 0.65 * growthFactor) * 100) / 100;
        } else if (activeMetric === "POPULATION") {
          const pop = country.population;
          const growthFactor = (year - 1990) / 33.0;
          point[country.nameCommon] = Math.round((pop / 1e6) * (0.75 + 0.25 * growthFactor) * 10) / 10;
        } else if (activeMetric === "HDI") {
          const hdi = country.indicators.find((i) => i.indicatorCode === "UNDP.HDI")?.value || 0.8;
          const growthFactor = (year - 1990) / 33.0;
          point[country.nameCommon] = Math.round((hdi - 0.15 + 0.15 * growthFactor) * 1000) / 1000;
        } else {
          const mil = country.indicators.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS")?.value || 1.5;
          point[country.nameCommon] = mil;
        }
      });

      return point;
    });
  }, [selectedIsos, activeMetric]);

  const metricLabels: Record<string, { title: string; unit: string }> = {
    GDP: { title: "PIB Nominal Histórico", unit: "Trilhões USD" },
    POPULATION: { title: "Evolução Demográfica", unit: "Milhões de Habitantes" },
    HDI: { title: "Índice de Desenvolvimento Humano", unit: "Score (0-1)" },
    MILITARY: { title: "Gastos com Defesa", unit: "% do PIB" },
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-100">
            {metricLabels[activeMetric].title}
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Unidade: {metricLabels[activeMetric].unit}
          </span>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1.5">
          {(["GDP", "POPULATION", "HDI", "MILITARY"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === m
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m === "GDP" ? "PIB" : m === "POPULATION" ? "População" : m === "HDI" ? "IDH" : "Militar"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                borderColor: "rgba(56, 189, 248, 0.3)",
                borderRadius: "0.75rem",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            {selectedIsos.map((iso, idx) => {
              const country = PILOT_COUNTRIES[iso];
              if (!country) return null;
              return (
                <Line
                  key={iso}
                  type="monotone"
                  dataKey={country.nameCommon}
                  stroke={COUNTRY_COLORS[idx % COUNTRY_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
