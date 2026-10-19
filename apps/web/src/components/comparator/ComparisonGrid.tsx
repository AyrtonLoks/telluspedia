"use client";

import React from "react";
import { X, Globe, Users, Maximize2, DollarSign, Award, Landmark, ExternalLink, Quote } from "lucide-react";
import { getCountryData } from "@/lib/country-data";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl } from "@/lib/citations";

interface ComparisonCardProps {
  country: ReturnType<typeof getCountryData>;
  onRemove: (iso: string) => void;
}

const ComparisonCountryCard: React.FC<ComparisonCardProps> = ({ country: c, onRemove }) => {
  const [flagError, setFlagError] = React.useState(false);
  const gdp = c.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD")?.value;
  const hdi = c.indicators.find((i) => i.indicatorCode === "UNDP.HDI")?.value;
  const lifeExp = c.indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN")?.value;

  const formatPop = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} bi`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mi`;
    return num.toLocaleString("pt-BR");
  };

  const formatGdp = (val?: number) => {
    if (!val) return "Consulte o dossiê";
    if (val >= 1e12) return `$ ${(val / 1e12).toFixed(2)} tri`;
    if (val >= 1e9) return `$ ${(val / 1e9).toFixed(1)} bi`;
    return `$ ${val.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800 relative space-y-3">
      {/* Header with remove button */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {c.flagSvgUrl && !flagError ? (
            <img
              src={c.flagSvgUrl}
              alt={`Bandeira de ${c.nameCommon}`}
              onError={() => setFlagError(true)}
              className="w-6 h-4 object-cover rounded shadow"
            />
          ) : (
            <span className="w-6 h-4 rounded bg-cyan-950 text-[10px] font-mono text-cyan-300 font-bold flex items-center justify-center border border-cyan-800/60 shadow">
              {c.isoCode}
            </span>
          )}
          <div>
            <h5 className="font-bold text-slate-100 text-xs line-clamp-1">{c.nameCommon}</h5>
            <span className="text-[10px] text-cyan-400 font-mono">{c.isoCode}</span>
          </div>
        </div>

        <button
          onClick={() => onRemove(c.isoCode)}
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
};

export const ComparisonGrid: React.FC = () => {
  const selectedIsos = useComparatorStore((s) => s.selectedIsos);
  const removeCountry = useComparatorStore((s) => s.removeCountry);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const countries = selectedIsos.map((iso) => getCountryData(iso)).filter(Boolean);

  if (countries.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Nenhum país selecionado para comparação. Adicione até 4 países para visualizar os dados lado a lado.
      </div>
    );
  }

  const handleGenerateComparisonCitation = () => {
    const names = countries.map((c) => c.nameCommon).join(", ");
    const isos = countries.map((c) => c.isoCode).join(",");
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/compare?c=${encodeURIComponent(isos)}`
      : `https://telluspedia.org/compare?c=${encodeURIComponent(isos)}`;

    setCitationModalOpen(true, {
      title: `Estudo Comparativo Multidimensional: ${names}`,
      countryName: countries[0]?.nameCommon || "TellusPedia",
      url,
      accessDate: new Date(),
      publicationYear: 2026,
    });
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-3 min-w-[600px]"
        style={{
          gridTemplateColumns: `repeat(${countries.length}, minmax(180px, 1fr))`,
        }}
      >
        {countries.map((c) => (
          <ComparisonCountryCard
            key={c.isoCode}
            country={c}
            onRemove={removeCountry}
          />
        ))}
      </div>

      {/* Institutional cited sources footer */}
      <footer className="mt-4 pt-2.5 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <strong className="text-cyan-400 font-medium">Fontes Primárias:</strong>
          <a
            href={getSourceUrl("Banco Mundial")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Banco Mundial</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
          •
          <a
            href={getSourceUrl("PNUD")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>PNUD</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
          •
          <a
            href={getSourceUrl("OMS")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>OMS</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
          •
          <a
            href={getSourceUrl("SIPRI")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>SIPRI</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
          •
          <a
            href={getSourceUrl("Natural Earth")}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-300 hover:underline inline-flex items-center gap-0.5"
          >
            <span>Natural Earth</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateComparisonCitation}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-700 font-mono text-[9px] transition-colors"
            title="Gerar Citação Acadêmica desta Comparação"
          >
            <Quote className="w-2.5 h-2.5" />
            <span>Citar Comparação</span>
          </button>
          <span className="font-mono text-slate-500">Auditoria TellusPedia</span>
        </div>
      </footer>
    </div>
  );
};
