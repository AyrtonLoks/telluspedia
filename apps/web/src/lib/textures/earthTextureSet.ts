import type { EarthTextureTier } from "@/lib/webgl-quality";
import { textureSource } from "@/lib/textures/globeTextures";

/**
 * Conjunto de texturas da Terra por capacidade da GPU (D02) e preset de qualidade (T39).
 * Cada item tem o KTX2 (preferido) e o JPG/PNG/WebP de fallback — ver lib/textures/globeTextures.ts.
 */
export function pickEarthTextureSet(
  maxTextureSize: number,
  preferredTier: EarthTextureTier = "4k"
) {
  const quality: EarthTextureTier =
    preferredTier === "2k" ? "2k" : maxTextureSize >= 8192 ? "4k" : "2k";
  return {
    quality,
    day: textureSource(`/textures/earth_day_${quality}.jpg`),
    night: textureSource(`/textures/earth_night_${quality}.jpg`),
    surface: textureSource("/textures/earth_surface_2k.png"),
    clouds: textureSource("/textures/earth_clouds_2k.jpg"),
  } as const;
}

/** Paleomapa padrão (Pangeia, 250 Ma) quando a era geológica não define outro. */
export const DEFAULT_PALEO_TEXTURE = "/textures/paleo/paleo_250ma.webp";
