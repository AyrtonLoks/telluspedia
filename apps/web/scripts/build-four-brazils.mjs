/**
 * Gera `public/data/four-brazils.json` (GeoJSON compacto de alta precisão derivado do contorno
 * Natural Earth 1:50m do Brasil) contendo:
 * - `fourBrazils`: Os Quatro Brasis (Milton Santos & María Laura Silveira, 2001)
 * - `ibgeRegions`: As 5 Macrorregiões Clássicas do IBGE (para comparação direta na interface)
 *
 * Todos os polígonos derivam exatamente dos vértices do contorno externo Natural Earth 1:50m
 * do Brasil (ISO 076) combinados às divisas interestaduais, garantindo 0 vazamento oceânico,
 * 0 lacunas entre regiões e verificação automática das 27 capitais brasileiras.
 *
 * Uso: node apps/web/scripts/build-four-brazils.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const topojson = require("../node_modules/topojson-client");
const whichPolygon = require("../node_modules/which-polygon");
const { geoArea } = require("../node_modules/d3-geo");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");
const NE50_PATH = path.join(WEB_DIR, "public/data/countries-ne-50m.json");
const OUT_PATH = path.join(WEB_DIR, "public/data/four-brazils.json");

function distSq(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function nearestIndex(ring, target) {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const d = distSq(ring[i], target);
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Extrai o arco de `ring` (sem fechar no último vértice duplicado) de `fromIdx` até `toIdx` no sentido crescente. */
function sliceArc(ring, fromIdx, toIdx) {
  const n = ring.length - 1;
  const pts = [];
  let i = fromIdx % n;
  const end = toIdx % n;
  pts.push(ring[i]);
  while (i !== end) {
    i = (i + 1) % n;
    pts.push(ring[i]);
  }
  return pts;
}

function signedArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return area / 2;
}

function roundPt(pt) {
  return [Number(pt[0].toFixed(4)), Number(pt[1].toFixed(4))];
}

function closeRing(points) {
  const cleaned = [];
  for (const pt of points) {
    const r = roundPt(pt);
    const prev = cleaned[cleaned.length - 1];
    if (!prev || prev[0] !== r[0] || prev[1] !== r[1]) {
      cleaned.push(r);
    }
  }
  if (cleaned.length > 0) {
    const first = cleaned[0];
    const last = cleaned[cleaned.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      cleaned.push([first[0], first[1]]);
    }
  }
  // d3-geo usa convenção esférica horária (clockwise em lon/lat: signedArea < 0) para o interior
  // de polígonos pequenos; anéis anti-horários preenchem o complemento (o resto do planeta!).
  if (signedArea(cleaned) > 0) {
    cleaned.reverse();
  }
  return cleaned;
}

function concatPolylines(...lines) {
  const out = [];
  for (const line of lines) {
    for (const pt of line) {
      const prev = out[out.length - 1];
      if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) {
        out.push(pt);
      }
    }
  }
  return out;
}

function rev(line) {
  return [...line].reverse();
}

const ne50 = JSON.parse(fs.readFileSync(NE50_PATH, "utf8"));
const fc = topojson.feature(ne50, ne50.objects.countries);
const bra = fc.features.find((f) => String(f.id).padStart(3, "0") === "076");
if (!bra || bra.geometry.type !== "MultiPolygon") {
  throw new Error("Brasil (ISO 076) não encontrado em countries-ne-50m.json");
}

// Garante sentido anti-horário (CCW) no anel principal (Poly 0) para fatiamento determinístico:
// Em lon/lat CCW: seguindo índices crescentes vamos Sul -> Leste (costa Atlântica) -> Norte -> Oeste!
let mainRing = bra.geometry.coordinates[0][0].slice();
if (signedArea(mainRing) < 0) {
  mainRing.reverse();
}
// Distribui todas as ilhas costeiras/fluviais do NE 1:50m (Marajó, Santa Catarina, Ilhabela, Itaparica...)
const islandsByRegion = { AMAZONIA: [], NORDESTE: [], SUDESTE: [], SUL: [] };
for (let i = 1; i < bra.geometry.coordinates.length; i++) {
  const ring = closeRing(bra.geometry.coordinates[i][0]);
  const avgLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  const avgLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  if (avgLat < -25.24) islandsByRegion.SUL.push([ring]);
  else if (avgLat < -18.35) islandsByRegion.SUDESTE.push([ring]);
  else if (avgLng > -46.08) islandsByRegion.NORDESTE.push([ring]);
  else islandsByRegion.AMAZONIA.push([ring]);
}

// Âncoras reais no contorno externo Natural Earth 1:50m do Brasil:
const idxPA_MA = nearestIndex(mainRing, [-46.08, -1.16]); // Foz do Gurupi (PA/MA)
const idxBA_ES = nearestIndex(mainRing, [-39.69, -18.35]); // Mucuri (BA/ES)
const idxSP_PR = nearestIndex(mainRing, [-48.03, -25.24]); // Cananéia / Varadouro (SP/PR)
const idxPR_MS = nearestIndex(mainRing, [-54.25, -24.05]); // Guaíra / Rio Paraná (PR/MS/PY)
const idxMT_RO = nearestIndex(mainRing, [-60.35, -13.65]); // Rio Guaporé (MT/RO/BO)

const pPA_MA = mainRing[idxPA_MA];
const pBA_ES = mainRing[idxBA_ES];
const pSP_PR = mainRing[idxSP_PR];
const pPR_MS = mainRing[idxPR_MS];
const pMT_RO = mainRing[idxMT_RO];

// Verifica a ordem dos índices ao longo do anel CCW:
// No sentido CCW em lon/lat:
//   pMT_RO (-60.35, -13.65) -> desce para pPR_MS (-54.25, -24.05) -> contorna Sul até pSP_PR (-48.03, -25.24)
//   -> sobe costa Sudeste até pBA_ES (-39.69, -18.35) -> sobe costa Nordeste até pPA_MA (-46.08, -1.16)
//   -> contorna Norte/Amazônia até pMT_RO!
const arcAmazoniaCoastNorthWest = sliceArc(mainRing, idxPA_MA, idxMT_RO);
const arcCentroOesteWest = sliceArc(mainRing, idxMT_RO, idxPR_MS);
const arcSulOuter = sliceArc(mainRing, idxPR_MS, idxSP_PR);
const arcSudesteCoast = sliceArc(mainRing, idxSP_PR, idxBA_ES);
const arcNordesteCoast = sliceArc(mainRing, idxBA_ES, idxPA_MA);

// Polilinhas internas compartilhadas (vértices geográficos reais das divisas interestaduais do Brasil):
// 1. Divisa PA / MA (de pPA_MA até Bico do Papagaio PA-MA-TO)
const b_PA_MA = [
  pPA_MA,
  [-46.28, -2.05],
  [-46.85, -3.35],
  [-47.45, -4.45],
  [-48.68, -5.28], // T_PA_MA_TO (Bico do Papagaio)
];

// 2. Divisa PA / TO (Rio Araguaia, de Bico do Papagaio até PA-MT-TO)
const b_PA_TO = [
  [-48.68, -5.28],
  [-48.35, -6.55],
  [-49.15, -7.85],
  [-50.05, -9.25],
  [-50.58, -9.85], // T_PA_MT_TO
];

// 3. Divisa (AM+PA+RO) / MT (de T_PA_MT_TO até pMT_RO)
const b_AMPA_MT = [
  [-50.58, -9.85],
  [-53.2, -9.8],
  [-55.8, -9.35],
  [-58.25, -8.85],
  [-60.05, -9.75],
  [-60.2, -11.8],
  pMT_RO,
];

// 4. Divisa TO / (MA+PI+BA) (de Bico do Papagaio até tri-point TO-BA-GO)
const b_TO_NE = [
  [-48.68, -5.28],
  [-47.48, -6.65],
  [-46.65, -7.8],
  [-46.25, -9.45],
  [-45.95, -10.35],
  [-46.25, -11.85],
  [-46.42, -13.15], // T_TO_BA_GO
];

// 5. Divisa TO / (MT+GO) (de T_TO_BA_GO até T_PA_MT_TO, para separar TO no mapa IBGE)
const b_TO_CO = [
  [-46.42, -13.15],
  [-47.95, -13.2],
  [-49.65, -13.15],
  [-50.55, -12.6],
  [-50.62, -11.15],
  [-50.58, -9.85],
];

// 6. Divisa BA / GO (de T_TO_BA_GO até tri-point BA-GO-MG)
const b_BA_GO = [
  [-46.42, -13.15],
  [-46.15, -14.1],
  [-45.95, -14.9], // T_BA_GO_MG
];

// 7. Divisa BA / (MG+ES) (de T_BA_GO_MG até pBA_ES)
const b_BA_SE = [
  [-45.95, -14.9],
  [-44.3, -15.05],
  [-42.75, -15.15],
  [-41.2, -15.75],
  [-40.55, -16.65],
  [-40.25, -17.85],
  pBA_ES,
];

// 8. Divisa (GO+MS) / (MG+SP) (de T_BA_GO_MG até tri-point MS-SP-PR)
const b_CO_SE = [
  [-45.95, -14.9],
  [-46.85, -16.1],
  [-47.45, -17.3],
  [-47.85, -18.45],
  [-49.2, -18.65],
  [-50.95, -19.65], // T_GO_MS_MG (Paranaíba/Grande)
  [-51.75, -20.95],
  [-52.15, -21.85],
  [-53.08, -22.62], // T_MS_SP_PR (Rio Paraná/Paranapanema)
];

// 9. Divisa MS / PR (de T_MS_SP_PR até pPR_MS)
const b_MS_PR = [
  [-53.08, -22.62],
  [-53.65, -23.35],
  pPR_MS,
];

// 10. Divisa SP / PR (de pSP_PR até T_MS_SP_PR)
const b_SP_PR = [
  pSP_PR,
  [-48.85, -24.75],
  [-49.55, -23.85],
  [-50.4, -22.95],
  [-51.65, -22.65],
  [-53.08, -22.62],
];

// === 4 BRASIS (Milton Santos & María Laura Silveira, 2001) ===
const fbAmazonia = {
  type: "Feature",
  id: "AMAZONIA",
  properties: { id: "AMAZONIA", scope: "fourBrazils" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [closeRing(concatPolylines(arcAmazoniaCoastNorthWest, rev(b_AMPA_MT), rev(b_PA_TO), rev(b_PA_MA)))],
      ...islandsByRegion.AMAZONIA,
    ],
  },
};

const fbNordeste = {
  type: "Feature",
  id: "NORDESTE",
  properties: { id: "NORDESTE", scope: "fourBrazils" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [closeRing(concatPolylines(arcNordesteCoast, b_PA_MA, b_TO_NE, b_BA_GO, b_BA_SE))],
      ...islandsByRegion.NORDESTE,
    ],
  },
};

// Centro-Oeste em Santos & Silveira INCLUI Tocantins!
const fbCentroOeste = {
  type: "Feature",
  id: "CENTRO_OESTE",
  properties: { id: "CENTRO_OESTE", scope: "fourBrazils" },
  geometry: {
    type: "Polygon",
    coordinates: [
      closeRing(
        concatPolylines(
          arcCentroOesteWest,
          rev(b_MS_PR),
          rev(b_CO_SE),
          rev(b_BA_GO),
          rev(b_TO_NE),
          b_PA_TO,
          b_AMPA_MT
        )
      ),
    ],
  },
};

// Região Concentrada em Santos & Silveira FUNDE Sudeste + Sul!
const fbConcentrada = {
  type: "Feature",
  id: "CONCENTRADA",
  properties: { id: "CONCENTRADA", scope: "fourBrazils" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [closeRing(concatPolylines(arcSulOuter, arcSudesteCoast, rev(b_BA_SE), b_CO_SE, b_MS_PR))],
      ...islandsByRegion.SUDESTE,
      ...islandsByRegion.SUL,
    ],
  },
};

// === 5 MACRORREGIÕES CLÁSSICAS DO IBGE ===
const ibgeNorte = {
  type: "Feature",
  id: "NORTE",
  properties: { id: "NORTE", scope: "ibgeRegions" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        closeRing(
          concatPolylines(
            arcAmazoniaCoastNorthWest,
            rev(b_AMPA_MT),
            rev(b_TO_CO),
            rev(b_TO_NE),
            rev(b_PA_MA)
          )
        ),
      ],
      ...islandsByRegion.AMAZONIA,
    ],
  },
};

const ibgeNordeste = {
  type: "Feature",
  id: "NORDESTE",
  properties: { id: "NORDESTE", scope: "ibgeRegions" },
  geometry: fbNordeste.geometry,
};

const ibgeCentroOeste = {
  type: "Feature",
  id: "CENTRO_OESTE",
  properties: { id: "CENTRO_OESTE", scope: "ibgeRegions" },
  geometry: {
    type: "Polygon",
    coordinates: [
      closeRing(
        concatPolylines(
          arcCentroOesteWest,
          rev(b_MS_PR),
          rev(b_CO_SE),
          rev(b_BA_GO),
          b_TO_CO,
          b_AMPA_MT
        )
      ),
    ],
  },
};

const ibgeSudeste = {
  type: "Feature",
  id: "SUDESTE",
  properties: { id: "SUDESTE", scope: "ibgeRegions" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [closeRing(concatPolylines(arcSudesteCoast, rev(b_BA_SE), b_CO_SE, rev(b_SP_PR)))],
      ...islandsByRegion.SUDESTE,
    ],
  },
};

const ibgeSul = {
  type: "Feature",
  id: "SUL",
  properties: { id: "SUL", scope: "ibgeRegions" },
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [closeRing(concatPolylines(arcSulOuter, b_SP_PR, b_MS_PR))],
      ...islandsByRegion.SUL,
    ],
  },
};

const dataset = {
  version: "2026-11-25",
  source: "Natural Earth 1:50m (ISO 076) + Regionalização Santos & Silveira (2001) / IBGE",
  fourBrazils: {
    type: "FeatureCollection",
    features: [fbConcentrada, fbCentroOeste, fbNordeste, fbAmazonia],
  },
  ibgeRegions: {
    type: "FeatureCollection",
    features: [ibgeNorte, ibgeNordeste, ibgeCentroOeste, ibgeSudeste, ibgeSul],
  },
};

// Validação esférica d3-geo: garante que nenhum polígono está invertido (preenchendo o planeta inteiro!)
for (const group of [dataset.fourBrazils.features, dataset.ibgeRegions.features]) {
  for (const feat of group) {
    const areaSr = geoArea(feat);
    if (!(areaSr > 0.005 && areaSr < 0.2)) {
      throw new Error(
        `Área esférica inválida em ${feat.properties.scope}/${feat.id}: ${areaSr.toFixed(4)} sr (winding order invertida?)`
      );
    }
  }
}

// Validação rigorosa de todas as 27 capitais brasileiras contra which-polygon!
const queryFour = whichPolygon(dataset.fourBrazils);
const queryIbge = whichPolygon(dataset.ibgeRegions);

const CAPITALS = [
  ["São Paulo (SP)", -23.55, -46.63, "CONCENTRADA", "SUDESTE"],
  ["Rio de Janeiro (RJ)", -22.85, -43.45, "CONCENTRADA", "SUDESTE"],
  ["Belo Horizonte (MG)", -19.92, -43.94, "CONCENTRADA", "SUDESTE"],
  ["Vitória (ES)", -20.32, -40.34, "CONCENTRADA", "SUDESTE"],
  ["Curitiba (PR)", -25.43, -49.27, "CONCENTRADA", "SUL"],
  ["Florianópolis (SC)", -27.62, -48.72, "CONCENTRADA", "SUL"],
  ["Porto Alegre (RS)", -30.03, -51.23, "CONCENTRADA", "SUL"],
  ["Brasília (DF)", -15.79, -47.88, "CENTRO_OESTE", "CENTRO_OESTE"],
  ["Goiânia (GO)", -16.68, -49.25, "CENTRO_OESTE", "CENTRO_OESTE"],
  ["Cuiabá (MT)", -15.6, -56.1, "CENTRO_OESTE", "CENTRO_OESTE"],
  ["Campo Grande (MS)", -20.44, -54.65, "CENTRO_OESTE", "CENTRO_OESTE"],
  ["Palmas (TO)", -10.18, -48.33, "CENTRO_OESTE", "NORTE"],
  ["Salvador (BA)", -12.88, -38.4, "NORDESTE", "NORDESTE"],
  ["Recife (PE)", -8.05, -34.9, "NORDESTE", "NORDESTE"],
  ["Fortaleza (CE)", -3.73, -38.54, "NORDESTE", "NORDESTE"],
  ["São Luís (MA)", -2.53, -44.3, "NORDESTE", "NORDESTE"],
  ["Teresina (PI)", -5.09, -42.8, "NORDESTE", "NORDESTE"],
  ["Natal (RN)", -5.8, -35.21, "NORDESTE", "NORDESTE"],
  ["João Pessoa (PB)", -7.12, -34.86, "NORDESTE", "NORDESTE"],
  ["Maceió (AL)", -9.67, -35.74, "NORDESTE", "NORDESTE"],
  ["Aracaju (SE)", -10.91, -37.07, "NORDESTE", "NORDESTE"],
  ["Manaus (AM)", -3.12, -60.02, "AMAZONIA", "NORTE"],
  ["Belém (PA)", -1.55, -48.3, "AMAZONIA", "NORTE"],
  ["Rio Branco (AC)", -9.97, -67.81, "AMAZONIA", "NORTE"],
  ["Porto Velho (RO)", -8.76, -63.9, "AMAZONIA", "NORTE"],
  ["Boa Vista (RR)", 2.82, -60.67, "AMAZONIA", "NORTE"],
  ["Macapá (AP)", 0.03, -51.07, "AMAZONIA", "NORTE"],
];

let errors = 0;
for (const [name, lat, lng, expectedFour, expectedIbge] of CAPITALS) {
  const gotFour = queryFour([lng, lat])?.id ?? null;
  const gotIbge = queryIbge([lng, lat])?.id ?? null;
  if (gotFour !== expectedFour || gotIbge !== expectedIbge) {
    console.error(`MISMATCH ${name}: 4Brasis=${gotFour} (exp ${expectedFour}), IBGE=${gotIbge} (exp ${expectedIbge})`);
    errors++;
  }
}

if (errors > 0) {
  throw new Error(`${errors} capitais falharam na validação geométrica!`);
}

fs.writeFileSync(OUT_PATH, JSON.stringify(dataset));
const kb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`OK! ${CAPITALS.length}/27 capitais validadas (incluindo Palmas TO: CENTRO_OESTE nos 4 Brasis / NORTE no IBGE).`);
console.log(`Gerado ${path.relative(process.cwd(), OUT_PATH)} (${kb} KiB).`);
