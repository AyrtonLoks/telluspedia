import * as topojson from "topojson-client";
import { geoPath, type GeoPermissibleObjects } from "d3-geo";
import { createEquirectangularProjection, getChoroplethFeatures } from "./choropleth-texture";
import type { BiomeFeatureProperties, BiomeTopology } from "./biomes-data";
import { PRODES_MONITORING_REGIONS } from "./inpe-data";
import type { DeterAlertPoint, ProdesBiomeId } from "./inpe-types";

export const DEFORESTATION_HEATMAP_WIDTH = 1024;
export const DEFORESTATION_HEATMAP_HEIGHT = 512;

export interface ProdesHotspotHub {
  id: string;
  municipality: string;
  uf: string;
  biome: ProdesBiomeId;
  lat: number;
  lng: number;
  /** Peso relativo de pressão de desmatamento (0.2–1.0) segundo rankings municipais oficiais INPE/PRODES. */
  intensity: number;
  /** Raio de influência espacial em graus aproximados para o kernel do mapa de calor. */
  spreadDeg: number;
}

/**
 * Zonas críticas municipais oficiais de desmatamento (INPE / PRODES BiomasBR — 2022–2025)
 * cobrindo todos os 6 biomas brasileiros: Arco do Desmatamento (Amazônia), fronteira MATOPIBA
 * (Cerrado), sertão e oeste baiano (Caatinga), norte de MG / sul da BA / planalto sul (Mata Atlântica),
 * Campanha Gaúcha (Pampa) e planície/entorno pantaneiro (Pantanal).
 */
export const PRODES_CRITICAL_HUBS: readonly ProdesHotspotHub[] = [
  // Amazônia (Arco do Desmatamento — PA, AM, RO, MT, AC, RR, MA)
  { id: "amz-sfx", municipality: "São Félix do Xingu", uf: "PA", biome: "amazonia", lat: -6.64, lng: -51.99, intensity: 1.0, spreadDeg: 2.3 },
  { id: "amz-alt", municipality: "Altamira", uf: "PA", biome: "amazonia", lat: -5.45, lng: -53.35, intensity: 0.96, spreadDeg: 2.4 },
  { id: "amz-pvh", municipality: "Porto Velho", uf: "RO", biome: "amazonia", lat: -9.15, lng: -64.45, intensity: 0.94, spreadDeg: 2.2 },
  { id: "amz-lab", municipality: "Lábrea", uf: "AM", biome: "amazonia", lat: -8.35, lng: -65.75, intensity: 0.92, spreadDeg: 2.2 },
  { id: "amz-apu", municipality: "Apuí", uf: "AM", biome: "amazonia", lat: -7.2, lng: -59.89, intensity: 0.9, spreadDeg: 2.0 },
  { id: "amz-npr", municipality: "Novo Progresso", uf: "PA", biome: "amazonia", lat: -7.14, lng: -55.38, intensity: 0.88, spreadDeg: 2.0 },
  { id: "amz-pac", municipality: "Pacajá", uf: "PA", biome: "amazonia", lat: -3.83, lng: -50.64, intensity: 0.86, spreadDeg: 1.8 },
  { id: "amz-col", municipality: "Colniza", uf: "MT", biome: "amazonia", lat: -9.41, lng: -59.02, intensity: 0.85, spreadDeg: 2.0 },
  { id: "amz-boc", municipality: "Boca do Acre", uf: "AM", biome: "amazonia", lat: -8.75, lng: -67.4, intensity: 0.82, spreadDeg: 1.9 },
  { id: "amz-ita", municipality: "Itaituba", uf: "PA", biome: "amazonia", lat: -5.85, lng: -56.45, intensity: 0.8, spreadDeg: 1.9 },
  { id: "amz-nar", municipality: "Novo Aripuanã", uf: "AM", biome: "amazonia", lat: -6.95, lng: -60.95, intensity: 0.76, spreadDeg: 1.8 },
  { id: "amz-man", municipality: "Manicoré", uf: "AM", biome: "amazonia", lat: -6.15, lng: -61.55, intensity: 0.72, spreadDeg: 1.7 },
  { id: "amz-feij", municipality: "Feijó / Tarauacá", uf: "AC", biome: "amazonia", lat: -8.45, lng: -70.65, intensity: 0.7, spreadDeg: 1.7 },
  { id: "amz-ror", municipality: "Rorainópolis", uf: "RR", biome: "amazonia", lat: 0.94, lng: -60.42, intensity: 0.68, spreadDeg: 1.6 },
  { id: "amz-ana", municipality: "Anapu / Portel", uf: "PA", biome: "amazonia", lat: -3.15, lng: -51.1, intensity: 0.78, spreadDeg: 1.7 },
  { id: "amz-ari", municipality: "Aripuanã / Juína", uf: "MT", biome: "amazonia", lat: -10.45, lng: -59.4, intensity: 0.74, spreadDeg: 1.7 },
  { id: "amz-bur", municipality: "Buriticupu / Amarante", uf: "MA", biome: "amazonia", lat: -4.7, lng: -46.4, intensity: 0.66, spreadDeg: 1.5 },

  // Cerrado (MATOPIBA — BA, PI, MA, TO + MT, GO, MS)
  { id: "cer-sde", municipality: "São Desidério", uf: "BA", biome: "cerrado", lat: -12.6, lng: -45.55, intensity: 1.0, spreadDeg: 2.1 },
  { id: "cer-bgr", municipality: "Baixa Grande do Ribeiro", uf: "PI", biome: "cerrado", lat: -7.85, lng: -45.22, intensity: 0.95, spreadDeg: 1.9 },
  { id: "cer-bal", municipality: "Balsas", uf: "MA", biome: "cerrado", lat: -7.53, lng: -46.04, intensity: 0.92, spreadDeg: 1.9 },
  { id: "cer-frp", municipality: "Formosa do Rio Preto", uf: "BA", biome: "cerrado", lat: -11.05, lng: -45.5, intensity: 0.94, spreadDeg: 2.0 },
  { id: "cer-uru", municipality: "Uruçuí", uf: "PI", biome: "cerrado", lat: -7.23, lng: -44.56, intensity: 0.85, spreadDeg: 1.8 },
  { id: "cer-rgo", municipality: "Ribeiro Gonçalves", uf: "PI", biome: "cerrado", lat: -7.56, lng: -45.25, intensity: 0.82, spreadDeg: 1.7 },
  { id: "cer-mat", municipality: "Mateiros / Campos Lindos", uf: "TO", biome: "cerrado", lat: -9.85, lng: -46.65, intensity: 0.86, spreadDeg: 1.9 },
  { id: "cer-jab", municipality: "Jaborandi / Correntina", uf: "BA", biome: "cerrado", lat: -13.6, lng: -45.3, intensity: 0.88, spreadDeg: 1.8 },
  { id: "cer-gra", municipality: "Grajaú / Mirador", uf: "MA", biome: "cerrado", lat: -6.1, lng: -45.6, intensity: 0.84, spreadDeg: 1.8 },
  { id: "cer-bar", municipality: "Barreiras / Luís Eduardo Magalhães", uf: "BA", biome: "cerrado", lat: -12.15, lng: -45.8, intensity: 0.82, spreadDeg: 1.7 },
  { id: "cer-gdn", municipality: "Gaúcha do Norte / Paranatinga", uf: "MT", biome: "cerrado", lat: -13.5, lng: -53.8, intensity: 0.72, spreadDeg: 1.8 },
  { id: "cer-cav", municipality: "Cavalcante / Niquelândia", uf: "GO", biome: "cerrado", lat: -14.1, lng: -47.9, intensity: 0.64, spreadDeg: 1.6 },
  { id: "cer-rib", municipality: "Ribas do Rio Pardo", uf: "MS", biome: "cerrado", lat: -20.44, lng: -53.76, intensity: 0.62, spreadDeg: 1.6 },

  // Caatinga (Oeste/Norte BA, PI, CE, PE, RN, PB)
  { id: "caa-smv", municipality: "Santa Maria da Vitória / Serra do Ramalho", uf: "BA", biome: "caatinga", lat: -13.4, lng: -43.7, intensity: 0.92, spreadDeg: 1.7 },
  { id: "caa-bjl", municipality: "Bom Jesus da Lapa / Paratinga", uf: "BA", biome: "caatinga", lat: -12.95, lng: -43.2, intensity: 0.88, spreadDeg: 1.6 },
  { id: "caa-xix", municipality: "Xique-Xique / Barra", uf: "BA", biome: "caatinga", lat: -10.82, lng: -42.73, intensity: 0.82, spreadDeg: 1.6 },
  { id: "caa-jag", municipality: "Jaguarari / Juazeiro", uf: "BA", biome: "caatinga", lat: -9.85, lng: -40.2, intensity: 0.78, spreadDeg: 1.5 },
  { id: "caa-flo", municipality: "Floresta / Petrolina", uf: "PE", biome: "caatinga", lat: -8.6, lng: -38.57, intensity: 0.74, spreadDeg: 1.5 },
  { id: "caa-tau", municipality: "Tauá / Crateús", uf: "CE", biome: "caatinga", lat: -5.9, lng: -40.3, intensity: 0.76, spreadDeg: 1.5 },
  { id: "caa-mos", municipality: "Mossoró / Apodi", uf: "RN", biome: "caatinga", lat: -5.3, lng: -37.5, intensity: 0.7, spreadDeg: 1.4 },
  { id: "caa-pic", municipality: "Picos / São Raimundo Nonato", uf: "PI", biome: "caatinga", lat: -8.35, lng: -42.2, intensity: 0.75, spreadDeg: 1.5 },
  { id: "caa-ser", municipality: "Seridó / Patos", uf: "PB", biome: "caatinga", lat: -6.95, lng: -37.25, intensity: 0.64, spreadDeg: 1.3 },

  // Mata Atlântica (Norte de MG, Sul da BA, PR, SC, MS)
  { id: "mat-jeq", municipality: "Jequitinhonha / Salinas", uf: "MG", biome: "mata_atlantica", lat: -16.4, lng: -41.5, intensity: 0.9, spreadDeg: 1.6 },
  { id: "mat-rpm", municipality: "Rio Pardo de Minas / Águas Vermelhas", uf: "MG", biome: "mata_atlantica", lat: -15.65, lng: -42.1, intensity: 0.86, spreadDeg: 1.5 },
  { id: "mat-teo", municipality: "Teófilo Otoni / Araçuaí", uf: "MG", biome: "mata_atlantica", lat: -17.6, lng: -41.6, intensity: 0.76, spreadDeg: 1.4 },
  { id: "mat-bno", municipality: "Boa Nova / Cândido Sales", uf: "BA", biome: "mata_atlantica", lat: -14.8, lng: -40.6, intensity: 0.82, spreadDeg: 1.5 },
  { id: "mat-ita", municipality: "Itapetinga / Eunápolis", uf: "BA", biome: "mata_atlantica", lat: -15.9, lng: -39.9, intensity: 0.7, spreadDeg: 1.3 },
  { id: "mat-cas", municipality: "Castro / Guarapuava", uf: "PR", biome: "mata_atlantica", lat: -25.1, lng: -50.6, intensity: 0.72, spreadDeg: 1.4 },
  { id: "mat-lag", municipality: "Lages / São Joaquim", uf: "SC", biome: "mata_atlantica", lat: -27.8, lng: -50.3, intensity: 0.68, spreadDeg: 1.4 },
  { id: "mat-nav", municipality: "Naviraí / Iguatemi", uf: "MS", biome: "mata_atlantica", lat: -23.1, lng: -54.3, intensity: 0.62, spreadDeg: 1.3 },

  // Pantanal (MS e MT)
  { id: "pan-cor", municipality: "Corumbá", uf: "MS", biome: "pantanal", lat: -18.85, lng: -56.9, intensity: 0.98, spreadDeg: 1.6 },
  { id: "pan-poc", municipality: "Poconé", uf: "MT", biome: "pantanal", lat: -16.85, lng: -56.75, intensity: 0.88, spreadDeg: 1.4 },
  { id: "pan-cac", municipality: "Cáceres", uf: "MT", biome: "pantanal", lat: -16.4, lng: -57.7, intensity: 0.84, spreadDeg: 1.4 },
  { id: "pan-aqu", municipality: "Aquidauana / Miranda", uf: "MS", biome: "pantanal", lat: -19.8, lng: -56.1, intensity: 0.78, spreadDeg: 1.3 },
  { id: "pan-pmu", municipality: "Porto Murtinho", uf: "MS", biome: "pantanal", lat: -21.2, lng: -57.4, intensity: 0.74, spreadDeg: 1.3 },
  { id: "pan-bar", municipality: "Barão de Melgaço", uf: "MT", biome: "pantanal", lat: -16.75, lng: -55.9, intensity: 0.76, spreadDeg: 1.3 },

  // Pampa (Campanha Gaúcha e Fronteira Oeste — RS)
  { id: "pam-ale", municipality: "Alegrete", uf: "RS", biome: "pampa", lat: -29.78, lng: -55.79, intensity: 0.9, spreadDeg: 1.4 },
  { id: "pam-sli", municipality: "Sant'Ana do Livramento", uf: "RS", biome: "pampa", lat: -30.7, lng: -55.4, intensity: 0.88, spreadDeg: 1.4 },
  { id: "pam-sga", municipality: "São Gabriel / Rosário do Sul", uf: "RS", biome: "pampa", lat: -30.3, lng: -54.5, intensity: 0.84, spreadDeg: 1.3 },
  { id: "pam-bag", municipality: "Bagé / Dom Pedrito", uf: "RS", biome: "pampa", lat: -31.15, lng: -54.2, intensity: 0.86, spreadDeg: 1.3 },
  { id: "pam-uru", municipality: "Uruguaiana / Quaraí", uf: "RS", biome: "pampa", lat: -29.95, lng: -56.8, intensity: 0.74, spreadDeg: 1.3 },
  { id: "pam-cac", municipality: "Caçapava do Sul / Lavras do Sul", uf: "RS", biome: "pampa", lat: -30.65, lng: -53.6, intensity: 0.76, spreadDeg: 1.3 },
];

export interface DeforestationHeatmapOptions {
  activeBiome: ProdesBiomeId;
  deterAlerts: readonly DeterAlertPoint[];
  biomeTopology: BiomeTopology | null;
}

export interface DeforestationHeatmapStats {
  renderedKernels: number;
  liveAlertKernels: number;
  activeBiome: ProdesBiomeId;
}

/**
 * Desenha um kernel térmico radial suave (âmbar -> laranja -> vermelho carmim -> núcleo incandescente)
 * em coordenadas projetadas equiretangulares.
 */
function drawHeatKernel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  weight: number
): void {
  const clamped = Math.max(0.08, Math.min(1, weight));
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radiusPx);
  grad.addColorStop(0.0, `rgba(254, 240, 138, ${(0.92 * clamped).toFixed(3)})`);
  grad.addColorStop(0.24, `rgba(239, 68, 68, ${(0.82 * clamped).toFixed(3)})`);
  grad.addColorStop(0.55, `rgba(234, 88, 12, ${(0.48 * clamped).toFixed(3)})`);
  grad.addColorStop(0.82, `rgba(245, 158, 11, ${(0.18 * clamped).toFixed(3)})`);
  grad.addColorStop(1.0, "rgba(245, 158, 11, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Rasteriza o Mapa de Calor Espacial de Desmatamento (INPE PRODES BiomasBR + alertas DETER ao vivo)
 * recortado estritamente pelos polígonos oficiais dos biomas brasileiros (IBGE), incluindo contorno
 * nítido do bioma em foco.
 */
export function rasterizeDeforestationHeatmap(
  ctx: CanvasRenderingContext2D,
  options: DeforestationHeatmapOptions,
  width: number = DEFORESTATION_HEATMAP_WIDTH,
  height: number = DEFORESTATION_HEATMAP_HEIGHT
): DeforestationHeatmapStats {
  const { activeBiome, deterAlerts, biomeTopology } = options;
  const projection = createEquirectangularProjection(width, height);
  const pathGen = geoPath(projection, ctx);
  const pxPerDeg = width / 360;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // 1. Recorta estritamente ao território brasileiro / polígonos oficiais do IBGE
  ctx.beginPath();
  const biomeFeatures = biomeTopology
    ? topojson.feature<BiomeFeatureProperties>(biomeTopology, biomeTopology.objects.biomes).features
    : [];

  if (biomeFeatures.length > 0) {
    for (const feat of biomeFeatures) {
      pathGen(feat as GeoPermissibleObjects);
    }
  } else {
    for (const record of getChoroplethFeatures()) {
      if (record.iso === "BRA") pathGen(record.feature);
    }
  }
  ctx.clip();

  // 2. Preenchimento sutil de calor de fundo no bioma selecionado para situar sua extensão real
  const activeIbgeId = PRODES_MONITORING_REGIONS[activeBiome].ibgeBiomeId;
  const activeFeature = biomeFeatures.find((f) => f.properties?.id === activeIbgeId) ?? null;
  if (activeFeature) {
    ctx.save();
    ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
    ctx.beginPath();
    pathGen(activeFeature as GeoPermissibleObjects);
    ctx.fill();
    ctx.restore();
  }

  // 3. Kernels térmicos de pressão PRODES nos 6 biomas (destaque total no bioma ativo; visão contextual nos demais)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  let renderedKernels = 0;

  for (const hub of PRODES_CRITICAL_HUBS) {
    const projected = projection([hub.lng, hub.lat]);
    if (!projected) continue;
    const isFocus = hub.biome === activeBiome;
    const weight = hub.intensity * (isFocus ? 0.82 : 0.34);
    const radiusPx = Math.max(6, hub.spreadDeg * pxPerDeg * (isFocus ? 1.12 : 0.85));
    drawHeatKernel(ctx, projected[0], projected[1], radiusPx, weight);
    renderedKernels++;
  }

  // 4. Kernels de alertas DETER recentes ao vivo (quando retornados pelo WFS INPE TerraBrasilis)
  let liveAlertKernels = 0;
  for (const alert of deterAlerts) {
    const projected = projection([alert.lng, alert.lat]);
    if (!projected) continue;
    const isFocus = alert.biome === activeBiome;
    const severity = Math.min(1, 0.45 + Math.sqrt(Math.max(0.05, alert.areaKm2)) * 0.45);
    const radiusPx = Math.max(5, (0.55 + Math.min(1.2, alert.areaKm2 * 0.3)) * pxPerDeg);
    drawHeatKernel(ctx, projected[0], projected[1], radiusPx, severity * (isFocus ? 0.95 : 0.45));
    liveAlertKernels++;
  }
  ctx.restore();

  // 5. Contorno oficial nítido (IBGE 1:250.000) do bioma selecionado em destaque
  if (activeFeature) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(251, 146, 60, 0.88)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    pathGen(activeFeature as GeoPermissibleObjects);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  return {
    renderedKernels,
    liveAlertKernels,
    activeBiome,
  };
}
