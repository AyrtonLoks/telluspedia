"use client";

import React from "react";
import { Quote } from "lucide-react";
import { getSourceUrl } from "@/lib/citations";
import { preloadCitationModal } from "@/lib/panel-preload";
import { useReaderStore } from "@/stores/readerStore";
import { useI18n } from "@/lib/i18n/useT";

interface InspectorSourcesFooterProps {
  isoCode: string;
  displayName: string;
  isHistoricalEntity?: boolean;
  completeness: "full" | "partial" | "none";
  sourceUrl?: string | null;
  referenceDate?: string | null;
}

export const InspectorSourcesFooter: React.FC<InspectorSourcesFooterProps> = ({
  isoCode,
  displayName,
  isHistoricalEntity,
  completeness,
  sourceUrl,
  referenceDate,
}) => {
  const { t } = useI18n();
  const setCitationModalOpen = useReaderStore((s) => s.setCitationModalOpen);

  return (
    <footer className="mt-3 border-t border-line pt-2.5 text-caption text-fg-muted">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium text-fg-secondary">
          {t("inspector.auditedSources", "Fontes Primárias Auditadas:")}
        </span>
        <button
          type="button"
          onMouseEnter={preloadCitationModal}
          onFocus={preloadCitationModal}
          onClick={() => {
            const url =
              typeof window !== "undefined"
                ? `${window.location.origin}/pais/${isoCode}`
                : `https://telluspedia.org/pais/${isoCode}`;
            setCitationModalOpen(true, {
              title: `Dossiê Geral e Indicadores: ${displayName}`,
              countryName: displayName,
              url,
              accessDate: new Date(),
              publicationYear: 2026,
            });
          }}
          className="inline-flex items-center gap-1 text-accent hover:text-accent-hover hover:underline"
          title={t("inspector.generateCitationTitle", "Gerar Citação Oficial deste País")}
        >
          <Quote aria-hidden="true" className="h-3 w-3" />
          <span>{t("inspector.generateCitation", "Gerar Citação")}</span>
        </button>
      </div>
      <p className="space-x-1">
        {isHistoricalEntity ? (
          <>
            <a
              href={getSourceUrl("Maddison")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              Maddison Project Database
            </a>
            ,
            <a
              href={getSourceUrl("Correlates of War")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              Correlates of War
            </a>
            ,
            <a
              href={getSourceUrl("Natural Earth")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              {t("common.naturalEarth", "Cartografia Natural Earth")}
            </a>
            .
          </>
        ) : completeness === "none" ? (
          <>
            <a
              href={sourceUrl || getSourceUrl("Natural Earth")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              {t("common.naturalEarth", "Cartografia Natural Earth (1:110m)")}
            </a>{" "}
            {t("inspector.isoCldrNote", "e padrão ISO 3166-1 / Unicode CLDR")}
            {referenceDate ? ` (ref. ${referenceDate})` : ""}.
          </>
        ) : (
          <>
            <a
              href={getSourceUrl("Banco Mundial")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              {t("common.worldBank", "Banco Mundial")}
            </a>
            ,
            <a
              href={getSourceUrl("ONU")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              {t("common.unStats", "Divisão de Estatística da ONU")}
            </a>
            ,
            <a
              href={getSourceUrl("IBGE")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              IBGE
            </a>
            ,
            <a
              href={getSourceUrl("Natural Earth")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg hover:underline"
            >
              {t("common.naturalEarth", "Cartografia Natural Earth (1:110m)")}
            </a>
            .
          </>
        )}
      </p>
    </footer>
  );
};
