import type { EnHistoricalEntityTranslation } from "./en-historical-types";

/** Traduções inglesas (`en`) para URSS, RDA, RFA, Iugoslávia e Tchecoslováquia (D42). */
export const EN_HISTORICAL_COLD_WAR: Record<string, EnHistoricalEntityTranslation> = {
  SUN: {
    nameCommon: "Soviet Union",
    nameOfficial: "Union of Soviet Socialist Republics (USSR)",
    capital: "Moscow",
    continent: "Europe/Asia",
    governmentType: "Federal Marxist-Leninist Single-Party Socialist State",
    leaderTitle: "General Secretary of the Communist Party",
    historicalLeader: "Leonid Brezhnev (1969) / Joseph Stalin",
    summary:
      "Eurasian socialist superpower uniting 15 constituent republics, decisive victor over Nazi Germany on the Eastern Front in World War II, and rival pole to the United States throughout the Cold War and the Space Race.",
    indicators: {
      "HIST.SUN.POP": {
        indicatorName: "Total Population (1969)",
        unit: "inhabitants",
        sourcePrimary: "USSR State Committee on Statistics (Goskomstat)",
      },
      "HIST.SUN.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.SUN.NUC": {
        indicatorName: "Estimated Nuclear Arsenal (Active Warheads)",
        unit: "warheads",
        sourcePrimary: "SIPRI / Bulletin of the Atomic Scientists",
      },
      "HIST.SUN.MIL_EXP": {
        indicatorName: "Estimated Defense Expenditure (% of GNP)",
        unit: "%",
        sourcePrimary: "CIA Historical National Intelligence Estimates",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "From the 1917 Revolution to the Cold War Space Race",
        contentMarkdown:
          "Founded in 1922 after the fall of the Russian Empire and the Russian Civil War, the **Soviet Union** emerged as a global superpower after bearing the heaviest human toll of World War II (the Great Patriotic War), losing more than 27 million military and civilian lives [1].\n\nIn 1957 the launch of Sputnik 1 opened the Space Age, followed by Yuri Gagarin's orbital flight aboard Vostok 1 in 1961, defining technological competition with the United States [2].",
      },
      GOVERNMENT_POLITICS: {
        title: "Democratic Centralism, the Politburo, and the Supreme Soviet",
        contentMarkdown:
          "Soviet governance operated under the constitutional monopoly of the Communist Party of the Soviet Union (CPSU), whose executive Politburo set ideological, foreign, and economic policy [1].\n\nFormally, the bicameral Supreme Soviet of the USSR represented the union and autonomous republics under the Leninist principle of democratic centralism [1].",
      },
      ECONOMY_SOCIAL: {
        title: "Command Economy, Gosplan, and the Five-Year Plans",
        contentMarkdown:
          "The Soviet economy rested on state ownership of industrial assets and centralized planning coordinated by the State Planning Committee (*Gosplan*) [1].\n\nSuccessive Five-Year Plans prioritized heavy metallurgy, hydroelectric and nuclear power, aerospace, and defense alongside universal state-subsidized housing, transit, education, and healthcare [1][2].",
      },
    },
  },

  GDR: {
    nameCommon: "East Germany (GDR)",
    nameOfficial: "German Democratic Republic (Deutsche Demokratische Republik)",
    capital: "East Berlin",
    continent: "Europe",
    governmentType: "Hegemonic-Party Socialist Republic (SED)",
    leaderTitle: "First Secretary of the SED Central Committee",
    historicalLeader: "Walter Ulbricht (1969) / Erich Honecker",
    summary:
      "Sovereign socialist state established in the Soviet occupation zone of Germany in 1949, key Warsaw Pact member, and leading industrial economy of the Eastern Bloc until the fall of the Berlin Wall in 1989.",
    indicators: {
      "HIST.GDR.POP": {
        indicatorName: "Total Population (1969)",
        unit: "inhabitants",
        sourcePrimary: "Staatliche Zentralverwaltung für Statistik der DDR",
      },
      "HIST.GDR.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.GDR.MIL": {
        indicatorName: "Active Armed Forces (NVA)",
        unit: "troops",
        sourcePrimary: "Nationale Volksarmee / Militärarchiv Potsdam",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "Founding of the GDR and the Berlin Frontier",
        contentMarkdown:
          "Proclaimed in October 1949 following the creation of West Germany, the **German Democratic Republic** stood along the central military fault line of the Cold War [1].\n\nIn August 1961, to halt ongoing emigration of skilled workers through West Berlin, Walter Ulbricht's government erected the Berlin Wall, turning the divided city into the premier symbol of Cold War Europe [1][2].",
      },
      GOVERNMENT_POLITICS: {
        title: "The Socialist Unity Party (SED) and the Ministry for State Security (Stasi)",
        contentMarkdown:
          "Political authority resided in the Central Committee and Politburo of the Socialist Unity Party of Germany (SED) [1].\n\nThe Ministry for State Security (*Stasi*) maintained one of the twentieth century's most pervasive domestic surveillance apparatuses through full-time officers and informal collaborators (*Inoffizielle Mitarbeiter*) [1].",
      },
    },
  },

  FRG: {
    nameCommon: "West Germany (FRG)",
    nameOfficial: "Federal Republic of Germany (Bundesrepublik Deutschland)",
    capital: "Bonn",
    continent: "Europe",
    governmentType: "Federal Parliamentary Republic",
    leaderTitle: "Federal Chancellor",
    historicalLeader: "Willy Brandt (1969) / Konrad Adenauer",
    summary:
      "Western parliamentary democracy founded in May 1949 across the American, British, and French zones, engine of the German Economic Miracle (Wirtschaftswunder), co-founder of the European Communities, and architect of Ostpolitik under Willy Brandt.",
    indicators: {
      "HIST.FRG.POP": {
        indicatorName: "Total Population (1969)",
        unit: "inhabitants",
        sourcePrimary: "Statistisches Bundesamt (Destatis)",
      },
      "HIST.FRG.GDP": {
        indicatorName: "Nominal GDP at Current Prices (1969)",
        unit: "USD",
        sourcePrimary: "Deutsche Bundesbank / World Bank",
      },
      "HIST.FRG.AUTO": {
        indicatorName: "Annual Automotive Production",
        unit: "vehicles",
        sourcePrimary: "VDA - Verband der Automobilindustrie",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "From Postwar Reconstruction to Willy Brandt's Ostpolitik",
        contentMarkdown:
          "Under founding Chancellor Konrad Adenauer, **West Germany** anchored itself firmly within the Western alliance, joining NATO and co-founding European economic integration via the 1957 Treaty of Rome [1].\n\nIn 1969 Social Democratic Chancellor Willy Brandt launched *Ostpolitik* — a landmark policy of détente and treaty normalization with the Soviet Union, Poland, and East Germany [1][2].",
      },
      ECONOMY_SOCIAL: {
        title: "The Economic Miracle (Wirtschaftswunder) and the Social Market Economy",
        contentMarkdown:
          "Following the 1948 currency reform that introduced the Deutsche Mark, Economics Minister Ludwig Erhard shaped the **Social Market Economy** (*Soziale Marktwirtschaft*) [1].\n\nCombining competitive private enterprise with comprehensive social insurance and workplace co-determination (*Mitbestimmung*), the FRG rose within two decades to become the world's third-largest economy [1][2].",
      },
    },
  },

  YUG: {
    nameCommon: "Yugoslavia",
    nameOfficial: "Socialist Federal Republic of Yugoslavia (SFRY)",
    capital: "Belgrade",
    continent: "Europe",
    governmentType: "Non-Aligned Federal Socialist Republic",
    leaderTitle: "President of the Republic / Marshal of Yugoslavia",
    historicalLeader: "Josip Broz Tito",
    summary:
      "Multinational Balkan socialist federation forged out of Josip Broz Tito's Partisan resistance, co-founder of the Non-Aligned Movement (NAM), and pioneer of workers' self-management (samoupravljanje) maintaining strategic autonomy between Washington and Moscow.",
    indicators: {
      "HIST.YUG.POP": {
        indicatorName: "Total Population (1969)",
        unit: "inhabitants",
        sourcePrimary: "Federal Statistical Office of SFRY",
      },
      "HIST.YUG.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.YUG.MIL": {
        indicatorName: "Yugoslav People's Army Strength (JNA)",
        unit: "troops",
        sourcePrimary: "Jugoslovenska narodna armija (JNA)",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "Partisan Resistance, the Tito–Stalin Split, and Non-Alignment",
        contentMarkdown:
          "Emerging from World War II largely through indigenous liberation led by Josip Broz Tito's Partisan Army, **Yugoslavia** reconstituted itself as a federation of six socialist republics [1].\n\nThe open rupture between Tito and Joseph Stalin in 1948 established Yugoslavia's independent socialist course, culminating in the 1961 Belgrade Summit that founded the Non-Aligned Movement [1][2].",
      },
      GOVERNMENT_POLITICS: {
        title: "Workers' Self-Management and Multinational Federalism",
        contentMarkdown:
          "Yugoslavia's distinctive socioeconomic model centered on workers' self-management (*radničko samoupravljanje*), empowering enterprise councils over production and surplus allocation [1].\n\nIts federal constitution balanced six constituent republics (Serbia, Croatia, Slovenia, Bosnia and Herzegovina, Macedonia, and Montenegro) alongside the autonomous provinces of Vojvodina and Kosovo [1][2].",
      },
    },
  },

  CSK: {
    nameCommon: "Czechoslovakia",
    nameOfficial: "Czechoslovak Socialist Republic (ČSSR)",
    capital: "Prague",
    continent: "Europe",
    governmentType: "Federal Socialist Republic (Warsaw Pact)",
    leaderTitle: "First Secretary of the Communist Party / President",
    historicalLeader: "Alexander Dubček / Ludvík Svoboda (1969)",
    summary:
      "Sovereign Central European union of Czechs and Slovaks, advanced industrial manufacturer renowned for the 1968 Prague Spring under Alexander Dubček and its reformist vision of 'socialism with a human face.'",
    indicators: {
      "HIST.CSK.POP": {
        indicatorName: "Total Population (1969)",
        unit: "inhabitants",
        sourcePrimary: "Federal Statistical Office of the ČSSR",
      },
      "HIST.CSK.GDP": {
        indicatorName: "Estimated Historical GDP (1990 Geary-Khamis)",
        unit: "USD (1990 GK)",
        sourcePrimary: "Maddison Project Database (2020)",
      },
      "HIST.CSK.IND": {
        indicatorName: "Automotive & Heavy Engineering Output",
        unit: "Škoda/Tatra vehicles",
        sourcePrimary: "ČKD / Škoda Auto Historical Archives",
      },
    },
    dossierSections: {
      HISTORY: {
        title: "From Republican Founding to the 1968 Prague Spring",
        contentMarkdown:
          "Founded in 1918 upon the collapse of the Habsburg monarchy under Tomáš Garrigue Masaryk, **Czechoslovakia** maintained Central Europe's strongest interwar industrial and parliamentary tradition [1].\n\nIn 1968 Alexander Dubček's reform program — 'socialism with a human face' — sparked sweeping civic and cultural liberalization before Warsaw Pact forces intervened in August 1968 [1][2].",
      },
      GOVERNMENT_POLITICS: {
        title: "The 1969 Constitutional Federation and Normalization",
        contentMarkdown:
          "On January 1, 1969 the Constitutional Act on the Czechoslovak Federation took effect, reorganizing the unitary state into two co-equal constituent republics: the Czech Socialist Republic and the Slovak Socialist Republic [1].\n\nUnder President Ludvík Svoboda and First Secretary Gustáv Husák, the subsequent 'Normalization' era restored orthodox Warsaw Pact alignment until the Velvet Revolution of 1989 [1][2].",
      },
    },
  },
};
