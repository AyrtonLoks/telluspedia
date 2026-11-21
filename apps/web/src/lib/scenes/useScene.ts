import { useEffect } from "react";
import { getScene, isSceneLoaded, loadScene, useSceneDataVersion } from "./catalog";
import type { Scene } from "./schema";

/**
 * Cena pelo id, re-renderizando quando a parte pesada chega (D24). Dispara a carga se faltar.
 * Antes de carregar, devolve a cena do índice (sem trajetórias); use `isSceneLoaded` para saber.
 */
export function useScene(id: string | null | undefined): Scene | undefined {
  useSceneDataVersion((s) => s.version);
  useEffect(() => {
    if (id && !isSceneLoaded(id)) void loadScene(id);
  }, [id]);
  return id ? getScene(id) : undefined;
}
