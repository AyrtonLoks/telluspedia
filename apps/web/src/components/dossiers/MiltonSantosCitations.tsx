"use client";

import React, { useState } from "react";
import { Check, Copy, Download, Quote } from "lucide-react";
import {
  MILTON_DOSSIER_CITATIONS,
  MILTON_SANTOS_WORKS,
} from "@/lib/milton-santos-dossier";
import type { Locale } from "@/lib/i18n/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

type CitationFormatKey = "abnt" | "apa" | "mla" | "bibtex";

const FORMATS: ReadonlyArray<{ key: CitationFormatKey; label: string }> = [
  { key: "abnt", label: "ABNT NBR 6023" },
  { key: "apa", label: "APA 7" },
  { key: "mla", label: "MLA 9" },
  { key: "bibtex", label: "BibTeX (.bib)" },
];

export interface MiltonSantosCitationsProps {
  locale: Locale;
}

export const MiltonSantosCitations: React.FC<MiltonSantosCitationsProps> = ({ locale }) => {
  const isEn = locale === "en";
  const [format, setFormat] = useState<CitationFormatKey>("abnt");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const downloadAllBibtex = () => {
    const bundle = [
      MILTON_DOSSIER_CITATIONS.bibtex,
      ...MILTON_SANTOS_WORKS.map((w) => w.bibtex),
    ].join("\n\n");
    const blob = new Blob([bundle + "\n"], { type: "application/x-bibtex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "milton-santos-telluspedia.bib";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby="milton-bibliography-heading"
      data-testid="milton-bibliography-section"
      className="space-y-4 rounded-panel border border-line bg-surface-raised p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Quote aria-hidden="true" className="h-4 w-4 text-accent" />
          <h2 id="milton-bibliography-heading" className="text-title font-semibold text-fg">
            {isEn
              ? "Fundamental Works & Academic Citations"
              : "Obras Fundamentais e Referências Acadêmicas"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">RN02 · ABNT / APA / MLA / BibTeX</Badge>
          <Button
            size="sm"
            variant="secondary"
            data-testid="milton-download-bib"
            onClick={downloadAllBibtex}
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <span>{isEn ? "Download .bib" : "Baixar .bib"}</span>
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={isEn ? "Citation format" : "Formato de citação"}
        className="flex flex-wrap gap-1.5"
      >
        {FORMATS.map((f) => {
          const active = format === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`milton-cite-tab-${f.key}`}
              onClick={() => setFormat(f.key)}
              className={cn(
                "rounded-control border px-2.5 py-1 text-caption font-medium transition-colors duration-fast ease-out",
                active
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-line bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Citação do próprio dossiê */}
      <div className="rounded-card border border-line bg-surface p-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-caption font-medium text-fg-muted">
            {isEn ? "Cite this dossier" : "Citar este dossiê"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyText("dossier", MILTON_DOSSIER_CITATIONS[format])}
          >
            {copiedId === "dossier" ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            )}
            <span>
              {copiedId === "dossier"
                ? isEn
                  ? "Copied"
                  : "Copiado"
                : isEn
                ? "Copy"
                : "Copiar"}
            </span>
          </Button>
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono text-caption text-fg-secondary">
          {MILTON_DOSSIER_CITATIONS[format]}
        </pre>
      </div>

      {/* Obras fundamentais */}
      <div className="space-y-3">
        {MILTON_SANTOS_WORKS.map((work) => {
          const citationText = work[format];
          const isCopied = copiedId === work.id;
          return (
            <div
              key={work.id}
              className="space-y-2 rounded-card border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-label font-semibold text-fg">
                  {work.title}{" "}
                  <span className="font-mono text-caption font-normal tabular-nums text-fg-muted">
                    ({work.year})
                  </span>
                </h3>
                <span className="text-caption text-fg-muted">
                  {work.coauthors
                    ? `${isEn ? "with" : "com"} ${work.coauthors} · `
                    : ""}
                  {work.publisher}
                </span>
              </div>
              <p className="font-serif text-label leading-relaxed text-fg-secondary">
                {isEn ? work.summaryEn : work.summaryPt}
              </p>
              <div className="flex items-start justify-between gap-3 rounded-control border border-line bg-surface-sunken p-2.5">
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-caption text-fg-secondary">
                  {citationText}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyText(work.id, citationText)}
                >
                  {isCopied ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                  )}
                  <span className="sr-only">
                    {isEn ? "Copy citation" : "Copiar citação"}
                  </span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
