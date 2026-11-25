import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCountryData } from "@/lib/country-data";
import {
  EDITORIAL_COUNTRY_ISOS,
  EDITORIAL_COUNTRY_PACK,
  RN13_CORE_DIMENSIONS,
  hasEditorialProfile,
  type EditorialPackId,
} from "@/lib/editorial-registry";
import {
  buildLocalizedDossierSections,
  getEditorialProfileSync,
  loadEditorialPack,
  loadEditorialProfile,
  resetEditorialCacheForTest,
} from "@/lib/editorial-loader";
import { ReaderContent } from "@/components/reader/ReaderContent";
import { useLocaleStore } from "@/stores/localeStore";

const ALL_PACK_IDS: EditorialPackId[] = [
  "pilots",
  "g20-asia-oceania",
  "g20-europe-northamerica",
  "lusophony",
  "latin-america",
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_URL_RE = /^https:\/\/[^\s]+$/;

function hasDivInsideParagraph(html: string): boolean {
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    if (/<div\b/i.test(match[1])) {
      return true;
    }
  }
  return false;
}

test("D35: catálogo editorial cobre >= 26 países (29 no total) e todos existem em Natural Earth", () => {
  assert.ok(
    EDITORIAL_COUNTRY_ISOS.length >= 26,
    `Esperado >= 26 países curados, obtido ${EDITORIAL_COUNTRY_ISOS.length}`
  );
  assert.equal(EDITORIAL_COUNTRY_ISOS.length, 29);

  for (const iso of EDITORIAL_COUNTRY_ISOS) {
    assert.equal(hasEditorialProfile(iso), true, `hasEditorialProfile(${iso}) deveria ser true`);
    const country = getCountryData(iso);
    assert.ok(country, `País ${iso} precisa existir no catálogo mundial (getCountryData)`);
    assert.equal(country.isoCode, iso);
  }
});

test("D35: todos os 5 pacotes lazy auditam 29 países × 7 dimensões RN13 em pt-BR e en com fontes HTTPS válidas", async () => {
  resetEditorialCacheForTest();
  assert.equal(getEditorialProfileSync("CHN"), null, "Cache deve iniciar vazio antes do carregamento lazy");

  const loadedIsos = new Set<string>();

  for (const packId of ALL_PACK_IDS) {
    const pack = await loadEditorialPack(packId);
    const packEntries = Object.entries(pack);
    assert.ok(packEntries.length > 0, `Pacote ${packId} não pode ser vazio`);

    for (const [isoKey, record] of packEntries) {
      assert.equal(record.isoCode, isoKey, `isoCode divergente em ${packId}/${isoKey}`);
      assert.equal(
        EDITORIAL_COUNTRY_PACK[isoKey],
        packId,
        `País ${isoKey} deveria estar registrado no pacote ${packId}`
      );
      assert.match(record.referenceDate, ISO_DATE_RE, `referenceDate inválida em ${isoKey}`);
      loadedIsos.add(isoKey);

      const dims = new Set(record.sections.map((s) => s.dimension));
      for (const reqDim of RN13_CORE_DIMENSIONS) {
        assert.ok(dims.has(reqDim), `País ${isoKey} sem dimensão RN13 obrigatória: ${reqDim}`);
      }

      for (const sec of record.sections) {
        assert.ok(sec.titlePt.trim().length >= 8, `titlePt curto em ${isoKey}/${sec.dimension}`);
        assert.ok(sec.titleEn.trim().length >= 8, `titleEn curto em ${isoKey}/${sec.dimension}`);
        assert.ok(sec.contentPt.trim().length >= 100, `contentPt curto em ${isoKey}/${sec.dimension}`);
        assert.ok(sec.contentEn.trim().length >= 100, `contentEn curto em ${isoKey}/${sec.dimension}`);
        assert.ok(sec.primarySource.trim().length >= 3, `primarySource vazia em ${isoKey}/${sec.dimension}`);
        assert.match(sec.sourceUrl, HTTPS_URL_RE, `sourceUrl HTTPS inválida em ${isoKey}/${sec.dimension}`);
        assert.match(sec.referenceDate, ISO_DATE_RE, `referenceDate inválida em ${isoKey}/${sec.dimension}`);
        assert.ok(!/<div\b/i.test(sec.contentPt), `HTML <div> proibido em contentPt de ${isoKey}/${sec.dimension}`);
        assert.ok(!/<div\b/i.test(sec.contentEn), `HTML <div> proibido em contentEn de ${isoKey}/${sec.dimension}`);
        assert.ok(sec.estimatedReadMin >= 3 && sec.estimatedReadMin <= 15);
      }
    }
  }

  assert.equal(loadedIsos.size, EDITORIAL_COUNTRY_ISOS.length, "Todos os países registrados devem existir nos pacotes");
  assert.ok(getEditorialProfileSync("CHN"), "Cache em memória deve servir CHN sincronamente após load");
});

test("D35: buildLocalizedDossierSections entrega narrativas distintas em pt-BR/en e preserva sourceUrl e referenceDate", async () => {
  const chn = getCountryData("CHN");
  assert.ok(chn);
  const record = await loadEditorialProfile("CHN");
  assert.ok(record);

  const ptSections = buildLocalizedDossierSections(chn, record, "pt-BR");
  const enSections = buildLocalizedDossierSections(chn, record, "en");

  assert.equal(ptSections.length, 7);
  assert.equal(enSections.length, 7);

  const ptGeo = ptSections.find((s) => s.dimension === "GEOGRAPHY");
  const enGeo = enSections.find((s) => s.dimension === "GEOGRAPHY");
  assert.ok(ptGeo && enGeo);
  assert.notEqual(ptGeo.title, enGeo.title);
  assert.notEqual(ptGeo.contentMarkdown, enGeo.contentMarkdown);
  assert.match(ptGeo.citationsJson?.sourceUrl ?? "", HTTPS_URL_RE);
  assert.equal(ptGeo.citationsJson?.referenceDate, "2026-11-25");
  assert.equal(enGeo.citationsJson?.referenceDate, "2026-11-25");
});

test("D35: ReaderContent SSR renderiza novos países em pt-BR e en com fontes clicáveis e ZERO <div> dentro de <p>", async () => {
  const sampleIsos = ["BRA", "CHN", "PRT", "ARG", "IND", "AGO", "GBR"] as const;
  const prevLocale = useLocaleStore.getState().locale;

  try {
    for (const locale of ["pt-BR", "en"] as const) {
      useLocaleStore.setState({ locale });

      for (const iso of sampleIsos) {
        const base = getCountryData(iso);
        assert.ok(base);
        const record = await loadEditorialProfile(iso);
        assert.ok(record);
        const localized = {
          ...base,
          dossierSections: buildLocalizedDossierSections(base, record, locale),
        };

        for (const dim of RN13_CORE_DIMENSIONS) {
          const html = renderToStaticMarkup(
            React.createElement(ReaderContent, { country: localized, dimension: dim })
          );

          assert.ok(!html.includes('data-testid="reader-empty-state"'), `${iso}/${dim} (${locale}) não deveria cair em empty state`);
          assert.ok(html.includes("2026-11-25"), `${iso}/${dim} (${locale}) deve exibir data de referência`);
          assert.ok(html.includes("https://"), `${iso}/${dim} (${locale}) deve renderizar link HTTPS da fonte primária`);
          assert.equal(
            hasDivInsideParagraph(html),
            false,
            `Violação HTML5 Phrasing Content (<div> dentro de <p>) em ${iso}/${dim} (${locale})`
          );
        }
      }
    }
  } finally {
    useLocaleStore.setState({ locale: prevLocale });
  }
});

test("D35: isolamento de bundle — módulos críticos de `/` não importam estaticamente src/data/editorial", () => {
  const criticalFiles = [
    path.join(process.cwd(), "src/components/shell/GlobeExperienceShell.tsx"),
    path.join(process.cwd(), "src/lib/country-data.ts"),
    path.join(process.cwd(), "src/lib/editorial-registry.ts"),
  ];

  for (const file of criticalFiles) {
    const src = fs.readFileSync(file, "utf8");
    assert.ok(
      !src.includes("data/editorial"),
      `${path.basename(file)} não pode importar pacotes de src/data/editorial diretamente`
    );
  }
});
