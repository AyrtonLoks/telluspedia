import { create } from "zustand";
import { useCosmicStore } from "./cosmicStore";

/**
 * Saída do Cosmos em andamento (D17): enquanto a câmera desce até a Terra, o sistema solar continua
 * na tela, levado pelo mesmo reposicionamento da câmera (a Terra volta à origem na escala 1), e vai
 * esmaecendo. `center`/`scale` são os da Terra na órbita no instante da saída.
 */
export interface CosmicExit {
  center: [number, number, number];
  scale: number;
}

export const useCosmicExitStore = create<{ exit: CosmicExit | null; setExit: (exit: CosmicExit | null) => void }>((set) => ({
  exit: null,
  setExit: (exit) => set({ exit }),
}));

/** O sistema solar está na tela: no Cosmos, ou durante a descida de volta à Terra. */
export function useSolarSystemVisible(): boolean {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const exiting = useCosmicExitStore((s) => s.exit !== null);
  return isCosmicMode || exiting;
}

/** Descendo de volta à Terra com o sistema solar ainda na tela (rótulos e interação desligados). */
export function useSolarSystemExiting(): boolean {
  const isCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const exiting = useCosmicExitStore((s) => s.exit !== null);
  return !isCosmicMode && exiting;
}
