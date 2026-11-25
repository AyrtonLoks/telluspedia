"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { getCountryData } from "@/lib/country-data";
import { hasEditorialProfile, RN13_CORE_DIMENSIONS } from "@/lib/editorial-registry";
import {
  buildLocalizedDossierSections,
  getEditorialProfileSync,
  loadEditorialProfile,
  type EditorialCountryRecord,
} from "@/lib/editorial-loader";
import { ReaderTableOfContents } from "./ReaderTableOfContents";
import { ReaderContent } from "./ReaderContent";
import { useReaderStore } from "@/stores/readerStore";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

export const ReaderMode: React.FC = () => {
  const { locale, t } = useI18n();
  const isReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const setReaderOpen = useGlobeStore((s) => s.setReaderOpen);
  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const resetActiveDimension = useReaderStore((s) => s.resetActiveDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);

  const [flagError, setFlagError] = React.useState(false);
  const [editorialState, setEditorialState] = React.useState<{
    iso: string;
    record: EditorialCountryRecord | null;
  } | null>(null);
  const [isLoadingEditorial, setIsLoadingEditorial] = React.useState(false);
  const prevIsoRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setFlagError(false);
  }, [selectedIso]);

  React.useEffect(() => {
    if (!isReaderOpen || !selectedIso || !hasEditorialProfile(selectedIso)) {
      setIsLoadingEditorial(false);
      return;
    }

    const syncRecord = getEditorialProfileSync(selectedIso);
    if (syncRecord) {
      setEditorialState({ iso: selectedIso, record: syncRecord });
      setIsLoadingEditorial(false);
      return;
    }

    let cancelled = false;
    setIsLoadingEditorial(true);
    loadEditorialProfile(selectedIso)
      .then((record) => {
        if (!cancelled) {
          setEditorialState({ iso: selectedIso, record });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditorialState({ iso: selectedIso, record: null });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingEditorial(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReaderOpen, selectedIso]);

  React.useEffect(() => {
    if (selectedIso && prevIsoRef.current !== selectedIso) {
      const c = getCountryData(selectedIso);
      const hasGeography =
        Boolean(c?.dossierSections?.some((s) => s.dimension === "GEOGRAPHY")) ||
        hasEditorialProfile(selectedIso);
      if (hasGeography) {
        if (prevIsoRef.current) resetActiveDimension();
      } else if (c?.dossierSections && c.dossierSections.length > 0) {
        setActiveDimension(c.dossierSections[0].dimension);
      } else if (c && !c.isHistoricalEntity) {
        setActiveDimension("ANALYTICAL_PROFILE");
      } else {
        resetActiveDimension();
      }
    }
    if (selectedIso) {
      prevIsoRef.current = selectedIso;
    }
  }, [selectedIso, resetActiveDimension, setActiveDimension]);

  const baseCountry = selectedIso ? getCountryData(selectedIso) : null;
  const activeEditorial = React.useMemo(() => {
    if (!selectedIso) return null;
    if (editorialState?.iso === selectedIso) return editorialState.record;
    return getEditorialProfileSync(selectedIso);
  }, [selectedIso, editorialState]);

  const country = React.useMemo(() => {
    if (!baseCountry) return null;
    const localizedSections = buildLocalizedDossierSections(baseCountry, activeEditorial, locale);
    return localizedSections === baseCountry.dossierSections
      ? baseCountry
      : { ...baseCountry, dossierSections: localizedSections };
  }, [baseCountry, activeEditorial, locale]);

  const availableDimensions = React.useMemo(() => {
    const dims = new Set<string>();
    if (country) {
      for (const sec of country.dossierSections) dims.add(sec.dimension);
    }
    if (selectedIso && hasEditorialProfile(selectedIso)) {
      for (const dim of RN13_CORE_DIMENSIONS) dims.add(dim);
    }
    return dims;
  }, [country, selectedIso]);

  // Fechado, o Dialog não renderiza nada; manter montado deixa a saída animar (D17).
  if (!selectedIso || !country) return null;
  const displayName = formatCountryName(country.iso2, country.nameCommon, locale);

  return (
    <Dialog open={isReaderOpen} onOpenChange={(open) => setReaderOpen(open)}>
      <DialogContent
        className="h-[88vh] max-h-[88vh] w-[min(94vw,64rem)]"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {country.flagSvgUrl && !flagError ? (
              <img
                src={country.flagSvgUrl}
                alt={`${t("inspector.flagOf", "Bandeira de")} ${displayName}`}
                onError={() => setFlagError(true)}
                className="h-4 w-6 rounded-sm border border-line object-cover"
              />
            ) : (
              <span className="flex h-4 w-6 items-center justify-center rounded-sm border border-line-strong bg-surface-raised font-mono text-caption font-medium text-fg-secondary">
                {country.isoCode}
              </span>
            )}
            <span>{displayName}</span>
            <Badge tone="neutral">{t("reader.badge", "Modo Leitura Profunda")}</Badge>
          </span>
        }
        description={`${t("reader.descPrefix", "Dossiê multidisciplinar de")} ${displayName}.`}
      >
        <div className="mb-4 flex items-center border-b border-line pb-3">
          <Button variant="ghost" size="sm" onClick={() => setReaderOpen(false)}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span>{t("reader.returnGlobe", "Retornar ao globo interativo")}</span>
          </Button>
        </div>

        {/* Content Body: Sidebar TOC + Main Academic Reader */}
        <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
          <ReaderTableOfContents availableDimensions={availableDimensions} />
          <ReaderContent country={country} isLoadingEditorial={isLoadingEditorial} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
