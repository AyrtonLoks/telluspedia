import { create } from "zustand";

/**
 * Layout de painéis (D15). Os painéis laterais (país, cosmos, observatório) continuam abertos/fechados
 * pelas próprias stores; aqui fica só QUAL deles ocupa o dock direito quando há mais de um aberto.
 */
export type RightPanelId = "country" | "cosmos" | "observatory";

/** Ordem das abas no dock. */
export const RIGHT_PANEL_ORDER: RightPanelId[] = ["country", "observatory", "cosmos"];

interface LayoutState {
  /** Aba ativa do dock; null = a mais recente entre as abertas. */
  activeRightPanel: RightPanelId | null;
  pendingRightPanelFocus: RightPanelId | null;
  requestRightPanelFocus: (id: RightPanelId | null) => void;
  setActiveRightPanel: (id: RightPanelId | null) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeRightPanel: null,
  pendingRightPanelFocus: null,
  requestRightPanelFocus: (id) => set({ pendingRightPanelFocus: id }),
  setActiveRightPanel: (id) => set({ activeRightPanel: id }),
}));
