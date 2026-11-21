"use client";

import { useEffect } from "react";
import { sceneActions, useSceneStore } from "@/stores/sceneStore";

/** Parâmetro de link que abre uma cena: `/?cena=<id>` (D12d). */
export const SCENE_QUERY_PARAM = "cena";

export function sceneIdFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(SCENE_QUERY_PARAM)?.trim();
  return id ? id : null;
}

/** Mesma query com o parâmetro da cena trocado (null remove). Mantém os outros parâmetros. */
export function searchWithScene(search: string, sceneId: string | null): string {
  const params = new URLSearchParams(search);
  if (sceneId) params.set(SCENE_QUERY_PARAM, sceneId);
  else params.delete(SCENE_QUERY_PARAM);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/**
 * Abre a cena do link ao carregar e mantém o endereço em sincronia com a cena aberta, para que
 * o link copiado reabra a mesma cena. Um id que não é cena tocável é ignorado e sai do endereço.
 */
export function SceneLinkSync(): null {
  useEffect(() => {
    const replace = (sceneId: string | null) => {
      const next = searchWithScene(window.location.search, sceneId);
      if (next === window.location.search) return;
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${next}${window.location.hash}`);
    };
    const linked = sceneIdFromSearch(window.location.search);
    if (linked && !sceneActions.open(linked)) replace(null);
    return useSceneStore.subscribe((s, prev) => {
      if (s.activeSceneId !== prev.activeSceneId) replace(s.activeSceneId);
    });
  }, []);
  return null;
}
