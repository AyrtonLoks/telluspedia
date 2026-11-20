/**
 * Mapas de cor por categoria/camada/estado com classes literais (o Tailwind só gera classes
 * que aparecem por extenso no código; por isso este arquivo fica em src/components).
 */
import type { MilestoneCategoryType } from "@/stores/timelineStore";

export type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "cat-politics"
  | "cat-economy"
  | "cat-war"
  | "cat-science"
  | "cat-health"
  | "layer-fires"
  | "layer-events"
  | "layer-satellites"
  | "layer-aircraft"
  | "layer-maritime";

export interface ToneClasses {
  /** Ponto/marcador sólido. */
  dot: string;
  /** Texto na cor do tom. */
  text: string;
  /** Fundo tingido (seleção / badge). */
  subtle: string;
  /** Borda tingida. */
  border: string;
  /** Borda sólida (pins). */
  ring: string;
}

export const TONES: Record<Tone, ToneClasses> = {
  neutral: { dot: "bg-fg-muted", text: "text-fg-secondary", subtle: "bg-fg-muted/15", border: "border-line-strong", ring: "border-fg-muted" },
  accent: { dot: "bg-accent", text: "text-accent", subtle: "bg-accent/15", border: "border-accent/40", ring: "border-accent" },
  success: { dot: "bg-success", text: "text-success", subtle: "bg-success/15", border: "border-success/40", ring: "border-success" },
  warning: { dot: "bg-warning", text: "text-warning", subtle: "bg-warning/15", border: "border-warning/40", ring: "border-warning" },
  danger: { dot: "bg-danger", text: "text-danger", subtle: "bg-danger/15", border: "border-danger/40", ring: "border-danger" },
  "cat-politics": { dot: "bg-cat-politics", text: "text-cat-politics", subtle: "bg-cat-politics/15", border: "border-cat-politics/45", ring: "border-cat-politics" },
  "cat-economy": { dot: "bg-cat-economy", text: "text-cat-economy", subtle: "bg-cat-economy/15", border: "border-cat-economy/45", ring: "border-cat-economy" },
  "cat-war": { dot: "bg-cat-war", text: "text-cat-war", subtle: "bg-cat-war/15", border: "border-cat-war/45", ring: "border-cat-war" },
  "cat-science": { dot: "bg-cat-science", text: "text-cat-science", subtle: "bg-cat-science/15", border: "border-cat-science/45", ring: "border-cat-science" },
  "cat-health": { dot: "bg-cat-health", text: "text-cat-health", subtle: "bg-cat-health/15", border: "border-cat-health/45", ring: "border-cat-health" },
  "layer-fires": { dot: "bg-layer-fires", text: "text-layer-fires", subtle: "bg-layer-fires/15", border: "border-layer-fires/45", ring: "border-layer-fires" },
  "layer-events": { dot: "bg-layer-events", text: "text-layer-events", subtle: "bg-layer-events/15", border: "border-layer-events/45", ring: "border-layer-events" },
  "layer-satellites": { dot: "bg-layer-satellites", text: "text-layer-satellites", subtle: "bg-layer-satellites/15", border: "border-layer-satellites/45", ring: "border-layer-satellites" },
  "layer-aircraft": { dot: "bg-layer-aircraft", text: "text-layer-aircraft", subtle: "bg-layer-aircraft/15", border: "border-layer-aircraft/45", ring: "border-layer-aircraft" },
  "layer-maritime": { dot: "bg-layer-maritime", text: "text-layer-maritime", subtle: "bg-layer-maritime/15", border: "border-layer-maritime/45", ring: "border-layer-maritime" },
};

export const CATEGORY_TONE: Record<MilestoneCategoryType, Tone> = {
  POLITICS_REGIMES: "cat-politics",
  ECONOMY: "cat-economy",
  WAR_MILITARY: "cat-war",
  SCIENCE_CULTURE: "cat-science",
  HEALTH_PANDEMICS: "cat-health",
};

export const CATEGORY_LABEL: Record<MilestoneCategoryType, string> = {
  POLITICS_REGIMES: "Política",
  ECONOMY: "Economia",
  WAR_MILITARY: "Guerras",
  SCIENCE_CULTURE: "Ciência",
  HEALTH_PANDEMICS: "Saúde",
};
