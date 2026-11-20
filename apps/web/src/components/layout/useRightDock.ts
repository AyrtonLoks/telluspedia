"use client";

import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { RIGHT_PANEL_ORDER, useLayoutStore, type RightPanelId } from "@/stores/layoutStore";

export interface RightDockState {
  /** Painéis laterais abertos, na ordem das abas. */
  open: RightPanelId[];
  /** Painel exibido no dock (null = dock vazio). */
  active: RightPanelId | null;
  /** O dock ocupa a coluna direita (timeline e overlays devem desviar). */
  visible: boolean;
}

/** Função pura: quais painéis estão abertos e qual ocupa o dock. */
export function resolveRightDock(input: {
  countryOpen: boolean;
  observatoryOpen: boolean;
  cosmosOpen: boolean;
  preferred: RightPanelId | null;
}): RightDockState {
  const flags: Record<RightPanelId, boolean> = {
    country: input.countryOpen,
    observatory: input.observatoryOpen,
    cosmos: input.cosmosOpen,
  };
  const open = RIGHT_PANEL_ORDER.filter((id) => flags[id]);
  const active = input.preferred && flags[input.preferred] ? input.preferred : open[0] ?? null;
  return { open, active, visible: open.length > 0 };
}

/**
 * Clique num botão de painel (ex.: "Observatório" na navbar): se o painel já está aberto mas atrás
 * de outra aba, traz para frente; caso contrário, alterna aberto/fechado.
 */
export function panelButtonAction(panel: RightPanelId, isOpen: boolean, dock: RightDockState): "focus" | "toggle" {
  return isOpen && dock.active !== panel ? "focus" : "toggle";
}

/**
 * Estado do dock direito derivado das stores dos painéis. No render de servidor (testes com
 * renderToStaticMarkup) lê o estado atual, como os demais componentes do app.
 */
export function useRightDock(): RightDockState {
  const isServer = typeof window === "undefined";
  const sSelectedIso = useGlobeStore((s) => s.selectedIso);
  const sReaderOpen = useGlobeStore((s) => s.isReaderOpen);
  const sObservatoryOpen = useObservatoryStore((s) => s.isPanelOpen);
  const sCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const sFocused = useCosmicStore((s) => s.focusedBodyId);
  const sCosmicInspector = useCosmicStore((s) => s.isInspectorOpen);
  const sPreferred = useLayoutStore((s) => s.activeRightPanel);

  const globe = isServer ? useGlobeStore.getState() : { selectedIso: sSelectedIso, isReaderOpen: sReaderOpen };
  const observatoryOpen = isServer ? useObservatoryStore.getState().isPanelOpen : sObservatoryOpen;
  const cosmic = isServer
    ? useCosmicStore.getState()
    : { isCosmicMode: sCosmicMode, focusedBodyId: sFocused, isInspectorOpen: sCosmicInspector };
  const preferred = isServer ? useLayoutStore.getState().activeRightPanel : sPreferred;

  return resolveRightDock({
    countryOpen: Boolean(globe.selectedIso) && !globe.isReaderOpen,
    observatoryOpen,
    cosmosOpen:
      (cosmic.isCosmicMode || cosmic.focusedBodyId === "MOON") && cosmic.isInspectorOpen && Boolean(cosmic.focusedBodyId),
    preferred,
  });
}
