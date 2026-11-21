"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { getCountryData } from "@/lib/country-data";
import { ReaderTableOfContents } from "./ReaderTableOfContents";
import { ReaderContent } from "./ReaderContent";
import { useReaderStore } from "@/stores/readerStore";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const ReaderMode: React.FC = () => {
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const resetActiveDimension = useReaderStore((s) => s.resetActiveDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);

  const [flagError, setFlagError] = React.useState(false);
  const prevIsoRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setFlagError(false);
  }, [selectedIso]);

  React.useEffect(() => {
    if (selectedIso && prevIsoRef.current && prevIsoRef.current !== selectedIso) {
      const c = getCountryData(selectedIso);
      const hasGeography = c?.dossierSections?.some((s) => s.dimension === "GEOGRAPHY");
      if (hasGeography) {
        resetActiveDimension();
      } else if (c?.dossierSections && c.dossierSections.length > 0) {
        setActiveDimension(c.dossierSections[0].dimension);
      } else {
        resetActiveDimension();
      }
    }
    if (selectedIso) {
      prevIsoRef.current = selectedIso;
    }
  }, [selectedIso, resetActiveDimension, setActiveDimension]);

  // Fechado, o Dialog não renderiza nada; manter montado deixa a saída animar (D17).
  if (!selectedIso) return null;

  const country = getCountryData(selectedIso);
  if (!country) return null;

  return (
    <Dialog open={isReaderOpen} onOpenChange={(open) => setReaderOpen(open)}>
      <DialogContent
        className="h-[88vh] max-h-[88vh] w-[min(94vw,64rem)]"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {country.flagSvgUrl && !flagError ? (
              <img
                src={country.flagSvgUrl}
                alt={`Bandeira de ${country.nameCommon}`}
                onError={() => setFlagError(true)}
                className="h-4 w-6 rounded-sm border border-line object-cover"
              />
            ) : (
              <span className="flex h-4 w-6 items-center justify-center rounded-sm border border-line-strong bg-surface-raised font-mono text-caption font-medium text-fg-secondary">
                {country.isoCode}
              </span>
            )}
            <span>{country.nameCommon}</span>
            <Badge tone="neutral">Modo Leitura Profunda</Badge>
          </span>
        }
        description={`Dossiê multidisciplinar de ${country.nameCommon}.`}
      >
        <div className="mb-4 flex items-center border-b border-line pb-3">
          <Button variant="ghost" size="sm" onClick={() => setReaderOpen(false)}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span>Retornar ao globo interativo</span>
          </Button>
        </div>

        {/* Content Body: Sidebar TOC + Main Academic Reader */}
        <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
          <ReaderTableOfContents />
          <ReaderContent country={country} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
