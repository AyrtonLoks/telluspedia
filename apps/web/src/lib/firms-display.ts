/**
 * Apresentação dos focos do FIRMS (D05): escala de cor por FRP (compartilhada entre o shader
 * do globo e a legenda da UI), rótulos e link para a fonte primária.
 */
import type { FirmsHotspot } from "./observatory-data";

/**
 * Paradas da escala de cor por Fire Radiative Power (MW). RGB 0–1 (para o shader) e hex (UI).
 * Laranja (fraco) → vermelho-alaranjado → vermelho → magenta (muito intenso). Sem amarelo-claro:
 * é a cor das luzes urbanas da textura noturna, e os focos não podem ser confundidos com elas.
 */
export const FIRMS_FRP_STOPS = [
  { frp: 0, rgb: [1.0, 0.55, 0.17], hex: "#FF8C2B" },
  { frp: 20, rgb: [1.0, 0.35, 0.12], hex: "#FF591F" },
  { frp: 80, rgb: [0.91, 0.13, 0.16], hex: "#E8212A" },
  { frp: 300, rgb: [0.76, 0.09, 0.48], hex: "#C2177A" },
] as const;

/** Cor (RGB 0–1) interpolada para um FRP. */
export function frpColor(frp: number): [number, number, number] {
  const stops = FIRMS_FRP_STOPS;
  if (!(frp > stops[0].frp)) return [...stops[0].rgb] as [number, number, number];
  for (let i = 1; i < stops.length; i++) {
    if (frp <= stops[i].frp) {
      const a = stops[i - 1];
      const b = stops[i];
      // Interpolação em escala logarítmica (FRP varia de 1 a milhares de MW).
      const t = (Math.log1p(frp) - Math.log1p(a.frp)) / (Math.log1p(b.frp) - Math.log1p(a.frp));
      return [0, 1, 2].map((k) => a.rgb[k] + (b.rgb[k] - a.rgb[k]) * t) as [number, number, number];
    }
  }
  return [...stops[stops.length - 1].rgb] as [number, number, number];
}

/** Tamanho relativo do sprite (1 = foco fraco), crescendo com a raiz do FRP e saturando. */
export function frpSize(frp: number): number {
  return Math.min(3.2, 1 + Math.sqrt(Math.max(0, frp)) / 8);
}

export const FIRMS_CONFIDENCE_LABEL: Record<FirmsHotspot["confidence"], string> = {
  low: "Baixa",
  nominal: "Nominal",
  high: "Alta",
};

/** "0142" → "01:42". */
export function formatAcqTime(acqTime: string): string {
  const t = acqTime.padStart(4, "0");
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

/** Link para o mapa oficial do FIRMS centrado no foco e na data (fonte primária, RN02). */
export function firmsMapUrl(lat: number, lng: number, date?: string): string {
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `d:${date}..${date};` : "d:24hrs;";
  return `https://firms.modaps.eosdis.nasa.gov/map/#${d}@${lng.toFixed(3)},${lat.toFixed(3)},9z`;
}
