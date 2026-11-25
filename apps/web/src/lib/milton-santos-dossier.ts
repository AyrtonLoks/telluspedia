/**
 * Dados editoriais e bibliográficos auditados do Dossiê Milton Santos (D36 / figure:milton-santos).
 * Bilíngue (`pt-BR` e `en`), com referências acadêmicas padronizadas em ABNT NBR 6023, APA 7,
 * MLA 9 e BibTeX (.bib) — em conformidade com RN02 e sem impacto no bundle inicial de `/`.
 */

import type { CriticalGeoLensId } from "@/lib/critical-geo-ids";

export interface MiltonTimelineEvent {
  year: string;
  placePt: string;
  placeEn: string;
  titlePt: string;
  titleEn: string;
  detailPt: string;
  detailEn: string;
}

export interface MiltonWorkEntry {
  id: string;
  year: number;
  title: string;
  coauthors?: string;
  publisher: string;
  city: string;
  summaryPt: string;
  summaryEn: string;
  abnt: string;
  apa: string;
  mla: string;
  bibtex: string;
}

export interface MiltonLensShortcut {
  lensId: CriticalGeoLensId;
  href: string;
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
}

export const MILTON_SANTOS_TIMELINE: readonly MiltonTimelineEvent[] = [
  {
    year: "1926",
    placePt: "Brotas de Macaúbas (BA), Brasil",
    placeEn: "Brotas de Macaúbas, Bahia, Brazil",
    titlePt: "Nascimento",
    titleEn: "Birth",
    detailPt:
      "Nasce em 3 de maio de 1926 no interior da Bahia, filho de professores primários que o alfabetizaram em casa e incentivaram sua formação humanística.",
    detailEn:
      "Born on May 3, 1926 in interior Bahia to primary-school teachers who fostered his early humanistic education.",
  },
  {
    year: "1948–1958",
    placePt: "Salvador (UFBA) → Estrasburgo, França",
    placeEn: "Salvador (UFBA) → Strasbourg, France",
    titlePt: "Direito, Magistério e Doutorado em Geografia",
    titleEn: "Law Degree, Teaching, and Doctorate in Geography",
    detailPt:
      "Forma-se em Direito pela Universidade Federal da Bahia (1948), leciona em Ilhéus e Salvador e obtém o doutorado em Geografia na Universidade de Estrasburgo (1958), sob orientação de Jean Tricart, com tese sobre o centro de Salvador.",
    detailEn:
      "Earns a law degree from UFBA (1948), teaches in Ilhéus and Salvador, and completes his doctorate in Geography at the University of Strasbourg (1958) under Jean Tricart with a thesis on downtown Salvador.",
  },
  {
    year: "1964–1977",
    placePt: "França, Canadá, EUA, Peru, Venezuela e Tanzânia",
    placeEn: "France, Canada, USA, Peru, Venezuela, and Tanzania",
    titlePt: "Exílio e Cátedras Internacionais",
    titleEn: "Exile and International Chairs",
    detailPt:
      "Preso após o golpe militar de 1964 e forçado ao exílio, leciona e pesquisa em Toulouse, Bordeaux, Paris-Sorbonne, MIT, Columbia, Toronto, Lima, Caracas e Dar es Salaam, consolidando uma teoria crítica da urbanização do Sul Global.",
    detailEn:
      "Arrested following the 1964 military coup and forced into exile, he teaches and conducts research in Toulouse, Bordeaux, Paris-Sorbonne, MIT, Columbia, Toronto, Lima, Caracas, and Dar es Salaam, forging a critical theory of Global South urbanization.",
  },
  {
    year: "1978–1997",
    placePt: "São Paulo (FFLCH-USP), Brasil",
    placeEn: "São Paulo (FFLCH-USP), Brazil",
    titlePt: "Retorno ao Brasil e Cátedra na USP",
    titleEn: "Return to Brazil and USP Professorship",
    detailPt:
      "Retorna ao Brasil em 1977–1978, torna-se professor titular de Geografia Humana na FFLCH-USP (1983), preside a AGB e recebe o título de Professor Emérito da USP em 1997.",
    detailEn:
      "Returns to Brazil in 1977–1978, becomes Full Professor of Human Geography at the University of São Paulo (1983), and is named Professor Emeritus of USP in 1997.",
  },
  {
    year: "1994",
    placePt: "Saint-Dié-des-Vosges, França",
    placeEn: "Saint-Dié-des-Vosges, France",
    titlePt: "Prêmio Internacional de Geografia Vautrin Lud",
    titleEn: "Vautrin Lud International Geography Prize",
    detailPt:
      "Consagrado com o Prêmio Vautrin Lud — amplamente reconhecido como o 'Nobel da Geografia' —, tornando-se o primeiro e único geógrafo latino-americano laureado na história da premiação.",
    detailEn:
      "Awarded the Vautrin Lud Prize—widely known as the 'Nobel Prize of Geography'—becoming the first and only Latin American geographer to receive the distinction.",
  },
  {
    year: "2001",
    placePt: "São Paulo, Brasil",
    placeEn: "São Paulo, Brazil",
    titlePt: "Legado e Publicação de Os Quatro Brasis",
    titleEn: "Legacy and Publication of The Four Brazils",
    detailPt:
      "Falece em 24 de junho de 2001 em São Paulo, deixando mais de 40 livros publicados em diversos idiomas, incluindo O Brasil: Território e Sociedade no Início do Século XXI (com María Laura Silveira).",
    detailEn:
      "Passes away on June 24, 2001 in São Paulo, leaving over 40 books translated into multiple languages, including O Brasil: Território e Sociedade no Início do Século XXI (with María Laura Silveira).",
  },
  {
    year: "2026",
    placePt: "Brasil e Comunidade Geográfica Internacional",
    placeEn: "Brazil and International Geographic Community",
    titlePt: "Centenário de Milton Santos (1926–2026)",
    titleEn: "Milton Santos Centenary (1926–2026)",
    detailPt:
      "Cem anos de nascimento de um dos maiores intérpretes do território, da técnica e da globalização. Suas categorias — território usado, meio técnico-científico-informacional, verticalidades e horizontalidades — permanecem decisivas para ler o planeta contemporâneo.",
    detailEn:
      "One hundred years since the birth of a towering theorist of territory, technology, and globalization whose categories—used territory, technical-scientific-informational milieu, verticalities, and horizontalities—remain vital to reading the modern world.",
  },
];

export const MILTON_SANTOS_WORKS: readonly MiltonWorkEntry[] = [
  {
    id: "santos-1979-espaco-dividido",
    year: 1979,
    title: "O Espaço Dividido: os dois circuitos da economia urbana dos países subdesenvolvidos",
    publisher: "Francisco Alves / Edusp",
    city: "Rio de Janeiro / São Paulo",
    summaryPt:
      "Formula a teoria dos dois circuitos da economia urbana: o circuito superior (capital intensivo, bancos, grandes redes e fluxos globais) e o circuito inferior (trabalho intensivo, proximidade local e criatividade cotidiana).",
    summaryEn:
      "Formulates the two-circuit theory of urban economies: the upper circuit (capital-intensive, finance, global networks) and the lower circuit (labor-intensive, local proximity, everyday adaptation).",
    abnt: "SANTOS, Milton. O Espaço Dividido: os dois circuitos da economia urbana dos países subdesenvolvidos. 2. ed. São Paulo: Edusp, 2004 [1979].",
    apa: "Santos, M. (1979). O Espaço Dividido: os dois circuitos da economia urbana dos países subdesenvolvidos. Francisco Alves / Edusp.",
    mla: "Santos, Milton. O Espaço Dividido: os dois circuitos da economia urbana dos países subdesenvolvidos. Edusp, 2004 [1979].",
    bibtex: `@book{santos1979espaco,
  author    = {Milton Santos},
  title     = {O Espaço Dividido: os dois circuitos da economia urbana dos países subdesenvolvidos},
  year      = {1979},
  publisher = {Francisco Alves / Edusp},
  address   = {São Paulo}
}`,
  },
  {
    id: "santos-1996-natureza-espaco",
    year: 1996,
    title: "A Natureza do Espaço: Técnica e Tempo, Razão e Emoção",
    publisher: "Hucitec / Edusp",
    city: "São Paulo",
    summaryPt:
      "Obra epistemológica central de Milton Santos: define o espaço geográfico como conjunto indissociável de sistemas de objetos e sistemas de ações, analisando o meio técnico-científico-informacional, rugosidades, verticalidades e horizontalidades.",
    summaryEn:
      "Santos's flagship epistemological treatise: defines geographic space as an inseparable system of objects and system of actions, analyzing the technical-scientific-informational milieu, 'rugosidades', verticalities, and horizontalities.",
    abnt: "SANTOS, Milton. A Natureza do Espaço: Técnica e Tempo, Razão e Emoção. 4. ed. São Paulo: Edusp, 2006 [1996].",
    apa: "Santos, M. (1996). A Natureza do Espaço: Técnica e Tempo, Razão e Emoção. Hucitec / Edusp.",
    mla: "Santos, Milton. A Natureza do Espaço: Técnica e Tempo, Razão e Emoção. Edusp, 2006 [1996].",
    bibtex: `@book{santos1996natureza,
  author    = {Milton Santos},
  title     = {A Natureza do Espaço: Técnica e Tempo, Razão e Emoção},
  year      = {1996},
  publisher = {Hucitec / Edusp},
  address   = {São Paulo}
}`,
  },
  {
    id: "santos-2000-outra-globalizacao",
    year: 2000,
    title: "Por uma outra globalização: do pensamento único à consciência universal",
    publisher: "Record",
    city: "Rio de Janeiro",
    summaryPt:
      "Distingue três mundos em um só: a globalização como fábula (discurso ideológico), como perversidade (desemprego, concentração de renda e exclusão) e como possibilidade (outra apropriação social das técnicas contemporâneas).",
    summaryEn:
      "Distinguishes three faces of globalization: as fable (ideological narrative), as perversity (inequality and exclusion), and as possibility (a democratic social reappropriation of modern technologies).",
    abnt: "SANTOS, Milton. Por uma outra globalização: do pensamento único à consciência universal. Rio de Janeiro: Record, 2000.",
    apa: "Santos, M. (2000). Por uma outra globalização: do pensamento único à consciência universal. Record.",
    mla: "Santos, Milton. Por uma outra globalização: do pensamento único à consciência universal. Record, 2000.",
    bibtex: `@book{santos2000globalizacao,
  author    = {Milton Santos},
  title     = {Por uma outra globalização: do pensamento único à consciência universal},
  year      = {2000},
  publisher = {Record},
  address   = {Rio de Janeiro}
}`,
  },
  {
    id: "santos-silveira-2001-brasil",
    year: 2001,
    title: "O Brasil: Território e Sociedade no Início do Século XXI",
    coauthors: "María Laura Silveira",
    publisher: "Record",
    city: "Rio de Janeiro",
    summaryPt:
      "Analisa a formação socioespacial brasileira sob a ótica do território usado e propõe a célebre regionalização em Quatro Brasis: Região Concentrada, Centro-Oeste, Nordeste e Amazônia.",
    summaryEn:
      "Analyzes Brazil's socio-spatial formation through the lens of used territory and introduces the landmark Four Brazils regionalization: Concentrated Region, Center-West, Northeast, and Amazonia.",
    abnt: "SANTOS, Milton; SILVEIRA, María Laura. O Brasil: Território e Sociedade no Início do Século XXI. Rio de Janeiro: Record, 2001.",
    apa: "Santos, M., & Silveira, M. L. (2001). O Brasil: Território e Sociedade no Início do Século XXI. Record.",
    mla: "Santos, Milton, and María Laura Silveira. O Brasil: Território e Sociedade no Início do Século XXI. Record, 2001.",
    bibtex: `@book{santos2001brasil,
  author    = {Milton Santos and María Laura Silveira},
  title     = {O Brasil: Território e Sociedade no Início do Século XXI},
  year      = {2001},
  publisher = {Record},
  address   = {Rio de Janeiro}
}`,
  },
];

export const MILTON_LENS_SHORTCUTS: readonly MiltonLensShortcut[] = [
  {
    lensId: "MTCI",
    href: "/?visao=1&lente=MTCI",
    titlePt: "Abrir Lente: Meio Técnico-Científico-Informacional",
    titleEn: "Open Lens: Technical-Scientific-Informational Milieu",
    descPt: "Compare espaços luminosos e opacos no globo com dados reais do Banco Mundial (PIB per capita e expectativa de vida).",
    descEn: "Compare luminous and opaque spaces on the globe using real World Bank data (GDP per capita and life expectancy).",
  },
  {
    lensId: "VERTICALITIES",
    href: "/?visao=1&lente=VERTICALITIES",
    titlePt: "Abrir Lente: Horizontalidades vs. Verticalidades",
    titleEn: "Open Lens: Horizontalities vs. Verticalities",
    descPt: "Explore os vetores globais de comando e cruze ao vivo com tráfego aéreo OpenSky, rotas marítimas AIS e satélites.",
    descEn: "Explore global command axes and cross-reference live with OpenSky aviation, AIS maritime routes, and satellites.",
  },
  {
    lensId: "FOUR_BRAZILS",
    href: "/?visao=1&lente=FOUR_BRAZILS&pais=BRA",
    titlePt: "Abrir Mapa: Os Quatro Brasis (2001)",
    titleEn: "Open Map: The Four Brazils (2001)",
    descPt: "Visualize Região Concentrada, Centro-Oeste, Nordeste e Amazônia no globo e compare com as 5 macrorregiões do IBGE.",
    descEn: "Inspect Concentrated Region, Center-West, Northeast, and Amazonia on the globe and compare with IBGE's 5 regions.",
  },
];

export const MILTON_DOSSIER_CITATIONS = {
  abnt: "TELLUSPEDIA. Milton Santos (1926–2001): Geografia Crítica, Território Usado e Centenário (1926–2026). TellusPedia: Enciclopédia Geopolítica e Observatório Planetário, 2026. Disponível em: <https://telluspedia.org/dossies/milton-santos>.",
  apa: "TellusPedia. (2026). Milton Santos (1926–2001): Critical Geography, Used Territory, and Centenary (1926–2026). TellusPedia. https://telluspedia.org/dossies/milton-santos",
  mla: "\"Milton Santos (1926–2001): Geografia Crítica e Território Usado.\" TellusPedia, 2026, https://telluspedia.org/dossies/milton-santos.",
  bibtex: `@online{telluspedia2026miltonsantos,
  author  = {{TellusPedia}},
  title   = {Milton Santos (1926--2001): Geografia Crítica, Território Usado e Centenário},
  year    = {2026},
  url     = {https://telluspedia.org/dossies/milton-santos}
}`,
} as const;
