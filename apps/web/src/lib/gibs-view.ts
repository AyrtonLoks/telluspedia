/**
 * Estado da camada NASA GIBS na URL e nos estudos (T35): produto, mês e validação, sem o catálogo
 * completo (`gibs.ts`, com nomes, legendas e referências locais), que re-exporta este arquivo.
 */
export type GibsProductId = "ndvi" | "snow" | "seaice" | "lst";

export const GIBS_PRODUCT_IDS: GibsProductId[] = ["ndvi", "snow", "seaice", "lst"];
export const GIBS_DEFAULT_PRODUCT: GibsProductId = "ndvi";
/** Primeiro mês de cada produto no GIBS (o `firstMonth` de `GIBS_PRODUCTS`; um teste garante). */
export const GIBS_FIRST_MONTH: Record<GibsProductId, string> = {
  ndvi: "2000-03",
  snow: "2000-03",
  seaice: "2002-06",
  lst: "2000-03",
};

export const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Mês anterior a `month` ("2026-01" → "2025-12"). */
function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Último mês que costuma estar processado: as composições mensais saem algumas semanas depois do
 * fim do mês, então até o dia 15 o último é o retrasado; depois, o mês passado (UTC).
 */
export function latestGibsMonth(now: Date = new Date()): string {
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const last = previousMonth(current);
  return now.getUTCDate() <= 15 ? previousMonth(last) : last;
}

export function isGibsProductId(value: unknown): value is GibsProductId {
  return typeof value === "string" && (GIBS_PRODUCT_IDS as string[]).includes(value);
}

/** Mês bem formado e não anterior ao início do produto (o limite superior depende da data atual). */
export function isGibsMonthFor(productId: GibsProductId, month: unknown): month is string {
  return typeof month === "string" && MONTH.test(month) && month >= GIBS_FIRST_MONTH[productId];
}

/**
 * Lê o estado salvo da camada (URL compartilhável `gibs=produto[,AAAA-MM]` e estudos): produto
 * desconhecido descarta tudo; mês inválido, anterior ao produto ou ainda não processado vira null
 * (último mês disponível), em vez de quebrar a restauração.
 */
export function readGibsView(
  product: unknown,
  month: unknown,
  now: Date = new Date()
): { product: GibsProductId; month: string | null } | null {
  if (!isGibsProductId(product)) return null;
  const ok = isGibsMonthFor(product, month) && month <= latestGibsMonth(now);
  return { product, month: ok ? (month as string) : null };
}

/** Valor do parâmetro `gibs` da URL. */
export function encodeGibsView(product: GibsProductId, month: string | null): string {
  return month ? `${product},${month}` : product;
}
