"use client";

import React from "react";
import { X, ArrowLeft } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { PILOT_COUNTRIES } from "@/lib/country-data";
import { ReaderTableOfContents } from "./ReaderTableOfContents";
import { ReaderContent } from "./ReaderContent";
import { CitationModal } from "./CitationModal";
import { useReaderStore } from "@/stores/readerStore";

export const ReaderMode: React.FC = () => {
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const activeDimension = useReaderStore((s) => s.activeDimension);

  if (!isReaderOpen || !selectedIso) return null;

  const country = PILOT_COUNTRIES[selectedIso] || {
    isoCode: selectedIso,
    iso2: selectedIso.slice(0, 2),
    numericCode: "000",
    nameCommon: selectedIso,
    nameOfficial: `República de ${selectedIso}`,
    capital: "Capital Central",
    continent: "Global",
    region: "Terra",
    population: 10000000,
    areaKm2: 250000,
    latitude: 0,
    longitude: 0,
    timezone: "UTC",
    flagSvgUrl: "",
    currencyCode: "USD",
    currencyName: "Dólar",
    governmentType: "Estado Soberano",
    headOfState: "Presidente",
    summary: "Dossiê em expansão pela comunidade TellusPedia.",
    indicators: [],
    dossierSections: [],
    milestones: [],
  };

  const currentSection = country.dossierSections?.find((s) => s.dimension === activeDimension);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in zoom-in-95">
      <div className="w-full max-w-5xl h-[88vh] glass-panel rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-700/60">
        {/* Top Navbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <button
            onClick={() => setReaderOpen(false)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retornar ao Globo Interativo</span>
          </button>

          <div className="flex items-center gap-3">
            {country.flagSvgUrl && (
              <img
                src={country.flagSvgUrl}
                alt=""
                className="w-5 h-3.5 object-cover rounded shadow"
              />
            )}
            <span className="font-semibold text-sm text-slate-100">{country.nameCommon}</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              Modo Leitura Profunda
            </span>
          </div>

          <button
            onClick={() => setReaderOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar TOC + Main Academic Reader */}
        <div className="flex flex-1 overflow-hidden p-6 gap-6">
          <ReaderTableOfContents />
          <ReaderContent country={country} />
        </div>
      </div>

      {/* Citation Export Modal */}
      <CitationModal
        countryName={country.nameCommon}
        dimensionTitle={currentSection?.title || `${country.nameCommon}: Dossiê Geral`}
        countryIso={country.isoCode}
      />
    </div>
  );
};
