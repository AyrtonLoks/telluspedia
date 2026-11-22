/** Arcos das placas e texturas de paleomapa desenhadas em canvas (fallback procedural, T36). */
/**
 * Gerador de coordenadas esféricas dos arcos de fratura e placas tectônicas da Pangeia (250 Ma).
 */
export interface PaleoPlateArc {
  id: string;
  name: string;
  type: "suture" | "rift" | "subduction";
  coordinates: [number, number][]; // [lat, lng]
}

export const PANGAEA_PLATE_ARCS: PaleoPlateArc[] = [
  {
    id: "central-atlantic-rift",
    name: "Rifteamento do Proto-Atlântico Central",
    type: "rift",
    coordinates: [
      [42.0, -22.0],
      [35.0, -18.0],
      [28.0, -15.0],
      [18.0, -18.0],
      [8.0, -22.0],
      [-2.0, -25.0],
      [-10.0, -26.0],
    ],
  },
  {
    id: "south-atlantic-breakup-fault",
    name: "Fratura da Separação América do Sul — África",
    type: "rift",
    coordinates: [
      [-10.0, -26.0],
      [-18.0, -24.0],
      [-28.0, -22.0],
      [-38.0, -25.0],
      [-48.0, -32.0],
      [-56.0, -42.0],
    ],
  },
  {
    id: "central-pangean-mountain-ridge",
    name: "Cadeia Orogênica Central da Pangeia (Apalaches-Variscos)",
    type: "suture",
    coordinates: [
      [44.0, -42.0],
      [38.0, -32.0],
      [32.0, -20.0],
      [28.0, -8.0],
      [25.0, 5.0],
      [24.0, 18.0],
      [22.0, 32.0],
    ],
  },
  {
    id: "ural-collision-suture",
    name: "Sutura Continental Uraliana (Báltica — Sibéria)",
    type: "suture",
    coordinates: [
      [72.0, 62.0],
      [66.0, 59.0],
      [60.0, 58.0],
      [54.0, 59.0],
      [48.0, 61.0],
      [42.0, 64.0],
    ],
  },
  {
    id: "tethys-northern-subduction",
    name: "Zona de Subducção Setentrional de Tétis",
    type: "subduction",
    coordinates: [
      [35.0, 20.0],
      [32.0, 42.0],
      [28.0, 65.0],
      [24.0, 88.0],
      [20.0, 110.0],
      [18.0, 130.0],
    ],
  },
  {
    id: "panthalassa-western-ring",
    name: "Anel de Subducção Ativo Ocidental de Panthalassa",
    type: "subduction",
    coordinates: [
      [65.0, -130.0],
      [50.0, -120.0],
      [35.0, -112.0],
      [15.0, -102.0],
      [-5.0, -88.0],
      [-25.0, -78.0],
      [-45.0, -72.0],
      [-62.0, -68.0],
    ],
  },
  {
    id: "gondwana-antarctic-rim",
    name: "Margem Austral Indo-Antártica",
    type: "suture",
    coordinates: [
      [-56.0, -42.0],
      [-68.0, -10.0],
      [-74.0, 30.0],
      [-72.0, 75.0],
      [-65.0, 115.0],
      [-52.0, 142.0],
    ],
  },
];

/**
 * Utilitário procedural gerador de textura de canvas paleogeográfica para Pangeia.
 */
export function generatePaleoPangeaCanvas(
  width: number = 1024,
  height: number = 512
): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Deep Panthalassa Superocean gradient
  const oceanGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    width * 0.08,
    width * 0.5,
    height * 0.5,
    width * 0.65
  );
  oceanGrad.addColorStop(0, "#0e294d");
  oceanGrad.addColorStop(0.5, "#081b36");
  oceanGrad.addColorStop(1, "#040d1c");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  // 2. Continental Shelf / Shallow Bathymetric Gradient
  ctx.beginPath();
  ctx.ellipse(width * 0.49, height * 0.48, width * 0.28, height * 0.38, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(18, 85, 128, 0.35)";
  ctx.fill();

  // 3. Tethys Sea (Azure tropical gulf on east margin)
  ctx.beginPath();
  ctx.ellipse(width * 0.64, height * 0.51, width * 0.19, height * 0.15, -0.12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14, 60, 96, 0.85)";
  ctx.fill();

  // 4. Main Pangea Continental Landmass
  // Northern Laurasia & Central Core
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.32, width * 0.21, height * 0.17, 0.08, 0, Math.PI * 2);
  ctx.ellipse(width * 0.46, height * 0.66, width * 0.19, height * 0.24, -0.18, 0, Math.PI * 2);
  ctx.ellipse(width * 0.39, height * 0.49, width * 0.13, height * 0.18, 0.02, 0, Math.PI * 2);
  ctx.fillStyle = "#9a6538";
  ctx.fill();

  // 5. Permian Central Arid Desert (Terracotta / Red Beds)
  ctx.beginPath();
  ctx.ellipse(width * 0.46, height * 0.48, width * 0.11, height * 0.15, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = "#b8703d";
  ctx.fill();

  // 6. Central Pangean Mountain Belt (Variscan-Appalachian Orogeny)
  ctx.beginPath();
  ctx.moveTo(width * 0.35, height * 0.46);
  // Alguns canvases de teste não implementam curvas: cai para uma reta.
  if (typeof (ctx as Partial<CanvasRenderingContext2D>).quadraticCurveTo === "function") {
    ctx.quadraticCurveTo(width * 0.45, height * 0.41, width * 0.56, height * 0.38);
  } else {
    ctx.lineTo(width * 0.56, height * 0.38);
  }
  ctx.lineWidth = height * 0.035;
  ctx.strokeStyle = "#c8ab82";
  ctx.stroke();

  // 7. Polar Glossopteris / Conifer wetlands
  ctx.beginPath();
  ctx.ellipse(width * 0.41, height * 0.82, width * 0.13, height * 0.09, 0.02, 0, Math.PI * 2);
  ctx.ellipse(width * 0.57, height * 0.19, width * 0.12, height * 0.07, -0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(75, 98, 52, 0.65)";
  ctx.fill();

  ctx.restore();
  return canvas;
}

/**
 * Utilitário procedural gerador de textura de canvas paleogeográfica para Gondwana & Laurásia (~150 Ma).
 */
export function generatePaleoGondwanaCanvas(
  width: number = 1024,
  height: number = 512
): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Panthalassa / Oceano Paleopacífico
  const oceanGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    width * 0.15,
    width * 0.5,
    height * 0.5,
    width * 0.65
  );
  oceanGrad.addColorStop(0, "#0e294d");
  oceanGrad.addColorStop(0.6, "#081a36");
  oceanGrad.addColorStop(1, "#040d1c");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  // 2. Tethys Seaway tropical shallow equatorial waters (separação circum-equatorial)
  ctx.beginPath();
  ctx.ellipse(width * 0.54, height * 0.48, width * 0.32, height * 0.12, 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(18, 85, 128, 0.7)";
  ctx.fill();

  // 3. Laurásia Setentrional (América do Norte + Eurásia)
  ctx.beginPath();
  // América do Norte
  ctx.ellipse(width * 0.32, height * 0.28, width * 0.15, height * 0.14, 0.15, 0, Math.PI * 2);
  // Eurásia
  ctx.ellipse(width * 0.56, height * 0.24, width * 0.22, height * 0.15, -0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#3e683f";
  ctx.fill();

  // 4. Gondwana Meridional (América do Sul, África, Índia, Antártica, Austrália)
  ctx.beginPath();
  // Bloco Afro-Sul-Americano conjoined
  ctx.ellipse(width * 0.42, height * 0.62, width * 0.16, height * 0.19, -0.22, 0, Math.PI * 2);
  // Índia e Madagascar
  ctx.ellipse(width * 0.62, height * 0.64, width * 0.07, height * 0.08, 0.2, 0, Math.PI * 2);
  // Bloco Antártico-Australiano
  ctx.ellipse(width * 0.58, height * 0.84, width * 0.24, height * 0.11, 0.04, 0, Math.PI * 2);
  ctx.fillStyle = "#8a7350";
  ctx.fill();

  // 5. Vegetação jurássica e savanas temperadas
  ctx.beginPath();
  ctx.ellipse(width * 0.44, height * 0.58, width * 0.11, height * 0.12, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60, 98, 55, 0.75)";
  ctx.fill();

  // 6. Proto-Atlântico Central (Abertura entre Laurásia e Gondwana)
  ctx.beginPath();
  ctx.moveTo(width * 0.34, height * 0.38);
  ctx.lineTo(width * 0.48, height * 0.44);
  ctx.lineWidth = height * 0.035;
  ctx.strokeStyle = "rgba(14, 55, 95, 0.9)";
  ctx.stroke();

  ctx.restore();
  return canvas;
}

/**
 * Utilitário procedural unificado para geração de canvas paleogeográfico.
 */
export function generatePaleoCanvas(
  eraId: string = "pangaea-250ma",
  width: number = 1024,
  height: number = 512
): HTMLCanvasElement | null {
  const normalized = eraId.toLowerCase().replace(/_/g, "-");
  if (normalized.includes("gondwana") || normalized.includes("150ma")) {
    return generatePaleoGondwanaCanvas(width, height);
  }
  return generatePaleoPangeaCanvas(width, height);
}
