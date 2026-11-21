/**
 * Anticolisão de rótulos em espaço de tela (D11): ordena por prioridade e esconde quem encosta
 * num rótulo já aceito. Guloso e O(n²) — suficiente para as dezenas de corpos do sistema solar.
 */
export interface LabelBox {
  id: string;
  priority: number;
  /** Centro horizontal e base (px, origem no canto superior esquerdo). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Falso quando o ponto está atrás da câmera ou fora da tela. */
  onScreen: boolean;
}

export function resolveLabelCollisions(boxes: LabelBox[], padding = 4): Set<string> {
  const visible = new Set<string>();
  const placed: Array<[number, number, number, number]> = [];
  const sorted = [...boxes].filter((b) => b.onScreen).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  for (const b of sorted) {
    const rect: [number, number, number, number] = [
      b.x - b.width / 2 - padding,
      b.y - b.height - padding,
      b.x + b.width / 2 + padding,
      b.y + padding,
    ];
    const hit = placed.some((p) => rect[0] < p[2] && rect[2] > p[0] && rect[1] < p[3] && rect[3] > p[1]);
    if (!hit) {
      placed.push(rect);
      visible.add(b.id);
    }
  }
  return visible;
}
