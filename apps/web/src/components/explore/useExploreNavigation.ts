"use client";

import { usePathname } from "next/navigation";
import { runSearchResult, type SearchResult } from "@/lib/explore/search";

export function useExploreNavigation() {
  const pathname = usePathname();
  const canApplyHere = pathname === "/" || pathname === "/compare" || /^\/pais\/[^/]+\/?$/.test(pathname ?? "");
  const hasCountryContext = canApplyHere || /^\/study\/[^/]+\/?$/.test(pathname ?? "");
  return {
    hasCountryContext,
    canApplyHere,
    navigate: (result: SearchResult) => {
      if (canApplyHere) runSearchResult(result);
      else window.location.assign(`/?${new URLSearchParams({ comando: result.id })}`);
    },
  };
}
