/**
 * Clique de verdade × arraste (D24). Girar o globo e soltar o botão sobre um objeto dispara `click`
 * (no DOM e no `onClick` do R3F, que não descarta arrastes). Só o `onPointerMissed` do R3F já
 * ignora arrastes (delta ≤ 2 px). Use isto nos cliques que selecionam ou desmarcam algo.
 */
export const CLICK_DRAG_TOLERANCE_PX = 4;

/** O evento de clique do R3F veio de um arraste (o ponteiro andou mais que a tolerância). */
export function isDragRelease(event: { delta?: number }): boolean {
  return (event.delta ?? 0) > CLICK_DRAG_TOLERANCE_PX;
}
