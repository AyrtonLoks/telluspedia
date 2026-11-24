/**
 * Metadados neutros e enciclopédicos de territórios disputados e regiões autônomas (RN07 / T49).
 *
 * Fonte primária: Organização das Nações Unidas (Lista de Territórios Não Autônomos e resoluções
 * aplicáveis) e Natural Earth Cultural Vectors (`1:110m` / `1:50m`).
 */

import type { Locale } from "./i18n/types";

export type TerritorialStatusKind = "disputed" | "autonomous";

export interface TerritorialStatusInfo {
  /** Código ISO 3166-1 alpha-3 (ou código convencional Natural Earth como XKX/CYN). */
  isoCode: string;
  /** Nomes usados nos arquivos TopoJSON Natural Earth (`1:110m` e `1:50m`). */
  naturalEarthNames: readonly string[];
  kind: TerritorialStatusKind;
  /** Etiqueta curta bilíngue exibida em badge D14 no InspectorHUD. */
  labelPt: string;
  labelEn: string;
  /** Nota editorial neutra (1 frase) explicando o status internacional/administrativo. */
  notePt: string;
  noteEn: string;
  /** Fonte primária rastreável (RN02). */
  sourceLabel: string;
  sourceUrl: string;
}

const UN_NSGT_URL = "https://www.un.org/dppa/decolonization/en/nsgt";
const NATURAL_EARTH_50M_URL = "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/";
const ANTARCTIC_TREATY_URL = "https://www.ats.aq/";

export const TERRITORIAL_STATUS_CATALOG: Readonly<Record<string, TerritorialStatusInfo>> = {
  ESH: {
    isoCode: "ESH",
    naturalEarthNames: ["W. Sahara", "Western Sahara"],
    kind: "disputed",
    labelPt: "Território disputado",
    labelEn: "Disputed territory",
    notePt: "Território não autônomo listado pela ONU, com soberania disputada entre Marrocos e a República Árabe Saaraui Democrática.",
    noteEn: "Non-Self-Governing Territory listed by the UN, with sovereignty disputed between Morocco and the Sahrawi Arab Democratic Republic.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: UN_NSGT_URL,
  },
  FLK: {
    isoCode: "FLK",
    naturalEarthNames: ["Falkland Is.", "Falkland Islands"],
    kind: "disputed",
    labelPt: "Território disputado",
    labelEn: "Disputed territory",
    notePt: "Território não autônomo administrado pelo Reino Unido, com disputa de soberania reivindicada pela Argentina (ONU).",
    noteEn: "Non-Self-Governing Territory administered by the United Kingdom, with sovereignty claimed by Argentina (UN).",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: UN_NSGT_URL,
  },
  PSE: {
    isoCode: "PSE",
    naturalEarthNames: ["Palestine"],
    kind: "disputed",
    labelPt: "Território disputado",
    labelEn: "Disputed territory",
    notePt: "Estado observador não membro da ONU, com fronteiras e estatuto político sob negociação e disputa internacional.",
    noteEn: "UN non-member observer state, with borders and political status subject to international dispute and negotiation.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: "https://www.un.org/en/about-us/non-member-states",
  },
  TWN: {
    isoCode: "TWN",
    naturalEarthNames: ["Taiwan"],
    kind: "disputed",
    labelPt: "Status disputado",
    labelEn: "Disputed status",
    notePt: "Território autogovernado com estatuto internacional disputado; a República Popular da China reivindica soberania sobre a ilha.",
    noteEn: "Self-governing territory with disputed international status; sovereignty over the island is claimed by the People's Republic of China.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  XKX: {
    isoCode: "XKX",
    naturalEarthNames: ["Kosovo"],
    kind: "disputed",
    labelPt: "Reconhecimento parcial",
    labelEn: "Partially recognized",
    notePt: "Território com reconhecimento diplomático parcial após declaração de independência em 2008; sob quadro da Resolução 1244 da ONU.",
    noteEn: "Territory with partial diplomatic recognition following its 2008 declaration of independence; referenced under UN Security Council Resolution 1244.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  CYN: {
    isoCode: "CYN",
    naturalEarthNames: ["N. Cyprus", "Northern Cyprus"],
    kind: "disputed",
    labelPt: "Administração de facto",
    labelEn: "De facto administration",
    notePt: "Administração de facto no norte da ilha de Chipre; internacionalmente reconhecida pela ONU como parte da República de Chipre.",
    noteEn: "De facto administration in northern Cyprus; internationally recognized by the UN as part of the Republic of Cyprus.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  GRL: {
    isoCode: "GRL",
    naturalEarthNames: ["Greenland"],
    kind: "autonomous",
    labelPt: "Território autônomo",
    labelEn: "Autonomous territory",
    notePt: "Território autônomo integrante do Reino da Dinamarca, com autogoverno amplo em assuntos internos desde 2009.",
    noteEn: "Autonomous territory within the Kingdom of Denmark, exercising broad self-government over domestic affairs since 2009.",
    sourceLabel: "Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  PRI: {
    isoCode: "PRI",
    naturalEarthNames: ["Puerto Rico"],
    kind: "autonomous",
    labelPt: "Território autônomo",
    labelEn: "Autonomous territory",
    notePt: "Território não incorporado e Estado Livre Associado sob soberania dos Estados Unidos.",
    noteEn: "Unincorporated territory and Commonwealth under the sovereignty of the United States.",
    sourceLabel: "Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  NCL: {
    isoCode: "NCL",
    naturalEarthNames: ["New Caledonia"],
    kind: "autonomous",
    labelPt: "Coletividade especial",
    labelEn: "Special collectivity",
    notePt: "Coletividade sui generis da França no Pacífico Sul, acompanhada pela Lista de Territórios Não Autônomos da ONU.",
    noteEn: "Sui generis collectivity of France in the South Pacific, included on the UN list of Non-Self-Governing Territories.",
    sourceLabel: "ONU / Natural Earth",
    sourceUrl: UN_NSGT_URL,
  },
  ATF: {
    isoCode: "ATF",
    naturalEarthNames: ["Fr. S. Antarctic Lands"],
    kind: "autonomous",
    labelPt: "Território ultramarino",
    labelEn: "Overseas territory",
    notePt: "Território ultramarino da França sem população permanente, dedicado a reservas naturais e pesquisa científica.",
    noteEn: "French overseas territory with no permanent population, dedicated to nature reserves and scientific research.",
    sourceLabel: "Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  ATA: {
    isoCode: "ATA",
    naturalEarthNames: ["Antarctica"],
    kind: "autonomous",
    labelPt: "Regime internacional",
    labelEn: "International treaty zone",
    notePt: "Continente regido pelo Sistema do Tratado da Antártida (1959), dedicado exclusivamente à paz e à pesquisa científica.",
    noteEn: "Continent governed under the Antarctic Treaty System (1959), reserved exclusively for peace and scientific research.",
    sourceLabel: "Tratado da Antártida / Natural Earth",
    sourceUrl: ANTARCTIC_TREATY_URL,
  },
  HKG: {
    isoCode: "HKG",
    naturalEarthNames: ["Hong Kong"],
    kind: "autonomous",
    labelPt: "Região administrativa especial",
    labelEn: "Special administrative region",
    notePt: "Região Administrativa Especial da República Popular da China, com ordenamento econômico e jurídico próprio.",
    noteEn: "Special Administrative Region of the People's Republic of China, maintaining distinct legal and economic systems.",
    sourceLabel: "Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
  MAC: {
    isoCode: "MAC",
    naturalEarthNames: ["Macao"],
    kind: "autonomous",
    labelPt: "Região administrativa especial",
    labelEn: "Special administrative region",
    notePt: "Região Administrativa Especial da República Popular da China, com autonomia administrativa e aduaneira.",
    noteEn: "Special Administrative Region of the People's Republic of China, with administrative and customs autonomy.",
    sourceLabel: "Natural Earth",
    sourceUrl: NATURAL_EARTH_50M_URL,
  },
};

/**
 * Nomes de geometrias presentes no TopoJSON (sem código ISO soberano próprio) que devem
 * receber destaque tracejado de fronteira disputada no globo 3D (RN07).
 */
export const EXTRA_DISPUTED_GEOMETRY_NAMES: ReadonlySet<string> = new Set([
  "Somaliland",
  "Siachen Glacier",
]);

const NAME_TO_STATUS = new Map<string, TerritorialStatusKind>();
for (const entry of Object.values(TERRITORIAL_STATUS_CATALOG)) {
  for (const name of entry.naturalEarthNames) {
    NAME_TO_STATUS.set(name, entry.kind);
  }
}
for (const name of EXTRA_DISPUTED_GEOMETRY_NAMES) {
  NAME_TO_STATUS.set(name, "disputed");
}

export function getTerritorialStatus(isoCode: string | null | undefined): TerritorialStatusInfo | null {
  if (!isoCode) return null;
  return TERRITORIAL_STATUS_CATALOG[isoCode.trim().toUpperCase()] ?? null;
}

export function getTerritorialStatusKindForGeometry(
  isoCode: string | null | undefined,
  geometryName?: string | null
): TerritorialStatusKind | null {
  if (geometryName && NAME_TO_STATUS.has(geometryName)) {
    return NAME_TO_STATUS.get(geometryName) ?? null;
  }
  if (isoCode) {
    const info = TERRITORIAL_STATUS_CATALOG[isoCode.trim().toUpperCase()];
    if (info) return info.kind;
  }
  return null;
}

export function formatTerritorialStatus(
  info: TerritorialStatusInfo,
  locale: Locale
): { label: string; note: string; sourceLabel: string; sourceUrl: string; kind: TerritorialStatusKind } {
  return {
    label: locale === "en" ? info.labelEn : info.labelPt,
    note: locale === "en" ? info.noteEn : info.notePt,
    sourceLabel: info.sourceLabel,
    sourceUrl: info.sourceUrl,
    kind: info.kind,
  };
}
