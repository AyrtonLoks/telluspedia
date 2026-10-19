"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Download, Quote } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { useGlobeStore } from "@/stores/globeStore";
import { getCountryData } from "@/lib/country-data";
import { formatABNT, formatAPA, formatMLA, formatBibTeX, copyToClipboard, CitationParams } from "@/lib/citations";

interface CitationModalProps {
  countryName?: string;
  dimensionTitle?: string;
  countryIso?: string;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  countryName: propCountryName,
  dimensionTitle: propDimensionTitle,
  countryIso: propCountryIso,
}) => {
  const isCitationModalOpen = useReaderStore((s) => s.isCitationModalOpen);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);
  const citationFormat = useReaderStore((s) => s.citationFormat);
  const setCitationFormat = useReaderStore((s) => s.setCitationFormat);
  const customCitationParams = useReaderStore((s) => s.customCitationParams);
  const selectedIso = useGlobeStore((s) => s.selectedIso);

  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isCitationModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCitationModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCitationModalOpen, setCitationModalOpen]);

  if (!isCitationModalOpen) return null;

  const currentCountry = selectedIso ? getCountryData(selectedIso) : null;
  const effectiveIso = propCountryIso || currentCountry?.isoCode || "BRA";
  const effectiveCountryName = propCountryName || currentCountry?.nameCommon || "TellusPedia";
  const effectiveTitle = propDimensionTitle || (currentCountry ? `${currentCountry.nameCommon}: Dossiê Temático` : "Observatório Planetário TellusPedia");

  const defaultUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pais/${effectiveIso}`
    : `https://telluspedia.org/pais/${effectiveIso}`;

  const params: CitationParams = customCitationParams || {
    title: effectiveTitle,
    countryName: effectiveCountryName,
    url: defaultUrl,
    accessDate: new Date(),
    publicationYear: 2026,
  };

  const formattedText = {
    ABNT: formatABNT(params),
    APA: formatAPA(params),
    MLA: formatMLA(params),
    BIBTEX: formatBibTeX(params),
  }[citationFormat];

  const handleCopy = async () => {
    const ok = await copyToClipboard(formattedText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadBib = () => {
    const bibContent = formatBibTeX(params);
    const blob = new Blob([bibContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `telluspedia_${(params.countryName || effectiveIso).toLowerCase().replace(/[^a-z0-9]/g, "")}.bib`;
    link.click();
  };

  return (
    <div
      onClick={() => setCitationModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl glass-panel rounded-2xl p-6 shadow-2xl border border-cyan-500/30 text-left"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2 min-w-0">
            <Quote className="w-5 h-5 text-cyan-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-100 truncate">
              {customCitationParams ? `Citar: ${params.title}` : "Citar Verbete / Fonte Acadêmica"}
            </h3>
          </div>
          <button
            onClick={() => setCitationModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 my-4 flex-wrap">
          {(["ABNT", "APA", "MLA", "BIBTEX"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setCitationFormat(fmt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                citationFormat === fmt
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {fmt === "ABNT" ? "ABNT (NBR 6023)" : fmt === "BIBTEX" ? "BibTeX (.bib)" : fmt}
            </button>
          ))}
        </div>

        {/* Formatted Citation Block */}
        <div className="relative p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words min-h-[90px] group">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm opacity-80 group-hover:opacity-100"
            title="Copiar citação formatada"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {formattedText}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800 flex-wrap gap-2">
          <span className="text-[11px] text-slate-400 truncate max-w-[280px]">
            {params.url}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {citationFormat === "BIBTEX" && (
              <button
                onClick={handleDownloadBib}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .bib</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-cyan-900/30"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Citação</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
