"use client";

import { useGlobeStore } from "@/stores/globeStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { RIGHT_PANEL_ORDER, useLayoutStore, type RightPanelId } from "@/stores/layoutStore";
import { useStoreSnapshot } from "@/lib/use-hydrated";

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
 * Estado do dock direito derivado das stores dos painéis. Usa `useStoreSnapshot` (T41) para
 * garantir que o HTML SSR e a hidratação inicial no cliente vejam exatamente o mesmo estado.
 */
export function useRightDock(): RightDockState {
  const selectedIso = useStoreSnapshot(useGlobeStore, (s) => s.selectedIso);
  const isReaderOpen = useStoreSnapshot(useGlobeStore, (s) => s.isReaderOpen);
  const observatoryOpen = useStoreSnapshot(useObservatoryStore, (s) => s.isPanelOpen);
  const isCosmicMode = useStoreSnapshot(useCosmicStore, (s) => s.isCosmicMode);
  const focusedBodyId = useStoreSnapshot(useCosmicStore, (s) => s.focusedBodyId);
  const focusedProbeId = useStoreSnapshot(useCosmicStore, (s) => s.focusedProbeId);
  const isInspectorOpen = useStoreSnapshot(useCosmicStore, (s) => s.isInspectorOpen);
  const preferred = useStoreSnapshot(useLayoutStore, (s) => s.activeRightPanel);

  return resolveRightDock({
    countryOpen: Boolean(selectedIso) && !isReaderOpen,
    observatoryOpen,
    cosmosOpen:
      (isCosmicMode || focusedBodyId === "MOON") &&
      isInspectorOpen &&
      Boolean(focusedBodyId || focusedProbeId),
    preferred,
  });
}
