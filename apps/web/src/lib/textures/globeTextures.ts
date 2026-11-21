import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

/**
 * Carregamento das texturas do globo (D02/D09): KTX2 (Basis Universal) quando o navegador
 * transcodifica para um formato comprimido da GPU; senão, o JPG/PNG equivalente.
 *
 * Os KTX2 são gerados por scripts/textures/build-earth-textures.mjs com o eixo Y invertido,
 * porque o KTX2Loader usa flipY = false. Assim as duas versões ficam com a mesma orientação.
 */

export const BASIS_TRANSCODER_PATH = "/basis/";

export type TextureKind = "color" | "data";

export interface GlobeTextureSource {
  /** Caminho do KTX2 (preferido). */
  ktx2: string;
  /** JPG/PNG usado quando o KTX2 não está disponível ou falha. */
  fallback: string;
}

/** Deriva o par KTX2 + fallback a partir do caminho do JPG/PNG (mesmo nome, extensão .ktx2). */
export function textureSource(fallback: string): GlobeTextureSource {
  return { ktx2: fallback.replace(/\.(png|jpe?g)$/i, ".ktx2"), fallback };
}

const loaders = new WeakMap<THREE.WebGLRenderer, KTX2Loader>();

function ktx2LoaderFor(gl: THREE.WebGLRenderer): KTX2Loader {
  let loader = loaders.get(gl);
  if (!loader) {
    loader = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(gl);
    loaders.set(gl, loader);
  }
  return loader;
}

function configure(texture: THREE.Texture, kind: TextureKind, anisotropy: number) {
  texture.colorSpace = kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = THREE.RepeatWrapping; // costura em ±180° sem filete
  texture.needsUpdate = true;
  return texture;
}

/** Último formato efetivamente usado (para telemetria e testes manuais). */
export const lastTextureFormat: Record<string, "ktx2" | "fallback"> = {};

/**
 * Carrega uma textura do globo. Tenta o KTX2 e, em qualquer falha (arquivo ausente, sem
 * WebAssembly/Worker, GPU sem formato compatível), cai para o JPG/PNG.
 */
export async function loadGlobeTexture(
  gl: THREE.WebGLRenderer,
  source: GlobeTextureSource,
  kind: TextureKind
): Promise<THREE.Texture> {
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const canTranscode = typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  if (canTranscode) {
    try {
      const texture = await ktx2LoaderFor(gl).loadAsync(source.ktx2);
      lastTextureFormat[source.fallback] = "ktx2";
      return configure(texture, kind, anisotropy);
    } catch (error) {
      console.warn(`[globo] KTX2 indisponível (${source.ktx2}); usando ${source.fallback}.`, error);
    }
  }
  const texture = await new THREE.TextureLoader().loadAsync(source.fallback);
  lastTextureFormat[source.fallback] = "fallback";
  return configure(texture, kind, anisotropy);
}
