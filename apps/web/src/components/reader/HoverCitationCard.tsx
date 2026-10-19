"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bookmark, ExternalLink, Quote, Copy, Check, X, ArrowDown } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { getSourceUrl, formatABNT, copyToClipboard, CitationParams } from "@/lib/citations";

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
  type = "Fonte Primária",
  countryName = "TellusPedia",
  countryIso,
  onOpenCitationModal,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const [copied, setCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Dismiss on click outside
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
      className="relative inline-block align-baseline mx-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleBadgeClick}
        className="inline-flex items-center justify-center font-mono text-[11px] font-bold text-cyan-400 hover:text-cyan-200 bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-800/60 hover:border-cyan-400/80 rounded px-1.5 py-0.5 -translate-y-0.5 shadow-sm transition-all cursor-pointer"
        title={`Nota [${number}]: ${source} (Clique para abrir opções de citação)`}
      >
        [{number}]
      </button>

      {isOpen && (
        <span
          className={`absolute z-50 w-80 text-left block pointer-events-auto animate-in fade-in zoom-in-95 duration-150 ${
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
          <span className={`absolute left-0 right-0 h-3 pointer-events-auto ${placement === "bottom" ? "-top-3" : "-bottom-3"}`} />

          <span className="block p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl relative">
            <span className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                <Bookmark className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Nota de Rodapé [{number}]</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-800/60 shrink-0">
                  {type}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </span>

            <a
              href={getSourceUrl(source)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:underline mb-1 leading-snug group/link"
              title={`Abrir repositório da fonte de dados: ${source}`}
            >
              <span className="break-words">{source}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-cyan-400 opacity-80 group-hover/link:opacity-100 transition-opacity" />
            </a>

            {detail && (
              <span className="block text-[11px] text-slate-400 mb-2 leading-relaxed">
                {detail}
              </span>
            )}

            {/* Direct Citation Generator Button */}
            <button
              type="button"
              onClick={handleOpenGenerator}
              className="w-full mt-1.5 mb-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 hover:text-white text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
              title="Abrir gerador de citações completo (ABNT / APA / MLA / BibTeX)"
            >
              <Quote className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Gerar Citação (ABNT / APA / BibTeX)</span>
            </button>

            <span className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
              <a
                href={getSourceUrl(source)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 hover:underline"
                title="Acessar base primária"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Dados de Origem</span>
              </a>

              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScrollToFootnote}
                  className="flex items-center gap-0.5 text-slate-400 hover:text-slate-200 hover:underline transition-colors cursor-pointer"
                  title="Rolar para a nota no rodapé do artigo"
                >
                  <ArrowDown className="w-3 h-3 text-slate-500" />
                  <span>Rodapé</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickCopy}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
                  title="Copiar citação ABNT rapidamente"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar ABNT</span>
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
