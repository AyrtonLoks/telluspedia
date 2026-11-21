"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { encodeView, mergeView, restoreView } from "@/lib/explore/view-url";
import type { ViewCamera } from "@/lib/explore/view-camera";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useTimelineStore } from "@/stores/timelineStore";

export function ExplorerUrlSync({ view, immutable }: { view: ViewCamera; immutable: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (immutable) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let burstStart = 0;
    let restoring = false;
    restoreView(window.location.search, view);
    let encoded = encodeView(view);
    const sync = () => {
      if (restoring || window.location.pathname !== pathname) return;
      const next = encodeView(view);
      if (next === encoded) return;
      encoded = next;
      clearTimeout(timer);
      const now = performance.now();
      if (!burstStart) burstStart = now;
      timer = setTimeout(() => {
        burstStart = 0;
        if (window.location.pathname !== pathname) return;
        const search = mergeView(window.location.search, encoded);
        if (search !== window.location.search) {
          window.history.replaceState(window.history.state, "", `${pathname}${search}${window.location.hash}`);
        }
      }, Math.max(0, Math.min(280, burstStart + 1100 - now)));
    };
    const onPopState = () => {
      if (window.location.pathname !== pathname) return;
      clearTimeout(timer);
      burstStart = 0;
      restoring = true;
      restoreView(window.location.search, view);
      encoded = encodeView(view);
      restoring = false;
    };
    window.addEventListener("popstate", onPopState);
    view.onChange = sync;
    const subscriptions = [
      useGlobeStore.subscribe((state, previous) => { if (state.selectedIso !== previous.selectedIso) sync(); }),
      useTimelineStore.subscribe(sync),
      useCosmicStore.subscribe(sync),
      useObservatoryStore.subscribe((state, previous) => {
        if (
          state.activeLayers !== previous.activeLayers ||
          state.isPanelOpen !== previous.isPanelOpen ||
          state.gibsProduct !== previous.gibsProduct ||
          state.gibsMonth !== previous.gibsMonth
        ) sync();
      }),
      useLayoutStore.subscribe(sync),
      useComparatorStore.subscribe(sync),
    ];

    const url = new URL(window.location.href);
    const command = url.searchParams.get("comando");
    let cancelled = false;
    if (pathname === "/" && command) {
      // Consome o comando depois que a experiência de destino montou e restaurou a URL.
      void import("@/lib/explore/search").then(({ findSearchResult, runSearchResult }) => {
        if (cancelled || window.location.pathname !== pathname) return;
        const current = new URL(window.location.href);
        current.searchParams.delete("comando");
        window.history.replaceState(window.history.state, "", current.pathname + current.search + current.hash);
        const result = findSearchResult(command);
        if (result) runSearchResult(result);
      });
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("popstate", onPopState);
      view.onChange = null;
      view.restore = null;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [immutable, pathname, view]);

  return null;
}
