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
import { CountryNewsReaderView } from "./CountryNewsReaderView";
import { COUNTRY_NAME_TO_ISO, createReaderTokenRegex } from "./reader-country-links";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";
import { useLocalizedCountryData } from "@/lib/i18n/useLocalizedCountry";

interface ReaderContentProps {
  country: CountryData;
  dimension?: string;
  isLoadingEditorial?: boolean;
}

interface FootnoteEntry {
  source: string;
  detail: string;
  type: string;
  url: string;
  referenceDate?: string;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({
  country: rawCountry,
  dimension,
  isLoadingEditorial = false,
}) => {
  const { locale, t, tRaw } = useI18n();
  const country = useLocalizedCountryData(rawCountry, locale) ?? rawCountry;
  const displayName = country.isHistoricalEntity
    ? tRaw(`country.${country.isoCode}.name`, country.nameCommon)
    : formatCountryName(country.iso2, country.nameCommon, locale);
  const displayOfficial = country.nameOfficial
    ? tRaw(`country.${country.isoCode}.official`, country.nameOfficial)
    : null;
  const storeDimension = useReaderStore((s) => s.activeDimension);
  const activeDimension =
    dimension ||
    (typeof window === "undefined"
      ? useReaderStore.getState().activeDimension
      : storeDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  const section = country.dossierSections?.find((s) => s.dimension === activeDimension);

  // Build footnotes strictly from real sources declared on the curated dossier section
  const activeFootnotesMap = useMemo(() => {
    if (!section) return {} as Record<number, FootnoteEntry>;

    const baseMap: Record<number, FootnoteEntry> = {};
    const primarySource = section.citationsJson?.primarySource;
    if (primarySource) {
      baseMap[1] = {
        source: primarySource,
        detail: t(
          "reader.primarySourceDetail",
          "Publicação ou repositório institucional declarado neste verbete."
        ),
        type: t("reader.primarySourceType", "Fonte Primária Direta"),
        url: section.citationsJson?.sourceUrl || getSourceUrl(primarySource),
        referenceDate: section.citationsJson?.referenceDate,
      };
    }

    const contentStr = section.contentMarkdown;
    const citedNumbers = new Set<number>();
    for (const match of contentStr.matchAll(/\[(\d+)\]/g)) {
      citedNumbers.add(parseInt(match[1], 10));
    }

    if (citedNumbers.has(2)) {
      const statsSource = t(
        "reader.statsSourceName",
        "Banco Mundial (World Development Indicators) / Divisão de Estatística da ONU"
      );
      baseMap[2] = {
        source: statsSource,
        detail: t(
          "reader.statsSourceDetail",
          "Séries temporais e indicadores demográficos e macroeconômicos auditados."
        ),
        type: t("reader.statsSourceType", "Série Estatística Oficial"),
        url: getSourceUrl("Banco Mundial"),
        referenceDate: section.citationsJson?.referenceDate,
      };
    }

    if (citedNumbers.has(3)) {
      const cartoSource = t("reader.cartoSourceName", "Cartografia Natural Earth (1:110m)");
      baseMap[3] = {
        source: cartoSource,
        detail: t(
          "reader.cartoSourceDetail",
          "Delimitações territoriais e vetores geoespaciais calibrados."
        ),
        type: t("reader.cartoSourceType", "Cartografia Oficial"),
        url: getSourceUrl("Natural Earth"),
      };
    }

    return baseMap;
  }, [section, t]);

  // Perfil Analítico & Posição Global (T38): disponível para todos os 177 países contemporâneos
  if (activeDimension === "ANALYTICAL_PROFILE" && !country.isHistoricalEntity) {
    return <AnalyticalProfileView country={country} />;
  }

  // Atualidades Geopolíticas via GDELT 2.0 Doc API (D38 / RN13.8): disponível para todos os 177 países contemporâneos
  if (activeDimension === "NEWS_CURRENT_AFFAIRS" && !country.isHistoricalEntity) {
    return <CountryNewsReaderView country={country} />;
  }

  if (!section && isLoadingEditorial) {
    return (
      <article
        role="status"
        data-testid="reader-loading-editorial"
        className="max-h-[calc(85vh-6rem)] flex-1 overflow-y-auto px-6 py-4"
      >
        <div className="rounded-card border border-line bg-surface-raised p-6 text-label text-fg-secondary">
          {t("reader.loadingEditorial", "Carregando dossiê multidisciplinar auditado…")}
        </div>
      </article>
    );
  }

  // Empty state when no dossier has been authored for this country/dimension
  if (!section) {
    const wikiHost = locale === "en" ? "en.wikipedia.org" : "pt.wikipedia.org";
    const wikipediaUrl = `https://${wikiHost}/wiki/${encodeURIComponent(displayName)}`;
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
            <Badge tone="neutral">{t("reader.noEditorialBadge", "Sem verbete editorial")}</Badge>
          </div>

          <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">
            {displayName}
          </h1>
          {displayOfficial && (
            <p className="mt-1 text-caption text-fg-secondary">{displayOfficial}</p>
          )}
        </div>

        <div className="mt-8 space-y-4 rounded-card border border-line bg-surface-raised p-6">
          <div className="flex items-center gap-2.5 text-title font-semibold text-fg">
            <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
            <h2>{t("reader.notWrittenTitle", "Este dossiê ainda não foi escrito")}</h2>
          </div>

          <p className="text-body leading-relaxed text-fg-secondary">
            {t("reader.notWrittenPrefix", "Ainda não há um verbete curado com fontes primárias auditadas para a dimensão")}{" "}
            <span className="font-mono text-fg">{activeDimension}</span> {t("reader.notWrittenOf", "de")}{" "}
            <strong className="font-semibold text-fg">{displayName}</strong>{" "}
            {t("reader.notWrittenSuffix", "no TellusPedia. Para consultar dados e referências verificáveis diretamente nas fontes externas:")}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {!country.isHistoricalEntity && (
              <Button
                variant="primary"
                size="sm"
                data-testid="open-analytical-profile-from-empty"
                onClick={() => setActiveDimension("ANALYTICAL_PROFILE")}
              >
                <span>{t("reader.openAnalyticalProfile", "Ver Perfil Analítico & Posição Global")}</span>
              </Button>
            )}
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "sm")}
            >
              <span>{t("common.wikipedia", "Wikipédia")} ({displayName})</span>
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
                <span>{t("common.worldBank", "Banco Mundial")} ({country.isoCode})</span>
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
  const sectionRefDate = section.citationsJson?.referenceDate;
  const publicationYear = sectionRefDate ? Number(sectionRefDate.slice(0, 4)) || 2026 : 2026;

  // Token parser for text elements: [N], bold **...**, italics *...*, and country hover cards
  const renderFormattedParagraph = (paragraph: string, pIdx: number) => {
    const parseLineTokens = (cleanLine: string, lIdx: number) => {
      const regex = createReaderTokenRegex();
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
                    countryName: displayName,
                    url: fn.url,
                    accessDate: new Date(),
                    publicationYear,
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{tRaw(`reader.dim.${activeDimension}`, activeDimension)}</Badge>
            <span className="flex items-center gap-1 font-mono text-caption tabular-nums text-fg-muted">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("reader.readingTime", "Leitura de ~")}{section.estimatedReadMin || 6} min</span>
            </span>
            {sectionRefDate && (
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                · {t("reader.referenceDate", "Referência:")} {sectionRefDate}
              </span>
            )}
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
                countryName: displayName,
                dimensionName: activeDimension,
                url,
                accessDate: new Date(),
                publicationYear,
              });
            }}
          >
            <Quote aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <span>{t("reader.citeEntry", "Citar Verbete")}</span>
          </Button>
        </div>

        <h1 className="mt-4 font-serif text-display font-bold leading-snug text-fg">{title}</h1>
        {displayOfficial && (
          <p className="mt-1 text-caption text-fg-muted">
            {displayOfficial} · TellusPedia Planetary &amp; Geopolitical Knowledge Base
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
              <span>{t("reader.footnotesTitle", "Fontes primárias e notas de rodapé acadêmicas")}</span>
            </div>
            <span className="font-mono text-caption text-fg-muted">
              {t("reader.abntCompliance", "Conformidade ABNT NBR 6023 / APA 7")}
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
                      href={fn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-label font-medium text-fg transition-colors duration-fast ease-out hover:text-accent hover:underline"
                      title={`${t("common.source", "Fonte primária")}: ${fn.source}`}
                    >
                      <span>{fn.source}</span>
                      <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 text-accent" />
                    </a>
                    <Badge tone="neutral">{fn.type}</Badge>
                  </div>
                  <p className="text-caption leading-relaxed text-fg-secondary">
                    {fn.detail}
                    {fn.referenceDate ? ` (${t("reader.referenceDate", "Referência:")} ${fn.referenceDate})` : ""}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-2 text-caption">
                    <a
                      href={fn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
                    >
                      <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      <span>{t("reader.accessPrimaryData", "Acessar dados primários")}</span>
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCitationModalOpen(true, {
                          title: `${fn.source}${fn.detail ? ` — ${fn.detail}` : ""}`,
                          countryName: displayName,
                          url: fn.url,
                          accessDate: new Date(),
                          publicationYear,
                        });
                      }}
                      title={`${t("reader.generateCitation", "Gerar citação")}: ${fn.source}`}
                    >
                      <Quote aria-hidden="true" className="h-3 w-3 text-accent" />
                      <span>{t("reader.generateCitation", "Gerar citação")}</span>
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
