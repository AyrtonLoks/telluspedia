import * as THREE from "three";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import type { PlanetId } from "@/lib/planet-orientation";
import { loadGlobeTexture, textureSource } from "./globeTextures";

/**
 * Texturas dos planetas (D21), geradas por scripts/textures/build-planet-textures.mjs.
 *
 * Só são pedidas quando um corpo é montado no Cosmos (nada entra no carregamento de `/`). O 1K
 * carrega para todos ao entrar; o 2K só para o corpo em foco. Cada textura tem contagem de
 * referências e é descartada (`dispose()`) quando o último usuário desmonta — sair do Cosmos
 * libera tudo.
 */
export const PLANET_TEXTURE_DIR = "/textures/planets";

export type PlanetTextureQuality = "1k" | "2k";

/** Resoluções disponíveis por corpo (o mosaico de Plutão da New Horizons tem 1024 px). */
export const PLANET_TEXTURE_QUALITIES: Record<PlanetId, readonly PlanetTextureQuality[]> = {
  MERCURY: ["1k", "2k"],
  VENUS: ["1k", "2k"],
  MARS: ["1k", "2k"],
  JUPITER: ["1k", "2k"],
  SATURN: ["1k", "2k"],
  URANUS: ["1k", "2k"],
  NEPTUNE: ["1k", "2k"],
  PLUTO: ["1k"],
};

export const SATURN_RING_TEXTURE = `${PLANET_TEXTURE_DIR}/saturn_ring.png`;

/** Caminho do fallback (JPG) de um corpo na qualidade pedida, ou na maior disponível abaixo dela. */
export function planetTexturePath(id: PlanetId, quality: PlanetTextureQuality): string {
  const available = PLANET_TEXTURE_QUALITIES[id];
  const q = available.includes(quality) ? quality : available[available.length - 1];
  return `${PLANET_TEXTURE_DIR}/${id.toLowerCase()}_${q}.jpg`;
}

interface Entry {
  refs: number;
  texture: THREE.Texture | null;
  promise: Promise<THREE.Texture>;
}

const defaultLoad = (gl: THREE.WebGLRenderer, fallbackPath: string) =>
  loadGlobeTexture(gl, textureSource(fallbackPath), "color");

const caches = new WeakMap<THREE.WebGLRenderer, Map<string, Entry>>();

function cacheFor(gl: THREE.WebGLRenderer) {
  let cache = caches.get(gl);
  if (!cache) caches.set(gl, (cache = new Map()));
  return cache;
}

/** Pega uma referência à textura (carrega na primeira). Devolve a promessa e a função de soltar. */
export function acquirePlanetTexture(
  gl: THREE.WebGLRenderer,
  fallbackPath: string,
  load: (gl: THREE.WebGLRenderer, fallbackPath: string) => Promise<THREE.Texture> = defaultLoad
) {
  const cache = cacheFor(gl);
  let entry = cache.get(fallbackPath);
  if (!entry) {
    const created: Entry = { refs: 0, texture: null, promise: null as unknown as Promise<THREE.Texture> };
    created.promise = load(gl, fallbackPath).then((texture) => {
      if (created.refs === 0) {
        // Ninguém mais quer: descarta assim que chega.
        texture.dispose();
        if (cache.get(fallbackPath) === created) cache.delete(fallbackPath);
      } else {
        created.texture = texture;
      }
      return texture;
    });
    cache.set(fallbackPath, created);
    entry = created;
  }
  entry.refs++;
  const held = entry;
  let released = false;
  return {
    promise: held.promise,
    release() {
      if (released) return;
      released = true;
      held.refs--;
      if (held.refs > 0) return;
      if (held.texture) {
        held.texture.dispose();
        held.texture = null;
        if (cache.get(fallbackPath) === held) cache.delete(fallbackPath);
      }
      // Se ainda está carregando, o `then` acima descarta ao chegar.
    },
  };
}

/** Quantas texturas de planeta estão vivas no renderer (para testes e diagnóstico). */
export function livePlanetTextureCount(gl: THREE.WebGLRenderer): number {
  return cacheFor(gl).size;
}

/** Hook: textura (ou `null` enquanto carrega / em falha) para o caminho dado; solta ao desmontar. */
export function usePlanetTexture(fallbackPath: string | null): THREE.Texture | null {
  const gl = useThree((s) => s.gl);
  const [loaded, setLoaded] = useState<{ path: string; texture: THREE.Texture } | null>(null);

  useEffect(() => {
    if (!fallbackPath) return;
    let active = true;
    const handle = acquirePlanetTexture(gl, fallbackPath);
    handle.promise
      .then((texture) => {
        if (active) setLoaded({ path: fallbackPath, texture });
      })
      .catch((error) => console.warn(`[cosmos] textura indisponível: ${fallbackPath}`, error));
    return () => {
      active = false;
      handle.release();
    };
  }, [gl, fallbackPath]);

  return loaded && loaded.path === fallbackPath ? loaded.texture : null;
}
