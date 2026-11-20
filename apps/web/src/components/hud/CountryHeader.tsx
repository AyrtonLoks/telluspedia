"use client";

import React from "react";
import { X, MapPin, Globe } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { DataCompleteness } from "@/lib/country-data";
import { IconButton } from "@/components/ui/IconButton";

interface CountryHeaderProps {
  nameCommon: string;
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  flagSvgUrl?: string;
  isoCode: string;
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
  completeness,
}) => {
  const resetView = useGlobeStore((s) => s.resetView);
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
              alt={`Bandeira de ${nameCommon}`}
              onError={() => setFlagError(true)}
              className="h-7 w-10 shrink-0 rounded-sm border border-line object-cover"
            />
          ) : (
            <div
              className="flex h-7 w-10 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface-raised font-mono text-caption font-medium text-fg-secondary"
              title={`Código ISO: ${isoCode}`}
            >
              {isoCode}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-display font-semibold text-fg">{nameCommon}</h2>
              <span className="shrink-0 rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-caption text-fg-secondary">
                {isoCode}
              </span>
            </div>
            {nameOfficial ? (
              <p className="line-clamp-1 text-caption text-fg-secondary">{nameOfficial}</p>
            ) : (
              completeness === "none" && (
                <p className="text-caption text-warning">
                  Dados socioeconômicos indisponíveis
                </p>
              )
            )}
          </div>
        </div>

        <IconButton label="Fechar painel" icon={<X />} size="sm" onClick={resetView} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-label text-fg-secondary">
        <div className="flex items-center gap-1">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
          <span>
            Capital:{" "}
            {capital ? (
              <strong className="font-medium text-fg">{capital}</strong>
            ) : (
              <span className="text-fg-muted">Dado indisponível</span>
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
