/** `prefers-reduced-motion: reduce` no navegador (false no servidor). Sem dependências: entra no bundle inicial. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
