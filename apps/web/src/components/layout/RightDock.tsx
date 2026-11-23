"use client";

import React, { useEffect, useRef } from "react";
import { MapPin, Orbit, Radio } from "lucide-react";
import { resetGlobeView, clearCelestialFocus } from "@/stores/actions";
import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useLayoutStore, type RightPanelId } from "@/stores/layoutStore";
import { getCountryData } from "@/lib/country-data";
import { InspectorHUD } from "@/components/hud/InspectorHUD";
import { CosmicInspectorHUD } from "@/components/hud/CosmicInspectorHUD";
import { ObservatoryPanel } from "@/components/observatory/ObservatoryPanel";
import { cn } from "@/components/ui/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useShellObstruction } from "./useShellObstruction";
import { useRightDock } from "./useRightDock";
import { DOCK_FRAME_CLASSES, dockMotionClasses } from "./dockFrame";
import { useLastDefined } from "@/components/ui/motion";
import { CountrySearchSuggestions } from "@/components/explore/CountrySearchSuggestions";
import { useI18n } from "@/lib/i18n/useT";
import { formatCountryName } from "@/lib/i18n/format";

const TAB_ICON: Record<RightPanelId, React.ReactNode> = {
  country: <MapPin />,
  observatory: <Radio />,
  cosmos: <Orbit />,
};

function restoreDockFocus(panel: RightPanelId) {
  const trigger = document.getElementById(panel === "observatory" ? "observatory-trigger" : "explore-search-trigger");
  trigger?.focus({ preventScroll: true });
}

/** Painéis laterais não modais. O mapa e a linha do tempo continuam interativos. */
export const RightDock: React.FC<{ closing?: boolean }> = ({ closing = false }) => {
  const dock = useRightDock();
  const active = useLastDefined(dock.active, closing);
  const setActive = useLayoutStore((s) => s.setActiveRightPanel);
  const pendingFocus = useLayoutStore((s) => s.pendingRightPanelFocus);
  const requestFocus = useLayoutStore((s) => s.requestRightPanelFocus);
  const storeIso = useGlobeStore((s) => s.selectedIso);
  const selectedIso = typeof window === "undefined" ? useGlobeStore.getState().selectedIso : storeIso;
  const { locale, t } = useI18n();
  const container = useRef<HTMLElement>(null);
  useShellObstruction(container, "--dock-obstruction", Boolean(active));
  const previousFocus = useRef<{ panel: RightPanelId; element: HTMLElement } | null>(null);

  const prevOpen = useRef<RightPanelId[]>(dock.open);
  useEffect(() => {
    const added = dock.open.find((id) => !prevOpen.current.includes(id));
    if (added) setActive(added);
    prevOpen.current = dock.open;
  }, [dock.open, setActive]);

  useEffect(() => {
    if (!pendingFocus) return;
    if (!dock.open.includes(pendingFocus)) {
      requestFocus(null);
      return;
    }
    if (active !== pendingFocus) {
      setActive(pendingFocus);
      return;
    }
    container.current?.querySelector<HTMLElement>(`[data-dock-content="${pendingFocus}"]`)?.focus({ preventScroll: true });
    requestFocus(null);
  }, [active, dock.open, pendingFocus, requestFocus, setActive]);

  useEffect(() => {
    const previous = previousFocus.current;
    if (!previous || dock.open.includes(previous.panel) || previous.element.isConnected) return;
    previousFocus.current = null;
    if (document.activeElement === document.body) restoreDockFocus(previous.panel);
  }, [dock.open]);

  useEffect(() => () => {
    const previous = previousFocus.current;
    if (!previous) return;
    const pathname = window.location.pathname;
    // O dock pode desaparecer no mesmo commit quando a redução de movimento está ativa.
    requestAnimationFrame(() => {
      if (window.location.pathname === pathname && !previous.element.isConnected &&
          document.activeElement === document.body && !useGlobeStore.getState().isReaderOpen) {
        restoreDockFocus(previous.panel);
      }
    });
  }, []);

  if ((!dock.visible && !closing) || !active) return null;

  const label = (id: RightPanelId) => {
    if (id === "country") {
      const c = selectedIso ? getCountryData(selectedIso) : null;
      return c ? formatCountryName(c.iso2, c.nameCommon, locale) : t("dock.tab.country", "País");
    }
    if (id === "observatory") return t("dock.tab.observatory", "Observatório");
    return t("dock.tab.cosmos", "Cosmos");
  };

  const content = (id: RightPanelId) => {
    switch (id) {
      case "country": return <><InspectorHUD /><CountrySearchSuggestions iso={selectedIso} /></>;
      case "observatory": return <ObservatoryPanel />;
      case "cosmos": return <CosmicInspectorHUD placement="dock" />;
    }
  };

  const dismiss = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented || closing) return;
    event.preventDefault();
    previousFocus.current = null;
    restoreDockFocus(active);
    switch (active) {
      case "country": resetGlobeView(); break;
      case "observatory": useObservatoryStore.getState().setPanelOpen(false); break;
      case "cosmos": clearCelestialFocus(); break;
    }
  };

  return (
    <Tabs value={active} onValueChange={(id) => setActive(id as RightPanelId)} asChild>
      <section
        ref={container}
        aria-label={t("dock.ariaLabel", "Painel lateral")}
        data-right-dock="true"
        data-active-panel={active}
        data-state={closing ? "closed" : "open"}
        className={cn(DOCK_FRAME_CLASSES, dockMotionClasses(closing))}
        onKeyDown={dismiss}
        onFocusCapture={(event) => { previousFocus.current = { panel: active, element: event.target }; }}
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong lg:hidden" />

        {dock.open.length > 1 ? (
          <>
            <TabsList aria-label={t("dock.openPanels", "Painéis abertos")} className="flex shrink-0 rounded-none border-x-0 border-t-0 bg-transparent p-1.5">
              {dock.open.map((id) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  data-testid={`dock-tab-${id}`}
                  className="h-8 min-w-0 flex-1 gap-1.5 px-2 hover:bg-surface-hover/60"
                >
                  <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">{TAB_ICON[id]}</span>
                  <span className="truncate">{label(id)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {dock.open.map((id) => (
              <TabsContent key={id} value={id} data-dock-content={id} className="mt-0 flex min-h-0 flex-1 flex-col focus-visible:-outline-offset-2 data-[state=inactive]:hidden">
                {content(id)}
              </TabsContent>
            ))}
          </>
        ) : (
          <div data-dock-content={active} tabIndex={-1} role="group" aria-label={label(active)} className="flex min-h-0 flex-1 flex-col focus-visible:-outline-offset-2">
            {content(active)}
          </div>
        )}
      </section>
    </Tabs>
  );
};
