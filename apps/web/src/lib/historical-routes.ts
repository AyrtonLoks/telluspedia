/**
 * TellusPedia — Rotas de Expedições Históricas & Trajetórias 3D (RN12)
 *
 * Reconstituição náutica, geodésica e cronológica da Primeira Circum-navegação da Terra
 * por Fernão de Magalhães e Juan Sebastián Elcano (1519–1522), a bordo da Armada das Molucas.
 *
 * Fontes primárias e historiográficas:
 * - Pigafetta, Antonio. "Relazione del primo viaggio intorno al mondo" (1524–1525).
 * - Zweig, Stefan. "Magalhães: O Homem e o Seu Feito" (1938).
 * - Bergreen, Laurence. "Over the Edge of the World: Magellan's Terrifying Circumnavigation of the Globe" (2003).
 * - Instituto Geográfico Nacional de España (IGN) — "500º Aniversario de la Primera Vuelta al Mundo".
 */

import { latLngToVector3, vector3ToLatLng, slerpVectors } from "./geo-spatial";

export type HistoricalRouteId = "magellan-1519" | (string & {});

export interface HistoricalVessel {
  name: string;
  type: string;
  tonnage: number;
  originalCaptain: string;
  crewCount: number;
  fate: string;
}

export interface RouteWaypoint {
  id: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
  date: string;
  calendarDate: string;
  dayOfVoyage: number;
  daysAtSea: number;
  leaguesNavigated: number;
  vessel: string;
  commander: string;
  modernCountry: string;
  description: string;
  historicalEvent: string;
  milestoneTitle?: string;
  quoteFromPigafetta?: string;
  pigafettaDiary?: string;
  vesselStatus?: string;
}

export interface LogbookEntry {
  date: string;
  location: string;
  event: string;
  excerptPigafetta?: string;
}

export interface HistoricalRouteDefinition {
  id: HistoricalRouteId;
  title: string;
  subtitle: string;
  type: "MARITIME" | "TERRESTRIAL" | "AVIATION";
  startYear: number;
  endYear: number;
  commander: string;
  flagCountry: string; // ISO 3166-1 alpha-3: "ESP"
  vessels: string[];
  fleet: HistoricalVessel[];
  survivorsCount: string;
  totalDistanceKm: number;
  durationDays: number;
  description: string;
  waypoints: RouteWaypoint[];
  logbookEntries: LogbookEntry[];
  citations: {
    authors: string;
    title: string;
    publication: string;
    year: number;
    doi?: string;
    url?: string;
  }[];
  dossierMarkdown: string;
}

// Aliases para conformidade com o plano técnico
export type HistoricalRoute = HistoricalRouteDefinition;
export type HistoricalRouteWaypoint = RouteWaypoint;

export const MAGELLAN_FLEET: HistoricalVessel[] = [
  {
    name: "Trinidad",
    type: "Nao capitânia",
    tonnage: 110,
    originalCaptain: "Fernão de Magalhães",
    crewCount: 62,
    fate: "Danificada em Tidore (Molucas). Tentou retornar pelo Pacífico sob comando de Gonzalo Gómez de Espinosa, mas foi capturada e desmantelada pelos portugueses em Ternate; apenas 4 homens sobreviveram.",
  },
  {
    name: "San Antonio",
    type: "Nao",
    tonnage: 120,
    originalCaptain: "Juan de Cartagena",
    crewCount: 57,
    fate: "Amotinou-se no Estreito de Magalhães em novembro de 1520 sob o piloto Esteban Gómez, desertou da armada e retornou à Espanha em maio de 1521.",
  },
  {
    name: "Concepción",
    type: "Nao",
    tonnage: 90,
    originalCaptain: "Gaspar de Quesada",
    crewCount: 44,
    fate: "Incendiada deliberadamente pela tripulação na Ilha de Bohol (Filipinas) após a Batalha de Mactan, por insuficiência de homens para manobrar três navios.",
  },
  {
    name: "Victoria",
    type: "Nao",
    tonnage: 85,
    originalCaptain: "Luis de Mendoza",
    crewCount: 45,
    fate: "A única nau a completar a circum-navegação do planeta. Retornou a Sanlúcar de Barrameda em 6 de setembro de 1522 comandada por Juan Sebastián Elcano com 18 sobreviventes a bordo.",
  },
  {
    name: "Santiago",
    type: "Caravela",
    tonnage: 75,
    originalCaptain: "João Serrão",
    crewCount: 31,
    fate: "Naufragou em maio de 1520 em missão de reconhecimento costeiro no Rio Santa Cruz (Patagônia); toda a tripulação sobreviveu e foi resgatada.",
  },
];

export const MAGELLAN_WAYPOINTS: RouteWaypoint[] = [
  {
    id: "SANLUCAR_DEPARTURE",
    order: 1,
    name: "Sanlúcar de Barrameda / Sevilha",
    lat: 36.78,
    lng: -6.35,
    date: "20/09/1519",
    calendarDate: "1519-09-20",
    dayOfVoyage: 0,
    daysAtSea: 0,
    leaguesNavigated: 0,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Espanha",
    description:
      "A Armada das Molucas, composta por cinco naus e cerca de 270 tripulantes de diversas nacionalidades, zarpa da foz do Guadalquivir rumo ao desconhecido.",
    historicalEvent: "Zarpada oficial da Armada das Molucas sob o comando do capitão-mor Fernão de Magalhães.",
    milestoneTitle: "Partida de Sanlúcar de Barrameda (1519)",
    quoteFromPigafetta:
      "Descemos o rio Guadalquivir até Sanlúcar... onde nos detivemos vários dias para abastecer as naus. Por fim, a vinte de setembro do mesmo ano de 1519, largamos as amarras e nos fizemos ao mar oceano.",
    pigafettaDiary:
      "Descemos o rio Guadalquivir até Sanlúcar... Por fim, a vinte de setembro de 1519, largamos as amarras e nos fizemos ao mar oceano sob ventos favoráveis.",
    vesselStatus: "5 naus em formação (Trinidad, San Antonio, Concepción, Victoria, Santiago).",
  },
  {
    id: "CANARY_ISLANDS",
    order: 2,
    name: "Santa Cruz de Tenerife (Ilhas Canárias)",
    lat: 28.47,
    lng: -16.25,
    date: "26/09/1519",
    calendarDate: "1519-09-26",
    dayOfVoyage: 6,
    daysAtSea: 6,
    leaguesNavigated: 280,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Espanha (Canárias)",
    description:
      "Primeira escala para reabastecimento de água doce, pez para calafetagem dos cascos e provisões frescas antes da travessia oceânica.",
    historicalEvent: "Escala em Tenerife; primeiros atritos entre Magalhães e o feitor real Juan de Cartagena.",
    milestoneTitle: "Reabastecimento nas Ilhas Canárias",
    quoteFromPigafetta:
      "A vinte e seis de setembro chegamos a uma ilha da Grã-Canária chamada Tenerife, onde permanecemos três dias e meio fazendo água e madeira.",
    pigafettaDiary:
      "A vinte e seis de setembro chegamos a Tenerife, onde permanecemos fazendo água doce, lenha e pez para as naus.",
    vesselStatus: "5 naus intactas.",
  },
  {
    id: "CAPE_VERDE_OUTBOUND",
    order: 3,
    name: "Arquipélago de Cabo Verde",
    lat: 14.93,
    lng: -23.51,
    date: "03/10/1519",
    calendarDate: "1519-10-03",
    dayOfVoyage: 13,
    daysAtSea: 13,
    leaguesNavigated: 750,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Cabo Verde",
    description:
      "Navegação próxima à costa africana e passagem a sudoeste de Cabo Verde, enfrentando calmarias equatoriais e tempestades tropicais.",
    historicalEvent: "Travessia das zonas de calmaria equatorial e confronto com tempestades elétricas.",
    milestoneTitle: "Passagem pelas Águas de Cabo Verde",
    quoteFromPigafetta:
      "Durante as tempestades, o corpo de Santo Elmo apareceu-nos várias vezes nas noites escuras, no topo do mastro grande, trazendo imenso consolo aos mareantes.",
    pigafettaDiary:
      "Durante as tempestades, o corpo de Santo Elmo apareceu-nos várias vezes no topo do mastro grande, aliviando o terror dos mareantes.",
    vesselStatus: "5 naus navegando sob ventos instáveis.",
  },
  {
    id: "GUANABARA_BAY",
    order: 4,
    name: "Baía de Guanabara (Rio de Janeiro)",
    lat: -22.91,
    lng: -43.17,
    date: "13/12/1519",
    calendarDate: "1519-12-13",
    dayOfVoyage: 84,
    daysAtSea: 84,
    leaguesNavigated: 2200,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Brasil",
    description:
      "Aporte na baía no dia de Santa Luzia. Escala de 14 dias de convívio pacífico com os índios tupinambás, reabastecendo mandioca, peixe fresco e frutos tropicais.",
    historicalEvent: "Escala de 14 dias no litoral do Brasil para calafetagem e recuperação dos marinheiros.",
    milestoneTitle: "Aporte na Baía de Guanabara (Brasil)",
    quoteFromPigafetta:
      "Neste lugar tivemos abundância de refrescos, tais como galinhas, batatas doces, uma fruta parecida com pinhas de pinheiro mas de extraordinária doçura chamada ananás... Por um espelho deram-nos cinco ou seis galinhas.",
    pigafettaDiary:
      "Neste lugar tivemos abundância de refrescos, tais como galinhas, batatas doces e ananás... Por um espelho deram-nos cinco ou seis galinhas.",
    vesselStatus: "5 naus ancoradas na Guanabara.",
  },
  {
    id: "RIO_DE_LA_PLATA",
    order: 5,
    name: "Estuário do Rio da Prata",
    lat: -35.2,
    lng: -56.5,
    date: "12/01/1520",
    calendarDate: "1520-01-12",
    dayOfVoyage: 114,
    daysAtSea: 114,
    leaguesNavigated: 2950,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Uruguai / Argentina",
    description:
      "Exploração minuciosa do estuário em busca da passagem interoceânica. A constatação de água doce e bancos arenosos revela tratar-se de um monumental rio.",
    historicalEvent: "Sondagem frustrada do Rio da Prata e avanço austral em direção à Patagônia.",
    milestoneTitle: "Exploração do Estuário do Prata",
    quoteFromPigafetta:
      "Entramos numa grande boca de água que se pensava ser um estreito; mas tendo entrado com a nau Santiago e sondado, verificou-se que a água era doce.",
    pigafettaDiary:
      "Entramos numa grande boca de água que se pensava ser um estreito; tendo sondado, verificou-se que a água era doce.",
    vesselStatus: "5 naus rumam para o sul desconhecido.",
  },
  {
    id: "PUERTO_SAN_JULIAN",
    order: 6,
    name: "Porto São Julião (Patagônia)",
    lat: -49.3,
    lng: -67.72,
    date: "31/03/1520",
    calendarDate: "1520-03-31",
    dayOfVoyage: 193,
    daysAtSea: 193,
    leaguesNavigated: 3900,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Argentina",
    description:
      "Invernada de cinco meses sob frio glacial patagônico. Magalhães reprime com firmeza o motim dos fidalgos espanhóis e estabelece contato com os nativos 'Patagões'.",
    historicalEvent: "Supressão do motim armado e invernada forçada na Patagônia.",
    milestoneTitle: "Invernada e Motim em Porto São Julião",
    quoteFromPigafetta:
      "Passamos dois meses inteiros nesta enseada sem ver habitante algum. Um dia, repentinamente, vimos um homem de estatura gigantesca na praia, quase nu, que cantava e dançava deitando poeira sobre a cabeça...",
    pigafettaDiary:
      "Passamos dois meses nesta enseada. Um dia vimos um homem de estatura gigantesca que cantava e dançava... O capitão-mor chamou a esses gigantes de Patagões.",
    vesselStatus: "5 naus invernando; Santiago naufragará em breve no rio Santa Cruz.",
  },
  {
    id: "STRAIT_OF_MAGELLAN",
    order: 7,
    name: "Estreito de Todos os Santos (Estreito de Magalhães)",
    lat: -53.47,
    lng: -70.92,
    date: "28/11/1520",
    calendarDate: "1520-11-28",
    dayOfVoyage: 435,
    daysAtSea: 435,
    leaguesNavigated: 4850,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Chile",
    description:
      "Após 38 dias navegando os 570 km de canais sinuosos e fiordes glaciais, a armada atinge o Cabo Deseado e ingressa no Mar do Sul. A nau San Antonio deserta na travessia.",
    historicalEvent: "Passagem vitoriosa do Estreito de Todos os Santos; deserção da San Antonio.",
    milestoneTitle: "Travessia do Estreito e Ingresso no Mar do Sul",
    quoteFromPigafetta:
      "Quarta-feira, 28 de novembro de 1520, desembocamos pelo estreito que chamamos de Todos os Santos e entramos no grande mar, ao qual demos o nome de Pacífico.",
    pigafettaDiary:
      "Quarta-feira, 28 de novembro de 1520, desembocamos pelo estreito que chamamos de Todos os Santos e entramos no grande mar, ao qual demos o nome de Pacífico, porque durante três meses e vinte dias não sofremos tempestade alguma.",
    vesselStatus: "3 naus restantes (Trinidad, Concepción, Victoria); San Antonio desertou rumo à Espanha.",
  },
  {
    id: "PACIFIC_CROSSING_MID",
    order: 8,
    name: "Travessia do Oceano Pacífico Sul",
    lat: -12.0,
    lng: -135.0,
    date: "28/12/1520",
    calendarDate: "1520-12-28",
    dayOfVoyage: 465,
    daysAtSea: 465,
    leaguesNavigated: 6800,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Águas Internacionais (Oceano Pacífico)",
    description:
      "Navegação desesperadora por quase quatro meses através da maior vastidão oceânica do planeta sem provisões frescas, enfrentando fome extrema e escorbuto mortal.",
    historicalEvent: "Surto devastador de escorbuto dizimando os marinheiros durante a travessia pacífica.",
    milestoneTitle: "A Provação Extrema no Oceano Pacífico",
    quoteFromPigafetta:
      "Navegamos durante três meses e vinte dias sem provar alimento fresco algum. Comíamos biscoito que já não era pão, senão um pó misturado com vermes e fétido pelo excremento dos ratos.",
    pigafettaDiary:
      "Navegamos três meses e vinte dias sem alimento fresco. Comíamos biscoito virado em pó cheio de vermes e bebíamos água amarela podre. O couro das vergas comíamo-lo amaciando-o na água do mar.",
    vesselStatus: "3 naus com tripulações esqueléticas e agonizantes.",
  },
  {
    id: "GUAM_MARIANAS",
    order: 9,
    name: "Ilha de Guam (Ilhas Marianas)",
    lat: 13.44,
    lng: 144.79,
    date: "06/03/1521",
    calendarDate: "1521-03-06",
    dayOfVoyage: 533,
    daysAtSea: 533,
    leaguesNavigated: 8900,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Guam (Estados Unidos)",
    description:
      "Primeiro avistamento de terra habitada após a travessia do Pacífico. Contato tenso com os nativos Chamorros e reabastecimento crucial de água doce e cocos.",
    historicalEvent: "Reabastecimento providencial de água e frutas frescas salvando a armada da morte por inanição.",
    milestoneTitle: "Desembarque em Guam (Ilhas Marianas)",
    quoteFromPigafetta:
      "A seis de março descobrimos a noroeste uma pequena ilha e duas outras a sudoeste... Os habitantes vinham a bordo em barcos velozes.",
    pigafettaDiary:
      "A seis de março descobrimos as ilhas habitadas... Os habitantes vinham a bordo em barcos velozes e forneciam água e cocos.",
    vesselStatus: "3 naus reabastecidas.",
  },
  {
    id: "HOMONHON_ISLAND",
    order: 10,
    name: "Ilha de Homonhon (Filipinas)",
    lat: 10.74,
    lng: 125.71,
    date: "16/03/1521",
    calendarDate: "1521-03-16",
    dayOfVoyage: 543,
    daysAtSea: 543,
    leaguesNavigated: 9400,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Filipinas",
    description:
      "Chegada ao arquipélago filipino (batizado por Magalhães como Ilhas de São Lázaro). Desembarque em tendas para cura dos doentes e primeiros contatos pacíficos.",
    historicalEvent: "Primeiro desembarque europeu documentado no arquipélago das Filipinas.",
    milestoneTitle: "Chegada às Filipinas (Ilha de Homonhon)",
    quoteFromPigafetta:
      "No sábado, 16 de março de 1521, avistamos ao alvorecer uma terra alta com muitas árvores... O capitão-mor fez montar duas tendas para os enfermos.",
    pigafettaDiary:
      "No sábado, 16 de março de 1521, avistamos ao alvorecer uma terra alta... Montamos tendas para cuidar dos nossos doentes.",
    vesselStatus: "3 naus ancoradas com marinheiros em recuperação.",
  },
  {
    id: "CEBU_ISLAND",
    order: 11,
    name: "Ilha de Cebu",
    lat: 10.31,
    lng: 123.89,
    date: "07/04/1521",
    calendarDate: "1521-04-07",
    dayOfVoyage: 565,
    daysAtSea: 565,
    leaguesNavigated: 9600,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Filipinas",
    description:
      "Entrada solene no porto de Cebu. Magalhães celebra pacto de sangue com o Rajah Humabon, promovendo batismos em massa e erguendo a Cruz de Magalhães.",
    historicalEvent: "Aliança política e primeiras conversões católicas registradas nas Filipinas.",
    milestoneTitle: "Aliança e Batismo em Cebu",
    quoteFromPigafetta:
      "No domingo, 14 de abril, foram batizadas mais de oitocentas almas entre homens, mulheres e crianças.",
    pigafettaDiary:
      "Foram batizadas centenas de almas no porto de Cebu e o rei local jurou lealdade ao imperador Carlos.",
    vesselStatus: "3 naus no porto de Cebu.",
  },
  {
    id: "MACTAN_BATTLE",
    order: 12,
    name: "Ilha de Mactan (Morte de Magalhães)",
    lat: 10.31,
    lng: 123.97,
    date: "27/04/1521",
    calendarDate: "1521-04-27",
    dayOfVoyage: 585,
    daysAtSea: 585,
    leaguesNavigated: 9610,
    vessel: "Nau Trinidad",
    commander: "Fernão de Magalhães",
    modernCountry: "Filipinas",
    description:
      "Desembarque com 49 soldados contra mais de mil guerreiros do cacique Lapu-Lapu. Magalhães é alvejado por flechas envenenadas e morto no mar. A frota recua em desespero.",
    historicalEvent: "Batalha de Mactan e morte em combate do capitão-mor Fernão de Magalhães.",
    milestoneTitle: "A Morte de Magalhães na Batalha de Mactan",
    quoteFromPigafetta:
      "Reconhecendo o capitão, tantos se arremessaram sobre ele que lhe derrubaram o capacete duas vezes... Foi assim que mataram o nosso espelho, a nossa luz, o nosso conforto e o nosso verdadeiro guia.",
    pigafettaDiary:
      "Reconhecendo o capitão, tantos se arremessaram sobre ele que lhe derrubaram o capacete... Foi assim que mataram o nosso espelho, a nossa luz, o nosso conforto e o nosso verdadeiro guia.",
    vesselStatus: "Morte do capitão-mor; queima da Concepción; restam Trinidad e Victoria.",
  },
  {
    id: "TIDORE_MOLUCCAS",
    order: 13,
    name: "Ilha de Tidore (Ilhas Molucas)",
    lat: 0.68,
    lng: 127.4,
    date: "08/11/1521",
    calendarDate: "1521-11-08",
    dayOfVoyage: 780,
    daysAtSea: 780,
    leaguesNavigated: 10500,
    vessel: "Nau Victoria",
    commander: "Juan Sebastián Elcano",
    modernCountry: "Indonésia",
    description:
      "Chegada triunfal às sonhadas Ilhas das Especiarias. Os porões são abarrotados de cravo-da-índia e noz-moscada. Elcano assume a Victoria para a volta ao mundo.",
    historicalEvent: "Atingimento da meta mercantil primordial: carregamento completo de especiarias finas.",
    milestoneTitle: "Chegada Triunfal às Molucas (Tidore)",
    quoteFromPigafetta:
      "Sexta-feira, 8 de novembro de 1521, entramos no porto da ilha chamada Tidore... Três horas antes do pôr do sol disparamos toda a artilharia, pois havíamos chegado após vinte e sete meses.",
    pigafettaDiary:
      "Sexta-feira, 8 de novembro de 1521, entramos no porto de Tidore e carregamos a Victoria com toneladas de precioso cravo.",
    vesselStatus: "Trinidad retida por vazamento; Victoria zarpa solitária para o oeste sob comando de Elcano.",
  },
  {
    id: "TIMOR_DEPARTURE",
    order: 14,
    name: "Ilha de Timor",
    lat: -8.55,
    lng: 125.57,
    date: "25/01/1522",
    calendarDate: "1522-01-25",
    dayOfVoyage: 858,
    daysAtSea: 858,
    leaguesNavigated: 11200,
    vessel: "Nau Victoria",
    commander: "Juan Sebastián Elcano",
    modernCountry: "Timor-Leste / Indonésia",
    description:
      "Último ponto de reabastecimento na Insulíndia antes da travessia sem escalas do tempestuoso Oceano Índico meridional.",
    historicalEvent: "Zarpada solitária da Nau Victoria para enfrentar as armadas portuguesas e o oceano aberto.",
    milestoneTitle: "Despedida da Insulíndia em Timor",
    quoteFromPigafetta:
      "Deixamos a ilha de Timor e fizemos-nos ao grande mar Índico para escapar às caravelas do rei de Portugal.",
    pigafettaDiary:
      "Deixamos a ilha de Timor e fizemos-nos ao grande mar Índico para escapar aos navios portugueses.",
    vesselStatus: "Apenas a Nau Victoria em mar aberto.",
  },
  {
    id: "INDIAN_OCEAN_CROSSING",
    order: 15,
    name: "Travessia do Oceano Índico Meridional",
    lat: -30.0,
    lng: 80.0,
    date: "18/03/1522",
    calendarDate: "1522-03-18",
    dayOfVoyage: 910,
    daysAtSea: 910,
    leaguesNavigated: 12500,
    vessel: "Nau Victoria",
    commander: "Juan Sebastián Elcano",
    modernCountry: "Águas Internacionais (Oceano Índico)",
    description:
      "Elcano conduz a nau por altas latitudes austrais (até 42°S) no oceano antártico tempestuoso para evitar as rotas de patrulha portuguesas.",
    historicalEvent: "Navegação evasiva através dos mares austrais frios do Índico.",
    milestoneTitle: "A Rota Solitária do Oceano Índico",
    quoteFromPigafetta:
      "Navegamos nove semanas seguidas sem aportar em terra alguma, suportando ventos furiosos e frio imenso.",
    pigafettaDiary:
      "Navegamos semanas seguidas em alto mar sem aportar, suportando ventos furiosos e a escassez de pão.",
    vesselStatus: "Nau Victoria com mastro avariado e marinheiros exaustos.",
  },
  {
    id: "CAPE_OF_GOOD_HOPE",
    order: 16,
    name: "Cabo da Boa Esperança (África do Sul)",
    lat: -34.36,
    lng: 18.47,
    date: "19/05/1522",
    calendarDate: "1522-05-19",
    dayOfVoyage: 972,
    daysAtSea: 972,
    leaguesNavigated: 13600,
    vessel: "Nau Victoria",
    commander: "Juan Sebastián Elcano",
    modernCountry: "África do Sul",
    description:
      "Após quase dois meses lutando contra ventos contrários brutais, a Victoria contorna o Cabo das Tormentas e ingressa no Atlântico com casco vazando.",
    historicalEvent: "Superação do Cabo da Boa Esperança em estado crítico de flutuabilidade.",
    milestoneTitle: "Superação do Cabo da Boa Esperança",
    quoteFromPigafetta:
      "Dobramos esse cabo a dezenove de maio, com grandíssimo trabalho, pois os ventos nos eram contrários e o navio vazava por muitos lugares.",
    pigafettaDiary:
      "Dobramos esse cabo com grandíssimo trabalho, pois os ventos nos eram contrários e o navio vazava por muitos lugares.",
    vesselStatus: "Nau Victoria entra no Atlântico Sul.",
  },
  {
    id: "SANLUCAR_RETURN",
    order: 17,
    name: "Sanlúcar de Barrameda / Sevilha (Retorno)",
    lat: 36.78,
    lng: -6.35,
    date: "06/09/1522",
    calendarDate: "1522-09-06",
    dayOfVoyage: 1082,
    daysAtSea: 1082,
    leaguesNavigated: 14460,
    vessel: "Nau Victoria",
    commander: "Juan Sebastián Elcano",
    modernCountry: "Espanha",
    description:
      "A Nau Victoria atraca em Sanlúcar com dezoito homens sobreviventes esquálidos. Três dias depois sobem a Sevilha, comprovando fisicamente a circum-navegação da Terra.",
    historicalEvent: "Conclusão vitoriosa da primeira circum-navegação da Terra na história humana.",
    milestoneTitle: "Retorno Triunfal da Nau Victoria (1522)",
    quoteFromPigafetta:
      "No sábado, 6 de setembro de 1522, entramos na baía de Sanlúcar com apenas dezoito homens, a maior parte enfermos, dos sessenta que haviam saído das Molucas na Victoria... Graças à Providência Divina, tínhamos dado a volta ao mundo inteiro.",
    pigafettaDiary:
      "No sábado, 6 de setembro de 1522, entramos na baía de Sanlúcar com apenas dezoito homens na Victoria. Graças à Providência Divina, tínhamos dado a volta ao mundo inteiro.",
    vesselStatus: "Nau Victoria atraca triunfalmente; missão cumprida.",
  },
];

export const MAGELLAN_LOGBOOK_ENTRIES: LogbookEntry[] = [
  {
    date: "20/09/1519",
    location: "Sanlúcar de Barrameda",
    event: "Zarpada de 5 naus com 270 tripulantes sob a bênção imperial de Carlos V.",
    excerptPigafetta: "Fizemo-nos ao mar oceano sob ventos favoráveis.",
  },
  {
    date: "13/12/1519",
    location: "Baía de Guanabara, Brasil",
    event: "Primeira escala prolongada em terras sul-americanas e banquete de frutas tropicais.",
    excerptPigafetta: "Por um anzol deram-nos cinco ou seis galinhas e batatas.",
  },
  {
    date: "01/04/1520",
    location: "Porto São Julião, Patagônia",
    event: "Motim sangrento dos fidalgos espanhóis contido por Magalhães.",
    excerptPigafetta: "A firmeza de Magalhães salvou a armada da anarquia total.",
  },
  {
    date: "28/11/1520",
    location: "Estreito de Magalhães",
    event: "Saída no Oceano Pacífico após 38 dias em labirintos de gelo.",
    excerptPigafetta: "O capitão-mor chorou de alegria ao avistar o Mar do Sul.",
  },
  {
    date: "27/04/1521",
    location: "Mactan, Filipinas",
    event: "Batalha fatídica contra Lapu-Lapu e morte do capitão-mor Fernão de Magalhães.",
    excerptPigafetta: "Mataram o nosso espelho, a nossa luz e o nosso guia.",
  },
  {
    date: "08/11/1521",
    location: "Tidore, Ilhas Molucas",
    event: "Chegada às Ilhas das Especiarias e carregamento total de cravo.",
    excerptPigafetta: "Atingimos o objetivo de nossa longa e dolorosa travessia.",
  },
  {
    date: "06/09/1522",
    location: "Sanlúcar de Barrameda",
    event: "Retorno de Juan Sebastián Elcano e 18 sobreviventes a bordo da Nau Victoria.",
    excerptPigafetta: "Completamos a primeira volta ao redor de toda a redondeza da Terra.",
  },
];

export const HISTORICAL_ROUTES: Record<string, HistoricalRouteDefinition> = {
  "magellan-1519": {
    id: "magellan-1519",
    title: "A Primeira Circum-navegação da Terra (1519–1522)",
    subtitle: "A Odisseia da Armada das Molucas por Fernão de Magalhães e Juan Sebastián Elcano",
    type: "MARITIME",
    startYear: 1519,
    endYear: 1522,
    commander: "Fernão de Magalhães & Juan Sebastián Elcano",
    flagCountry: "ESP",
    vessels: ["Trinidad", "San Antonio", "Concepción", "Victoria", "Santiago"],
    fleet: MAGELLAN_FLEET,
    survivorsCount:
      "18 de ~270 tripulantes na Nau Victoria (mais 12 detidos em Cabo Verde repatriados posteriormente)",
    totalDistanceKm: 60440,
    durationDays: 1084,
    description:
      "A mais formidável proeza de navegação da história da humanidade. Patrocinada pela Coroa Espanhola, a expedição partiu com cinco naus para encontrar uma passagem ocidental para as Ilhas das Especiarias (Molucas), cruzou o Atlântico, descobriu o estreito interoceânico na América do Sul, realizou a primeira travessia europeia documentada do Oceano Pacífico e concluiu o primeiro giro completo ao redor do globo terrestre.",
    waypoints: MAGELLAN_WAYPOINTS,
    logbookEntries: MAGELLAN_LOGBOOK_ENTRIES,
    citations: [
      {
        authors: "Pigafetta, Antonio",
        title: "Relazione del primo viaggio intorno al mondo",
        publication: "Manuscrito original publicado postumamente / Edição Crítica",
        year: 1525,
      },
      {
        authors: "Bergreen, Laurence",
        title:
          "Over the Edge of the World: Magellan's Terrifying Circumnavigation of the Globe",
        publication: "HarperCollins",
        year: 2003,
      },
      {
        authors: "Zweig, Stefan",
        title: "Magalhães: O Homem e o Seu Feito",
        publication: "Herbert Reichner Verlag / Edições Zahar",
        year: 1938,
      },
    ],
    dossierMarkdown: `## A Primeira Circum-navegação da Terra (1519–1522)

### 1. O Projeto e o Tratado de Tordesilhas
No início do século XVI, a riqueza do comércio mundial estava concentrada nas especiarias do sudeste asiático — principalmente o cravo-da-índia e a noz-moscada, especiarias raras valendo mais que o seu peso em ouro na Europa. Pelo **Tratado de Tordesilhas (1494)**, a rota oriental contornando a África pertencia exclusivamente a Portugal.

O navegador português **Fernão de Magalhães**, convencido de que as Ilhas Molucas situavam-se no hemisfério espanhol de Tordesilhas e de que existia um passo marítimo ligando o Atlântico ao Mar do Sul (Oceano Pacífico), apresentou sua proposta ao jovem rei Carlos I de Espanha (futuro imperador Carlos V), que financiou a **Armada das Molucas** composta por cinco navios.

### 2. A Travessia dos Mares Desconhecidos
A jornada enfrentou todos os limites físicos e psicológicos humanos:
- **O Labirinto Patagônico**: Em outubro de 1520, Magalhães descobriu a passagem tempestuosa de 570 km que hoje ostenta seu nome, cortando os fiordes austrais da América do Sul.
- **O Vazio do Pacífico**: Três meses e vinte dias de navegação ininterrupta pelo maior oceano do planeta, sem suprimentos frescos, culminando em mortes maciças por escorbuto.
- **A Batalha de Mactan**: Nas Filipinas, o líder Magalhães foi morto ao tentar subjugar o cacique local Lapu-Lapu com armas de fogo em águas rasas desfavoráveis.

### 3. O Retorno Heróico de Elcano
Sob o comando de **Juan Sebastián Elcano**, a solitária *Nau Victoria* carregou toneladas de cravo nas Molucas e empreendeu uma fuga desesperada pelo Oceano Índico meridional, navegando em segredo para não ser interceptada pelas frotas portuguesas. Três anos após a partida, dezoito sobreviventes retornaram a Sevilha, provando fisicamente pela primeira vez que a Terra é uma esfera contínua e navegável.`,
  },
};

export const MAGELLAN_ROUTE: HistoricalRouteDefinition = HISTORICAL_ROUTES["magellan-1519"];

/**
 * Recupera os metadados de uma rota histórica pelo seu identificador.
 */
export function getHistoricalRoute(
  routeId: string | null | undefined
): HistoricalRouteDefinition | null {
  if (!routeId) return null;
  return HISTORICAL_ROUTES[routeId] ?? null;
}

/**
 * Cálculo da distância total percorrida somando os segmentos de grande círculo (Haversine).
 */
export function calculateRouteDistanceKm(waypoints: RouteWaypoint[]): number {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) return 0;
  const EARTH_RADIUS_KM = 6371.0;
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if (
      !p1 ||
      !p2 ||
      typeof p1.lat !== "number" ||
      typeof p1.lng !== "number" ||
      typeof p2.lat !== "number" ||
      typeof p2.lng !== "number" ||
      !Number.isFinite(p1.lat) ||
      !Number.isFinite(p1.lng) ||
      !Number.isFinite(p2.lat) ||
      !Number.isFinite(p2.lng)
    ) {
      continue;
    }

    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;

    let dLngDeg = p2.lng - p1.lng;
    if (dLngDeg > 180) dLngDeg -= 360;
    if (dLngDeg < -180) dLngDeg += 360;
    const dLng = (dLngDeg * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalKm += EARTH_RADIUS_KM * c;
  }

  return Math.round(totalKm);
}

/**
 * Interpolação esférica geodésica contínua para trajetórias de navegação Three.js.
 * Utiliza o slerp tridimensional rigoroso no espaço esférico unitário, garantindo
 * fidelidade cartográfica sem distorções no anti-meridiano do Pacífico.
 */
export function interpolateGeodesicSegment(
  p1: { lat: number; lng: number } | null | undefined,
  p2: { lat: number; lng: number } | null | undefined,
  steps: number = 8
): Array<{ lat: number; lng: number }> {
  if (
    !p1 ||
    !p2 ||
    typeof p1.lat !== "number" ||
    typeof p1.lng !== "number" ||
    typeof p2.lat !== "number" ||
    typeof p2.lng !== "number" ||
    !Number.isFinite(p1.lat) ||
    !Number.isFinite(p1.lng) ||
    !Number.isFinite(p2.lat) ||
    !Number.isFinite(p2.lng)
  ) {
    return [];
  }

  if (steps < 1) {
    return [{ lat: p1.lat, lng: p1.lng }];
  }

  const v1 = latLngToVector3(p1.lat, p1.lng, 1.0);
  const v2 = latLngToVector3(p2.lat, p2.lng, 1.0);
  const result: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const v = slerpVectors(v1, v2, t);
    const pt = vector3ToLatLng(v);
    result.push(pt);
  }

  return result;
}

/**
 * Recupera um waypoint histórico específico pelo seu identificador na rota.
 */
export function findRouteWaypoint(
  waypointId: string,
  routeId: string = "magellan-1519"
): RouteWaypoint | null {
  if (!waypointId) return null;
  const route = getHistoricalRoute(routeId);
  if (!route) return null;
  const targetId = waypointId.trim().toUpperCase();
  return (
    route.waypoints.find(
      (w) => w.id === waypointId || w.id.toUpperCase() === targetId
    ) ?? null
  );
}
