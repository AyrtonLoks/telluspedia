/** Impérios e reinos anteriores a 1918: Prússia, Áustria-Hungria e Império Otomano (T36: dados separados de `historical-entities.ts`, que os reúne). */
import type { HistoricalEntity } from "./historical-entity-types";

export const EMPIRE_ENTITIES: Record<string, HistoricalEntity> = {
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
};
