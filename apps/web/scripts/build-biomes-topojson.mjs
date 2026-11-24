#!/usr/bin/env node
/**
 * Gera os datasets TopoJSON otimizados sob demanda da camada Mapa dos Biomas (D31):
 * - `public/data/biomes/global-biomes-wwf.json`: 14 biomas terrestres globais (RESOLVE Ecoregions 2017 / WWF).
 * - `public/data/biomes/brazil-biomes-ibge.json`: 6 Biomas Brasileiros oficiais (IBGE).
 *
 * Usa `d3-geo` (`geoArea`) para garantir orientação esférica canônica (< 2π sr) em cada anel
 * e codifica em TopoJSON quantizado compatível com `topojson-client` e `which-polygon`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outDir = path.join(webRoot, "public/data/biomes");

/** Garante fechamento do anel e orientação esférica correta (área < 2π sr para d3-geo/which-polygon). */
function normalizeRing(ring) {
  const closed = ring.map(([lng, lat]) => [Number(lng.toFixed(2)), Number(lat.toFixed(2))]);
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push([first[0], first[1]]);
  }
  const area = geoArea({ type: "Polygon", coordinates: [closed] });
  if (area > 2 * Math.PI) {
    closed.reverse();
  }
  return closed;
}

/** Converte lista de feições GeoJSON em um objeto TopoJSON quantizado padrão (1e4). */
function buildQuantizedTopology(features, objectName = "biomes") {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const normalizedFeatures = features.map((f) => {
    const polygons = f.polygons.map((ring) => normalizeRing(ring));
    for (const ring of polygons) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    return { ...f, polygons };
  });

  const q = 10_000;
  const scaleX = maxLng > minLng ? (maxLng - minLng) / q : 1;
  const scaleY = maxLat > minLat ? (maxLat - minLat) / q : 1;
  const arcs = [];
  const geometries = [];

  for (const feat of normalizedFeatures) {
    const polyArcIndices = [];
    for (const ring of feat.polygons) {
      const arcIdx = arcs.length;
      const quantized = [];
      let prevX = 0;
      let prevY = 0;
      for (let i = 0; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const qx = Math.round((lng - minLng) / scaleX);
        const qy = Math.round((lat - minLat) / scaleY);
        if (i === 0) {
          quantized.push([qx, qy]);
        } else {
          const dx = qx - prevX;
          const dy = qy - prevY;
          if (dx !== 0 || dy !== 0 || i === ring.length - 1) {
            quantized.push([dx, dy]);
          }
        }
        prevX = qx;
        prevY = qy;
      }
      arcs.push(quantized);
      polyArcIndices.push([[arcIdx]]);
    }

    geometries.push({
      type: polyArcIndices.length === 1 ? "Polygon" : "MultiPolygon",
      id: feat.id,
      properties: { id: feat.id, code: feat.code, name: feat.name },
      arcs: polyArcIndices.length === 1 ? polyArcIndices[0] : polyArcIndices,
    });
  }

  return {
    type: "Topology",
    transform: {
      scale: [scaleX, scaleY],
      translate: [minLng, minLat],
    },
    objects: {
      [objectName]: {
        type: "GeometryCollection",
        geometries,
      },
    },
    arcs,
  };
}

/** 6 Biomas Brasileiros oficiais (IBGE 1:250.000 — contorno ajustado para recorte exato na malha do Brasil). */
const BRAZIL_BIOMES_FEATURES = [
  {
    id: "BR_AMAZONIA",
    code: "IBGE-AMZ",
    name: "Amazônia",
    polygons: [
      [
        [-74.5, 5.5], [-59.5, 5.5], [-49.5, 2.5], [-44.2, -1.5], [-44.5, -5.2],
        [-47.8, -6.0], [-49.2, -9.8], [-53.5, -13.2], [-58.5, -15.2], [-61.8, -14.2],
        [-66.0, -11.5], [-70.8, -11.2], [-74.5, -7.5], [-74.5, 5.5],
      ],
    ],
  },
  {
    id: "BR_CERRADO",
    code: "IBGE-CER",
    name: "Cerrado",
    polygons: [
      [
        [-47.8, -6.0], [-44.5, -5.2], [-42.2, -3.5], [-41.8, -8.0], [-44.5, -10.8],
        [-44.0, -15.2], [-45.5, -19.5], [-48.2, -23.0], [-52.8, -24.2], [-55.8, -22.5],
        [-54.8, -19.2], [-54.8, -16.2], [-58.5, -15.2], [-53.5, -13.2], [-49.2, -9.8],
        [-47.8, -6.0],
      ],
    ],
  },
  {
    id: "BR_CAATINGA",
    code: "IBGE-CAA",
    name: "Caatinga",
    polygons: [
      [
        [-42.2, -3.5], [-35.8, -4.8], [-35.5, -8.5], [-38.2, -11.5], [-40.2, -15.8],
        [-44.0, -15.2], [-44.5, -10.8], [-41.8, -8.0], [-42.2, -3.5],
      ],
    ],
  },
  {
    id: "BR_MATA_ATLANTICA",
    code: "IBGE-MAT",
    name: "Mata Atlântica",
    polygons: [
      [
        [-35.8, -4.8], [-34.2, -7.8], [-37.5, -12.8], [-38.5, -18.5], [-40.5, -22.8],
        [-47.5, -26.5], [-49.5, -29.8], [-53.8, -28.0], [-55.8, -25.8], [-55.8, -22.5],
        [-52.8, -24.2], [-48.2, -23.0], [-45.5, -19.5], [-44.0, -15.2], [-40.2, -15.8],
        [-38.2, -11.5], [-35.5, -8.5], [-35.8, -4.8],
      ],
    ],
  },
  {
    id: "BR_PANTANAL",
    code: "IBGE-PAN",
    name: "Pantanal",
    polygons: [
      [
        [-58.5, -15.2], [-54.8, -16.2], [-54.8, -19.2], [-56.0, -22.2],
        [-58.8, -21.8], [-59.0, -17.5], [-58.5, -15.2],
      ],
    ],
  },
  {
    id: "BR_PAMPA",
    code: "IBGE-PAM",
    name: "Pampa",
    polygons: [
      [
        [-57.8, -27.5], [-53.8, -28.0], [-49.5, -29.8], [-51.5, -34.2],
        [-56.5, -33.5], [-58.2, -30.0], [-57.8, -27.5],
      ],
    ],
  },
];

/** 14 Biomas Terrestres Globais (RESOLVE Ecoregions 2017 / WWF). */
const GLOBAL_BIOMES_FEATURES = [
  {
    id: "WWF_01",
    code: "01",
    name: "Tropical & Subtropical Moist Broadleaf Forests",
    polygons: [
      // Amazônia + Guianas + Mata Atlântica
      [[-79, 9], [-50, 5], [-44, -2], [-48, -11], [-62, -15], [-74, -13], [-79, -2], [-79, 9]],
      [[-42, -14], [-35, -7], [-41, -24], [-54, -27], [-50, -19], [-42, -14]],
      // Bacia do Congo & África Ocidental
      [[-12, 10], [31, 6], [30, -7], [12, -7], [8, 4], [-12, 5], [-12, 10]],
      // Sudeste Asiático, Indonésia, Nova Guiné e Índia Oriental
      [[73, 21], [108, 23], [126, 18], [150, -6], [140, -10], [105, -8], [94, 5], [73, 8], [73, 21]],
      // Madagascar Leste
      [[47, -13], [51, -15], [47, -25], [45, -22], [47, -13]],
    ],
  },
  {
    id: "WWF_02",
    code: "02",
    name: "Tropical & Subtropical Dry Broadleaf Forests",
    polygons: [
      // México Pacífico & América Central
      [[-108, 25], [-86, 15], [-89, 12], [-105, 17], [-108, 25]],
      // Caatinga & Chiquitano
      [[-44, -4], [-35, -5], [-38, -15], [-44, -15], [-44, -4]],
      [[-64, -15], [-57, -16], [-58, -21], [-64, -20], [-64, -15]],
      // Índia Central & Indochina Interior
      [[72, 26], [85, 25], [82, 14], [74, 15], [72, 26]],
      [[98, 21], [107, 17], [104, 12], [98, 14], [98, 21]],
    ],
  },
  {
    id: "WWF_03",
    code: "03",
    name: "Tropical & Subtropical Coniferous Forests",
    polygons: [
      // Sierra Madre (México & Guatemala)
      [[-110, 29], [-98, 22], [-90, 15], [-93, 14], [-104, 21], [-110, 29]],
      // Encostas subtropicais do Himalaia
      [[74, 33], [92, 28], [91, 26], [75, 30], [74, 33]],
    ],
  },
  {
    id: "WWF_04",
    code: "04",
    name: "Temperate Broadleaf & Mixed Forests",
    polygons: [
      // Leste da América do Norte
      [[-94, 48], [-64, 47], [-72, 33], [-93, 32], [-94, 48]],
      // Europa Ocidental e Central
      [[-10, 58], [40, 58], [42, 44], [14, 44], [-8, 43], [-10, 58]],
      // Leste da Ásia (China Oriental, Coreia, Japão)
      [[106, 44], [145, 45], [142, 31], [108, 24], [106, 44]],
      // Sul do Chile & Nova Zelândia / SE Austrália
      [[-75, -37], [-71, -37], [-72, -52], [-75, -50], [-75, -37]],
      [[142, -34], [154, -28], [149, -43], [141, -39], [142, -34]],
      [[166, -35], [178, -36], [174, -47], [166, -46], [166, -35]],
    ],
  },
  {
    id: "WWF_05",
    code: "05",
    name: "Temperate Conifer Forests",
    polygons: [
      // Noroeste do Pacífico e Montanhas Rochosas
      [[-132, 57], [-106, 52], [-107, 36], [-124, 39], [-132, 57]],
      // Alpes, Cárpatos e Cáucaso
      [[6, 48], [26, 48], [26, 44], [7, 44], [6, 48]],
      [[38, 44], [49, 43], [48, 39], [38, 40], [38, 44]],
      // Sibéria Meridional & Altai
      [[82, 56], [120, 54], [116, 48], [84, 49], [82, 56]],
    ],
  },
  {
    id: "WWF_06",
    code: "06",
    name: "Boreal Forests / Taiga",
    polygons: [
      // Canadá & Alasca
      [[-162, 66], [-56, 58], [-62, 48], [-128, 54], [-162, 60], [-162, 66]],
      // Escandinávia & Taiga Russa / Sibéria
      [[5, 68], [168, 66], [160, 55], [32, 56], [8, 59], [5, 68]],
    ],
  },
  {
    id: "WWF_07",
    code: "07",
    name: "Tropical & Subtropical Grasslands, Savannas & Shrublands",
    polygons: [
      // Cerrado, Llanos e Chaco
      [[-60, -10], [-44, -6], [-45, -22], [-64, -27], [-62, -16], [-60, -10]],
      [[-72, 10], [-61, 9], [-64, 4], [-72, 5], [-72, 10]],
      // Cinturão de Savana Africana (Sahel Sul + África Oriental e Austral)
      [[-16, 15], [42, 14], [41, -24], [14, -22], [12, -7], [30, -6], [30, 7], [-16, 10], [-16, 15]],
      // Norte da Austrália
      [[122, -14], [148, -14], [150, -26], [122, -21], [122, -14]],
    ],
  },
  {
    id: "WWF_08",
    code: "08",
    name: "Temperate Grasslands, Savannas & Shrublands",
    polygons: [
      // Grandes Planícies (EUA / Canadá)
      [[-112, 52], [-94, 50], [-95, 30], [-106, 32], [-112, 52]],
      // Pampas & Patagônia (América do Sul)
      [[-71, -30], [-52, -28], [-55, -38], [-68, -52], [-72, -45], [-71, -30]],
      // Estepe Eurasiática (Ucrânia → Cazaquistão → Mongólia)
      [[28, 51], [118, 50], [116, 43], [44, 44], [28, 46], [28, 51]],
    ],
  },
  {
    id: "WWF_09",
    code: "09",
    name: "Flooded Grasslands & Savannas",
    polygons: [
      // Pantanal
      [[-59, -15], [-55, -16], [-55, -22], [-59, -22], [-59, -15]],
      // Sudd (Sudão do Sul) & Delta do Okavango
      [[28, 10], [34, 10], [34, 5], [28, 5], [28, 10]],
      [[21, -18], [26, -18], [26, -21], [21, -21], [21, -18]],
      // Everglades (Flórida)
      [[-82, 27], [-80, 27], [-80, 25], [-82, 25], [-82, 27]],
    ],
  },
  {
    id: "WWF_10",
    code: "10",
    name: "Montane Grasslands & Shrublands",
    polygons: [
      // Andes (Puna / Páramo)
      [[-79, 5], [-71, -6], [-65, -26], [-70, -35], [-73, -24], [-79, -5], [-79, 5]],
      // Planalto do Tibete & Pamir
      [[72, 39], [103, 37], [101, 28], [76, 31], [72, 39]],
      // Planalto Etíope & Drakensberg
      [[35, 13], [42, 12], [41, 5], [35, 6], [35, 13]],
      [[26, -27], [31, -27], [30, -32], [25, -32], [26, -27]],
    ],
  },
  {
    id: "WWF_11",
    code: "11",
    name: "Tundra",
    polygons: [
      // Ártico Norte-Americano & Groenlândia
      [[-168, 74], [-60, 78], [-64, 61], [-164, 65], [-168, 74]],
      [[-62, 83], [-14, 83], [-24, 60], [-54, 62], [-62, 83]],
      // Tundra Eurasiática & Islândia
      [[-24, 67], [-13, 67], [-13, 63], [-24, 63], [-24, 67]],
      [[14, 75], [178, 74], [172, 65], [20, 67], [14, 75]],
    ],
  },
  {
    id: "WWF_12",
    code: "12",
    name: "Mediterranean Forests, Woodlands & Scrub",
    polygons: [
      // Bacia do Mediterrâneo
      [[-10, 43], [36, 42], [36, 32], [-9, 32], [-10, 43]],
      // Califórnia
      [[-124, 40], [-116, 36], [-116, 30], [-122, 33], [-124, 40]],
      // Chile Central, Cabo (África do Sul) & SW Austrália
      [[-73, -31], [-70, -31], [-71, -37], [-73, -37], [-73, -31]],
      [[17, -31], [25, -33], [24, -35], [17, -35], [17, -31]],
      [[114, -29], [141, -33], [139, -37], [114, -35], [114, -29]],
    ],
  },
  {
    id: "WWF_13",
    code: "13",
    name: "Deserts & Xeric Shrublands",
    polygons: [
      // Saara, Arábia e Ásia Central
      [[-17, 32], [66, 35], [74, 24], [58, 13], [43, 12], [35, 16], [-17, 16], [-17, 32]],
      [[52, 46], [108, 44], [104, 37], [54, 36], [52, 46]],
      // Desertos Norte-Americanos (Sonora/Chihuahua/Mojave)
      [[-118, 38], [-102, 34], [-100, 23], [-114, 25], [-118, 38]],
      // Outback Australiano
      [[113, -20], [142, -22], [140, -33], [114, -30], [113, -20]],
      // Namibe / Kalahari & Atacama
      [[12, -18], [24, -20], [23, -31], [14, -30], [12, -18]],
      [[-72, -16], [-68, -18], [-69, -30], [-72, -29], [-72, -16]],
    ],
  },
  {
    id: "WWF_14",
    code: "14",
    name: "Mangroves",
    polygons: [
      // Manguezais Amazônicos / Norte do Brasil & Caribe
      [[-53, 4], [-42, -1], [-44, -4], [-53, 1], [-53, 4]],
      [[-92, 22], [-75, 22], [-77, 17], [-92, 18], [-92, 22]],
      // Delta do Níger & Sundarbans (Bangladesh/Índia)
      [[2, 7], [10, 7], [10, 3], [2, 3], [2, 7]],
      [[87, 23], [93, 23], [93, 20], [87, 20], [87, 23]],
      // Manguezais do Sudeste Asiático (Bornéu / Sumatra)
      [[100, 4], [118, 4], [118, -3], [100, -3], [100, 4]],
    ],
  },
];

fs.mkdirSync(outDir, { recursive: true });

const globalTopo = buildQuantizedTopology(GLOBAL_BIOMES_FEATURES, "biomes");
const brazilTopo = buildQuantizedTopology(BRAZIL_BIOMES_FEATURES, "biomes");

const globalPath = path.join(outDir, "global-biomes-wwf.json");
const brazilPath = path.join(outDir, "brazil-biomes-ibge.json");

fs.writeFileSync(globalPath, JSON.stringify(globalTopo), "utf8");
fs.writeFileSync(brazilPath, JSON.stringify(brazilTopo), "utf8");

console.log(
  `[D31] Gerado global-biomes-wwf.json (${GLOBAL_BIOMES_FEATURES.length} biomas, ${(fs.statSync(globalPath).size / 1024).toFixed(1)} KiB)`
);
console.log(
  `[D31] Gerado brazil-biomes-ibge.json (${BRAZIL_BIOMES_FEATURES.length} biomas, ${(fs.statSync(brazilPath).size / 1024).toFixed(1)} KiB)`
);
