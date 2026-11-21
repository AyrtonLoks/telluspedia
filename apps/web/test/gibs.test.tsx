import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GIBS_BLANK_MAX_BYTES,
  GIBS_PRODUCTS,
  GIBS_PRODUCT_IDS,
  formatGibsMonth,
  gibsGetMapUrl,
  gibsImagePath,
  isBlankGibsImage,
  latestGibsMonth,
  parseGibsRequest,
} from "../src/lib/gibs";
import { __resetGibsCache, fetchGibsImage, gibsEnvelope } from "../src/lib/gibs-source";
import { SourceUnavailableError } from "../src/lib/observatory-source";
import { GET as gibsRoute } from "../src/app/api/observatory/gibs/route";
import { GET as gibsImageRoute } from "../src/app/api/observatory/gibs/image/route";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { GibsLayerControls } from "../src/components/observatory/GibsLayerControls";

const root = path.join(__dirname, "..");
const NOW = new Date("2026-11-21T12:00:00Z");
const req = (product: string, month: string) => {
  const r = parseGibsRequest({ product, month }, NOW);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

/** PNG falso: só o tamanho e o content-type importam para o proxy. */
function pngResponse(bytes: number, init: { status?: number; type?: string } = {}) {
  return new Response(new Uint8Array(bytes), { status: init.status ?? 200, headers: { "content-type": init.type ?? "image/png" } });
}
function fakeFetch(handler: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return handler(String(input));
  }) as typeof fetch;
  return { impl, calls };
}

describe("D25 — catálogo e arquivos", () => {
  test("quatro produtos, com camada GIBS, barra de cores e referência local", () => {
    assert.deepEqual(GIBS_PRODUCT_IDS, ["ndvi", "snow", "seaice", "lst"]);
    for (const p of Object.values(GIBS_PRODUCTS)) {
      assert.match(p.gibsLayer, /^(MODIS_Terra_L3_|GHRSST_L4_MUR_)/, p.id);
      const scale = fs.readFileSync(path.join(root, "public", p.scaleImage));
      assert.equal(scale.toString("ascii", 1, 4), "PNG");
      assert.deepEqual([scale.readUInt32BE(16), scale.readUInt32BE(20)], [256, 8], `${p.id}: barra 256×8`);
      const ref = fs.readFileSync(path.join(root, "public", p.fallbackImage));
      assert.equal(ref.toString("ascii", 0, 4) + ref.toString("ascii", 8, 12), "RIFFWEBP", `${p.id}: referência WebP`);
      assert.ok(ref.length < 80_000, `${p.id}: referência leve (${ref.length} B)`);
      assert.ok(p.fallbackMonth >= p.firstMonth);
      const ats = p.scaleLabels.map((l) => l.at);
      assert.deepEqual([...ats].sort((a, b) => a - b), ats, `${p.id}: rótulos em ordem`);
      assert.ok(ats[0] === 0 && ats[ats.length - 1] === 1);
    }
  });

  test("créditos documentados", () => {
    const sources = fs.readFileSync(path.join(root, "../../docs/DATA_SOURCES.md"), "utf-8");
    assert.match(sources, /NASA GIBS/);
    for (const p of Object.values(GIBS_PRODUCTS)) assert.ok(sources.includes(p.gibsLayer), p.gibsLayer);
  });
});

describe("D25 — validação estrita do pedido", () => {
  test("último mês processado: mês retrasado até o dia 15, depois o mês passado (UTC)", () => {
    assert.equal(latestGibsMonth(new Date("2026-11-21T00:00:00Z")), "2026-10");
    assert.equal(latestGibsMonth(new Date("2026-11-15T23:00:00Z")), "2026-09");
    assert.equal(latestGibsMonth(new Date("2026-01-10T00:00:00Z")), "2025-11");
    assert.equal(latestGibsMonth(new Date("2026-02-20T00:00:00Z")), "2026-01");
  });

  test("padrões, dia do pedido e erros com motivo", () => {
    const d = parseGibsRequest({}, NOW);
    assert.ok(d.ok && d.value.product.id === "ndvi" && d.value.month === "2026-10" && d.value.time === "2026-10-01");
    assert.equal(req("seaice", "2024-09").time, "2024-09-15", "gelo marinho (diário) usa o dia 15");
    const bad = (product: string | null, month: string | null) => {
      const r = parseGibsRequest({ product, month }, NOW);
      assert.equal(r.ok, false, `${product} ${month}`);
      return r.ok ? "" : r.error;
    };
    assert.match(bad("MODIS_Terra_L3_NDVI_Monthly", "2024-07"), /Produto inválido/, "camada crua não passa");
    assert.match(bad("ndvi", "2024-7"), /AAAA-MM/);
    assert.match(bad("ndvi", "2024-13"), /AAAA-MM/);
    assert.match(bad("ndvi", "2024-07&LAYERS=x"), /AAAA-MM/, "sem injeção de parâmetros");
    assert.match(bad("ndvi", "2000-02"), /fora do intervalo/);
    assert.match(bad("seaice", "2002-05"), /fora do intervalo/);
    assert.match(bad("lst", "2026-11"), /fora do intervalo/, "mês ainda não processado");
  });

  test("GetMap do WMS 1.3.0 em EPSG:4326 (BBOX latitude, longitude), 2:1", () => {
    const url = new URL(gibsGetMapUrl(GIBS_PRODUCTS.lst, "2024-07-01"));
    assert.equal(url.origin + url.pathname, "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi");
    const q = url.searchParams;
    assert.equal(q.get("LAYERS"), "MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day");
    assert.equal(q.get("CRS"), "EPSG:4326");
    assert.equal(q.get("BBOX"), "-90,-180,90,180");
    assert.equal(q.get("TIME"), "2024-07-01");
    assert.equal(Number(q.get("WIDTH")), 2 * Number(q.get("HEIGHT")));
    assert.equal(gibsImagePath("ndvi", "2024-07"), "/api/observatory/gibs/image?product=ndvi&month=2024-07");
  });

  test("imagem vazia do GIBS (sem dado na data) vs. imagem real", () => {
    assert.ok(isBlankGibsImage(8221), "PNG transparente observado no GIBS");
    assert.ok(!isBlankGibsImage(94_817), "gelo marinho, a mais vazia das reais");
    assert.ok(GIBS_BLANK_MAX_BYTES > 8221 && GIBS_BLANK_MAX_BYTES < 94_817);
    assert.equal(formatGibsMonth("2024-07"), "julho de 2024");
  });
});

describe("D25 — proxy (envelope T05)", () => {
  beforeEach(() => __resetGibsCache());

  test("live: baixa uma vez e serve da memória; envelope aponta para a imagem do próprio TellusPedia", async () => {
    const f = fakeFetch(() => pngResponse(600_000));
    const env = await gibsEnvelope(req("ndvi", "2024-07"), f.impl, () => NOW.getTime());
    assert.equal(env.meta.source, "live");
    assert.match(env.meta.provider, /NASA GIBS .*composição mensal MODIS\/Terra/);
    assert.equal(env.data.imageUrl, "/api/observatory/gibs/image?product=ndvi&month=2024-07");
    assert.deepEqual([env.data.month, env.data.imageMonth, env.data.time], ["2024-07", "2024-07", "2024-07-01"]);
    const img = await fetchGibsImage(req("ndvi", "2024-07"), f.impl);
    assert.equal(img.bytes.byteLength, 600_000);
    assert.equal(f.calls.length, 1, "a rota da imagem reaproveita o download do envelope");
  });

  const fallbackCases: Array<[string, () => Response | Promise<Response>, RegExp]> = [
    ["imagem vazia", () => pngResponse(8221), /Sem imagem do NASA GIBS para vegetação/],
    ["HTTP 500", () => pngResponse(10, { status: 500 }), /HTTP 500/],
    ["não é PNG", () => pngResponse(900_000, { type: "text/xml" }), /não devolveu uma imagem/],
    ["tempo limite", () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" })), /Tempo limite/],
    ["rede", () => Promise.reject(new Error("ECONNRESET")), /indisponível/],
  ];
  for (const [label, handler, reason] of fallbackCases) {
    test(`fallback (${label}): referência local, com o motivo e o mês que a imagem mostra`, async () => {
      const f = fakeFetch(handler);
      const env = await gibsEnvelope(req("ndvi", "2025-04"), f.impl, () => NOW.getTime());
      assert.equal(env.meta.source, "fallback");
      assert.match(env.meta.reason ?? "", reason);
      assert.match(env.meta.reason ?? "", /referência local de 2024-07/);
      assert.equal(env.data.imageUrl, "/observatory/gibs/ndvi-ref.webp");
      assert.deepEqual([env.data.month, env.data.imageMonth], ["2025-04", "2024-07"]);
    });
  }

  test("falha fica em cache por 1 minuto (não martela o GIBS) e depois tenta de novo", async () => {
    let t = NOW.getTime();
    const f = fakeFetch(() => pngResponse(8221));
    await assert.rejects(fetchGibsImage(req("snow", "2024-01"), f.impl, () => t), SourceUnavailableError);
    await assert.rejects(fetchGibsImage(req("snow", "2024-01"), f.impl, () => t), SourceUnavailableError);
    assert.equal(f.calls.length, 1);
    t += 61_000;
    await assert.rejects(fetchGibsImage(req("snow", "2024-01"), f.impl, () => t), SourceUnavailableError);
    assert.equal(f.calls.length, 2);
  });

  test("pedidos simultâneos compartilham o mesmo download", async () => {
    const f = fakeFetch(() => pngResponse(300_000));
    await Promise.all([fetchGibsImage(req("lst", "2024-07"), f.impl), fetchGibsImage(req("lst", "2024-07"), f.impl)]);
    assert.equal(f.calls.length, 1);
  });
});

describe("D25 — rotas", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => __resetGibsCache());
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("400 para pedido inválido, sem tocar no GIBS", async () => {
    let called = false;
    globalThis.fetch = (async () => ((called = true), pngResponse(1))) as typeof fetch;
    for (const q of ["product=xpto", "product=ndvi&month=1999-01", "product=ndvi&month=2024-7"]) {
      const res = await gibsRoute(new Request(`http://localhost/api/observatory/gibs?${q}`));
      assert.equal(res.status, 400, q);
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal((await gibsImageRoute(new Request(`http://localhost/api/observatory/gibs/image?${q}`))).status, 400);
    }
    assert.equal(called, false);
  });

  test("envelope live e imagem PNG servida pela origem; fallback com cache curto e imagem 502", async () => {
    globalThis.fetch = (async () => pngResponse(400_000)) as typeof fetch;
    const res = await gibsRoute(new Request("http://localhost/api/observatory/gibs?product=lst&month=2024-07"));
    const body = await res.json();
    assert.equal(body.meta.source, "live");
    assert.match(res.headers.get("cache-control") ?? "", /max-age=3600/);
    const img = await gibsImageRoute(new Request(`http://localhost${body.data.imageUrl}`));
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/png");
    assert.equal((await img.arrayBuffer()).byteLength, 400_000);

    globalThis.fetch = (async () => pngResponse(8221)) as typeof fetch;
    const fb = await gibsRoute(new Request("http://localhost/api/observatory/gibs?product=snow&month=2025-04"));
    const fbBody = await fb.json();
    assert.equal(fbBody.meta.source, "fallback");
    assert.equal(fb.headers.get("cache-control"), "public, max-age=60");
    assert.equal((await gibsImageRoute(new Request("http://localhost/api/observatory/gibs/image?product=snow&month=2025-04"))).status, 502);
  });
});

describe("D25 — store e painel", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    useObservatoryStore.getState().resetObservatory();
    useObservatoryStore.setState({ gibs: null, gibsMonth: null, gibsProduct: "ndvi" });
  });

  const envelope = (product: string, month: string, source = "live") => ({
    data: { product, month, imageMonth: source === "live" ? month : GIBS_PRODUCTS[product as "ndvi"].fallbackMonth, imageUrl: `/x/${product}-${month}`, gibsLayer: "L", time: `${month}-01` },
    meta: { source, provider: "NASA GIBS", fetchedAt: NOW.toISOString(), stale: false },
  });

  test("ligar carrega; trocar produto/mês recarrega; resposta atrasada é descartada", async () => {
    const urls: string[] = [];
    let release: (() => void) | null = null;
    globalThis.fetch = (async (u: RequestInfo | URL) => {
      const url = String(u);
      urls.push(url);
      const q = new URL(url, "http://x").searchParams;
      if (q.get("month") === "2020-01") await new Promise<void>((r) => (release = r)); // lenta
      return new Response(JSON.stringify(envelope(q.get("product")!, q.get("month") ?? "2026-10")));
    }) as typeof fetch;
    const s = useObservatoryStore.getState();
    s.setLayerActive("NASA_GIBS", true);
    await new Promise((r) => setTimeout(r, 0));
    assert.match(urls[0], /\/api\/observatory\/gibs\?product=ndvi$/);
    assert.equal(useObservatoryStore.getState().gibs?.month, "2026-10");
    assert.equal(useObservatoryStore.getState().layerMeta.NASA_GIBS.source, "live");

    useObservatoryStore.getState().setGibsRequest({ month: "2020-01" }); // fica pendente
    useObservatoryStore.getState().setGibsRequest({ product: "lst", month: "2024-07" });
    await new Promise((r) => setTimeout(r, 0));
    release!();
    await new Promise((r) => setTimeout(r, 0));
    const g = useObservatoryStore.getState().gibs!;
    assert.deepEqual([g.product, g.month], ["lst", "2024-07"], "a resposta lenta de 2020-01 não sobrescreve");
  });

  test("servidor do TellusPedia fora: referência local do produto, marcada como offline", async () => {
    globalThis.fetch = (async () => new Response("x", { status: 503 })) as typeof fetch;
    useObservatoryStore.setState({ gibsProduct: "seaice" });
    await useObservatoryStore.getState().loadLayerData("NASA_GIBS");
    const st = useObservatoryStore.getState();
    assert.equal(st.gibs?.imageUrl, "/observatory/gibs/seaice-ref.webp");
    assert.equal(st.layerError.NASA_GIBS, true);
  });

  test("painel: camada listada; controles com produtos, mês, legenda e aviso de referência local", () => {
    useObservatoryStore.setState({
      isPanelOpen: true,
      activeLayers: ["NASA_GIBS"],
      gibsProduct: "ndvi",
      gibsMonth: "2025-04",
      gibs: envelope("ndvi", "2025-04", "fallback").data as never,
    });
    const panel = renderToStaticMarkup(React.createElement(ObservatoryPanel, { initialExpanded: ["NASA_GIBS"] }));
    for (const s of ["Imagens de Satélite (GIBS)", "Vegetação · julho de 2024", "layer-opacity-NASA_GIBS"]) assert.ok(panel.includes(s), s);
    assert.ok(!panel.includes("gibs-month"), "controles carregados sob demanda, fora do primeiro carregamento");
    const html = renderToStaticMarkup(React.createElement(GibsLayerControls));
    for (const s of ["gibs-product-seaice", "gibs-month", "0,3", "gibs-reference-note", "julho de 2024"]) assert.ok(html.includes(s), s);
    assert.match(html, /min="2000-03"/);
  });

  test("globo: camada montada dentro do grupo da Terra; textura descartada ao trocar e ao desligar", () => {
    const canvas = fs.readFileSync(path.join(root, "src/components/globe/GlobeCanvas.tsx"), "utf-8");
    assert.match(canvas, /activeObservatoryLayers\.includes\("NASA_GIBS"\) && <GibsLayer \/>/);
    const layer = fs.readFileSync(path.join(root, "src/components/globe/GibsLayer.tsx"), "utf-8");
    assert.match(layer, /useEffect\(\(\) => \(\) => texture\?\.dispose\(\), \[texture\]\)/);
    assert.match(layer, /toneMapped=\{false\}/, "cores fiéis à legenda");
    assert.match(layer, /raycast=\{noRaycast\}/, "clique passa para o país");
  });
});
