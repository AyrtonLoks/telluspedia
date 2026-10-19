export type HistoricalEraId =
  | "CONTEMPORARY"
  | "COLD_WAR_1969"
  | "WW2_1939"
  | "WW1_1914"
  | "PRUSSIA_1870";

export interface HistoricalEraDefinition {
  id: HistoricalEraId;
  label: string;
  startYear: number;
  endYear: number;
  representativeYear: number;
  topoJsonPath: string;
  description: string;
}

export interface HistoricalEntity {
  id: string; // ex.: "PRU", "SUN", "AHU", "GDR", "FRG", "TUR_HIST", "YUG", "CSK"
  wikidataQid: string;
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent?: string;
  areaKm2?: number;
  numericCode?: string;
  era: HistoricalEraId;
  startYear: number;
  endYear: number;
  latitude: number;
  longitude: number;
  flagSvgUrl: string;
  governmentType: string;
  leaderTitle: string;
  historicalLeader: string;
  summary: string;
  successorIsos: string[]; // ex.: PRU -> ["DEU", "POL", "RUS"]
  predecessorIsos?: string[];
  indicators: {
    indicatorCode: string;
    indicatorName: string;
    category: "ECONOMY" | "DEMOGRAPHY" | "HEALTH" | "MILITARY";
    year: number;
    value: number;
    unit: string;
    sourcePrimary: string;
  }[];
  dossierSections: {
    dimension:
      | "GEOGRAPHY"
      | "GOVERNMENT_POLITICS"
      | "ECONOMY_SOCIAL"
      | "HISTORY"
      | "BIOGRAPHIES"
      | "CULTURE_HUMANITIES"
      | "BIOLOGY_HEALTH"
      | "NEWS_CURRENT_AFFAIRS";
    title: string;
    contentMarkdown: string;
    estimatedReadMin: number;
    citationsJson: any;
  }[];
}

export const HISTORICAL_ERAS: Record<HistoricalEraId, HistoricalEraDefinition> = {
  CONTEMPORARY: {
    id: "CONTEMPORARY",
    label: "Era Contemporânea",
    startYear: 1991,
    endYear: 2026,
    representativeYear: 2024,
    topoJsonPath: "",
    description: "Ordem geopolítica pós-Guerra Fria e globalização multipolar.",
  },
  COLD_WAR_1969: {
    id: "COLD_WAR_1969",
    label: "Guerra Fria & Corrida Espacial (1969)",
    startYear: 1946,
    endYear: 1990,
    representativeYear: 1969,
    topoJsonPath: "/data/history/borders-1969.json",
    description: "Bipolaridade ideológica, União Soviética, Alemanha dividida (RDA/RFA) e a missão Apollo 11 à Lua.",
  },
  WW2_1939: {
    id: "WW2_1939",
    label: "Segunda Guerra Mundial (1939)",
    startYear: 1926,
    endYear: 1945,
    representativeYear: 1939,
    topoJsonPath: "/data/history/borders-1939.json",
    description: "Auge do expansionismo totalitário, Terceiro Reich, União Soviética e a Segunda República Polonesa.",
  },
  WW1_1914: {
    id: "WW1_1914",
    label: "Primeira Guerra Mundial (1914)",
    startYear: 1891,
    endYear: 1925,
    representativeYear: 1914,
    topoJsonPath: "/data/history/borders-1914.json",
    description: "Choque dos grandes impérios europeus: Império Alemão, Áustria-Hungria, Império Russo e Império Otomano.",
  },
  PRUSSIA_1870: {
    id: "PRUSSIA_1870",
    label: "Unificação Alemã & Reino da Prússia (1870)",
    startYear: 1800,
    endYear: 1890,
    representativeYear: 1870,
    topoJsonPath: "/data/history/borders-1870.json",
    description: "Hegemonia do Reino da Prússia, Confederação da Alemanha do Norte, Guerra Franco-Prussiana e fundação do Império Alemão.",
  },
};

export const HISTORICAL_ENTITIES: Record<string, HistoricalEntity> = {
  PRU: {
    id: "PRU",
    wikidataQid: "Q27306",
    nameCommon: "Reino da Prússia",
    nameOfficial: "Reino da Prússia (Königreich Preußen)",
    capital: "Berlim / Königsberg",
    continent: "Europe",
    areaKm2: 348700,
    numericCode: "902",
    era: "PRUSSIA_1870",
    startYear: 1701,
    endYear: 1918,
    latitude: 52.52,
    longitude: 13.405,
    flagSvgUrl: "/flags/pru.svg",
    governmentType: "Monarquia Constitucional Autocrática",
    leaderTitle: "Rei da Prússia / Chanceler Imperial",
    historicalLeader: "Otto von Bismarck",
    summary: "Estado germânico de excelência militar e administrativa que liderou a Confederação da Alemanha do Norte e consolidou a Unificação Alemã em 1871 sob a liderança do Chanceler Otto von Bismarck e do Rei Guilherme I.",
    successorIsos: ["DEU", "POL", "RUS", "LTU"],
    predecessorIsos: ["DEU"],
    indicators: [
      {
        indicatorCode: "HIST.PRU.POP",
        indicatorName: "População Total (1870)",
        category: "DEMOGRAPHY",
        year: 1870,
        value: 40165000,
        unit: "habitantes",
        sourcePrimary: "Königlich Preußisches Statistisches Bureau",
      },
      {
        indicatorCode: "HIST.PRU.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1870,
        value: 72149000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.PRU.MIL",
        indicatorName: "Efetivo Militar em Tempo de Mobilização",
        category: "MILITARY",
        year: 1870,
        value: 1180000,
        unit: "soldados",
        sourcePrimary: "Großer Generalstab / Bundesarchiv",
      },
      {
        indicatorCode: "HIST.PRU.EDU",
        indicatorName: "Taxa de Alfabetização da População Adulta",
        category: "HEALTH",
        year: 1870,
        value: 88.5,
        unit: "%",
        sourcePrimary: "Preußisches Bildungsministerium",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "A Ascensão da Prússia e a Unificação Alemã",
        estimatedReadMin: 9,
        citationsJson: { primarySource: "Clark, Christopher. Iron Kingdom: The Rise and Downfall of Prussia, 1600-1947. Penguin, 2007." },
        contentMarkdown: `O **Reino da Prússia** transformou-se de um ducado periférico no Báltico no coração do maior poder terrestre da Europa continental [1]. Sob o comando do Rei Guilherme I e do Chanceler Otto von Bismarck, a Prússia utilizou uma combinação precisa de reformas militares e diplomacia pragmática — a *Realpolitik* [1].
        
A vitória na Guerra Franco-Prussiana de 1870 culminou na proclamação do Império Alemão na Galeria dos Espelhos no Palácio de Versalhes em 18 de janeiro de 1871, alterando irrevogavelmente o equilíbrio de poder europeu [2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "O Sistema Político Bismarckiano e a Hegemonia Militar",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Eyck, Erich. Bismarck and the German Empire. Routledge, 1968." },
        contentMarkdown: `A estrutura constitucional prussiana combinava um parlamento bicameral (*Landtag*) com um sistema eleitoral de três classes que favorecia as elites latifundiárias (*Junkers*) [1].
        
O Chanceler respondia diretamente ao monarca, mantendo o controle civil sobre a máquina governamental, enquanto o Estado-Maior (*Großer Generalstab*) de Helmuth von Moltke revolucionava o planejamento logístico ferroviário e telegráfico militar [1][2].`,
      },
      {
        dimension: "ECONOMY_SOCIAL",
        title: "Industrialização Rápida e a União Aduaneira (Zollverein)",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Tilly, Richard. Capital Formation and Economic Growth in Prussia. Harvard University Press." },
        contentMarkdown: `A criação do *Zollverein* (União Aduaneira Alemã) estabeleceu um mercado interno sem barreiras tarifárias, catalisando a Revolução Industrial na Renânia e na Silésia [1].
        
A indústria pesada de carvão e aço, simbolizada pelas fundições Krupp em Essen, propiciou a base material para a expansão de uma rede ferroviária densa que conectou as fronteiras ocidentais a Berlim e Königsberg [1][2].`,
      },
      {
        dimension: "CULTURE_HUMANITIES",
        title: "Iluminismo de Königsberg, Immanuel Kant e o Sistema Educacional",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Kuehn, Manfred. Kant: A Biography. Cambridge University Press." },
        contentMarkdown: `A Prússia foi o berço do pensamento crítico kantiano em Königsberg e pioneira na instituição do ensino fundamental público universal e obrigatório [1].
        
A Universidade de Berlim, fundada por Wilhelm von Humboldt em 1810, estabeleceu o modelo moderno de universidade científica baseada na união indissociável entre ensino e pesquisa livre [1].`,
      },
    ],
  },

  SUN: {
    id: "SUN",
    wikidataQid: "Q15180",
    nameCommon: "União Soviética",
    nameOfficial: "União das Repúblicas Socialistas Soviéticas (URSS)",
    capital: "Moscou",
    continent: "Europe/Asia",
    areaKm2: 22402200,
    numericCode: "810",
    era: "COLD_WAR_1969",
    startYear: 1922,
    endYear: 1991,
    latitude: 55.7558,
    longitude: 37.6173,
    flagSvgUrl: "/flags/sun.svg",
    governmentType: "Estado Socialista Federal de Partido Único",
    leaderTitle: "Secretário-Geral do Partido Comunista",
    historicalLeader: "Leonid Brejnev (1969) / Josef Stálin",
    summary: "Superpotência socialista eurasiática constituída por 15 repúblicas federadas, protagonista na derrota do nazifascismo na Segunda Guerra Mundial e polo antagônico dos Estados Unidos durante a Guerra Fria e a Corrida Espacial.",
    successorIsos: [
      "RUS", "UKR", "BLR", "KAZ", "UZB", "TKM", "KGZ", "TJK",
      "GEO", "AZE", "ARM", "MDA", "EST", "LVA", "LTU"
    ],
    predecessorIsos: ["RUS"],
    indicators: [
      {
        indicatorCode: "HIST.SUN.POP",
        indicatorName: "População Total (1969)",
        category: "DEMOGRAPHY",
        year: 1969,
        value: 241720000,
        unit: "habitantes",
        sourcePrimary: "Comitê Estatal de Estatística da URSS (Goskomstat)",
      },
      {
        indicatorCode: "HIST.SUN.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1969,
        value: 1228000000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.SUN.NUC",
        indicatorName: "Arsenal Nuclear Estimado (Ogivas Ativas)",
        category: "MILITARY",
        year: 1969,
        value: 10500,
        unit: "ogivas",
        sourcePrimary: "SIPRI / Bulletin of the Atomic Scientists",
      },
      {
        indicatorCode: "HIST.SUN.MIL_EXP",
        indicatorName: "Gastos Militares Estimados (% do PNB)",
        category: "MILITARY",
        year: 1969,
        value: 13.5,
        unit: "%",
        sourcePrimary: "CIA Historical National Intelligence Estimates",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "Da Revolução de 1917 à Corrida Espacial da Guerra Fria",
        estimatedReadMin: 10,
        citationsJson: { primarySource: "Fitzpatrick, Sheila. The Russian Revolution. Oxford University Press, 2017." },
        contentMarkdown: `Fundada em 1922 após a queda do Império Russo e a Guerra Civil Russa, a **União Soviética** consolidou-se como potência global após pagar o mais alto tributo humano na Segunda Guerra Mundial (Grande Guerra Patriótica), com mais de 27 milhões de cidadãos mortos [1].
        
Em 1957, o lançamento do Sputnik 1 abriu a Era Espacial, seguido pelo voo histórico de Yuri Gagarin na Vostok 1 em 1961, consolidando a rivalidade tecnológica com os Estados Unidos [2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "O Centralismo Democrático, o Politburo e o Soviete Supremo",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Service, Robert. The History of Modern Russia. Harvard University Press, 2015." },
        contentMarkdown: `O sistema de poder soviético operava sob a liderança do Partido Comunista da União Soviética (PCUS), cujo órgão executivo de cúpula — o Politburo — exercia a direção ideológica e governamental [1].
        
Formalmente, o Soviete Supremo da URSS era o corpo legislativo supremo representativo das repúblicas federadas e autônomas, sob o princípio do centralismo democrático leninista [1].`,
      },
      {
        dimension: "ECONOMY_SOCIAL",
        title: "Economia Planejada, Gosplan e os Planos Quinquenais",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Kornai, János. The Socialist System: The Political Economy of Communism. Princeton University Press." },
        contentMarkdown: `A economia soviética baseava-se na propriedade estatal dos meios de produção e no planejamento central coordenado pelo Comitê Estatal de Planejamento (*Gosplan*) [1].
        
Os Planos Quinquenais priorizaram a indústria pesada de base, energia hidrelétrica e nuclear, e o setor de defesa, com subsídios maciços à habitação, transporte coletivo e saúde pública universal gratuita [1][2].`,
      },
    ],
  },

  AHU: {
    id: "AHU",
    wikidataQid: "Q28513",
    nameCommon: "Áustria-Hungria",
    nameOfficial: "Os Reinos e Terras Representados no Conselho Imperial e os Países da Santa Coroa Húngara de Santo Estêvão",
    capital: "Viena (Cisleitânia) / Budapeste (Transleitânia)",
    continent: "Europe",
    areaKm2: 676615,
    numericCode: "901",
    era: "WW1_1914",
    startYear: 1867,
    endYear: 1918,
    latitude: 48.2082,
    longitude: 16.3738,
    flagSvgUrl: "/flags/ahu.svg",
    governmentType: "Monarquia Dual Constitucional",
    leaderTitle: "Imperador da Áustria e Rei Apostólico da Hungria",
    historicalLeader: "Francisco José I (Franz Joseph I)",
    summary: "Império multinacional centro-europeu formado pelo Compromisso Austro-Húngaro de 1867, que abrigava mais de dez nacionalidades e cuja crise política após o atentado de Sarajevo em 1914 deflagrou a Primeira Guerra Mundial.",
    successorIsos: ["AUT", "HUN", "CZE", "SVK", "SVN", "HRV", "BIH", "POL", "UKR", "ROU", "ITA"],
    predecessorIsos: ["AUT", "HUN"],
    indicators: [
      {
        indicatorCode: "HIST.AHU.POP",
        indicatorName: "População Total (1914)",
        category: "DEMOGRAPHY",
        year: 1914,
        value: 52750000,
        unit: "habitantes",
        sourcePrimary: "K.k. Statistische Zentralkommission Wien",
      },
      {
        indicatorCode: "HIST.AHU.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1913,
        value: 100500000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.AHU.AREA",
        indicatorName: "Área Territorial",
        category: "DEMOGRAPHY",
        year: 1914,
        value: 676615,
        unit: "km²",
        sourcePrimary: "Militärgeographisches Institut",
      },
      {
        indicatorCode: "HIST.AHU.MIL",
        indicatorName: "Efetivo das Forças Armadas Austro-Húngaras (1914)",
        category: "MILITARY",
        year: 1914,
        value: 1820000,
        unit: "soldados",
        sourcePrimary: "K.u.k. Kriegsministerium",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "O Compromisso de 1867 e a Queda na Grande Guerra",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Taylor, A.J.P. The Habsburg Monarchy, 1809-1918. Penguin Books, 1990." },
        contentMarkdown: `O *Ausgleich* (Compromisso) de 1867 restabeleceu a soberania do Reino da Hungria, criando uma monarquia dual sob o cetro de Francisco José I [1].
        
Apesar de sua pujança cultural e econômica, as tensões nacionalistas de eslavos, tchecos, croatas e sérvios tensionaram a integridade do Estado [1]. O assassinato do herdeiro Francisco Ferdinando em Sarajevo em 28 de junho de 1914 precipitou a catástrofe da Primeira Guerra Mundial e a dissolução final do império em 1918 [2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "A Estrutura Dual: Viena, Budapeste e os Ministérios Comuns",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Kann, Robert A. A History of the Habsburg Empire 1526-1918. University of California Press." },
        contentMarkdown: `A monarquia operava com dois governos e dois parlamentos autônomos: a Cisleitânia (Áustria) sediada em Viena e a Transleitânia (Hungria) sediada em Budapeste [1].
        
Apenas três ministérios eram estritamente comuns e respondiam diretamente ao monarca: o Ministério dos Negócios Estrangeiros, o Ministério da Guerra e o Ministério das Finanças Comuns [1].`,
      },
      {
        dimension: "CULTURE_HUMANITIES",
        title: "Viena Fin-de-Siècle e a Vanguarda Intelectual Europeia",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Schorske, Carl E. Fin-de-Siècle Vienna: Politics and Culture. Vintage Books." },
        contentMarkdown: `A Viena do início do século XX foi um dos maiores polos mundiais de efervescência cultural, científica e artística [1].
        
A cidade acolheu a fundação da psicanálise por Sigmund Freud, as pinturas revolucionárias de Gustav Klimt e Egon Schiele na Secessão de Viena, a música expressionista de Gustav Mahler e Arnold Schoenberg, e a filosofia seminal de Ludwig Wittgenstein [1][2].`,
      },
    ],
  },

  GDR: {
    id: "GDR",
    wikidataQid: "Q16957",
    nameCommon: "Alemanha Oriental (RDA)",
    nameOfficial: "República Democrática Alemã (Deutsche Demokratische Republik)",
    capital: "Berlim Oriental",
    continent: "Europe",
    areaKm2: 108333,
    numericCode: "278",
    era: "COLD_WAR_1969",
    startYear: 1949,
    endYear: 1990,
    latitude: 52.52,
    longitude: 13.405,
    flagSvgUrl: "/flags/gdr.svg",
    governmentType: "República Socialista de Partido Hegemônico (SED)",
    leaderTitle: "Primeiro-Secretário do Comitê Central da SED",
    historicalLeader: "Walter Ulbricht (1969) / Erich Honecker",
    summary: "Estado socialista soberano fundado na zona de ocupação soviética da Alemanha em 1949, membro chave do Pacto de Varsóvia e vanguarda industrial e esportiva do Bloco Socialista até a queda do Muro de Berlim em 1989.",
    successorIsos: ["DEU"],
    predecessorIsos: ["DEU"],
    indicators: [
      {
        indicatorCode: "HIST.GDR.POP",
        indicatorName: "População Total (1969)",
        category: "DEMOGRAPHY",
        year: 1969,
        value: 17075000,
        unit: "habitantes",
        sourcePrimary: "Staatliche Zentralverwaltung für Statistik der DDR",
      },
      {
        indicatorCode: "HIST.GDR.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1969,
        value: 112000000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.GDR.MIL",
        indicatorName: "Efetivo Militar Ativo (NVA)",
        category: "MILITARY",
        year: 1969,
        value: 165000,
        unit: "soldados",
        sourcePrimary: "Nationale Volksarmee / Militärarchiv Potsdam",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "A Criação da RDA e a Fronteira de Berlim",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Fulbrook, Mary. Anatomy of a Dictatorship: Inside the GDR, 1949-1989. Oxford University Press." },
        contentMarkdown: `Proclamada em outubro de 1949 em resposta à criação da República Federal da Alemanha, a **República Democrática Alemã** tornou-se a linha de frente militar da Guerra Fria [1].
        
Em agosto de 1961, para deter o êxodo contínuo de profissionais qualificados em direção a Berlim Ocidental, o governo de Walter Ulbricht ergueu o Muro de Berlim (*Antifaschistischer Schutzwall*), transformando a cidade no símbolo máximo da divisão europeia [1][2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "O Partido Socialista Unificado (SED) e o Ministério de Segurança do Estado (Stasi)",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Koehler, John O. Stasi: The Untold Story of the East German Secret Police. Westview Press." },
        contentMarkdown: `O Partido Socialista Unificado da Alemanha (SED) governava sob a liderança do Comitê Central e do Politburo [1].
        
O Ministério para a Segurança do Estado (*Stasi*) construiu uma das mais extensas redes de vigilância interna do século XX, com dezenas de milhares de oficiais regulares e colaboradores informais (*Inoffizielle Mitarbeiter*) [1].`,
      },
    ],
  },

  FRG: {
    id: "FRG",
    wikidataQid: "Q7124",
    nameCommon: "Alemanha Ocidental (RFA)",
    nameOfficial: "República Federal da Alemanha (Bundesrepublik Deutschland)",
    capital: "Bonn",
    continent: "Europe",
    areaKm2: 248577,
    numericCode: "280",
    era: "COLD_WAR_1969",
    startYear: 1949,
    endYear: 1990,
    latitude: 50.7374,
    longitude: 7.0982,
    flagSvgUrl: "/flags/frg.svg",
    governmentType: "República Federal Parlamentar",
    leaderTitle: "Chanceler Federal",
    historicalLeader: "Willy Brandt (1969) / Konrad Adenauer",
    summary: "Democracia parlamentar ocidental fundada em maio de 1949 nas zonas americana, britânica e francesa, protagonista do Milagre Econômico Alemão (Wirtschaftswunder), cofundadora das Comunidades Europeias e pioneira da Ostpolitik sob Willy Brandt.",
    successorIsos: ["DEU"],
    predecessorIsos: ["DEU"],
    indicators: [
      {
        indicatorCode: "HIST.FRG.POP",
        indicatorName: "População Total (1969)",
        category: "DEMOGRAPHY",
        year: 1969,
        value: 60650000,
        unit: "habitantes",
        sourcePrimary: "Statistisches Bundesamt (Destatis)",
      },
      {
        indicatorCode: "HIST.FRG.GDP",
        indicatorName: "PIB a Preços Correntes (1969)",
        category: "ECONOMY",
        year: 1969,
        value: 153000000000,
        unit: "USD",
        sourcePrimary: "Deutsche Bundesbank / Banco Mundial",
      },
      {
        indicatorCode: "HIST.FRG.AUTO",
        indicatorName: "Produção Automobilística Anual",
        category: "ECONOMY",
        year: 1969,
        value: 3600000,
        unit: "veículos",
        sourcePrimary: "VDA - Verband der Automobilindustrie",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "Do Pós-Guerra à Ostpolitik de Willy Brandt",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Brandt, Willy. My Life in Politics. Viking, 1992." },
        contentMarkdown: `Sob a liderança fundacional do Chanceler Konrad Adenauer, a Alemanha Ocidental ancorou-se firmemente no bloco democrático ocidental, ingressando na OTAN e liderando a integração europeia com o Tratado de Roma de 1957 [1].
        
Em 1969, a ascensão do Chanceler social-democrata Willy Brandt inaugurou a *Ostpolitik* — política pioneira de distensão, diálogo e normalização de relações com a União Soviética, Polônia e a própria Alemanha Oriental [1][2].`,
      },
      {
        dimension: "ECONOMY_SOCIAL",
        title: "O Milagre Econômico (Wirtschaftswunder) e a Economia Social de Mercado",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Erhard, Ludwig. Prosperity Through Competition. Praeger." },
        contentMarkdown: `Arquiteto das reformas monetárias de 1948 com a introdução do Marco Alemão (Deutsche Mark), Ludwig Erhard formulou o conceito da Economia Social de Mercado (*Soziale Marktwirtschaft*) [1].
        
O modelo combinava a livre iniciativa e concorrência com uma rede sólida de seguridade social e cogestão trabalhista (*Mitbestimmung*), tornando a RFA a terceira maior economia mundial em poucas décadas [1][2].`,
      },
    ],
  },

  TUR_HIST: {
    id: "TUR_HIST",
    wikidataQid: "Q12560",
    nameCommon: "Império Otomano",
    nameOfficial: "O Sublime Estado Otomano (Devlet-i ʿAlīye-i ʿOsmānīye)",
    capital: "Constantinopla (Istambul)",
    continent: "Europe/Asia/Africa",
    areaKm2: 1800000,
    numericCode: "903",
    era: "WW1_1914",
    startYear: 1299,
    endYear: 1922,
    latitude: 41.0082,
    longitude: 28.9784,
    flagSvgUrl: "/flags/tur_hist.svg",
    governmentType: "Monarquia Constitucional Parlamentar (Segunda Era Constitucional)",
    leaderTitle: "Sultão e Califa do Islã / Grão-Vizir",
    historicalLeader: "Mehmed V / Talaat Paxá",
    summary: "Império transcontinental islâmico que governou o Sudeste Europeu, o Oriente Médio e o Norte da África por mais de seis séculos, exercendo soberania no Bósforo e no Levante até a sua partilha na Primeira Guerra Mundial e o surgimento da moderna República da Turquia.",
    successorIsos: ["TUR", "SYR", "IRQ", "LBN", "JOR", "ISR", "SAU", "YEM", "EGY"],
    predecessorIsos: ["TUR"],
    indicators: [
      {
        indicatorCode: "HIST.TUR.POP",
        indicatorName: "População Total (1914)",
        category: "DEMOGRAPHY",
        year: 1914,
        value: 20800000,
        unit: "habitantes",
        sourcePrimary: "Devlet-i Âliyye-i Osmâniyye İstatistik Nezâreti",
      },
      {
        indicatorCode: "HIST.TUR.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1913,
        value: 25300000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020) / Pamuk (2006)",
      },
      {
        indicatorCode: "HIST.TUR.AREA",
        indicatorName: "Área Territorial (1914)",
        category: "DEMOGRAPHY",
        year: 1914,
        value: 1800000,
        unit: "km²",
        sourcePrimary: "Ottoman Survey Archives",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "Das Conquistas do Bósforo à Dissolução na Primeira Guerra",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Finkel, Caroline. Osman's Dream: The History of the Ottoman Empire. Basic Books, 2007." },
        contentMarkdown: `Desde a tomada de Constantinopla em 1453 pelo Sultão Maomé II, o **Império Otomano** ocupou posição geopolítica nevrálgica entre a Europa, a Ásia e a África [1].
        
Após séculos de hegemonia e o ciclo modernizador do *Tanzimat* no século XIX, o império entrou na Primeira Guerra Mundial ao lado dos Impérios Centrais em 1914, sofrendo derrota e posterior partilha pelo Tratado de Sèvres em 1920 [1][2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "A Sublime Porta, o Sultão-Califa e a Revolução dos Jovens Turcos",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Zürcher, Erik J. Turkey: A Modern History. I.B. Tauris, 2004." },
        contentMarkdown: `A sede executiva do governo otomano era conhecida internacionalmente como a **Sublime Porta** (*Bâb-ı Âlî*), onde despachava o Grão-Vizir [1].
        
A Revolução dos Jovens Turcos de 1908 restaurou a Constituição otomana de 1876 e o Parlamento, estabelecendo uma monarquia constitucional multipartidária antes das turbulências dos conflitos balcânicos e da Grande Guerra [1][2].`,
      },
    ],
  },

  YUG: {
    id: "YUG",
    wikidataQid: "Q36704",
    nameCommon: "Iugoslávia",
    nameOfficial: "República Socialista Federativa da Iugoslávia (SFRJ)",
    capital: "Belgrado",
    continent: "Europe",
    areaKm2: 255804,
    numericCode: "891",
    era: "COLD_WAR_1969",
    startYear: 1945,
    endYear: 1992,
    latitude: 44.8176,
    longitude: 20.4633,
    flagSvgUrl: "/flags/yug.svg",
    governmentType: "República Socialista Federal Não-Alinhada",
    leaderTitle: "Presidente da República / Marechal da Iugoslávia",
    historicalLeader: "Josip Broz Tito",
    summary: "Federação socialista multinacional dos Bálcãs ocidentais fundada sob a liderança dos partisans de Josip Broz Tito, líder cofundadora do Movimento dos Não-Alinhados (NAM) e caracterizada pelo modelo de autogestão dos trabalhadores (samoupravljanje), mantendo soberania e equidistância de Washington e Moscou.",
    successorIsos: ["SRB", "HRV", "SVN", "BIH", "MKD", "MNE", "XKX"],
    predecessorIsos: ["SRB"],
    indicators: [
      {
        indicatorCode: "HIST.YUG.POP",
        indicatorName: "População Total (1969)",
        category: "DEMOGRAPHY",
        year: 1969,
        value: 20370000,
        unit: "habitantes",
        sourcePrimary: "Savezni zavod za statistiku SFRJ",
      },
      {
        indicatorCode: "HIST.YUG.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1969,
        value: 92400000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.YUG.MIL",
        indicatorName: "Efetivo das Forças Armadas (JNA)",
        category: "MILITARY",
        year: 1969,
        value: 330000,
        unit: "soldados",
        sourcePrimary: "Jugoslovenska narodna armija (JNA)",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "A Resistência Partisan, a Ruptura Tito-Stálin e o Não-Alinhamento",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Lampe, John R. Yugoslavia as History: Twice There Was a Country. Cambridge University Press." },
        contentMarkdown: `Emergindo vitoriosa da Segunda Guerra Mundial pela libertação autônoma conduzida pelo Exército Partisan de Josip Broz Tito, a **Iugoslávia** reconstruiu-se como uma federação de seis repúblicas socialistas [1].
        
Em 1948, a ruptura pública entre Tito e Josef Stálin consagrou o caminho próprio iugoslavo ao socialismo, culminando na Conferência de Belgrado de 1961 e na liderança do Movimento dos Países Não-Alinhados [1][2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "A Autogestão Socialista e a Estrutura Federal Étnica",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Rusinow, Dennison. The Yugoslav Experiment 1948-1974. University of California Press." },
        contentMarkdown: `O diferencial do socialismo iugoslavo residia no sistema de autogestão dos trabalhadores (*radničko samoupravljanje*), onde os conselhos fabris detinham poder decisório sobre a produção e a distribuição de excedentes [1].
        
A Constituição estabelecia o equilíbrio entre as seis repúblicas federadas (Sérvia, Croácia, Eslovênia, Bósnia e Herzegovina, Macedônia e Montenegro) e as duas províncias autônomas de Vojvodina e Kosovo sob a divisa da Fraternidade e Unidade [1][2].`,
      },
    ],
  },

  CSK: {
    id: "CSK",
    wikidataQid: "Q33946",
    nameCommon: "Tchecoslováquia",
    nameOfficial: "República Socialista da Tchecoslováquia (ČSSR)",
    capital: "Praga",
    continent: "Europe",
    areaKm2: 127900,
    numericCode: "200",
    era: "COLD_WAR_1969",
    startYear: 1918,
    endYear: 1992,
    latitude: 50.0755,
    longitude: 14.4378,
    flagSvgUrl: "/flags/csk.svg",
    governmentType: "República Socialista Federal (Pacto de Varsóvia)",
    leaderTitle: "Primeiro-Secretário do Partido Comunista / Presidente",
    historicalLeader: "Alexander Dubček / Ludvík Svoboda (1969)",
    summary: "Estado soberano da Europa Central formado pela união histórica de tchecos e eslovacos, potência industrial avançada célebre pela Primavera de Praga de 1968 sob Alexander Dubček e seu modelo de socialismo com rosto humano.",
    successorIsos: ["CZE", "SVK"],
    predecessorIsos: ["CZE", "SVK"],
    indicators: [
      {
        indicatorCode: "HIST.CSK.POP",
        indicatorName: "População Total (1969)",
        category: "DEMOGRAPHY",
        year: 1969,
        value: 14360000,
        unit: "habitantes",
        sourcePrimary: "Federální statistický úřad ČSSR",
      },
      {
        indicatorCode: "HIST.CSK.GDP",
        indicatorName: "PIB Histórico Estimado (Geary-Khamis 1990)",
        category: "ECONOMY",
        year: 1969,
        value: 98500000000,
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      {
        indicatorCode: "HIST.CSK.IND",
        indicatorName: "Produção Automobilística e Maquinário Pesado",
        category: "ECONOMY",
        year: 1969,
        value: 135000,
        unit: "veículos Škoda/Tatra",
        sourcePrimary: "ČKD / Škoda Auto Historical Archives",
      },
    ],
    dossierSections: [
      {
        dimension: "HISTORY",
        title: "Da Fundação Republicana à Primavera de Praga de 1968",
        estimatedReadMin: 8,
        citationsJson: { primarySource: "Williams, Kieran. The Prague Spring and its Aftermath. Cambridge University Press, 1997." },
        contentMarkdown: `Criada em 1918 após a dissolução da monarquia dos Habsburgo por Tomáš Masaryk, a **Tchecoslováquia** manteve tradição democrática e industrial avançada na Europa Central [1].
        
Em 1968, o programa reformista de Alexander Dubček — sintetizado no 'socialismo com rosto humano' — desencadeou uma abertura política e cultural sem precedentes, encerrada pela intervenção militar do Pacto de Varsóvia em agosto de 1968 [1][2].`,
      },
      {
        dimension: "GOVERNMENT_POLITICS",
        title: "A Federalização Constitucional de 1969 e a Normalização",
        estimatedReadMin: 7,
        citationsJson: { primarySource: "Skilling, H. Gordon. Czechoslovakia's Interrupted Revolution. Princeton University Press." },
        contentMarkdown: `Em 1º de janeiro de 1969, entrou em vigor a Lei Constitucional sobre a Federação Tchecoslovaca, dividindo o Estado em duas repúblicas soberanas paritárias: a República Socialista Tcheca e a República Socialista Eslovaca [1].
        
Sob a presidência de Ludvík Svoboda e posterior liderança de Gustáv Husák, iniciou-se o período da 'Normalização', que buscou a estabilização institucional sob supervisão do bloco soviético [1][2].`,
      },
    ],
  },
};

export function resolveHistoricalEra(year: number | null | undefined): HistoricalEraDefinition {
  if (year === null || year === undefined || year >= 1991) {
    return HISTORICAL_ERAS.CONTEMPORARY;
  }
  if (year >= 1946 && year <= 1990) {
    return HISTORICAL_ERAS.COLD_WAR_1969;
  }
  if (year >= 1926 && year <= 1945) {
    return HISTORICAL_ERAS.WW2_1939;
  }
  if (year >= 1891 && year <= 1925) {
    return HISTORICAL_ERAS.WW1_1914;
  }
  return HISTORICAL_ERAS.PRUSSIA_1870;
}

const NUMERIC_ISO_LOOKUP: Record<string, string> = {
  "276": "DEU", "643": "RUS", "040": "AUT", "348": "HUN", "792": "TUR",
  "826": "GBR", "250": "FRA", "392": "JPN", "380": "ITA", "616": "POL",
  "703": "SVK", "203": "CZE", "688": "SRB", "191": "HRV", "705": "SVN",
  "070": "BIH", "807": "MKD", "499": "MNE", "076": "BRA", "840": "USA",
  "124": "CAN", "156": "CHN", "356": "IND", "036": "AUS", "032": "ARG",
};

export function resolveHistoricalEntity(iso: string, year: number | null | undefined): string {
  let upper = (iso || "").trim().toUpperCase();
  if (!upper) return "";

  if (NUMERIC_ISO_LOOKUP[upper]) {
    upper = NUMERIC_ISO_LOOKUP[upper];
  }

  const era = resolveHistoricalEra(year);

  // If already an explicit historical entity:
  if (HISTORICAL_ENTITIES[upper]) {
    const h = HISTORICAL_ENTITIES[upper];
    // In contemporary era, extinct entity smoothly resolves to modern sovereign successor
    if (era.id === "CONTEMPORARY") {
      return h.successorIsos?.[0] || upper;
    }

    const y = year ?? era.representativeYear;
    // Entity is active during the requested historical year / era
    if (y >= h.startYear && y <= h.endYear) {
      return upper;
    }

    // Historical year is after entity's dissolution: resolve forward through successor
    if (y > h.endYear) {
      const succ = h.successorIsos?.[0] || upper;
      return resolveHistoricalEntity(succ, year);
    }

    // Historical year is before entity's creation: resolve backward through predecessor
    if (y < h.startYear) {
      const pred = h.predecessorIsos?.[0] || h.successorIsos?.[0] || upper;
      return resolveHistoricalEntity(pred, year);
    }

    return upper;
  }

  if (era.id === "CONTEMPORARY") {
    return upper;
  }

  if (era.id === "PRUSSIA_1870") {
    if (upper === "DEU") return "PRU";
    if (["AUT", "HUN", "CZE", "SVK", "SVN", "HRV", "BIH"].includes(upper)) return "AHU";
    if (["TUR", "SYR", "IRQ", "JOR", "LBN", "ISR", "PSE", "CYP", "CYN"].includes(upper)) return "TUR_HIST";
    if ([
      "RUS", "UKR", "BLR", "FIN", "EST", "LVA", "LTU", "POL",
      "KAZ", "UZB", "TKM", "KGZ", "TJK", "GEO", "ARM", "AZE", "MDA"
    ].includes(upper)) return "RUS";
    if (upper === "IRL") return "GBR";
    return upper;
  }

  if (era.id === "WW1_1914") {
    if (["AUT", "HUN", "CZE", "SVK", "SVN", "HRV", "BIH"].includes(upper)) return "AHU";
    if (["TUR", "SYR", "IRQ", "JOR", "LBN", "ISR", "PSE"].includes(upper)) return "TUR_HIST";
    if ([
      "RUS", "UKR", "BLR", "FIN", "EST", "LVA", "LTU", "POL",
      "KAZ", "UZB", "TKM", "KGZ", "TJK", "GEO", "ARM", "AZE", "MDA"
    ].includes(upper)) return "RUS";
    if (upper === "IRL") return "GBR";
    return upper;
  }

  if (era.id === "WW2_1939") {
    if (["AUT", "CZE"].includes(upper)) return "DEU";
    if (upper === "ALB") return "ITA";
    if (["KOR", "PRK", "TWN"].includes(upper)) return "JPN";
    if ([
      "RUS", "UKR", "BLR", "KAZ", "UZB", "TKM", "KGZ", "TJK",
      "GEO", "ARM", "AZE"
    ].includes(upper)) {
      return "SUN";
    }
    return upper;
  }

  if (era.id === "COLD_WAR_1969") {
    if ([
      "RUS", "UKR", "BLR", "KAZ", "UZB", "TKM", "KGZ", "TJK",
      "GEO", "ARM", "AZE", "MDA", "EST", "LVA", "LTU"
    ].includes(upper)) {
      return "SUN";
    }
    if (["SRB", "HRV", "SVN", "BIH", "MKD", "MNE", "XKX"].includes(upper)) {
      return "YUG";
    }
    if (["CZE", "SVK"].includes(upper)) {
      return "CSK";
    }
    if (upper === "DEU") return "FRG";
    return upper;
  }

  return upper;
}

export function findHistoricalEntity(id: string): HistoricalEntity | undefined {
  const upper = (id || "").toUpperCase();
  return HISTORICAL_ENTITIES[upper];
}

export function resolveEffectiveHistoricalYear(params: {
  selectedYear?: number | null;
  milestoneYear?: number | null;
  startYear?: number | null;
  endYear?: number | null;
}): number | null {
  const { selectedYear, milestoneYear, startYear, endYear } = params;

  if (selectedYear !== null && selectedYear !== undefined) {
    return selectedYear;
  }

  if (milestoneYear !== null && milestoneYear !== undefined) {
    return milestoneYear;
  }

  if (
    startYear !== null &&
    startYear !== undefined &&
    endYear !== null &&
    endYear !== undefined
  ) {
    // Prussia & 19th Century (<= 1890)
    if (endYear <= 1890) {
      return startYear <= 1870 ? 1870 : startYear;
    }
    // World Wars preset / interval: 1914 - 1945
    if (startYear <= 1914 && endYear <= 1945 && endYear >= 1939) {
      return 1939;
    }
    // WWI era
    if (endYear <= 1925 && startYear >= 1891) {
      return 1914;
    }
    // WWII era
    if (endYear <= 1945 && startYear >= 1926) {
      return 1939;
    }
    // Cold War preset / interval: 1946/1947 - 1990/1991
    if (endYear <= 1991 && startYear >= 1945) {
      return 1969;
    }
  }

  return null;
}

