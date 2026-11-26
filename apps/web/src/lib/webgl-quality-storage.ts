/**
 * Persistência e rótulos leves de preset de qualidade gráfica WebGL (T39/T25).
 * Separado de `webgl-quality.ts` para manter os perfis completos e o controlador de FPS fora do First Load JS de `/`.
 */

export const GRAPHICS_QUALITY_STORAGE_KEY = "telluspedia.graphics-quality.v1";

export const GRAPHICS_QUALITY_PRESETS = ["auto", "high", "medium", "low"] as const;
export type GraphicsQualityPreset = (typeof GRAPHICS_QUALITY_PRESETS)[number];

export const QUALITY_PRESET_LABELS: Readonly<Record<GraphicsQualityPreset, string>> = {
  auto: "Auto",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export function isGraphicsQualityPreset(value: unknown): value is GraphicsQualityPreset {
  return (
    typeof value === "string" &&
    (GRAPHICS_QUALITY_PRESETS as readonly string[]).includes(value)
  );
}

export function readStoredQualityPreset(): GraphicsQualityPreset {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(GRAPHICS_QUALITY_STORAGE_KEY);
    return isGraphicsQualityPreset(raw) ? raw : "auto";
  } catch {
    return "auto";
  }
}

export function writeStoredQualityPreset(preset: GraphicsQualityPreset): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GRAPHICS_QUALITY_STORAGE_KEY, preset);
  } catch {
    // Armazenamento bloqueado (modo privado/política do navegador): ignora sem erro.
  }
}
