"use client";

import React, { useState } from "react";
import { X, Copy, Check, Download, Quote } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { formatABNT, formatAPA, formatMLA, formatBibTeX } from "@/lib/citations";

interface CitationModalProps {
  countryName: string;
  dimensionTitle: string;
  countryIso: string;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  countryName,
  dimensionTitle,
  countryIso,
}) => {
  const isCitationModalOpen = useReaderStore((s) => s.isCitationModalOpen);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);
  const citationFormat = useReaderStore((s) => s.citationFormat);
  const setCitationFormat = useReaderStore((s) => s.setCitationFormat);

  const [copied, setCopied] = useState<boolean>(false);

  if (!isCitationModalOpen) return null;

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/pais/${countryIso}`
    : `https://telluspedia.org/pais/${countryIso}`;

  const params = {
    title: dimensionTitle,
    countryName: countryName,
    url,
    accessDate: new Date(),
    publicationYear: 2026,
  };

  const formattedText = {
    ABNT: formatABNT(params),
    APA: formatAPA(params),
    MLA: formatMLA(params),
    BIBTEX: formatBibTeX(params),
  }[citationFormat];

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBib = () => {
    const bibContent = formatBibTeX(params);
    const blob = new Blob([bibContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `telluspedia_${countryIso.toLowerCase()}.bib`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl glass-panel rounded-2xl p-6 shadow-2xl border border-cyan-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">Citar Verbete Acadêmico</h3>
          </div>
          <button
            onClick={() => setCitationModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 my-4">
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
        <div className="relative p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words min-h-[90px]">
          {formattedText}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            Padrão oficial com DOI e identificador canônico.
          </span>

          <div className="flex items-center gap-2">
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
                  <Check className="w-4 h-4" />
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
