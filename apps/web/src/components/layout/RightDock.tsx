"use client";

import React, { useEffect, useRef } from "react";
import { MapPin, Orbit, Radio } from "lucide-react";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore, type RightPanelId } from "@/stores/layoutStore";
import { getCountryData } from "@/lib/country-data";
import { InspectorHUD } from "@/components/hud/InspectorHUD";
import { CosmicInspectorHUD } from "@/components/hud/CosmicInspectorHUD";
import { ObservatoryPanel } from "@/components/observatory/ObservatoryPanel";
import { cn } from "@/components/ui/cn";
import { useRightDock } from "./useRightDock";
import { DOCK_FRAME_CLASSES, dockMotionClasses } from "./dockFrame";
import { useLastDefined } from "@/components/ui/motion";
import { CountrySearchSuggestions } from "@/components/explore/CountrySearchSuggestions";

const TAB_ICON: Record<RightPanelId, React.ReactNode> = {
  country: <MapPin />,
  observatory: <Radio />,
  cosmos: <Orbit />,
};

/**
 * Dock direito (D15): um único lugar para os painéis laterais — Inspector do país, Observatório e
 * Inspector cósmico. Mostra um painel por vez; com mais de um aberto, abas alternam entre eles.
 * Abrir um painel novo ativa a aba dele. Em telas estreitas vira bottom sheet.
 * A timeline e os overlays desviam do dock via `useRightDock().visible`.
 */
export const RightDock: React.FC<{ closing?: boolean }> = ({ closing = false }) => {
  const dock = useRightDock();
  // Durante a saída (D17) o dock continua mostrando o último painel até a animação terminar.
  const active = useLastDefined(dock.active, closing);
  const setActive = useLayoutStore((s) => s.setActiveRightPanel);
  const storeIso = useGlobeStore((s) => s.selectedIso);
  const selectedIso = typeof window === "undefined" ? useGlobeStore.getState().selectedIso : storeIso;

  // Painel recém-aberto vira o ativo.
  const prevOpen = useRef<RightPanelId[]>(dock.open);
  useEffect(() => {
    const added = dock.open.find((id) => !prevOpen.current.includes(id));
    if (added) setActive(added);
    prevOpen.current = dock.open;
  }, [dock.open, setActive]);

  if ((!dock.visible && !closing) || !active) return null;

  const label = (id: RightPanelId) =>
    id === "country" ? (selectedIso && getCountryData(selectedIso)?.nameCommon) || "País" : id === "observatory" ? "Observatório" : "Cosmos";

  return (
    <section
      aria-label="Painel lateral"
      data-right-dock="true"
      data-active-panel={active}
      data-state={closing ? "closed" : "open"}
      className={cn(DOCK_FRAME_CLASSES, dockMotionClasses(closing))}
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong lg:hidden" />

      {dock.open.length > 1 && (
        <div role="tablist" aria-label="Painéis abertos" className="flex shrink-0 gap-1 border-b border-line p-1.5">
          {dock.open.map((id) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`dock-tab-${id}`}
                onClick={() => setActive(id)}
                className={cn(
                  "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-control px-2 text-label font-medium transition-colors duration-fast ease-out",
                  isActive ? "bg-surface-hover text-fg" : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
                )}
              >
                <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                  {TAB_ICON[id]}
                </span>
                <span className="truncate">{label(id)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div role={dock.open.length > 1 ? "tabpanel" : undefined} className="flex min-h-0 flex-1 flex-col">
        {active === "country" && (
          <>
            <InspectorHUD />
            <CountrySearchSuggestions iso={selectedIso} />
          </>
        )}
        {active === "observatory" && <ObservatoryPanel />}
        {active === "cosmos" && <CosmicInspectorHUD placement="dock" />}
      </div>
    </section>
  );
};
