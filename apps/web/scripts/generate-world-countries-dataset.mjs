import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as topojson from "topojson-client";
import { geoCentroid } from "d3-geo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load Natural Earth 1:110m Cultural Vectors from installed world-atlas package
const topoPath = require.resolve("world-atlas/countries-110m.json");
const pkgPath = require.resolve("world-atlas/package.json");
const worldAtlasPkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const topo = JSON.parse(readFileSync(topoPath, "utf8"));
const fc = topojson.feature(topo, topo.objects.countries);

// Official ISO 3166-1 numeric (zero-padded) -> alpha-3
const NUMERIC_TO_ISO3 = {
  "004": "AFG", "008": "ALB", "010": "ATA", "012": "DZA", "024": "AGO", "031": "AZE", "032": "ARG", "036": "AUS",
  "040": "AUT", "044": "BHS", "050": "BGD", "051": "ARM", "056": "BEL", "064": "BTN", "068": "BOL", "070": "BIH",
  "072": "BWA", "076": "BRA", "084": "BLZ", "090": "SLB", "096": "BRN", "100": "BGR", "104": "MMR", "108": "BDI",
  "112": "BLR", "116": "KHM", "120": "CMR", "124": "CAN", "140": "CAF", "144": "LKA", "148": "TCD", "152": "CHL",
  "156": "CHN", "158": "TWN", "170": "COL", "178": "COG", "180": "COD", "188": "CRI", "191": "HRV", "192": "CUB",
  "196": "CYP", "203": "CZE", "204": "BEN", "208": "DNK", "214": "DOM", "218": "ECU", "222": "SLV", "226": "GNQ",
  "231": "ETH", "232": "ERI", "233": "EST", "238": "FLK", "242": "FJI", "246": "FIN", "250": "FRA", "260": "ATF",
  "262": "DJI", "266": "GAB", "268": "GEO", "270": "GMB", "275": "PSE", "276": "DEU", "288": "GHA", "300": "GRC",
  "304": "GRL", "320": "GTM", "324": "GIN", "328": "GUY", "332": "HTI", "340": "HND", "348": "HUN", "352": "ISL",
  "356": "IND", "360": "IDN", "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR", "380": "ITA", "384": "CIV",
  "388": "JAM", "392": "JPN", "398": "KAZ", "400": "JOR", "404": "KEN", "408": "PRK", "410": "KOR", "414": "KWT",
  "417": "KGZ", "418": "LAO", "422": "LBN", "426": "LSO", "428": "LVA", "430": "LBR", "434": "LBY", "440": "LTU",
  "442": "LUX", "450": "MDG", "454": "MWI", "458": "MYS", "466": "MLI", "478": "MRT", "484": "MEX", "496": "MNG",
  "498": "MDA", "499": "MNE", "504": "MAR", "508": "MOZ", "512": "OMN", "516": "NAM", "524": "NPL", "528": "NLD",
  "540": "NCL", "548": "VUT", "554": "NZL", "558": "NIC", "562": "NER", "566": "NGA", "578": "NOR", "586": "PAK",
  "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER", "608": "PHL", "616": "POL", "620": "PRT", "624": "GNB",
  "626": "TLS", "630": "PRI", "634": "QAT", "642": "ROU", "643": "RUS", "646": "RWA", "682": "SAU", "686": "SEN",
  "688": "SRB", "694": "SLE", "703": "SVK", "704": "VNM", "705": "SVN", "706": "SOM", "710": "ZAF", "716": "ZWE",
  "724": "ESP", "728": "SSD", "729": "SDN", "732": "ESH", "740": "SUR", "748": "SWZ", "752": "SWE", "756": "CHE",
  "760": "SYR", "762": "TJK", "764": "THA", "768": "TGO", "780": "TTO", "784": "ARE", "788": "TUN", "792": "TUR",
  "795": "TKM", "800": "UGA", "804": "UKR", "807": "MKD", "818": "EGY", "826": "GBR", "834": "TZA", "840": "USA",
  "854": "BFA", "858": "URY", "860": "UZB", "862": "VEN", "887": "YEM", "894": "ZMB",
};

const SPECIAL_NAME_TO_ISO3 = {
  "N. Cyprus": "CYN",
  "Somaliland": "SOM",
  "Kosovo": "XKX",
};

// Complete ISO 3166-1 alpha-3 -> alpha-2
const ISO3_TO_ISO2 = {
  AFG: "AF", ALB: "AL", ATA: "AQ", DZA: "DZ", AND: "AD", AGO: "AO", ATG: "AG", ARG: "AR", ARM: "AM", ATF: "TF",
  AUS: "AU", AUT: "AT", AZE: "AZ", BHS: "BS", BHR: "BH", BGD: "BD", BRB: "BB", BLR: "BY", BEL: "BE", BLZ: "BZ",
  BEN: "BJ", BTN: "BT", BOL: "BO", BIH: "BA", BWA: "BW", BRA: "BR", BRN: "BN", BGR: "BG", BFA: "BF", BDI: "BI",
  CPV: "CV", KHM: "KH", CMR: "CM", CAN: "CA", CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", COL: "CO", COM: "KM",
  COG: "CG", COD: "CD", CRI: "CR", CIV: "CI", HRV: "HR", CUB: "CU", CYP: "CY", CZE: "CZ", DNK: "DK", DJI: "DJ",
  DMA: "DM", DOM: "DO", ECU: "EC", EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", ESH: "EH", EST: "EE", SWZ: "SZ",
  ETH: "ET", FJI: "FJ", FIN: "FI", FLK: "FK", FRA: "FR", GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE", GHA: "GH",
  GRC: "GR", GRD: "GD", GRL: "GL", GTM: "GT", GUF: "GF", GIN: "GN", GNB: "GW", GUY: "GY", HTI: "HT", HND: "HN",
  HUN: "HU", ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ", IRL: "IE", ISR: "IL", ITA: "IT", JAM: "JM",
  JPN: "JP", JOR: "JO", KAZ: "KZ", KEN: "KE", KIR: "KI", PRK: "KP", KOR: "KR", KWT: "KW", KGZ: "KG", LAO: "LA",
  LVA: "LV", LBN: "LB", LSO: "LS", LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT", LUX: "LU", MDG: "MG", MWI: "MW",
  MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MHL: "MH", MRT: "MR", MUS: "MU", MEX: "MX", FSM: "FM", MDA: "MD",
  MCO: "MC", MNG: "MN", MNE: "ME", MAR: "MA", MOZ: "MZ", MMR: "MM", NAM: "NA", NCL: "NC", NRU: "NR", NPL: "NP",
  NLD: "NL", NZL: "NZ", NIC: "NI", NER: "NE", NGA: "NG", MKD: "MK", NOR: "NO", OMN: "OM", PAK: "PK", PLW: "PW",
  PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE", PHL: "PH", POL: "PL", PRI: "PR", PRT: "PT", PSE: "PS", QAT: "QA",
  ROU: "RO", RUS: "RU", RWA: "RW", KNA: "KN", LCA: "LC", VCT: "VC", WSM: "WS", SMR: "SM", STP: "ST", SAU: "SA",
  SEN: "SN", SRB: "RS", SYC: "SC", SLE: "SL", SGP: "SG", SVK: "SK", SVN: "SI", SLB: "SB", SOM: "SO", ZAF: "ZA",
  SSD: "SS", ESP: "ES", LKA: "LK", SDN: "SD", SUR: "SR", SWE: "SE", CHE: "CH", SYR: "SY", TWN: "TW", TJK: "TJ",
  TZA: "TZ", THA: "TH", TLS: "TL", TGO: "TG", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM", TUV: "TV",
  UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB", USA: "US", URY: "UY", UZB: "UZ", VUT: "VU", VEN: "VE", VNM: "VN",
  YEM: "YE", ZMB: "ZM", ZWE: "ZW", XKX: "XK",
};

// Official UN Portuguese names where CLDR uses a disambiguation hyphen form
const PT_NAME_OVERRIDES = {
  COD: "República Democrática do Congo",
  CYN: "Chipre do Norte",
};

const displayNamesPt = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const entries = {};

for (const feature of fc.features) {
  const numericCode = feature.id !== undefined && feature.id !== null ? String(feature.id).padStart(3, "0") : null;
  const neName = feature.properties?.name || "";
  const isoCode = (numericCode && NUMERIC_TO_ISO3[numericCode]) || SPECIAL_NAME_TO_ISO3[neName];
  if (!isoCode) continue;

  // Keep the primary numeric-ID feature when both SOM (706) and Somaliland map to SOM
  if (entries[isoCode] && !numericCode) continue;

  const iso2 = ISO3_TO_ISO2[isoCode] || "";
  const [lng, lat] = geoCentroid(feature);
  const cldrName = iso2 ? displayNamesPt.of(iso2) : undefined;
  const nameCommon = PT_NAME_OVERRIDES[isoCode] || cldrName || neName;

  entries[isoCode] = {
    isoCode,
    iso2,
    numericCode,
    nameCommon,
    nameNaturalEarth: neName,
    latitude: Number.isFinite(lat) ? Number(lat.toFixed(4)) : null,
    longitude: Number.isFinite(lng) ? Number(lng.toFixed(4)) : null,
    flagSvgUrl: iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : "",
  };
}

// Explicit territory present in South American timezone catalog (part of FRA multipolygon in 110m)
if (!entries.GUF) {
  entries.GUF = {
    isoCode: "GUF",
    iso2: "GF",
    numericCode: "254",
    nameCommon: displayNamesPt.of("GF") || "Guiana Francesa",
    nameNaturalEarth: "French Guiana",
    latitude: 3.9339,
    longitude: -53.1258,
    flagSvgUrl: "https://flagcdn.com/gf.svg",
  };
}

const sortedCountries = Object.fromEntries(
  Object.keys(entries)
    .sort()
    .map((k) => [k, entries[k]])
);

const output = {
  metadata: {
    source: `Natural Earth 1:110m Cultural Vectors (world-atlas@${worldAtlasPkg.version}) + ISO 3166-1 / Unicode CLDR (pt-BR)`,
    sourceUrl: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/",
    referenceDate: "2026-11-20",
    license: "Public Domain (Natural Earth) / Unicode License (CLDR)",
    countryCount: Object.keys(sortedCountries).length,
    notes:
      "Centroides geográficos calculados sobre polígonos Natural Earth 1:110m via d3-geo (geoCentroid). Nomes em português derivados do padrão Unicode CLDR (Intl.DisplayNames pt-BR) e bandeiras via FlagCDN (ISO 3166-1 alpha-2). Não inclui indicadores socioeconômicos.",
  },
  countries: sortedCountries,
};

const outPath = path.resolve(__dirname, "../public/data/countries-ne-110m.json");
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`Generated ${outPath} with ${output.metadata.countryCount} entries.`);
