/**
 * T33 — SEO técnico & PWA: robots.ts, sitemap.ts dinâmico (177 países + dossiês),
 * manifest.ts (#05070B) e JSON-LD (WebApplication, Country/Place, Article).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, test, type TestContext } from "node:test";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import manifest from "../src/app/manifest";
import { JsonLdScript } from "../src/components/seo/JsonLdScript";
import { getCountryData, WORLD_COUNTRIES_CATALOG } from "../src/lib/country-data";
import { getPublishedDossier, getPublishedDossierSlugs } from "../src/lib/dossiers-catalog";
import {
  buildCountryJsonLd,
  buildDossierArticleJsonLd,
  buildWebApplicationJsonLd,
  getSiteOrigin,
  serializeJsonLd,
} from "../src/lib/seo";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

function withAppUrl(t: TestContext, value: string | undefined) {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = value;
  t.after(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prev;
  });
}

describe("T33 · robots.ts, sitemap.ts e manifest.ts", () => {
  test("robots.ts bloqueia /dev/ui e /api/ e aponta para sitemap.xml", (t) => {
    withAppUrl(t, "https://telluspedia.org/");
    const result = robots();
    assert.equal(result.sitemap, "https://telluspedia.org/sitemap.xml");
    assert.equal(result.host, "https://telluspedia.org");
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallow = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : []
    );
    assert.ok(disallow.includes("/dev/ui"), "robots deve bloquear /dev/ui");
    assert.ok(disallow.includes("/api/"), "robots deve bloquear /api/");
  });

  test("sitemap.ts inclui /, /compare, /telluslab, todos os 177 países e todos os dossiês publicados sem /dev/ui", (t) => {
    withAppUrl(t, "https://telluspedia.org");
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    const uniqueUrls = new Set(urls);

    assert.equal(uniqueUrls.size, urls.length, "sitemap não deve conter URLs duplicadas");
    assert.ok(uniqueUrls.has("https://telluspedia.org/"));
    assert.ok(uniqueUrls.has("https://telluspedia.org/compare"));
    assert.ok(uniqueUrls.has("https://telluspedia.org/telluslab"));

    const expectedCountries = Object.keys(WORLD_COUNTRIES_CATALOG);
    assert.equal(expectedCountries.length, 177);
    for (const iso of expectedCountries) {
      assert.ok(uniqueUrls.has(`https://telluspedia.org/pais/${iso}`), `faltou /pais/${iso}`);
    }

    const expectedDossiers = getPublishedDossierSlugs();
    assert.ok(expectedDossiers.length >= 9);
    for (const slug of expectedDossiers) {
      assert.ok(uniqueUrls.has(`https://telluspedia.org/dossies/${slug}`), `faltou /dossies/${slug}`);
    }

    assert.equal(urls.length, 3 + expectedCountries.length + expectedDossiers.length);
    for (const url of urls) {
      assert.doesNotThrow(() => new URL(url), `URL inválida no sitemap: ${url}`);
      assert.doesNotMatch(url, /\/dev\/ui|\/api\//, `URL interna não pode estar no sitemap: ${url}`);
    }
  });

  test("manifest.ts define PWA com tema #05070B e ícone SVG existente", () => {
    const m = manifest();
    assert.equal(m.short_name, "TellusPedia");
    assert.equal(m.start_url, "/");
    assert.equal(m.display, "standalone");
    assert.equal(m.theme_color, "#05070B");
    assert.equal(m.background_color, "#05070B");
    assert.equal(m.lang, "pt-BR");
    assert.ok(Array.isArray(m.icons) && m.icons.length >= 1);
    assert.equal(m.icons[0].src, "/icon.svg");
    assert.ok(fs.existsSync(path.join(webRoot, "src/app/icon.svg")), "src/app/icon.svg deve existir");
  });
});

describe("T33 · JSON-LD seguro (WebApplication, Country/Place, Article)", () => {
  test("getSiteOrigin rejeita protocolos inseguros e normaliza origem", () => {
    assert.equal(getSiteOrigin("https://telluspedia.org/caminho/extra"), "https://telluspedia.org");
    assert.equal(getSiteOrigin("javascript:alert(1)"), "http://localhost:3000");
    assert.equal(getSiteOrigin("not-a-url"), "http://localhost:3000");
  });

  test("serializeJsonLd escapa </script> e caracteres especiais impedindo XSS", () => {
    const payload = serializeJsonLd({
      "@context": "https://schema.org",
      name: "Teste </script><script>alert('xss')</script> & \u2028\u2029",
    });
    assert.doesNotMatch(payload, /<\/script>/i);
    assert.doesNotMatch(payload, /</);
    assert.doesNotMatch(payload, />/);
    assert.doesNotMatch(payload, /&/);
    const parsed = JSON.parse(payload) as { name: string };
    assert.match(parsed.name, /Teste <\/script>/);
  });

  test("builders geram JSON-LD válido para Home, País (piloto e não-piloto) e Dossiê", () => {
    const origin = "https://telluspedia.org";

    const homeLd = buildWebApplicationJsonLd(origin);
    assert.equal(homeLd["@context"], "https://schema.org");
    assert.equal(homeLd["@type"], "WebApplication");
    assert.equal(homeLd.url, origin);

    for (const iso of ["BRA", "ARG"]) {
      const country = getCountryData(iso);
      assert.ok(country, `país ${iso} deve existir`);
      const countryLd = buildCountryJsonLd(country, origin);
      assert.deepEqual(countryLd["@type"], ["Country", "Place"]);
      assert.equal(countryLd.identifier, iso);
      assert.equal(countryLd.url, `${origin}/pais/${iso}`);
      assert.ok(countryLd.geo && typeof countryLd.geo === "object");
    }

    const dossier = getPublishedDossier("astronomia-optica");
    assert.ok(dossier);
    const articleLd = buildDossierArticleJsonLd(dossier, origin);
    assert.equal(articleLd["@type"], "Article");
    assert.equal(articleLd.headline, dossier.title);
    assert.equal(articleLd.url, `${origin}/dossies/astronomia-optica`);

    const html = renderToStaticMarkup(<JsonLdScript data={homeLd} />);
    assert.match(html, /^<script type="application\/ld\+json">[\s\S]+<\/script>$/);
  });

  test("page.tsx, pais/[iso]/page.tsx e dossies/[slug]/page.tsx incluem JsonLdScript", () => {
    assert.match(read("src/app/page.tsx"), /JsonLdScript[\s\S]*buildWebApplicationJsonLd/);
    assert.match(read("src/app/pais/[iso]/page.tsx"), /JsonLdScript[\s\S]*buildCountryJsonLd/);
    assert.match(read("src/app/dossies/[slug]/page.tsx"), /JsonLdScript[\s\S]*buildDossierArticleJsonLd/);
  });
});
