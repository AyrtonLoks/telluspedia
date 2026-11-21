/**
 * Eixo histórico da timeline (D13): janela visível com zoom/pan, ticks adaptativos
 * (século → década → ano → mês) e agrupamento de marcos próximos sem sobreposição.
 * Funções puras — o componente `TimelineAxis` só guarda o estado e mede a largura.
 */

/** Janela visível em anos decimais (ex.: 1989.86 = 10/11/1989). */
export interface AxisView {
  start: number;
  end: number;
}

/** Menor janela permitida: três meses (o tick mais fino é mensal). */
export const MIN_VIEW_SPAN = 0.25;
/** Distância mínima entre ticks e entre marcadores (px). */
export const MIN_TICK_SPACING_PX = 80;
export const MIN_PIN_SPACING_PX = 22;
/** Largura assumida antes da medição (SSR). */
export const DEFAULT_AXIS_WIDTH_PX = 800;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Mantém a janela dentro do período do preset, sem inverter nem ficar menor que o mínimo. */
export function clampView(view: AxisView, bounds: AxisView): AxisView {
  const boundsSpan = Math.max(MIN_VIEW_SPAN, bounds.end - bounds.start);
  const span = clamp(view.end - view.start, Math.min(MIN_VIEW_SPAN, boundsSpan), boundsSpan);
  const start = clamp(view.start, bounds.start, bounds.start + boundsSpan - span);
  return { start, end: start + span };
}

/** Zoom ancorado: `factor` < 1 aproxima; o ano sob o cursor fica no mesmo lugar. */
export function zoomView(view: AxisView, bounds: AxisView, factor: number, anchor: number): AxisView {
  const span = view.end - view.start;
  const t = span > 0 ? (anchor - view.start) / span : 0.5;
  const nextSpan = span * factor;
  return clampView({ start: anchor - t * nextSpan, end: anchor - t * nextSpan + nextSpan }, bounds);
}

export function panView(view: AxisView, bounds: AxisView, deltaYears: number): AxisView {
  return clampView({ start: view.start + deltaYears, end: view.end + deltaYears }, bounds);
}

/** Posição (0–100 %) de um ano decimal na janela. */
export function yearToPercent(year: number, view: AxisView): number {
  return ((year - view.start) / Math.max(1e-9, view.end - view.start)) * 100;
}

/** Ano decimal a partir da posição em px. */
export function pxToYear(px: number, widthPx: number, view: AxisView): number {
  return view.start + (px / Math.max(1, widthPx)) * (view.end - view.start);
}

/** Ano decimal de um marco: usa a data exata quando existe (meio do ano quando não). */
export function milestoneDecimalYear(year: number, exactDate?: string): number {
  const m = exactDate?.match(/^(-?\d{1,4})-(\d{2})-(\d{2})/);
  if (!m || Number(m[1]) !== year) return year + 0.5;
  const month = Number(m[2]) - 1;
  const day = Number(m[3]) - 1;
  return year + (month + day / 31) / 12;
}

export type TickUnit = "century" | "decade" | "year" | "month";
export interface AxisTick {
  /** Chave estável (ano inteiro ou "ano-mês"). */
  key: string;
  value: number;
  label: string;
  percent: number;
  unit: TickUnit;
  /** Ano inteiro do tick (para `data-year`). */
  year: number;
}

/** Passos candidatos, do mais grosso ao mais fino (em anos). */
const STEPS: Array<{ years: number; unit: TickUnit }> = [
  { years: 500, unit: "century" },
  { years: 200, unit: "century" },
  { years: 100, unit: "century" },
  { years: 50, unit: "decade" },
  { years: 25, unit: "decade" },
  { years: 10, unit: "decade" },
  { years: 5, unit: "year" },
  { years: 2, unit: "year" },
  { years: 1, unit: "year" },
  { years: 6 / 12, unit: "month" },
  { years: 3 / 12, unit: "month" },
  { years: 1 / 12, unit: "month" },
];

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Escolhe o passo mais fino que ainda deixa `MIN_TICK_SPACING_PX` entre ticks. */
export function tickStepFor(view: AxisView, widthPx: number): (typeof STEPS)[number] {
  const span = Math.max(1e-9, view.end - view.start);
  const maxTicks = Math.max(2, Math.floor(widthPx / MIN_TICK_SPACING_PX));
  let chosen = STEPS[0];
  for (const step of STEPS) {
    if (span / step.years <= maxTicks) chosen = step;
    else break;
  }
  return chosen;
}

export function adaptiveTicks(view: AxisView, widthPx: number): AxisTick[] {
  const step = tickStepFor(view, widthPx);
  const ticks: AxisTick[] = [];
  if (step.unit === "month") {
    const monthStep = Math.round(step.years * 12);
    let idx = Math.ceil((view.start * 12 - 1e-6) / monthStep) * monthStep;
    for (; idx / 12 <= view.end + 1e-6; idx += monthStep) {
      const year = Math.floor(idx / 12);
      const month = ((idx % 12) + 12) % 12;
      const value = idx / 12;
      ticks.push({ key: `${year}-${month}`, value, label: month === 0 ? String(year) : `${MONTHS[month]} ${year}`, percent: yearToPercent(value, view), unit: "month", year });
    }
    return ticks;
  }
  const first = Math.ceil((view.start - 1e-6) / step.years) * step.years;
  for (let value = first; value <= view.end + 1e-6; value += step.years) {
    const year = Math.round(value);
    ticks.push({ key: String(year), value: year, label: String(year), percent: yearToPercent(year, view), unit: step.unit, year });
  }
  return ticks;
}

export interface PinInput<T> {
  item: T;
  /** Ano decimal. */
  value: number;
}
export interface PinCluster<T> {
  key: string;
  members: T[];
  /** Ano decimal médio (posição do marcador). */
  value: number;
  /** Extremos (para o zoom ao expandir). */
  first: number;
  last: number;
}

/**
 * Agrupa marcos cujos marcadores ficariam a menos de `minGapPx` um do outro. Funde sempre o par
 * vizinho mais próximo até que todos os vizinhos estejam a pelo menos `minGapPx` — então nenhum
 * marcador se sobrepõe, em qualquer nível de zoom.
 */
export function clusterPins<T>(pins: PinInput<T>[], view: AxisView, widthPx: number, keyOf: (item: T) => string, minGapPx = MIN_PIN_SPACING_PX): PinCluster<T>[] {
  const pxPerYear = widthPx / Math.max(1e-9, view.end - view.start);
  const groups = [...pins]
    .sort((a, b) => a.value - b.value)
    .map((p) => ({ members: [p.item], sum: p.value, first: p.value, last: p.value }));
  const center = (g: (typeof groups)[number]) => g.sum / g.members.length;
  while (groups.length > 1) {
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i < groups.length - 1; i++) {
      const gap = (center(groups[i + 1]) - center(groups[i])) * pxPerYear;
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    if (bestGap >= minGapPx) break;
    const a = groups[best];
    const b = groups[best + 1];
    groups.splice(best, 2, { members: [...a.members, ...b.members], sum: a.sum + b.sum, first: Math.min(a.first, b.first), last: Math.max(a.last, b.last) });
  }
  return groups.map((g) => ({ key: g.members.map(keyOf).join("+"), members: g.members, value: center(g), first: g.first, last: g.last }));
}

/** Janela para "abrir" um grupo: cobre os membros com folga, sem passar do período. */
export function viewForCluster(first: number, last: number, bounds: AxisView): AxisView {
  const span = Math.max(MIN_VIEW_SPAN, (last - first) * 1.6);
  const mid = (first + last) / 2;
  return clampView({ start: mid - span / 2, end: mid + span / 2 }, bounds);
}
