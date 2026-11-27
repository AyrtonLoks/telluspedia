import type { EnHistoricalEntityTranslation } from "./en-historical-types";

/** Traduções inglesas (`en`) para Prússia, Áustria-Hungria e Império Otomano (D42). */
export const EN_HISTORICAL_EMPIRES: Record<string, EnHistoricalEntityTranslation> = {
  PRU: {
    nameCommon: "Kingdom of Prussia",
    nameOfficial: "Kingdom of Prussia (Königreich Preußen)",
    capital: "Berlin / Königsberg",
    continent: "Europe",
    governmentType: "Autocratic Constitutional Monarchy",
    leaderTitle: "King of Prussia / Imperial Chancellor",
    historicalLeader: "Otto von Bismarck",
    summary:
      "Germanic state renowned for military and administrative statecraft that led the North German Confederation and achieved German Unification in 1871 under Chancellor Otto von Bismarck and King William I.",
    indicators: {
      "HIST.PRU.POP": {
        indicatorName: "Total Population (1870)",
        unit: "inhabitants",
        sourcePrimary: "Königlich Preußisches Statistisches Bureau",
      },
      "HIST.PRU.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.PRU.MIL": {
        indicatorName: "Mobilized Military Strength",
        unit: "troops",
        sourcePrimary: "Großer Generalstab / Bundesarchiv",
      },
      "HIST.PRU.EDU": {
        indicatorName: "Adult Literacy Rate",
        unit: "%",
        sourcePrimary: "Preußisches Bildungsministerium",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "The Rise of Prussia and German Unification",
        contentMarkdown:
          "The **Kingdom of Prussia** evolved from a peripheral Baltic duchy into the core of continental Europe's foremost land power [1]. Under King William I and Minister-President Otto von Bismarck, Prussia combined military modernization with pragmatic diplomacy — *Realpolitik* [1].\n\nVictory in the Franco-Prussian War of 1870 culminated in the proclamation of the German Empire in the Hall of Mirrors at the Palace of Versailles on January 18, 1871, permanently reshaping the European balance of power [2].",
      },
      GOVERNMENT_POLITICS: {
        title: "The Bismarckian Political System and Military General Staff",
        contentMarkdown:
          "Prussia's constitutional framework paired a bicameral parliament (*Landtag*) with a three-class franchise weighted toward landed aristocratic elites (*Junkers*) [1].\n\nThe Chancellor answered directly to the Crown while Helmuth von Moltke's Great General Staff (*Großer Generalstab*) pioneered railway and telegraph mobilization planning [1][2].",
      },
      ECONOMY_SOCIAL: {
        title: "Rapid Industrialization and the Customs Union (Zollverein)",
        contentMarkdown:
          "The *Zollverein* (German Customs Union) forged a tariff-free domestic market that catalyzed the Industrial Revolution across the Rhineland and Silesia [1].\n\nHeavy coal and steel manufacturing — exemplified by the Krupp works in Essen — underpinned a dense rail network linking western frontiers to Berlin and Königsberg [1][2].",
      },
      CULTURE_HUMANITIES: {
        title: "The Königsberg Enlightenment, Immanuel Kant, and Public Education",
        contentMarkdown:
          "Prussia nurtured Kantian critical philosophy in Königsberg and pioneered compulsory universal primary schooling [1].\n\nThe University of Berlin, founded by Wilhelm von Humboldt in 1810, established the modern research university model uniting teaching with independent inquiry [1].",
      },
    },
  },

  AHU: {
    nameCommon: "Austria-Hungary",
    nameOfficial:
      "The Kingdoms and Lands Represented in the Imperial Council and the Lands of the Holy Hungarian Crown of St. Stephen",
    capital: "Vienna (Cisleithania) / Budapest (Transleithania)",
    continent: "Europe",
    governmentType: "Constitutional Dual Monarchy",
    leaderTitle: "Emperor of Austria and Apostolic King of Hungary",
    historicalLeader: "Franz Joseph I",
    summary:
      "Multinational Central European empire created by the Austro-Hungarian Compromise of 1867, encompassing over ten nationalities; its political crisis after the 1914 Sarajevo assassination triggered World War I.",
    indicators: {
      "HIST.AHU.POP": {
        indicatorName: "Total Population (1914)",
        unit: "inhabitants",
        sourcePrimary: "K.k. Statistische Zentralkommission Wien",
      },
      "HIST.AHU.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.AHU.AREA": {
        indicatorName: "Land Area",
        unit: "km²",
        sourcePrimary: "Militärgeographisches Institut",
      },
      "HIST.AHU.MIL": {
        indicatorName: "Austro-Hungarian Armed Forces Strength (1914)",
        unit: "troops",
        sourcePrimary: "K.u.k. Kriegsministerium",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "The Compromise of 1867 and Collapse in the Great War",
        contentMarkdown:
          "The *Ausgleich* (Compromise) of 1867 restored constitutional sovereignty to the Kingdom of Hungary, establishing a Dual Monarchy under Emperor-King Franz Joseph I [1].\n\nDespite vibrant industrial and cultural dynamism, competing national movements among Czechs, Poles, South Slavs, and Romanians strained imperial cohesion [1]. The assassination of Archduke Franz Ferdinand in Sarajevo on June 28, 1914 precipitated World War I and the empire's dissolution in 1918 [2].",
      },
      GOVERNMENT_POLITICS: {
        title: "The Dual Structure: Vienna, Budapest, and the Common Ministries",
        contentMarkdown:
          "The Dual Monarchy operated two autonomous governments and parliaments: Cisleithania (Austria) seated in Vienna and Transleithania (Hungary) seated in Budapest [1].\n\nOnly three Imperial and Royal (*k.u.k.*) ministries were shared directly under the monarch: Foreign Affairs, War, and Joint Finance [1].",
      },
      CULTURE_HUMANITIES: {
        title: "Fin-de-Siècle Vienna and European Intellectual Modernism",
        contentMarkdown:
          "Turn-of-the-century Vienna ranked among the world's foremost laboratories of scientific, artistic, and philosophical modernity [1].\n\nThe imperial capital fostered Sigmund Freud's psychoanalysis, Gustav Klimt and Egon Schiele's Vienna Secession, Gustav Mahler and Arnold Schoenberg's musical modernism, and Ludwig Wittgenstein's philosophy [1][2].",
      },
    },
  },

  TUR_HIST: {
    nameCommon: "Ottoman Empire",
    nameOfficial: "The Sublime Ottoman State (Devlet-i ʿAlīye-i ʿOsmānīye)",
    capital: "Constantinople (Istanbul)",
    continent: "Europe/Asia/Africa",
    governmentType: "Parliamentary Constitutional Monarchy (Second Constitutional Era)",
    leaderTitle: "Sultan and Caliph of Islam / Grand Vizier",
    historicalLeader: "Mehmed V / Talaat Pasha",
    summary:
      "Transcontinental Islamic empire that governed Southeastern Europe, Western Asia, and North Africa for over six centuries, commanding the Bosporus and the Levant until its partition after World War I and the founding of the Republic of Türkiye.",
    indicators: {
      "HIST.TUR.POP": {
        indicatorName: "Total Population (1914)",
        unit: "inhabitants",
        sourcePrimary: "Ottoman Imperial Statistics Directorate",
      },
      "HIST.TUR.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020) / Pamuk (2006)",
      },
      "HIST.TUR.AREA": {
        indicatorName: "Land Area (1914)",
        unit: "km²",
        sourcePrimary: "Ottoman Survey Archives",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "From the Conquest of the Bosporus to Dissolution in World War I",
        contentMarkdown:
          "From Sultan Mehmed II's capture of Constantinople in 1453, the **Ottoman Empire** stood at the geopolitical crossroads of Europe, Asia, and Africa [1].\n\nFollowing nineteenth-century *Tanzimat* legal and administrative reforms, the empire entered World War I alongside the Central Powers in late 1914, leading to defeat, Allied occupation, and postwar partition [1][2].",
      },
      GOVERNMENT_POLITICS: {
        title: "The Sublime Porte, the Sultan-Caliph, and the Young Turk Revolution",
        contentMarkdown:
          "Imperial executive administration centered on the **Sublime Porte** (*Bâb-ı Âlî*), seat of the Grand Vizier [1].\n\nThe Young Turk Revolution of 1908 restored the 1876 Ottoman Constitution and reconvened Parliament, inaugurating a multiparty constitutional era ahead of the Balkan Wars and the Great War [1][2].",
      },
    },
  },
};
