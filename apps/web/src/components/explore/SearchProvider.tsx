"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const SearchPalette = dynamic(() => import("./SearchPalette").then((module) => module.SearchPalette), {
  ssr: false,
});
const SearchContext = createContext<() => void>(() => {});

export function useOpenExploreSearch() {
  return useContext(SearchContext);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const openSearch = useRef(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }).current;

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.repeat || (!event.ctrlKey && !event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (!open) openSearch();
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [open, openSearch]);

  return (
    <SearchContext.Provider value={openSearch}>
      {children}
      {open && <SearchPalette onClose={() => setOpen(false)} previousFocus={previousFocus.current} />}
    </SearchContext.Provider>
  );
}
