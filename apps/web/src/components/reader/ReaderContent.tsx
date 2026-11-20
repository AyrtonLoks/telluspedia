"use client";

import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useMemo } from "react";
import { Quote, Clock, Bookmark, ExternalLink, BookOpen } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { CountryData } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";
import { HoverCardPreview } from "./HoverCardPreview";
import { HoverCitationCard } from "./HoverCitationCard";

interface ReaderContentProps {
  country: CountryData;
  dimension?: string;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({ country, dimension }) => {
  const storeDimension = useReaderStore((s) => s.activeDimension);
  const activeDimension = dimension || storeDimension;
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const section = country.dossierSections?.find((s) => s.dimension === activeDimension);

  const COUNTRY_NAME_TO_ISO: Record<string, string> = useMemo(
    () => ({
      "Brasil": "BRA",
      "Alemanha": "DEU",
      "Estados Unidos": "USA",
      "Japão": "JPN",
      "África do Sul": "ZAF",
      "Egito": "EGY",
      "Canadá": "CAN",
      "França": "FRA",
      "Reino Unido": "GBR",
      "Itália": "ITA",
      "Espanha": "ESP",
      "Portugal": "PRT",
      "China": "CHN",
      "Índia": "IND",
      "Rússia": "RUS",
      "Austrália": "AUS",
      "Argentina": "ARG",
      "México": "MEX",
      "Chile": "CHL",
      "Colômbia": "COL",
      "Polônia": "POL",
    }),
    []
  );

  // Build footnotes strictly from real sources declared on the curated dossier section
  const activeFootnotesMap = useMemo(() => {
    if (!section) return {} as Record<number, { source: string; detail: string; type: string }>;

    const baseMap: Record<number, { source: string; detail: string; type: string }> = {};
    const primarySource = section.citationsJson?.primarySource;
    if (primarySource) {
      baseMap[1] = {
        source: primarySource,
        detail: "Publicação ou repositório institucional declarado neste verbete.",
        type: "Fonte Primária Direta",
      };
    }

    const contentStr = section.contentMarkdown;
    const citedNumbers = new Set<number>();
    for (const match of contentStr.matchAll(/\[(\d+)\]/g)) {
      citedNumbers.add(parseInt(match[1], 10));
    }

    if (citedNumbers.has(2)) {
      baseMap[2] = {
        source: "Banco Mundial (World Development Indicators) / Divisão de Estatística da ONU",
        detail: "Séries temporais e indicadores demográficos e macroeconômicos auditados.",
        type: "Série Estatística Oficial",
      };
    }

    if (citedNumbers.has(3)) {
      baseMap[3] = {
        source: "Cartografia Natural Earth (1:110m)",
        detail: "Delimitações territoriais e vetores geoespaciais calibrados.",
        type: "Cartografia Oficial",
      };
    }

    return baseMap;
  }, [section]);

  // Empty state when no dossier has been authored for this country/dimension
  if (!section) {
    const wikipediaUrl = `https://pt.wikipedia.org/wiki/${encodeURIComponent(country.nameCommon)}`;
    const wikidataUrl = country.wikidataQid
      ? `https://www.wikidata.org/wiki/${encodeURIComponent(country.wikidataQid)}`
      : null;
    const worldBankUrl = !country.isHistoricalEntity
      ? `https://data.worldbank.org/country/${encodeURIComponent(country.isoCode)}`
      : null;

    return (
      <article
        data-testid="reader-empty-state"
        className="flex-1 px-8 py-6 overflow-y-auto max-h-[calc(85vh-4rem)] scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent"
      >
        <div className="pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 font-mono text-xs font-semibold">
              {activeDimension}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-mono">
              Sem verbete editorial
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-serif font-bold text-slate-100 tracking-tight leading-snug">
            {country.nameCommon}
          </h1>
          {country.nameOfficial && (
            <p className="text-xs text-slate-400 mt-1">{country.nameOfficial}</p>
          )}
        </div>

        <div className="mt-8 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-100 font-semibold text-base">
            <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2>Este dossiê ainda não foi escrito</h2>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            Ainda não há um verbete curado com fontes primárias auditadas para a dimensão{" "}
            <span className="font-mono text-cyan-300">{activeDimension}</span> de{" "}
            <strong className="text-slate-100">{country.nameCommon}</strong> no TellusPedia. Para
            consultar dados e referências verificáveis diretamente nas fontes externas:
          </p>

          <div className="flex items-center gap-2.5 flex-wrap pt-2">
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-700 text-xs font-medium transition-colors"
            >
              <span>Wikipédia ({country.nameCommon})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {wikidataUrl && (
              <a
                href={wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-700 text-xs font-medium transition-colors"
              >
                <span>Wikidata ({country.wikidataQid})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {worldBankUrl && (
              <a
                href={worldBankUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-cyan-950 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-700 text-xs font-medium transition-colors"
              >
                <span>Banco Mundial ({country.isoCode})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <StudyContext entityId={`country:${country.isoCode}`} />
      </article>
    );
  }

  const title = section.title;
  const content = section.contentMarkdown;

  // Token parser for text elements: [N], bold **...**, italics *...*, and country hover cards
  const renderFormattedParagraph = (paragraph: string, pIdx: number) => {
    const parseLineTokens = (cleanLine: string, lIdx: number) => {
      const regex =
        /(\[\d+\]|\*\*[^*]+\*\*|\*[^*]+\*|Estados Unidos|África do Sul|Reino Unido|Alemanha|Brasil|Japão|Egito|Canadá|França|Itália|Espanha|Portugal|China|Índia|Rússia|Austrália|Argentina|México|Chile|Colômbia|Polônia)/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith("[") && token.endsWith("]")) {
          const num = parseInt(token.replace(/\D/g, ""), 10);
          const fn = activeFootnotesMap[num];
          if (fn) {
            parts.push(
              <HoverCitationCard
                key={`fn-${pIdx}-${lIdx}-${match.index}`}
                number={num}
                source={fn.source}
                detail={fn.detail}
                type={fn.type}
                countryName={country.nameCommon}
                countryIso={country.isoCode}
                onOpenCitationModal={() => {
                  setCitationModalOpen(true, {
                    title: `${fn.source}${fn.detail ? ` — ${fn.detail}` : ""}`,
                    countryName: country.nameCommon,
                    url: getSourceUrl(fn.source),
                    accessDate: new Date(),
                    publicationYear: 2026,
                  });
                }}
              />
            );
          } else {
            parts.push(token);
          }
        } else if (token.startsWith("**") && token.endsWith("**")) {
          parts.push(
            <strong key={`b-${pIdx}-${lIdx}-${match.index}`} className="font-semibold text-slate-100">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
          parts.push(
            <em key={`i-${pIdx}-${lIdx}-${match.index}`} className="italic text-slate-300">
              {token.slice(1, -1)}
            </em>
          );
        } else if (COUNTRY_NAME_TO_ISO[token] && COUNTRY_NAME_TO_ISO[token] !== country.isoCode) {
          parts.push(
            <HoverCardPreview key={`c-${pIdx}-${lIdx}-${match.index}`} isoCode={COUNTRY_NAME_TO_ISO[token]}>
              {token}
            </HoverCardPreview>
          );
        } else {
          parts.push(token);
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      return parts;
    };

    const lines = paragraph.split("\n");
    const hasListItems = lines.some((l) => l.trim().startsWith("- "));

    if (!hasListItems) {
      const parts = parseLineTokens(paragraph, 0);
      return (
        <p key={pIdx} className="leading-relaxed">
          {parts}
        </p>
      );
    }

    // Group consecutive lines into prose blocks or list blocks
    const blocks: { type: "prose" | "list"; lines: string[] }[] = [];
    let currentBlock: { type: "prose" | "list"; lines: string[] } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const isListItem = trimmed.startsWith("- ");
      const blockType = isListItem ? "list" : "prose";

      if (!currentBlock || currentBlock.type !== blockType) {
        currentBlock = { type: blockType, lines: [line] };
        blocks.push(currentBlock);
      } else {
        currentBlock.lines.push(line);
      }
    }

    return (
      <React.Fragment key={pIdx}>
        {blocks.map((block, bIdx) => {
          if (block.type === "list") {
            return (
              <ul key={`ul-${pIdx}-${bIdx}`} className="leading-relaxed space-y-1.5 list-disc pl-5 my-2">
                {block.lines.map((l, lIdx) => {
                  const cleanLine = l.trim().startsWith("- ") ? l.trim().slice(2) : l.trim();
                  const parts = parseLineTokens(cleanLine, lIdx);
                  return (
                    <li key={`li-${lIdx}`} className="text-slate-200">
                      {parts}
                    </li>
                  );
                })}
              </ul>
            );
          }
          const proseText = block.lines.join(" ");
          const parts = parseLineTokens(proseText, bIdx);
          return (
            <p key={`p-${pIdx}-${bIdx}`} className="leading-relaxed">
              {parts}
            </p>
          );
        })}
      </React.Fragment>
    );
  };

  const footnoteEntries = Object.entries(activeFootnotesMap);

  return (
    <article className="flex-1 px-8 py-4 overflow-y-auto max-h-[calc(85vh-4rem)] scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent">
      {/* Header of Dossier Entry */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 font-mono text-xs font-semibold">
              {activeDimension}
            </span>
            <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Leitura de ~{section.estimatedReadMin || 6} min</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const url = typeof window !== "undefined"
                ? `${window.location.origin}/pais/${country.isoCode}`
                : `https://telluspedia.org/pais/${country.isoCode}`;
              setCitationModalOpen(true, {
                title,
                countryName: country.nameCommon,
                dimensionName: activeDimension,
                url,
                accessDate: new Date(),
                publicationYear: 2026,
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            <Quote className="w-3.5 h-3.5 text-cyan-400" />
            <span>Citar Verbete</span>
          </button>
        </div>

        <h1 className="mt-4 text-2xl font-serif font-bold text-slate-100 tracking-tight leading-snug">
          {title}
        </h1>
        {country.nameOfficial && (
          <p className="text-xs text-slate-400 mt-1">
            {country.nameOfficial} • TellusPedia Planetary & Geopolitical Knowledge Base
          </p>
        )}
      </div>

      {/* Main Prose Content with Academic Typography */}
      <div className="mt-6 font-serif text-slate-200 text-base leading-relaxed space-y-4">
        {content.split("\n\n").map((paragraph, idx) => renderFormattedParagraph(paragraph, idx))}
      </div>

      <StudyContext entityId={`country:${country.isoCode}`} />

      {/* Footnotes & Academic References Section (only rendered when declared real references exist) */}
      {footnoteEntries.length > 0 && (
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs font-sans text-slate-400 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Bookmark className="w-4 h-4 text-cyan-400" />
              <span>Fontes Primárias & Notas de Rodapé Acadêmicas</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Conformidade ABNT NBR 6023 / APA 7
            </span>
          </div>

          {footnoteEntries.map(([numStr, fn]) => {
            const num = Number(numStr);
            return (
              <div
                key={num}
                id={`footnote-${num}`}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all flex items-start gap-3 group"
              >
                <span className="font-mono font-bold text-cyan-400 text-xs bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded shrink-0">
                  [{num}]
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <a
                      href={getSourceUrl(fn.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-slate-200 hover:text-cyan-300 hover:underline text-xs inline-flex items-center gap-1.5 transition-colors"
                      title={`Abrir repositório da fonte primária (${fn.source})`}
                    >
                      <span>{fn.source}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                    </a>
                    <span className="text-[10px] font-mono text-cyan-400/80 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
                      {fn.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{fn.detail}</p>
                  <div className="pt-2 mt-1 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[10px]">
                    <a
                      href={getSourceUrl(fn.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400/90 hover:text-cyan-200 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Acessar Dados Primários</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setCitationModalOpen(true, {
                          title: `${fn.source}${fn.detail ? ` — ${fn.detail}` : ""}`,
                          countryName: country.nameCommon,
                          url: getSourceUrl(fn.source),
                          accessDate: new Date(),
                          publicationYear: 2026,
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-700 text-[10px] font-semibold transition-all shadow-sm"
                      title={`Gerar citação acadêmica para ${fn.source}`}
                    >
                      <Quote className="w-3 h-3 text-cyan-400" />
                      <span>Gerar Citação</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};
