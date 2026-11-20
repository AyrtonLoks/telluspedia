/**
 * Apresentação dos focos do FIRMS (D05): escala de cor por FRP (compartilhada entre o shader
 * do globo e a legenda da UI), rótulos e link para a fonte primária.
 */
import type { FirmsHotspot } from "./observatory-data";

/**
 * Paradas da escala de cor por Fire Radiative Power (MW). RGB 0–1 (para o shader) e hex (UI).
 * Amarelo pálido (fraco) → laranja → vermelho → magenta (muito intenso).
 */
export const FIRMS_FRP_STOPS = [
  { frp: 0, rgb: [1.0, 0.86, 0.45], hex: "#FFDB73" },
  { frp: 20, rgb: [1.0, 0.62, 0.2], hex: "#FF9E33" },
  { frp: 80, rgb: [0.98, 0.3, 0.12], hex: "#FA4D1F" },
  { frp: 300, rgb: [0.85, 0.12, 0.35], hex: "#D91F59" },
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
