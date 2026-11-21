"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/reduced-motion";

/**
 * Tokens de movimento (D14/D17) em milissegundos — iguais a `--duration-*` em `globals.css`
 * (teste em `test/motion.test.tsx`). Entradas usam `base`/`slow` com ease-out; saídas, `fast`.
 */
export const MOTION_MS = { fast: 120, base: 200, slow: 320 } as const;

/** Margem para a animação de saída terminar antes de desmontar. */
const EXIT_MARGIN_MS = 40;

/**
 * Mantém um elemento montado enquanto a animação de saída roda: `mounted` segue verdadeiro por
 * `exitMs` depois de `open` virar falso, e `closing` diz que é hora de aplicar a animação de saída.
 * Com movimento reduzido (ou no servidor), desmonta na hora.
 */
export function usePresence(open: boolean, exitMs: number = MOTION_MS.fast): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    const id = window.setTimeout(() => setMounted(false), exitMs + EXIT_MARGIN_MS);
    return () => window.clearTimeout(id);
  }, [open, exitMs]);
  const isMounted = open || mounted;
  return { mounted: isMounted, closing: isMounted && !open };
}

/**
 * Guarda o último valor não nulo enquanto `keep` for verdadeiro — para um painel em saída continuar
 * mostrando o que mostrava (ex.: a cena que acabou de fechar) até sumir.
 */
export function useLastDefined<T>(value: T | null | undefined, keep: boolean): T | null {
  const [last, setLast] = useState<T | null>(value ?? null);
  useEffect(() => {
    if (value !== null && value !== undefined) setLast(value);
  }, [value]);
  if (value !== null && value !== undefined) return value;
  return keep ? last : null;
}
