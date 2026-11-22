/**
 * Link da fonte primária a partir do nome da fonte e do código do indicador (T35): fora de
 * `citations.ts` (formatos ABNT/APA/MLA/BibTeX), que só o modal de citação usa.
 */
export function getSourceUrl(source?: string, indicatorCode?: string): string {
  if (source && (source.startsWith("http://") || source.startsWith("https://"))) {
    return source;
  }

  const s = (source || "").toLowerCase().trim();

  // World Bank indicator codes
  if (indicatorCode) {
    if (indicatorCode === "UNDP.HDI") {
      return "https://hdr.undp.org/data-center/human-development-index";
    }
    if (
      s.includes("banco mundial") ||
      s.includes("world bank") ||
      s.includes("bm") ||
      indicatorCode.startsWith("NY.") ||
      indicatorCode.startsWith("SP.") ||
      indicatorCode.startsWith("MS.") ||
      indicatorCode.startsWith("AG.") ||
      indicatorCode.startsWith("EG.") ||
      indicatorCode.startsWith("EN.")
    ) {
      return `https://data.worldbank.org/indicator/${indicatorCode}`;
    }
  }

  if (s.includes("banco mundial") || s.includes("world bank") || s.includes("bm")) {
    return "https://data.worldbank.org/";
  }
  if (s.includes("pnud") || s.includes("undp") || s.includes("hdr")) {
    return "https://hdr.undp.org/data-center/human-development-index";
  }
  if (s.includes("oms") || s.includes("who") || s.includes("gho")) {
    return "https://www.who.int/data/gho";
  }
  if (s.includes("sipri")) {
    return "https://www.sipri.org/databases/milex";
  }
  if (s.includes("natural earth")) {
    return "https://www.naturalearthdata.com/";
  }
  if (s.includes("maddison")) {
    return "https://www.rug.nl/ggdc/historicaldevelopment/maddison/";
  }
  if (s.includes("correlates of war") || s.includes("cow")) {
    return "https://correlatesofwar.org/";
  }
  if (s.includes("ibge")) {
    return "https://www.ibge.gov.br/";
  }
  if (s.includes("ecb") || s.includes("bce") || s.includes("european central bank")) {
    return "https://www.ecb.europa.eu/";
  }
  if (s.includes("nasa")) {
    return "https://www.nasa.gov/";
  }
  if (s.includes("cern")) {
    return "https://home.cern/";
  }
  if (s.includes("census")) {
    return "https://www.census.gov/";
  }
  if (s.includes("bea")) {
    return "https://www.bea.gov/";
  }
  if (s.includes("destatis")) {
    return "https://www.destatis.de/";
  }
  if (s.includes("stats sa")) {
    return "https://www.statssa.gov.za/";
  }
  if (s.includes("e-stat")) {
    return "https://www.e-stat.go.jp/";
  }
  if (s.includes("capmas")) {
    return "https://www.capmas.gov.eg/";
  }
  if (s.includes("ihgb")) {
    return "https://ihgb.org.br/";
  }
  if (s.includes("arquivo nacional")) {
    return "https://www.gov.br/arquivonacional/";
  }
  if (s.includes("congresso nacional")) {
    return "https://www.congressonacional.leg.br/";
  }
  if (s.includes("bundestag")) {
    return "https://www.bundestag.de/";
  }
  if (s.includes("bundesarchiv")) {
    return "https://www.bundesarchiv.de/";
  }
  if (s.includes("usgs")) {
    return "https://www.usgs.gov/";
  }
  if (s.includes("cdc")) {
    return "https://www.cdc.gov/";
  }
  if (s.includes("mhlw")) {
    return "https://www.mhlw.go.jp/";
  }
  if (s.includes("banco central") || s.includes("bcb")) {
    return "https://www.bcb.gov.br/";
  }
  if (s.includes("federal reserve") || s.includes("fed")) {
    return "https://www.federalreserve.gov/";
  }
  if (s.includes("nelson mandela")) {
    return "https://www.nelsonmandela.org/";
  }
  if (s.includes("jr central")) {
    return "https://global.jr-central.co.jp/";
  }
  if (s.includes("japão") && s.includes("arquivo")) {
    return "https://www.archives.go.jp/";
  }
  if (s.includes("eurostat")) {
    return "https://ec.europa.eu/eurostat";
  }
  if (s.includes("oecd") || s.includes("ocde")) {
    return "https://www.oecd.org/";
  }
  if (s.includes("imf") || s.includes("fmi")) {
    return "https://www.imf.org/";
  }
  if (s.includes("unesco")) {
    return "https://www.unesco.org/";
  }
  if (s.includes("fao")) {
    return "https://www.fao.org/";
  }
  if (s.includes("wto") || s.includes("omc")) {
    return "https://www.wto.org/";
  }
  if (s.includes("nara") || s.includes("national archives")) {
    return "https://www.archives.gov/";
  }
  if (s.includes("onu") || s.includes("un ") || s.includes("united nations") || s.includes("dppa")) {
    return "https://data.un.org/";
  }

  return "https://data.un.org/";
}
