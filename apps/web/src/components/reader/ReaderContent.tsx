"use client";

import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import React, { useMemo } from "react";
import { Quote, Clock, Bookmark, ExternalLink, BookOpen } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { CountryData } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";
import { HoverCardPreview } from "./HoverCardPreview";
import { HoverCitationCard } from "./HoverCitationCard";
import { AnalyticalProfileView } from "./AnalyticalProfileView";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ReaderContentProps {
  country: CountryData;
  dimension?: string;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({ country, dimension }) => {
  const storeDimension = useReaderStore((s) => s.activeDimension);
  const activeDimension =
    dimension ||
    (typeof window === "undefined"
      ? useReaderStore.getState().activeDimension
      : storeDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);
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

  // Perfil Analítico & Posição Global (T38): disponível para todos os 177 países contemporâneos
  if (activeDimension === "ANALYTICAL_PROFILE" && !country.isHistoricalEntity) {
    return <AnalyticalProfileView country={country} />;
  }

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
        className="max-h-[calc(85vh-6rem)] flex-1 overflow-y-auto px-6 py-4"
      >
        <div className="border-b border-line pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{activeDimension}</Badge>
            <Badge tone="neutral">Sem verbete editorial</Badge>
          </div>

          <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">
            {country.nameCommon}
          </h1>
          {country.nameOfficial && (
            <p className="mt-1 text-caption text-fg-secondary">{country.nameOfficial}</p>
          )}
        </div>

        <div className="mt-8 space-y-4 rounded-card border border-line bg-surface-raised p-6">
          <div className="flex items-center gap-2.5 text-title font-semibold text-fg">
            <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
            <h2>Este dossiê ainda não foi escrito</h2>
          </div>

          <p className="text-body leading-relaxed text-fg-secondary">
            Ainda não há um verbete curado com fontes primárias auditadas para a dimensão{" "}
            <span className="font-mono text-fg">{activeDimension}</span> de{" "}
            <strong className="font-semibold text-fg">{country.nameCommon}</strong> no TellusPedia.
            Para consultar dados e referências verificáveis diretamente nas fontes externas:
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {!country.isHistoricalEntity && (
              <Button
                variant="primary"
                size="sm"
                data-testid="open-analytical-profile-from-empty"
                onClick={() => setActiveDimension("ANALYTICAL_PROFILE")}
              >
                <span>Ver Perfil Analítico &amp; Posição Global</span>
              </Button>
            )}
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              <span>Wikipédia ({country.nameCommon})</span>
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>

            {wikidataUrl && (
              <a
                href={wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "sm")}
              >
                <span>Wikidata ({country.wikidataQid})</span>
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            )}

            {worldBankUrl && (
              <a
                href={worldBankUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "sm")}
              >
                <span>Banco Mundial ({country.isoCode})</span>
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
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
            <strong key={`b-${pIdx}-${lIdx}-${match.index}`} className="font-semibold text-fg">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
          parts.push(
            <em key={`i-${pIdx}-${lIdx}-${match.index}`} className="italic text-fg-secondary">
              {token.slice(1, -1)}
            </em>
          );
        } else if (COUNTRY_NAME_TO_ISO[token] && COUNTRY_NAME_TO_ISO[token] !== country.isoCode) {
          parts.push(
            <HoverCardPreview
              key={`c-${pIdx}-${lIdx}-${match.index}`}
              isoCode={COUNTRY_NAME_TO_ISO[token]}
            >
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
              <ul
                key={`ul-${pIdx}-${bIdx}`}
                className="my-2 list-disc space-y-1.5 pl-5 leading-relaxed"
              >
                {block.lines.map((l, lIdx) => {
                  const cleanLine = l.trim().startsWith("- ") ? l.trim().slice(2) : l.trim();
                  const parts = parseLineTokens(cleanLine, lIdx);
                  return (
                    <li key={`li-${lIdx}`} className="text-fg">
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
    <article className="max-h-[calc(85vh-6rem)] flex-1 overflow-y-auto px-6 py-4">
      {/* Header of Dossier Entry */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{activeDimension}</Badge>
            <span className="flex items-center gap-1 font-mono text-caption tabular-nums text-fg-muted">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Leitura de ~{section.estimatedReadMin || 6} min</span>
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const url =
                typeof window !== "undefined"
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
          >
            <Quote aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <span>Citar Verbete</span>
          </Button>
        </div>

        <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">{title}</h1>
        {country.nameOfficial && (
          <p className="mt-1 text-caption text-fg-muted">
            {country.nameOfficial} · TellusPedia Planetary &amp; Geopolitical Knowledge Base
          </p>
        )}
      </div>

      {/* Main Prose Content with Academic Typography */}
      <div className="mt-6 space-y-4 font-serif text-body leading-relaxed text-fg">
        {content.split("\n\n").map((paragraph, idx) => renderFormattedParagraph(paragraph, idx))}
      </div>

      <StudyContext entityId={`country:${country.isoCode}`} />

      {/* Footnotes & Academic References Section (only rendered when declared real references exist) */}
      {footnoteEntries.length > 0 && (
        <div className="mt-12 space-y-3 border-t border-line pt-6 font-sans text-caption text-fg-secondary">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-label font-semibold text-fg">
              <Bookmark aria-hidden="true" className="h-4 w-4 text-accent" />
              <span>Fontes primárias e notas de rodapé acadêmicas</span>
            </div>
            <span className="font-mono text-caption text-fg-muted">
              Conformidade ABNT NBR 6023 / APA 7
            </span>
          </div>

          {footnoteEntries.map(([numStr, fn]) => {
            const num = Number(numStr);
            return (
              <div
                key={num}
                id={`footnote-${num}`}
                className="flex items-start gap-3 rounded-card border border-line bg-surface-raised p-3 transition-colors duration-fast ease-out hover:border-line-strong"
              >
                <span className="shrink-0 rounded-sm border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-caption font-medium tabular-nums text-accent">
                  [{num}]
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={getSourceUrl(fn.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-label font-medium text-fg transition-colors duration-fast ease-out hover:text-accent hover:underline"
                      title={`Abrir repositório da fonte primária (${fn.source})`}
                    >
                      <span>{fn.source}</span>
                      <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 text-accent" />
                    </a>
                    <Badge tone="neutral">{fn.type}</Badge>
                  </div>
                  <p className="text-caption leading-relaxed text-fg-secondary">{fn.detail}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-2 text-caption">
                    <a
                      href={getSourceUrl(fn.source)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
                    >
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      <span>Acessar dados primários</span>
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCitationModalOpen(true, {
                          title: `${fn.source}${fn.detail ? ` — ${fn.detail}` : ""}`,
                          countryName: country.nameCommon,
                          url: getSourceUrl(fn.source),
                          accessDate: new Date(),
                          publicationYear: 2026,
                        });
                      }}
                      title={`Gerar citação acadêmica para ${fn.source}`}
                    >
                      <Quote aria-hidden="true" className="h-3 w-3 text-accent" />
                      <span>Gerar citação</span>
                    </Button>
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
