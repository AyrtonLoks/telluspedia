/**
 * Códigos ISO 3166-1 alfa-3 dos 177 países do globo (as chaves de `countries-ne-110m.json`; um
 * teste garante). Para validar um país na URL sem carregar o catálogo inteiro (T35).
 */
export const COUNTRY_ISO_CODES: ReadonlySet<string> = new Set([
  "AFG", "AGO", "ALB", "ARE", "ARG", "ARM", "ATA", "ATF", "AUS", "AUT", "AZE", "BDI", "BEL", "BEN",
  "BFA", "BGD", "BGR", "BHS", "BIH", "BLR", "BLZ", "BOL", "BRA", "BRN", "BTN", "BWA", "CAF", "CAN",
  "CHE", "CHL", "CHN", "CIV", "CMR", "COD", "COG", "COL", "CRI", "CUB", "CYN", "CYP", "CZE", "DEU",
  "DJI", "DNK", "DOM", "DZA", "ECU", "EGY", "ERI", "ESH", "ESP", "EST", "ETH", "FIN", "FJI", "FLK",
  "FRA", "GAB", "GBR", "GEO", "GHA", "GIN", "GMB", "GNB", "GNQ", "GRC", "GRL", "GTM", "GUF", "GUY",
  "HND", "HRV", "HTI", "HUN", "IDN", "IND", "IRL", "IRN", "IRQ", "ISL", "ISR", "ITA", "JAM", "JOR",
  "JPN", "KAZ", "KEN", "KGZ", "KHM", "KOR", "KWT", "LAO", "LBN", "LBR", "LBY", "LKA", "LSO", "LTU",
  "LUX", "LVA", "MAR", "MDA", "MDG", "MEX", "MKD", "MLI", "MMR", "MNE", "MNG", "MOZ", "MRT", "MWI",
  "MYS", "NAM", "NCL", "NER", "NGA", "NIC", "NLD", "NOR", "NPL", "NZL", "OMN", "PAK", "PAN", "PER",
  "PHL", "PNG", "POL", "PRI", "PRK", "PRT", "PRY", "PSE", "QAT", "ROU", "RUS", "RWA", "SAU", "SDN",
  "SEN", "SLB", "SLE", "SLV", "SOM", "SRB", "SSD", "SUR", "SVK", "SVN", "SWE", "SWZ", "SYR", "TCD",
  "TGO", "THA", "TJK", "TKM", "TLS", "TTO", "TUN", "TUR", "TWN", "TZA", "UGA", "UKR", "URY", "USA",
  "UZB", "VEN", "VNM", "VUT", "XKX", "YEM", "ZAF", "ZMB", "ZWE",
]);
