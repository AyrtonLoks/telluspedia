/**
 * Mapa de menções a países no texto corrido do Reader Mode para preview em hover.
 * Mantido em módulo dedicado do Reader (chunk lazy) para não impactar `/`.
 */

export const COUNTRY_NAME_TO_ISO: Readonly<Record<string, string>> = {
  Brasil: "BRA",
  Brazil: "BRA",
  Alemanha: "DEU",
  Germany: "DEU",
  "Estados Unidos": "USA",
  "United States": "USA",
  Japão: "JPN",
  Japan: "JPN",
  "África do Sul": "ZAF",
  "South Africa": "ZAF",
  Egito: "EGY",
  Egypt: "EGY",
  Canadá: "CAN",
  Canada: "CAN",
  França: "FRA",
  France: "FRA",
  "Reino Unido": "GBR",
  "United Kingdom": "GBR",
  Itália: "ITA",
  Italy: "ITA",
  Espanha: "ESP",
  Spain: "ESP",
  Portugal: "PRT",
  Angola: "AGO",
  Moçambique: "MOZ",
  Mozambique: "MOZ",
  "Guiné-Bissau": "GNB",
  "Guinea-Bissau": "GNB",
  "Timor-Leste": "TLS",
  China: "CHN",
  Índia: "IND",
  India: "IND",
  "Coreia do Sul": "KOR",
  "South Korea": "KOR",
  Rússia: "RUS",
  Russia: "RUS",
  Austrália: "AUS",
  Australia: "AUS",
  Indonésia: "IDN",
  Indonesia: "IDN",
  Turquia: "TUR",
  Türkiye: "TUR",
  "Arábia Saudita": "SAU",
  "Saudi Arabia": "SAU",
  Argentina: "ARG",
  México: "MEX",
  Mexico: "MEX",
  Chile: "CHL",
  Colômbia: "COL",
  Colombia: "COL",
  Peru: "PER",
  Uruguai: "URY",
  Uruguay: "URY",
  Polônia: "POL",
};

const SORTED_COUNTRY_NAMES = Object.keys(COUNTRY_NAME_TO_ISO)
  .sort((a, b) => b.length - a.length)
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export function createReaderTokenRegex(): RegExp {
  return new RegExp(`(\\[\\d+\\]|\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|${SORTED_COUNTRY_NAMES})`, "g");
}
