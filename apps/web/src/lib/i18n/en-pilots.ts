import type { CountryData } from "@/lib/country-types";
import type { Locale } from "./types";

/**
 * Tradução sob demanda (`en`) dos textos editoriais narrativos dos 6 países-piloto (`country-pilots.ts`)
 * exibidos em `ReaderContent` quando `locale === "en"` (D42).
 *
 * Complementa os pacotes de `editorial-loader.ts` (`pilots.json`) garantindo que até renderizações
 * síncronas diretas de `ReaderContent` / SSR / primeiro frame antes do pacote editorial resolver
 * apresentem 100% dos textos e fontes primárias em inglês, sem `<div>` dentro de `<p>` e com 0 bytes
 * no First Load JS de `/`.
 */

export interface EnPilotSectionTranslation {
  ptTitlePrefix: string;
  titleEn: string;
  contentEn: string;
  primarySourceEn: string;
}

export type EnPilotsMap = Readonly<
  Record<string, Readonly<Record<string, EnPilotSectionTranslation>>>
>;

export const EN_PILOT_DOSSIERS: EnPilotsMap = {
  BRA: {
    GEOGRAPHY: {
      ptTitlePrefix: "Dimensões Continentais",
      titleEn: "Continental Dimensions, Biomes, and Natural Resources",
      primarySourceEn: "IBGE (2024)",
      contentEn:
        "**Brazil** spans a contiguous land area of 8,515,767 km² [3], covering nearly half the continental landmass of South America [3]. Its territory encompasses six foundational terrestrial biomes: the **Amazon**, **Cerrado**, **Atlantic Forest**, **Caatinga**, **Pampa**, and **Pantanal** [1].\n\nBrazilian hydrography is anchored by the Amazon Basin — the largest river basin on Earth in both discharge volume and catchment area — alongside the Río de la Plata Basin formed by the Paraná, Paraguay, and Uruguay rivers [1]. Over 80% of national electricity generation comes from clean renewable sources, led by hydropower, wind, and solar [2].",
    },
    GOVERNMENT_POLITICS: {
      ptTitlePrefix: "Sistema Político",
      titleEn: "Political System, Separation of Powers, and the 1988 Constitution",
      primarySourceEn: "Constitution of the Federative Republic of Brazil (1988)",
      contentEn:
        "Brazil's system of government is a **Federal Presidential Republic** [1], grounded in popular sovereignty, citizenship, human dignity, and political pluralism under Article 1 of the 1988 Citizen Constitution [1].\n\nState authority is divided across three independent and harmonious branches [1]:\n- **Executive Branch**: headed by the President of the Republic, elected by two-round majority vote to four-year terms [1].\n- **Legislative Branch**: exercised by the bicameral National Congress comprising the Chamber of Deputies and the Federal Senate [1].\n- **Judicial Branch**: headed by the Supreme Federal Court (STF), constitutional guardian of the Republic [1].",
    },
    HISTORY: {
      ptTitlePrefix: "Trajetória Histórica",
      titleEn: "Historical Trajectory: From Colonial Era to Democratic Consolidation",
      primarySourceEn: "Fausto, Boris. A Concise History of Brazil. Cambridge University Press / EdUSP.",
      contentEn:
        "Brazilian territory encompasses millennia of settlement by Indigenous nations, followed by over three centuries of Portuguese colonial rule after Pedro Álvares Cabral's fleet made landfall in 1500 [1].\n\nIn 1808 the transfer of the Portuguese royal court to Rio de Janeiro made Brazil the seat of a pluricontinental empire [1]. On September 7, 1822 Dom Pedro I proclaimed Brazilian Independence, establishing the parliamentary Empire of Brazil until 1889 [1].\n\nOn November 15, 1889 Marshal Deodoro da Fonseca led the Proclamation of the Republic [1]. Across the twentieth century the nation experienced industrialization and institutional upheavals — including the Vargas Era (1930–1945), the construction of Brasília under Juscelino Kubitschek (1956–1961), military rule (1964–1985), and redemocratization crowned by the 1988 Constitution [1].",
    },
    ECONOMY_SOCIAL: {
      ptTitlePrefix: "Estrutura Econômica",
      titleEn: "Economic Structure, Agribusiness, Industry, and Services",
      primarySourceEn: "Central Bank of Brazil / World Bank (2024)",
      contentEn:
        "Brazil's economy is the largest in Latin America and ranks among the ten largest globally by nominal GDP [2]. Services generate over 65% of value added, while export agribusiness (soybeans, animal protein, coffee, sugarcane) anchors recurring trade surpluses [1][2].\n\nIts diversified industrial base stands out in commercial aviation (Embraer), ultra-deepwater offshore oil extraction (Pre-Salt fields via Petrobras), iron-ore mining (Vale), and automotive manufacturing [1][2].",
    },
  },

  DEU: {
    GOVERNMENT_POLITICS: {
      ptTitlePrefix: "Estrutura Institucional",
      titleEn: "Institutional Structure and the Basic Law (Grundgesetz)",
      primarySourceEn: "Basic Law for the Federal Republic of Germany (Grundgesetz)",
      contentEn:
        "**Germany** is a federal parliamentary representative democracy composed of 16 federated states (*Länder*) [1]. Constitutional order rests upon the 1949 Basic Law (*Grundgesetz*), which enshrines the inviolability of human dignity at the apex of legal order [1].\n\nExecutive policy leadership is vested in the Federal Chancellor (*Bundeskanzler*), elected by the *Bundestag* (federal parliament) [1], while the Federal President (*Bundespräsident*) serves as head of state [1].",
    },
    HISTORY: {
      ptTitlePrefix: "Da Unificação de 1871",
      titleEn: "From the 1871 Unification to the Fall of the Wall and European Integration",
      primarySourceEn: "Winkler, Heinrich August. Germany: The Long Road West. Oxford University Press.",
      contentEn:
        "The modern German nation-state was forged in 1871 under Otto von Bismarck [1]. Its twentieth century was shaped by World War I, the democratic Weimar Republic (1919–1933), the Nazi dictatorship, and the devastation of World War II [1].\n\nAfter 1945 Germany was divided into the Federal Republic of Germany (FRG, West) and the German Democratic Republic (GDR, East) [1]. On November 9, 1989 the peaceful fall of the Berlin Wall paved the way for formal reunification on October 3, 1990 [1][2].",
    },
  },

  USA: {
    GOVERNMENT_POLITICS: {
      ptTitlePrefix: "Federalismo, Tripartição",
      titleEn: "Federalism, Separation of Powers, and the 1787 Constitution",
      primarySourceEn: "U.S. National Archives / Constitution of the United States",
      contentEn:
        "Constitutional authority in the **United States** rests upon the 1787 Constitution, the world's oldest codified national constitution still in force [1].\n\nGovernance operates through an institutional system of *checks and balances* [1]:\n- The President heads the Executive Branch and serves as Commander-in-Chief of the Armed Forces [1].\n- The bicameral Congress holds federal legislative power and the power of the purse [1].\n- The Supreme Court of the United States exercises judicial review over federal and state laws [1].",
    },
    HISTORY: {
      ptTitlePrefix: "Da Revolução Americana",
      titleEn: "From the American Revolution to Global Leadership and the Space Age",
      primarySourceEn: "Library of Congress",
      contentEn:
        "Emerging from the Thirteen British Colonies that declared independence on July 4, 1776, the **United States** expanded westward across the North American continent throughout the nineteenth century [1].\n\nFollowing the Civil War (1861–1865), rapid industrialization propelled the country into a decisive power in both World Wars [1]. During the Cold War it led the Apollo lunar program culminating in the first human Moon landing in 1969 [1][2].",
    },
  },

  JPN: {
    GOVERNMENT_POLITICS: {
      ptTitlePrefix: "Monarquia Constitucional",
      titleEn: "Constitutional Monarchy and the 1947 Pacifist Constitution",
      primarySourceEn: "Constitution of Japan (Nihon-koku Kenpō)",
      contentEn:
        "**Japan** operates as a democratic parliamentary constitutional monarchy [1]. Under the 1947 Constitution, the Emperor serves as 'the symbol of the State and of the unity of the People,' exercising purely ceremonial duties without executive authority [1].\n\nExecutive power is vested in the Prime Minister and Cabinet, collectively responsible to the bicameral National Diet (*Kokkai*) [1]. Article 9 of the Constitution expressly renounces war as a sovereign right of the nation [1].",
    },
  },

  ZAF: {
    GOVERNMENT_POLITICS: {
      ptTitlePrefix: "A Nação Arco-Íris",
      titleEn: "The Rainbow Nation and the 1996 Democratic Constitution",
      primarySourceEn: "Constitution of the Republic of South Africa, 1996",
      contentEn:
        "**South Africa** is a constitutional parliamentary republic uniquely structured around three capitals: Pretoria (Executive seat), Cape Town (Legislative seat), and Bloemfontein (Supreme Court of Appeal) [1].\n\nIts 1996 Constitution is internationally recognized as one of the world's most progressive charters, featuring an expansive Bill of Rights safeguarding equality across race, gender, belief, and orientation [1][2].",
    },
  },

  EGY: {
    HISTORY: {
      ptTitlePrefix: "Do Egito Antigo",
      titleEn: "From Pharaonic Antiquity to the Opening of the Suez Canal",
      primarySourceEn: "Ministry of Tourism and Antiquities of Egypt",
      contentEn:
        "With more than five millennia of recorded history, **Egypt** flourished along the fertile banks of the Nile River [1]. Its pyramids at Giza and monumental temple complexes at Luxor and Karnak stand as enduring landmarks of ancient engineering and scholarship [1].\n\nIn the modern era, the opening of the Suez Canal in 1869 transformed global maritime trade by linking the Mediterranean directly with the Red Sea [1][2].",
    },
  },
};

let enPilotsCache: EnPilotsMap | null = EN_PILOT_DOSSIERS;

export function getEnPilotsSync(): EnPilotsMap | null {
  return enPilotsCache;
}

export function resetEnPilotsCacheForTest(): void {
  enPilotsCache = null;
}

export async function loadEnPilots(): Promise<EnPilotsMap> {
  enPilotsCache = EN_PILOT_DOSSIERS;
  return EN_PILOT_DOSSIERS;
}

/**
 * Traduz as seções nativas de `country-pilots.ts` para `en` quando ainda estão em `pt-BR`,
 * preservando integralmente seções já enriquecidas pelo `editorial-loader.ts` (`pilots.json`).
 */
export function localizePilotDossierSections(
  isoCode: string,
  sections: CountryData["dossierSections"],
  locale: Locale,
  pack: EnPilotsMap | null = enPilotsCache
): CountryData["dossierSections"] {
  if (locale !== "en" || !pack) return sections;
  const countryMap = pack[isoCode];
  if (!countryMap) return sections;

  let changed = false;
  const next = sections.map((sec) => {
    const tr = countryMap[sec.dimension];
    if (!tr || !sec.title.startsWith(tr.ptTitlePrefix)) return sec;
    changed = true;
    return {
      ...sec,
      title: tr.titleEn,
      contentMarkdown: tr.contentEn,
      citationsJson: {
        ...sec.citationsJson,
        primarySource: tr.primarySourceEn,
      },
    };
  });

  return changed ? next : sections;
}
