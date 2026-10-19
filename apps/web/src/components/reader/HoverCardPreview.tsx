"use client";

import React, { useState, useRef, useEffect } from "react";
import { getCountryData } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useTimelineStore } from "@/stores/timelineStore";

interface HoverCardPreviewProps {
  isoCode: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const HoverCardPreview: React.FC<HoverCardPreviewProps> = ({ isoCode, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [flagError, setFlagError] = useState(false);

  const containerRef = useRef<HTMLSpanElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
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
    setSelectedIso(isoCode);
    useTimelineStore.getState().selectMilestone(null);
    if (country && country.latitude && country.longitude) {
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
      <span className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 cursor-pointer font-medium">
        {children}
      </span>

      {isOpen && country && (
        <span
          className={`absolute left-0 z-50 w-64 text-left block pointer-events-auto ${
            placement === "bottom" ? "top-full pt-1.5" : "bottom-full pb-1.5"
          }`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Bridge element preventing cursor drop */}
          <span className={`absolute left-0 right-0 h-3 pointer-events-auto ${placement === "bottom" ? "-top-3" : "-bottom-3"}`} />

          <span className="block p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 shadow-2xl relative">
            <span className="flex items-center gap-2 mb-2">
              {country.flagSvgUrl && !flagError ? (
                <img
                  src={country.flagSvgUrl}
                  alt=""
                  onError={() => setFlagError(true)}
                  className="w-6 h-4 object-cover rounded shadow"
                />
              ) : (
                <span className="w-6 h-4 rounded bg-cyan-950 text-[10px] font-mono text-cyan-300 font-bold flex items-center justify-center border border-cyan-800/60 shadow">
                  {country.isoCode}
                </span>
              )}
              <span className="font-bold text-slate-100 text-xs block">{country.nameCommon}</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1 py-0.5 rounded ml-auto block">
                {country.isoCode}
              </span>
            </span>

            <span className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed mb-3 block">
              {country.summary}
            </span>

            <span className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleFocusGlobe}
                className="flex-1 py-1 px-2 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-medium transition-colors text-center cursor-pointer"
              >
                Focar Globo
              </button>
              <button
                type="button"
                onClick={handleCompare}
                className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition-colors text-center cursor-pointer"
              >
                Comparar
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  );
};
