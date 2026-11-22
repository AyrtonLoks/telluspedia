/**
 * Motor puro de qualidade gráfica adaptativa no WebGL (T39).
 *
 * Controla presets persistidos (`auto`, `low`, `medium`, `high`), limites de DPR,
 * resolução de texturas (2K vs 4K), nuvens, subdivisão de malha e escalas de densidade
 * de estrelas/asteroides, além da máquina de estados de adaptação por FPS sustentado.
 */

export const GRAPHICS_QUALITY_STORAGE_KEY = "telluspedia.graphics-quality.v1";

export const GRAPHICS_QUALITY_PRESETS = ["auto", "high", "medium", "low"] as const;
export type GraphicsQualityPreset = (typeof GRAPHICS_QUALITY_PRESETS)[number];

export type EarthTextureTier = "2k" | "4k";

export interface GraphicsQualityProfile {
  preset: GraphicsQualityPreset;
  label: string;
  description: string;
  minDpr: number;
  maxDpr: number;
  textureTier: EarthTextureTier;
  earthSegments: readonly [widthSegments: number, heightSegments: number];
  cloudsEnabled: boolean;
  /** Multiplicadores expostos para consumo por camadas de partículas (estrelas/asteroides). */
  starDensity: number;
  asteroidDensity: number;
}

export const GRAPHICS_QUALITY_PROFILES: Readonly<
  Record<GraphicsQualityPreset, GraphicsQualityProfile>
> = {
  auto: {
    preset: "auto",
    label: "Auto",
    description: "Ajusta o DPR dinamicamente se o FPS cair abaixo de 30 fps.",
    minDpr: 0.75,
    maxDpr: 2.0,
    textureTier: "4k",
    earthSegments: [96, 64],
    cloudsEnabled: true,
    starDensity: 1.0,
    asteroidDensity: 1.0,
  },
  high: {
    preset: "high",
    label: "Alto",
    description: "Texturas 4K, nuvens e DPR até 2.0× para GPUs dedicadas.",
    minDpr: 1.0,
    maxDpr: 2.0,
    textureTier: "4k",
    earthSegments: [96, 64],
    cloudsEnabled: true,
    starDensity: 1.0,
    asteroidDensity: 1.0,
  },
  medium: {
    preset: "medium",
    label: "Médio",
    description: "Texturas 2K, nuvens e DPR até 1.5× equilibrando nitidez e bateria.",
    minDpr: 1.0,
    maxDpr: 1.5,
    textureTier: "2k",
    earthSegments: [64, 48],
    cloudsEnabled: true,
    starDensity: 0.65,
    asteroidDensity: 0.65,
  },
  low: {
    preset: "low",
    label: "Baixo",
    description: "Texturas 2K, sem nuvens e DPR até 1.0× para GPUs integradas ou economia.",
    minDpr: 0.75,
    maxDpr: 1.0,
    textureTier: "2k",
    earthSegments: [48, 32],
    cloudsEnabled: false,
    starDensity: 0.35,
    asteroidDensity: 0.35,
  },
};

export function isGraphicsQualityPreset(value: unknown): value is GraphicsQualityPreset {
  return (
    typeof value === "string" &&
    (GRAPHICS_QUALITY_PRESETS as readonly string[]).includes(value)
  );
}

export function getQualityProfile(preset: GraphicsQualityPreset): GraphicsQualityProfile {
  return GRAPHICS_QUALITY_PROFILES[preset];
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

/**
 * Calcula o DPR efetivo aplicado ao WebGLRenderer sem recriar o contexto.
 * Em modo `auto`, multiplica o teto de hardware por `adaptiveDprScale` (0.55..1.0).
 */
export function computeEffectiveDpr(
  devicePixelRatio: number,
  preset: GraphicsQualityPreset,
  adaptiveDprScale: number = 1.0
): number {
  const profile = GRAPHICS_QUALITY_PROFILES[preset];
  const safeDeviceDpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const baseDpr = Math.min(safeDeviceDpr, profile.maxDpr);
  const scale =
    preset === "auto"
      ? Math.max(0.5, Math.min(1.0, Number.isFinite(adaptiveDprScale) ? adaptiveDprScale : 1))
      : 1.0;
  const raw = Math.max(profile.minDpr, Math.min(profile.maxDpr, baseDpr * scale));
  return Math.round(raw * 20) / 20;
}

/** Parâmetros do controlador adaptativo por janela sustentada de FPS (T39). */
export const ADAPTIVE_FPS_LOW_THRESHOLD = 30;
export const ADAPTIVE_FPS_RECOVERY_THRESHOLD = 50;
export const ADAPTIVE_LOW_WINDOWS_TO_DOWNGRADE = 2;
export const ADAPTIVE_HIGH_WINDOWS_TO_UPGRADE = 4;
export const ADAPTIVE_DPR_STEP = 0.15;
export const ADAPTIVE_DPR_MIN_SCALE = 0.55;

export interface AdaptiveFpsState {
  scale: number;
  lowStreak: number;
  highStreak: number;
}

export function createAdaptiveFpsState(): AdaptiveFpsState {
  return { scale: 1.0, lowStreak: 0, highStreak: 0 };
}

/**
 * Avalia uma janela de amostragem de FPS (~1,5 s) no modo `auto`.
 * Rebaixa o DPR após janelas sustentadas abaixo de 30 fps e recupera gradualmente
 * acima de 50 fps com histerese para evitar oscilação.
 */
export function stepAdaptiveFps(
  state: AdaptiveFpsState,
  measuredFps: number
): AdaptiveFpsState {
  if (!Number.isFinite(measuredFps) || measuredFps <= 0) {
    return state;
  }

  if (measuredFps < ADAPTIVE_FPS_LOW_THRESHOLD) {
    const nextLow = state.lowStreak + 1;
    if (nextLow >= ADAPTIVE_LOW_WINDOWS_TO_DOWNGRADE) {
      const nextScale = Math.max(
        ADAPTIVE_DPR_MIN_SCALE,
        Math.round((state.scale - ADAPTIVE_DPR_STEP) * 100) / 100
      );
      return { scale: nextScale, lowStreak: 0, highStreak: 0 };
    }
    return { scale: state.scale, lowStreak: nextLow, highStreak: 0 };
  }

  if (measuredFps >= ADAPTIVE_FPS_RECOVERY_THRESHOLD && state.scale < 1.0) {
    const nextHigh = state.highStreak + 1;
    if (nextHigh >= ADAPTIVE_HIGH_WINDOWS_TO_UPGRADE) {
      const nextScale = Math.min(
        1.0,
        Math.round((state.scale + ADAPTIVE_DPR_STEP) * 100) / 100
      );
      return { scale: nextScale, lowStreak: 0, highStreak: 0 };
    }
    return { scale: state.scale, lowStreak: 0, highStreak: nextHigh };
  }

  return { scale: state.scale, lowStreak: 0, highStreak: 0 };
}
