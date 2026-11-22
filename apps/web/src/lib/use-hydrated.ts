import { useSyncExternalStore } from "react";
import type { StoreApi, UseBoundStore } from "zustand";

const noopSubscribe = () => () => {};

/**
 * `false` no servidor e durante a hidratação; `true` depois (T41). O React usa o snapshot do
 * servidor ao hidratar e re-renderiza sozinho quando ele muda.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Lê um store Zustand de forma que o HTML do servidor e a hidratação no cliente vejam o mesmo
 * valor (T41). O hook do Zustand usa o estado *inicial* do store como snapshot do servidor, então
 * no SSR e na hidratação lemos o estado atual (`getState`), que o `GlobeExperienceShell` já
 * preencheu com o estudo/país da rota antes dos filhos renderizarem. Depois da hidratação, vale
 * a assinatura normal.
 */
export function useStoreSnapshot<S, T>(store: UseBoundStore<StoreApi<S>>, selector: (state: S) => T): T {
  const live = store(selector);
  const hydrated = useHydrated();
  return hydrated ? live : selector(store.getState());
}
