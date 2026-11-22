"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  computeEffectiveDpr,
  createAdaptiveFpsState,
  stepAdaptiveFps,
  type AdaptiveFpsState,
} from "@/lib/webgl-quality";
import { useGlobeStore } from "@/stores/globeStore";
import { useGraphicsQualityStore } from "@/stores/graphicsQualityStore";

const SAMPLE_WINDOW_SECONDS = 1.5;
const MAX_FRAME_DELTA_SECONDS = 0.25;

/**
 * Controlador WebGL de qualidade adaptativa (T39):
 * - Aplica DPR dinâmico via `setDpr` do R3F (sem recriar o contexto WebGL).
 * - Monitora FPS em janelas deslizantes de ~1,5 s e reduz o DPR no modo `Auto`
 *   quando o FPS permanece abaixo de 30 fps por janela sustentada.
 */
export function WebGLQualityController() {
  const setDpr = useThree((state) => state.setDpr);
  const invalidate = useThree((state) => state.invalidate);

  const preset = useGraphicsQualityStore((s) => s.preset);
  const adaptiveDprScale = useGraphicsQualityStore((s) => s.adaptiveDprScale);
  const isThrottled = useGlobeStore((s) => s.isThrottled);

  const adaptiveStateRef = useRef<AdaptiveFpsState>(createAdaptiveFpsState());
  const windowFramesRef = useRef(0);
  const windowElapsedRef = useRef(0);
  const lastAppliedDprRef = useRef<number | null>(null);

  // Reinicia histerese ao trocar de preset
  useEffect(() => {
    adaptiveStateRef.current = createAdaptiveFpsState();
    windowFramesRef.current = 0;
    windowElapsedRef.current = 0;
  }, [preset]);

  // Aplica DPR efetivo sem recriar o WebGLRenderer (responde também a mudança de zoom/display)
  useEffect(() => {
    const apply = () => {
      const hardwareDpr =
        typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
          ? window.devicePixelRatio
          : 1;
      const nextDpr = computeEffectiveDpr(hardwareDpr, preset, adaptiveDprScale);
      if (lastAppliedDprRef.current !== nextDpr) {
        lastAppliedDprRef.current = nextDpr;
        setDpr(nextDpr);
        invalidate();
      }
      useGraphicsQualityStore.getState().setTelemetry({ effectiveDpr: nextDpr });
    };

    apply();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [preset, adaptiveDprScale, setDpr, invalidate]);

  useFrame((_, delta) => {
    // Ignora pausas do modo de leitura (RN22) ou trocas de aba do navegador
    if (isThrottled || delta <= 0 || delta > MAX_FRAME_DELTA_SECONDS) return;

    windowFramesRef.current += 1;
    windowElapsedRef.current += delta;

    if (windowElapsedRef.current < SAMPLE_WINDOW_SECONDS) return;

    const measuredFps = Math.round(windowFramesRef.current / windowElapsedRef.current);
    windowFramesRef.current = 0;
    windowElapsedRef.current = 0;

    if (preset === "auto") {
      const prevScale = adaptiveStateRef.current.scale;
      const next = stepAdaptiveFps(adaptiveStateRef.current, measuredFps);
      adaptiveStateRef.current = next;
      useGraphicsQualityStore.getState().setTelemetry({
        currentFps: measuredFps,
        ...(next.scale !== prevScale ? { adaptiveDprScale: next.scale } : {}),
      });
    } else {
      useGraphicsQualityStore.getState().setTelemetry({ currentFps: measuredFps });
    }
  });

  return null;
}
