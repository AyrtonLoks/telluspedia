"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bookmark, ExternalLink, Quote, Copy, Check, X, ArrowDown } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl, formatABNT, copyToClipboard, CitationParams } from "@/lib/citations";
import { useI18n } from "@/lib/i18n/useT";

interface HoverCitationCardProps {
  number: number;
  source: string;
  detail?: string;
  type?: string;
  countryName?: string;
  countryIso?: string;
  onOpenCitationModal?: () => void;
  defaultOpen?: boolean;
}

export const HoverCitationCard: React.FC<HoverCitationCardProps> = ({
  number,
  source,
  detail,
  type,
  countryName = "TellusPedia",
  onOpenCitationModal,
  defaultOpen = false,
}) => {
  const { t } = useI18n();
  const displayType = type ?? t("reader.cite.defaultType", "Fonte Primária");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const [copied, setCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const updatePosition = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < 200) {
      setPlacement("bottom");
    } else {
      setPlacement("top");
    }
    if (rect.left < 160) {
      setAlign("left");
    } else if (typeof window !== "undefined" && window.innerWidth - rect.right < 160) {
      setAlign("right");
    } else {
      setAlign("center");
    }
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (containerRef.current) {
      updatePosition(containerRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!isOpen && containerRef.current) {
      updatePosition(containerRef.current);
    }
    setIsOpen((prev) => !prev);
  };

  const handleScrollToFootnote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const elem = document.getElementById(`footnote-${number}`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getParams = (): CitationParams => ({
    title: `${source}${detail ? ` — ${detail}` : ""}`,
    countryName: countryName || "TellusPedia",
    url: getSourceUrl(source),
    accessDate: new Date(),
    publicationYear: 2026,
  });

  const handleOpenGenerator = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = getParams();
    setCitationModalOpen(true, params);
    onOpenCitationModal?.();
  };

  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = getParams();
    const formatted = formatABNT(params);
    const ok = await copyToClipboard(formatted);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <span
      ref={containerRef}
      className="relative mx-0.5 inline-block align-baseline"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleBadgeClick}
        className="-translate-y-0.5 inline-flex cursor-pointer items-center justify-center rounded-sm border border-accent/40 bg-accent/15 px-1.5 py-0.5 font-mono text-caption font-medium tabular-nums text-accent transition-colors duration-fast ease-out hover:border-accent hover:bg-accent/25 hover:text-accent-hover"
        title={`${t("reader.cite.badgeTitlePrefix", "Nota")} [${number}]: ${source} (${t("reader.cite.badgeTitleSuffix", "Clique para abrir opções de citação")})`}
      >
        [{number}]
      </button>

      {isOpen && (
        <span
          className={`pointer-events-auto absolute z-50 block w-80 text-left font-sans animate-pop-in ${
            placement === "bottom" ? "top-full pt-1.5" : "bottom-full pb-1.5"
          } ${
            align === "left"
              ? "left-0"
              : align === "right"
              ? "right-0"
              : "left-1/2 -translate-x-1/2"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Bridge element preventing cursor drop */}
          <span
            className={`pointer-events-auto absolute left-0 right-0 h-3 ${
              placement === "bottom" ? "-top-3" : "-bottom-3"
            }`}
          />

          <span className="relative block rounded-card border border-line-strong bg-surface p-3.5 shadow-e2 backdrop-blur-md">
            <span className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-1.5">
              <span className="flex items-center gap-1.5 text-label font-semibold text-fg">
                <Bookmark aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  {t("reader.cite.headerPrefix", "Nota de Rodapé")} [{number}]
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="shrink-0 rounded-sm border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-caption text-fg-secondary">
                  {displayType}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="rounded-control p-0.5 text-fg-muted transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-fg"
                  title={t("reader.cite.closeTitle", "Fechar")}
                  aria-label={t("reader.cite.closeAria", "Fechar prévia de citação")}
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </span>
            </span>

            <a
              href={getSourceUrl(source)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group/link mb-1 inline-flex items-center gap-1.5 text-label font-medium leading-snug text-accent hover:text-accent-hover hover:underline"
              title={`${t("reader.cite.openRepoPrefix", "Abrir repositório da fonte de dados:")} ${source}`}
            >
              <span className="break-words">{source}</span>
              <ExternalLink
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 opacity-80 transition-opacity group-hover/link:opacity-100"
              />
            </a>

            {detail && (
              <span className="mb-2 block text-caption leading-relaxed text-fg-secondary">
                {detail}
              </span>
            )}

            {/* Direct Citation Generator Button */}
            <button
              type="button"
              onClick={handleOpenGenerator}
              className="mb-2 mt-1.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-control border border-accent/40 bg-accent/15 px-3 py-1.5 text-caption font-medium text-accent transition-colors duration-fast ease-out hover:bg-accent/25 hover:text-accent-hover"
              title={t(
                "reader.cite.openGeneratorTitle",
                "Abrir gerador de citações completo (ABNT / APA / MLA / BibTeX)"
              )}
            >
              <Quote aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span>{t("reader.cite.openGenerator", "Gerar Citação (ABNT / APA / BibTeX)")}</span>
            </button>

            <span className="flex items-center justify-between border-t border-line pt-2 text-caption">
              <a
                href={getSourceUrl(source)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-fg-secondary hover:text-accent hover:underline"
                title={t("reader.cite.sourceDataTitle", "Acessar base primária")}
              >
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
                <span>{t("reader.cite.sourceData", "Dados de origem")}</span>
              </a>

              <span className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleScrollToFootnote}
                  className="flex cursor-pointer items-center gap-0.5 text-fg-secondary transition-colors duration-fast ease-out hover:text-fg hover:underline"
                  title={t("reader.cite.scrollFooterTitle", "Rolar para a nota no rodapé do artigo")}
                >
                  <ArrowDown aria-hidden="true" className="h-3 w-3 text-fg-muted" />
                  <span>{t("reader.cite.scrollFooter", "Rodapé")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickCopy}
                  className="flex cursor-pointer items-center gap-1 font-medium text-accent transition-colors duration-fast ease-out hover:text-accent-hover"
                  title={t("reader.cite.quickCopyTitle", "Copiar citação ABNT rapidamente")}
                >
                  {copied ? (
                    <>
                      <Check aria-hidden="true" className="h-3 w-3 text-success" />
                      <span className="font-semibold text-success">{t("common.copiedBang", "Copiado!")}</span>
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" className="h-3 w-3" />
                      <span>{t("reader.cite.quickCopy", "Copiar ABNT")}</span>
                    </>
                  )}
                </button>
              </span>
            </span>
          </span>
        </span>
      )}
    </span>
  );
};
