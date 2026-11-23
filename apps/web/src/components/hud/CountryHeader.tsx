"use client";

import { resetGlobeView } from "@/stores/actions";

import React from "react";
import { X, MapPin, Globe } from "lucide-react";
import { DataCompleteness } from "@/lib/country-data";
import { IconButton } from "@/components/ui/IconButton";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

interface CountryHeaderProps {
  nameCommon: string;
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  flagSvgUrl?: string;
  isoCode: string;
  iso2?: string;
  completeness?: DataCompleteness;
}

export const CountryHeader: React.FC<CountryHeaderProps> = ({
  nameCommon,
  nameOfficial,
  capital,
  continent,
  region,
  flagSvgUrl,
  isoCode,
  iso2,
  completeness,
}) => {
  const { locale, t } = useI18n();
  const displayName = formatCountryName(iso2, nameCommon, locale);
  const [flagError, setFlagError] = React.useState(false);

  React.useEffect(() => {
    setFlagError(false);
  }, [isoCode, flagSvgUrl]);

  const locationLabel = region || continent;

  return (
    <div className="relative border-b border-line pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {flagSvgUrl && !flagError ? (
            <img
              src={flagSvgUrl}
              alt={`${t("inspector.flagOf", "Bandeira de")} ${displayName}`}
              onError={() => setFlagError(true)}
              className="h-7 w-10 shrink-0 rounded-sm border border-line object-cover"
            />
          ) : (
            <div
              className="flex h-7 w-10 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface-raised font-mono text-caption font-medium text-fg-secondary"
              title={`${t("inspector.isoCode", "Código ISO")}: ${isoCode}`}
            >
              {isoCode}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-display font-semibold text-fg">{displayName}</h2>
              <span className="shrink-0 rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-caption text-fg-secondary">
                {isoCode}
              </span>
            </div>
            {nameOfficial ? (
              <p className="line-clamp-1 text-caption text-fg-secondary">{nameOfficial}</p>
            ) : (
              completeness === "none" && (
                <p className="text-caption text-warning">
                  {t("inspector.socioUnavailable", "Dados socioeconômicos indisponíveis")}
                </p>
              )
            )}
          </div>
        </div>

        <IconButton label={t("common.closePanel", "Fechar painel")} icon={<X />} size="sm" onClick={resetGlobeView} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-label text-fg-secondary">
        <div className="flex items-center gap-1">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
          <span>
            {t("inspector.capital", "Capital")}:{" "}
            {capital ? (
              <strong className="font-medium text-fg">{capital}</strong>
            ) : (
              <span className="text-fg-muted">{t("common.dataUnavailable", "Dado indisponível")}</span>
            )}
          </span>
        </div>
        {locationLabel && (
          <div className="flex items-center gap-1">
            <Globe aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
            <span>{locationLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
