"use client";

import React, { useState } from "react";
import { Copy, Check, Download, Quote } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { useGlobeStore } from "@/stores/globeStore";
import { getCountryData } from "@/lib/country-data";
import {
  formatABNT,
  formatAPA,
  formatMLA,
  formatBibTeX,
  copyToClipboard,
  CitationParams,
} from "@/lib/citations";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/components/ui/cn";

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

  // Sem retorno antecipado: com `open` falso o Dialog não renderiza nada e anima a saída (D17).
  const currentCountry = selectedIso ? getCountryData(selectedIso) : null;
  const effectiveIso = propCountryIso || currentCountry?.isoCode || "BRA";
  const effectiveCountryName = propCountryName || currentCountry?.nameCommon || "TellusPedia";
  const effectiveTitle =
    propDimensionTitle ||
    (currentCountry
      ? `${currentCountry.nameCommon}: Dossiê Temático`
      : "Observatório Planetário TellusPedia");

  const defaultUrl =
    typeof window !== "undefined"
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
    link.download = `telluspedia_${(params.countryName || effectiveIso)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}.bib`;
    link.click();
  };

  const modalTitle = customCitationParams
    ? `Citar: ${params.title}`
    : "Citar verbete / fonte acadêmica";

  return (
    <Dialog open={isCitationModalOpen} onOpenChange={(open) => setCitationModalOpen(open)}>
      <DialogContent
        className="w-[min(92vw,36rem)]"
        title={
          <span className="flex items-center gap-2">
            <Quote aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{modalTitle}</span>
          </span>
        }
        description="Formatos acadêmicos ABNT NBR 6023, APA 7, MLA 9 e BibTeX."
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="max-w-[260px] truncate font-mono text-caption text-fg-muted">
              {params.url}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {citationFormat === "BIBTEX" && (
                <Button variant="secondary" size="sm" onClick={handleDownloadBib}>
                  <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Baixar .bib</span>
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="h-4 w-4" />
                    <span>Copiar citação</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        {/* Format Selector Tabs */}
        <div role="tablist" aria-label="Formato de citação" className="mb-4 flex flex-wrap items-center gap-2">
          {(["ABNT", "APA", "MLA", "BIBTEX"] as const).map((fmt) => {
            const active = citationFormat === fmt;
            return (
              <button
                key={fmt}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCitationFormat(fmt)}
                className={cn(
                  "rounded-control border px-3 py-1.5 text-caption font-medium transition-colors duration-fast ease-out",
                  active
                    ? "border-accent bg-accent text-accent-on"
                    : "border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
                )}
              >
                {fmt === "ABNT" ? "ABNT (NBR 6023)" : fmt === "BIBTEX" ? "BibTeX (.bib)" : fmt}
              </button>
            );
          })}
        </div>

        {/* Formatted Citation Block */}
        <div className="group relative min-h-[96px] whitespace-pre-wrap break-words rounded-card border border-line bg-surface-sunken p-4 pr-11 font-mono text-caption leading-relaxed text-fg">
          <div className="absolute right-2 top-2">
            <IconButton
              label="Copiar citação formatada"
              size="sm"
              icon={copied ? <Check className="text-success" /> : <Copy />}
              onClick={handleCopy}
            />
          </div>
          {formattedText}
        </div>
      </DialogContent>
    </Dialog>
  );
};
