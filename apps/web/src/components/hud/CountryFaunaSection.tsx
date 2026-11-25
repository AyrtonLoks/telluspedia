"use client";

import React, { useMemo } from "react";
import { PawPrint } from "lucide-react";
import { getSpeciesForCountry, IUCN_STATUS_META } from "@/lib/species-catalog";
import { useSpeciesStore } from "@/stores/speciesStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/useT";

interface CountryFaunaSectionProps {
  isoCode: string;
}

/**
 * Seção compacta de Fauna Emblemática & Ameaçada no painel do país (D32 / RN13.7).
 * Carregada sob demanda via `next/dynamic` dentro de `InspectorHUD`.
 */
export const CountryFaunaSection: React.FC<CountryFaunaSectionProps> = ({ isoCode }) => {
  const { locale, t } = useI18n();
  const species = useMemo(() => getSpeciesForCountry(isoCode), [isoCode]);
  const selectSpecies = useSpeciesStore((s) => s.selectSpecies);
  const setCountryFilter = useSpeciesStore((s) => s.setCountryFilter);
  const setLayerActive = useObservatoryStore((s) => s.setLayerActive);
  const setPanelOpen = useObservatoryStore((s) => s.setPanelOpen);
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const setActiveRightPanel = useLayoutStore((s) => s.setActiveRightPanel);
  const flyTo = useGlobeStore((s) => s.flyTo);

  if (species.length === 0) return null;

  const handleInspectSpecies = (sp: (typeof species)[number]) => {
    setSelectedEntity(null);
    setCountryFilter(isoCode.toUpperCase());
    setLayerActive("SPECIES_MAP", true);
    setPanelOpen(true);
    setActiveRightPanel("observatory");
    selectSpecies(sp.id);
    flyTo(sp.centerLat, sp.centerLng, 2.05);
  };

  return (
    <section
      data-testid="country-fauna-section"
      aria-label={t("inspector.faunaTitle", "Fauna emblemática e ameaçada (IUCN / GBIF)")}
      className="my-3 space-y-2 rounded-card border border-line bg-surface-raised p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-fg">
          <PawPrint aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          {t("inspector.faunaTitle", "Fauna emblemática (IUCN / GBIF)")}
        </span>
        <span className="font-mono text-caption tabular-nums text-fg-muted">
          {species.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {species.slice(0, 6).map((sp) => {
          const iucn = IUCN_STATUS_META[sp.iucnStatus];
          return (
            <button
              key={sp.id}
              type="button"
              data-testid={`country-fauna-${sp.id}`}
              onClick={() => handleInspectSpecies(sp)}
              title={`${sp.scientificName} · ${locale === "en" ? iucn.labelEn : iucn.labelPt}`}
              className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:border-accent/40 hover:text-fg"
            >
              <span className="truncate font-medium">
                {locale === "en" ? sp.commonNameEn : sp.commonNamePt}
              </span>
              <Badge tone={iucn.tone}>{sp.iucnStatus}</Badge>
            </button>
          );
        })}
      </div>
    </section>
  );
};
