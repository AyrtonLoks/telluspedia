"use client";

import React from "react";
import { Quote, Clock, Bookmark, ArrowRight } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { PilotCountryData } from "@/lib/country-data";
import { HoverCardPreview } from "./HoverCardPreview";

interface ReaderContentProps {
  country: PilotCountryData;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({ country }) => {
  const activeDimension = useReaderStore((s) => s.activeDimension);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const section = country.dossierSections?.find((s) => s.dimension === activeDimension);

  const title = section?.title || `${country.nameCommon}: Dossiê Temático`;
  const content = section?.contentMarkdown || `O dossiê da dimensão ${activeDimension} para ${country.nameCommon} está em constante expansão pela comunidade acadêmica do TellusPedia.

Para estudos comparativos preliminares, consulte as relações bilaterais com a Alemanha, Estados Unidos e Japão.`;

  return (
    <article className="flex-1 px-8 py-4 overflow-y-auto max-h-[calc(85vh-4rem)]">
      {/* Header of Dossier Entry */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 font-mono text-xs font-semibold">
              {activeDimension}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Leitura de ~{section?.estimatedReadMin || 6} min</span>
            </span>
          </div>

          <button
            onClick={() => setCitationModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            <Quote className="w-3.5 h-3.5 text-cyan-400" />
            <span>Citar Verbete</span>
          </button>
        </div>

        <h1 className="mt-4 text-2xl font-serif font-bold text-slate-100 tracking-tight leading-snug">
          {title}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {country.nameOfficial} • TellusPedia Planetary & Geopolitical Knowledge Base
        </p>
      </div>

      {/* Main Prose Content with Academic Typography */}
      <div className="mt-6 font-serif text-slate-200 text-base leading-relaxed space-y-4">
        {content.split("\n\n").map((paragraph, idx) => {
          // Render hover preview if Germany, USA, Japan or Brazil are mentioned in text
          if (paragraph.includes("Alemanha") && country.isoCode !== "DEU") {
            const parts = paragraph.split("Alemanha");
            return (
              <p key={idx} className="leading-relaxed">
                {parts[0]}
                <HoverCardPreview isoCode="DEU">Alemanha</HoverCardPreview>
                {parts[1]}
              </p>
            );
          }
          if (paragraph.includes("Estados Unidos") && country.isoCode !== "USA") {
            const parts = paragraph.split("Estados Unidos");
            return (
              <p key={idx} className="leading-relaxed">
                {parts[0]}
                <HoverCardPreview isoCode="USA">Estados Unidos</HoverCardPreview>
                {parts[1]}
              </p>
            );
          }
          if (paragraph.includes("Brasil") && country.isoCode !== "BRA") {
            const parts = paragraph.split("Brasil");
            return (
              <p key={idx} className="leading-relaxed">
                {parts[0]}
                <HoverCardPreview isoCode="BRA">Brasil</HoverCardPreview>
                {parts[1]}
              </p>
            );
          }
          return (
            <p key={idx} className="leading-relaxed">
              {paragraph}
            </p>
          );
        })}
      </div>

      {/* Footnotes & Academic References Section */}
      <div className="mt-12 pt-6 border-t border-slate-800 text-xs font-sans text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-300 mb-2">
          <Bookmark className="w-4 h-4 text-cyan-400" />
          <span>Fontes Primárias & Conformidade de Dados</span>
        </div>
        <p>
          1. Dados geoespaciais e fronteiras baseados na cartografia Natural Earth (1:110m).
        </p>
        <p>
          2. Séries temporais de indicadores econômicos e demográficos validados junto ao Banco Mundial e ONU.
        </p>
        {section?.citationsJson?.primarySource && (
          <p>
            3. Fonte de referência direta: <em>{section.citationsJson.primarySource}</em>.
          </p>
        )}
      </div>
    </article>
  );
};
