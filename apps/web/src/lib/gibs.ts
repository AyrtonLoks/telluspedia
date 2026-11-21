/**
 * Camada NASA GIBS do Observatório (D25): catálogo dos produtos, validação estrita do pedido e URL
 * do WMS. Sem dependências de servidor: usado pela rota proxy, pelo store e pelos testes.
 *
 * Produtos escolhidos: composições L3/L4 que cobrem o globo inteiro (sem as faixas vazias das
 * passagens diárias) e têm histórico desde 2000. O pedido é por mês (`AAAA-MM`): os mensais usam o
 * dia 1 (o GIBS também encaixa qualquer dia do mês na composição); o gelo marinho, diário, usa o dia 15.
 * Projeção EPSG:4326 (equiretangular, 2:1), que casa com o UV da `SphereGeometry` do globo.
 */
export type GibsProductId = "ndvi" | "snow" | "seaice" | "lst";

export interface GibsScaleLabel {
  /** Posição na barra, de 0 a 1. */
  at: number;
  text: string;
}

export interface GibsProduct {
  id: GibsProductId;
  /** Identificador da camada no GIBS (GetCapabilities). */
  gibsLayer: string;
  name: string;
  shortName: string;
  description: string;
  /** Primeiro mês disponível no GIBS. */
  firstMonth: string;
  /** Dia usado no pedido (mensais: 1; diário: 15). */
  day: number;
  /** Composição de que tipo, para o texto da procedência. */
  composite: string;
  /** Barra de cores recortada da legenda oficial do GIBS. */
  scaleImage: string;
  scaleLabels: GibsScaleLabel[];
  scaleUnit: string;
  /** Imagem local de referência (fallback T05) e o mês que ela mostra. */
  fallbackImage: string;
  fallbackMonth: string;
}

export const GIBS_PRODUCTS: Record<GibsProductId, GibsProduct> = {
  ndvi: {
    id: "ndvi",
    gibsLayer: "MODIS_Terra_L3_NDVI_Monthly",
    name: "Cobertura vegetal (NDVI)",
    shortName: "Vegetação",
    description: "Índice de vegetação por diferença normalizada: quanto mais verde e denso, mais perto de 1.",
    firstMonth: "2000-03",
    day: 1,
    composite: "composição mensal MODIS/Terra",
    scaleImage: "/observatory/gibs/ndvi-scale.png",
    // A barra oficial não é linear: posições medidas nos traços da legenda do GIBS.
    scaleLabels: [
      { at: 0, text: "0" },
      { at: 0.43, text: "0,3" },
      { at: 0.71, text: "0,6" },
      { at: 1, text: "1" },
    ],
    scaleUnit: "índice (adimensional)",
    fallbackImage: "/observatory/gibs/ndvi-ref.webp",
    fallbackMonth: "2024-07",
  },
  snow: {
    id: "snow",
    gibsLayer: "MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct",
    name: "Cobertura de neve",
    shortName: "Neve",
    description: "Fração média do terreno coberta de neve no mês.",
    firstMonth: "2000-03",
    day: 1,
    composite: "média mensal MODIS/Terra",
    scaleImage: "/observatory/gibs/snow-scale.png",
    // Classes de 20 em 20 pontos (barra em degraus): rótulos nas divisas medidas na legenda do GIBS.
    scaleLabels: [
      { at: 0, text: "1" },
      { at: 0.39, text: "40" },
      { at: 0.8, text: "80" },
      { at: 1, text: "100" },
    ],
    scaleUnit: "% de cobertura",
    fallbackImage: "/observatory/gibs/snow-ref.webp",
    fallbackMonth: "2024-01",
  },
  seaice: {
    id: "seaice",
    gibsLayer: "GHRSST_L4_MUR_Sea_Ice_Concentration",
    name: "Gelo marinho",
    shortName: "Gelo marinho",
    description: "Concentração de gelo no mar (análise GHRSST MUR, sem lacunas), no dia 15 do mês.",
    firstMonth: "2002-06",
    day: 15,
    composite: "análise diária GHRSST L4 MUR (dia 15)",
    scaleImage: "/observatory/gibs/seaice-scale.png",
    scaleLabels: [
      { at: 0, text: "0" },
      { at: 0.4, text: "40" },
      { at: 0.8, text: "80" },
      { at: 1, text: "100" },
    ],
    scaleUnit: "% de concentração",
    fallbackImage: "/observatory/gibs/seaice-ref.webp",
    fallbackMonth: "2024-09",
  },
  lst: {
    id: "lst",
    gibsLayer: "MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day",
    name: "Temperatura da superfície (dia)",
    shortName: "Temperatura",
    description: "Temperatura da superfície terrestre durante o dia, média do mês (só continentes).",
    firstMonth: "2000-03",
    day: 1,
    composite: "média mensal diurna MODIS/Terra",
    scaleImage: "/observatory/gibs/lst-scale.png",
    // Escala oficial de 200 a 350 K; rótulos em °C (K − 273,15, arredondado).
    scaleLabels: [
      { at: 0, text: "≤ −73" },
      { at: 0.4, text: "−13" },
      { at: 0.6, text: "17" },
      { at: 1, text: "≥ 77" },
    ],
    scaleUnit: "°C (escala oficial de 200 a 350 K)",
    fallbackImage: "/observatory/gibs/lst-ref.webp",
    fallbackMonth: "2024-07",
  },
};

export const GIBS_PRODUCT_IDS = Object.keys(GIBS_PRODUCTS) as GibsProductId[];
export const GIBS_DEFAULT_PRODUCT: GibsProductId = "ndvi";
export const GIBS_PROVIDER = "NASA GIBS (WMS, EPSG:4326)";
export const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
/** Largura pedida ao WMS (2:1). 2048 dá ~20 km por pixel no equador e cabe em ~0,1–0,7 MB de PNG. */
export const GIBS_IMAGE_WIDTH = 2048;

/**
 * O GIBS responde HTTP 200 com um PNG transparente quando não há dado na data (lacunas da missão,
 * mês ainda não processado). Na largura de 2048 px esse PNG tem ~8 kB; uma imagem real tem dezenas
 * ou centenas de kB (gelo marinho, a mais vazia, ~95 kB). Abaixo do limite, é tratado como "sem dado".
 */
export const GIBS_BLANK_MAX_BYTES = 16 * 1024;
export function isBlankGibsImage(byteLength: number): boolean {
  return byteLength <= GIBS_BLANK_MAX_BYTES;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Mês anterior a `month` ("2026-01" → "2025-12"). */
function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Último mês que costuma estar processado: as composições mensais saem algumas semanas depois do fim
 * do mês. Até o dia 15, o mês retrasado; depois, o mês passado (em UTC).
 */
export function latestGibsMonth(now: Date = new Date()): string {
  const current = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const last = previousMonth(current);
  return now.getUTCDate() <= 15 ? previousMonth(last) : last;
}

export type GibsRequest = { product: GibsProduct; month: string; time: string };

/** Validação estrita do pedido (produto da lista, mês `AAAA-MM` dentro do intervalo do produto). */
export function parseGibsRequest(
  params: { product?: string | null; month?: string | null },
  now: Date = new Date()
): { ok: true; value: GibsRequest } | { ok: false; error: string } {
  const productId = params.product ?? GIBS_DEFAULT_PRODUCT;
  if (!(GIBS_PRODUCT_IDS as string[]).includes(productId)) {
    return { ok: false, error: `Produto inválido: use ${GIBS_PRODUCT_IDS.join(", ")}.` };
  }
  const product = GIBS_PRODUCTS[productId as GibsProductId];
  const latest = latestGibsMonth(now);
  const month = params.month ?? latest;
  if (!MONTH.test(month)) return { ok: false, error: "Mês inválido: use o formato AAAA-MM." };
  if (month < product.firstMonth || month > latest) {
    return { ok: false, error: `Mês fora do intervalo de ${product.shortName}: de ${product.firstMonth} a ${latest}.` };
  }
  return { ok: true, value: { product, month, time: `${month}-${String(product.day).padStart(2, "0")}` } };
}

/** URL do GetMap do WMS 1.3.0 (em EPSG:4326 a ordem do BBOX é latitude, longitude). */
export function gibsGetMapUrl(product: GibsProduct, time: string, width: number = GIBS_IMAGE_WIDTH): string {
  const q = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: product.gibsLayer,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    CRS: "EPSG:4326",
    BBOX: "-90,-180,90,180",
    WIDTH: String(width),
    HEIGHT: String(width / 2),
    TIME: time,
  });
  return `${GIBS_WMS}?${q.toString()}`;
}

/** Caminho da imagem servida pelo proxy do TellusPedia (a CSP só permite imagens da própria origem). */
export function gibsImagePath(product: GibsProductId, month: string): string {
  return `/api/observatory/gibs/image?product=${product}&month=${month}`;
}

/** O que a rota `/api/observatory/gibs` entrega em `data` (envelope T05). */
export interface GibsLayerData {
  product: GibsProductId;
  /** Mês pedido. */
  month: string;
  /** Mês que a imagem mostra (difere do pedido quando é a referência local). */
  imageMonth: string;
  imageUrl: string;
  /** Camada GIBS e data exata usadas (procedência). */
  gibsLayer: string;
  time: string;
}

/** "2024-07" → "julho de 2024". */
export function formatGibsMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  return `${name} de ${y}`;
}
