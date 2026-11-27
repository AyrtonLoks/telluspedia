"use client";

import { selectCountry } from "@/stores/actions";

import React, { useState, useRef, useEffect } from "react";
import { getCountryData } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useTransversalStore } from "@/stores/transversalStore";
import { formatCountryName } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/useT";

interface HoverCardPreviewProps {
  isoCode: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const HoverCardPreview: React.FC<HoverCardPreviewProps> = ({
  isoCode,
  children,
  defaultOpen = false,
}) => {
  const { locale, t, tRaw } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [flagError, setFlagError] = useState(false);

  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flyTo = useGlobeStore((s) => s.flyTo);
  const addCountry = useComparatorStore((s) => s.addCountry);
  const openComparator = useComparatorStore((s) => s.openComparator);

  const country = getCountryData(isoCode);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 180) {
        setPlacement("bottom");
      } else {
        setPlacement("top");
      }
    }
    setFlagError(false);
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

  const handleFocusGlobe = (e: React.MouseEvent) => {
    e.stopPropagation();
    useGlobeStore.getState().setReaderOpen(false);
    selectCountry(isoCode);
    useLayoutStore.getState().setActiveRightPanel("country");
    useTimelineStore.getState().selectMilestone(null);
    if (country) {
      useTransversalStore.getState().pushTrailStep({
        key: `country:${isoCode}`,
        kind: "country",
        id: isoCode,
        labelPt: country.nameCommon,
        labelEn: formatCountryName(country.iso2, country.nameCommon, "en"),
        lat: country.latitude ?? undefined,
        lng: country.longitude ?? undefined,
        altitude: 2.0,
      });
    }
    if (
      country &&
      country.latitude !== null &&
      country.longitude !== null &&
      (country.latitude !== 0 || country.longitude !== 0)
    ) {
      flyTo(country.latitude, country.longitude, 2.0);
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    addCountry(isoCode);
    openComparator();
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="cursor-pointer font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover">
        {children}
      </span>

      {isOpen && country && (
        <span
          className={`pointer-events-auto absolute left-0 z-50 block w-64 text-left ${
            placement === "bottom" ? "top-full pt-1.5" : "bottom-full pb-1.5"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Bridge element preventing cursor drop */}
          <span
            className={`pointer-events-auto absolute left-0 right-0 h-3 ${
              placement === "bottom" ? "-top-3" : "-bottom-3"
            }`}
          />

          <span className="relative block rounded-card border border-line-strong bg-surface p-3 font-sans shadow-e2 backdrop-blur-md">
            <span className="mb-2 flex items-center gap-2">
              {country.flagSvgUrl && !flagError ? (
                <img
                  src={country.flagSvgUrl}
                  alt=""
                  onError={() => setFlagError(true)}
                  className="h-4 w-6 rounded-sm border border-line object-cover"
                />
              ) : (
                <span className="flex h-4 w-6 items-center justify-center rounded-sm border border-line-strong bg-surface-raised font-mono text-caption font-medium text-fg-secondary">
                  {country.isoCode}
                </span>
              )}
              <span className="block truncate text-label font-semibold text-fg">
                {country.isHistoricalEntity
                  ? tRaw(`country.${country.isoCode}.name`, country.nameCommon)
                  : formatCountryName(country.iso2, country.nameCommon, locale)}
              </span>
              <span className="ml-auto block rounded-sm border border-line-strong bg-surface-raised px-1.5 py-0.5 font-mono text-caption text-fg-secondary">
                {country.isoCode}
              </span>
            </span>

            <span className="mb-3 block line-clamp-3 text-caption leading-relaxed text-fg-secondary">
              {country.summary
                ? tRaw(`country.${country.isoCode}.summary`, country.summary)
                : t("reader.hover.noSummary", "Dados descritivos ainda indisponíveis na base local.")}
            </span>

            <span className="flex items-center gap-1.5 border-t border-line pt-2">
              <button
                type="button"
                onClick={handleFocusGlobe}
                className="flex-1 cursor-pointer rounded-control border border-accent/50 bg-accent/15 px-2 py-1 text-center text-caption font-medium text-accent transition-colors duration-fast ease-out hover:bg-accent/25"
              >
                {t("reader.hover.focusGlobe", "Focar Globo")}
              </button>
              <button
                type="button"
                onClick={handleCompare}
                className="flex-1 cursor-pointer rounded-control border border-line bg-surface-raised px-2 py-1 text-center text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
              >
                {t("reader.hover.compare", "Comparar")}
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  );
};
