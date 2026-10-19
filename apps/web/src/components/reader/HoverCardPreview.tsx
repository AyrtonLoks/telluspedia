"use client";

import React, { useState } from "react";
import { PILOT_COUNTRIES } from "@/lib/country-data";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";

interface HoverCardPreviewProps {
  isoCode: string;
  children: React.ReactNode;
}

export const HoverCardPreview: React.FC<HoverCardPreviewProps> = ({ isoCode, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const setSelectedIso = useGlobeStore((s) => s.setSelectedIso);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const addCountry = useComparatorStore((s) => s.addCountry);
  const openComparator = useComparatorStore((s) => s.openComparator);

  const country = PILOT_COUNTRIES[isoCode];

  const handleFocusGlobe = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIso(isoCode);
    if (country) flyTo(country.latitude, country.longitude, 2.0);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    addCountry(isoCode);
    openComparator();
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 cursor-pointer font-medium">
        {children}
      </span>

      {isOpen && country && (
        <span className="absolute left-0 bottom-full mb-2 z-50 w-64 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 shadow-2xl text-left block pointer-events-auto">
          <span className="flex items-center gap-2 mb-2 block">
            <img
              src={country.flagSvgUrl}
              alt=""
              className="w-6 h-4 object-cover rounded shadow"
            />
            <span className="font-bold text-slate-100 text-xs block">{country.nameCommon}</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1 py-0.5 rounded ml-auto block">
              {country.isoCode}
            </span>
          </span>

          <span className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed mb-3 block">
            {country.summary}
          </span>

          <span className="flex items-center gap-1.5 pt-2 border-t border-slate-800 block">
            <button
              onClick={handleFocusGlobe}
              className="flex-1 py-1 px-2 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-[10px] font-medium transition-colors text-center"
            >
              Focar Globo
            </button>
            <button
              onClick={handleCompare}
              className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium transition-colors text-center"
            >
              Comparar
            </button>
          </span>
        </span>
      )}
    </span>
  );
};
