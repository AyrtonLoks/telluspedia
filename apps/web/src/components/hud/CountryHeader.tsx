"use client";

import { resetGlobeView } from "@/stores/actions";

import React from "react";
import { X, MapPin, Globe, Info, ExternalLink } from "lucide-react";
import { DataCompleteness } from "@/lib/country-data";
import { IconButton } from "@/components/ui/IconButton";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";
import { formatTerritorialStatus, getTerritorialStatus } from "@/lib/territorial-status";
import { cn } from "@/components/ui/cn";

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
  const { locale, t, tRaw } = useI18n();
  const curatedHistName = tRaw(`country.${isoCode}.name`, "");
  const displayName = curatedHistName
    ? curatedHistName
    : iso2
    ? formatCountryName(iso2, nameCommon, locale)
    : nameCommon;
  const displayOfficial = nameOfficial ? tRaw(`country.${isoCode}.official`, nameOfficial) : null;
  const displayCapital = capital ? tRaw(`capital.${capital}`, capital) : null;
  const [flagError, setFlagError] = React.useState(false);

  React.useEffect(() => {
    setFlagError(false);
  }, [isoCode, flagSvgUrl]);

  const rawLocation = region || continent;
  const locationLabel = rawLocation ? tRaw(`region.${rawLocation}`, rawLocation) : null;
  const territorialStatusRaw = getTerritorialStatus(isoCode);
  const territorialStatus = territorialStatusRaw
    ? formatTerritorialStatus(territorialStatusRaw, locale)
    : null;

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
            {displayOfficial ? (
              <p className="line-clamp-1 text-caption text-fg-secondary">{displayOfficial}</p>
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
            {displayCapital ? (
              <strong className="font-medium text-fg">{displayCapital}</strong>
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

      {territorialStatus && (
        <div
          data-testid="territorial-status-note"
          data-territorial-kind={territorialStatus.kind}
          className={cn(
            "mt-3 rounded-card border px-3 py-2 text-caption",
            territorialStatus.kind === "disputed"
              ? "border-warning/40 bg-warning/10"
              : "border-accent/35 bg-accent/10"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                territorialStatus.kind === "disputed" ? "text-warning" : "text-accent"
              )}
            >
              <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {territorialStatus.label}
            </span>
            <a
              href={territorialStatus.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-caption text-fg-secondary transition-colors duration-fast ease-out hover:text-fg"
            >
              <span>
                {t("inspector.sourcePrefix", "Fonte:")} {territorialStatus.sourceLabel}
              </span>
              <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <p className="mt-1 leading-snug text-fg-secondary">{territorialStatus.note}</p>
        </div>
      )}
    </div>
  );
};
