import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { parseFirmsCsv } from "../src/lib/firms-csv";
import { resetObservatorySources } from "../src/lib/observatory-sources";
import { GET as firmsGET } from "../src/app/api/observatory/firms/route";

const firmsReq = (query = "") => new Request(`http://localhost/api/observatory/firms${query}`);

// Cabeçalhos reais da API "area" do FIRMS (VIIRS_SNPP_NRT e MODIS_NRT).
const VIIRS_HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const MODIS_HEADER =
  "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight";

const VIIRS_CSV = [
  VIIRS_HEADER,
  "-9.88123,33.12456,345.6,0.39,0.36,2026-11-19,142,N,VIIRS,n,2.0NRT,295.3,12.7,N",
  "-2.34567,112.56789,367.0,0.52,0.42,2026-11-19,0548,N,VIIRS,h,2.0NRT,301.1,48.9,D",
  "39.85,-121.45,330.2,0.40,0.37,2026-11-19,2105,N,VIIRS,l,2.0NRT,290.0,3.1,D",
].join("\n");

describe("T04: parseFirmsCsv", () => {
  test("VIIRS: FRP vem da coluna frp (não de version) e confiança l/n/h é normalizada", () => {
    const [a, b, c] = parseFirmsCsv(VIIRS_CSV);
    assert.equal(a.frp, 12.7);
    assert.equal(b.frp, 48.9);
    assert.equal(a.confidence, "nominal");
    assert.equal(b.confidence, "high");
    assert.equal(c.confidence, "low");
    assert.equal(a.brightness, 345.6);
    assert.equal(a.satellite, "VIIRS");
    assert.equal(a.acqDate, "2026-11-19");
    assert.equal(a.acqTime, "0142");
    assert.equal(a.daynight, "N");
    assert.equal(b.daynight, "D");
  });

  test("regressão: o valor de version (2.0NRT) nunca é usado como FRP", () => {
    for (const h of parseFirmsCsv(VIIRS_CSV)) assert.notEqual(h.frp, 2);
  });

  test("MODIS: brightness e confiança percentual (0–100)", () => {
    const csv = [
      MODIS_HEADER,
      "10.5,20.5,320.1,1.0,1.0,2026-11-19,1030,Terra,MODIS,15,6.1NRT,290.0,5.5,D",
      "11.5,21.5,330.1,1.0,1.0,2026-11-19,1031,Aqua,MODIS,55,6.1NRT,291.0,25.5,D",
      "12.5,22.5,340.1,1.0,1.0,2026-11-19,1032,Aqua,MODIS,92,6.1NRT,292.0,85.5,D",
    ].join("\n");
    const [low, nominal, high] = parseFirmsCsv(csv);
    assert.equal(low.satellite, "MODIS");
    assert.equal(low.brightness, 320.1);
    assert.equal(low.confidence, "low");
    assert.equal(nominal.confidence, "nominal");
    assert.equal(high.confidence, "high");
    assert.equal(high.frp, 85.5);
  });

  test("colunas fora de ordem são lidas pelo nome", () => {
    const csv = ["frp,acq_date,confidence,instrument,longitude,latitude,bright_ti4", "77.7,2026-11-19,h,VIIRS,-50.5,-5.5,360.0"].join("\n");
    const [h] = parseFirmsCsv(csv);
    assert.equal(h.lat, -5.5);
    assert.equal(h.lng, -50.5);
    assert.equal(h.frp, 77.7);
    assert.equal(h.confidence, "high");
  });

  test("linhas malformadas são ignoradas sem derrubar o parse", () => {
    const csv = [
      VIIRS_HEADER,
      "abc,33.1,345.6,0.39,0.36,2026-11-19,0142,N,VIIRS,n,2.0NRT,295.3,12.7,N", // latitude inválida
      "95.0,33.1,345.6,0.39,0.36,2026-11-19,0142,N,VIIRS,n,2.0NRT,295.3,12.7,N", // fora da faixa
      "-9.8,33.1,345.6,0.39,0.36,2026-11-19,0142,N,VIIRS,x,2.0NRT,295.3,12.7,N", // confiança desconhecida
      "-9.8,33.1,345.6,0.39,0.36,19/11/2026,0142,N,VIIRS,n,2.0NRT,295.3,12.7,N", // data inválida
      "-9.8,33.1,345.6,0.39,0.36,2026-11-19,0142,N,VIIRS,n,2.0NRT,295.3,,N", // FRP vazio
      "-9.8,33.1,345.6", // linha truncada
      "-9.9,33.2,345.6,0.39,0.36,2026-11-19,0142,N,VIIRS,n,2.0NRT,295.3,12.7,N", // válida
    ].join("\n");
    const result = parseFirmsCsv(csv);
    assert.equal(result.length, 1);
    assert.equal(result[0].lat, -9.9);
  });

  test("CRLF e cabeçalho sem colunas essenciais", () => {
    assert.equal(parseFirmsCsv(VIIRS_CSV.replace(/\n/g, "\r\n")).length, 3);
    assert.deepEqual(parseFirmsCsv("foo,bar\n1,2"), []);
    assert.deepEqual(parseFirmsCsv(""), []);
  });

  test("acima do limite ficam os focos de maior FRP", () => {
    const result = parseFirmsCsv(VIIRS_CSV, { limit: 2 });
    assert.deepEqual(result.map((h) => h.frp), [48.9, 12.7]);
  });

  test("ids são únicos e estáveis entre leituras", () => {
    const a = parseFirmsCsv(VIIRS_CSV).map((h) => h.id);
    const b = parseFirmsCsv(VIIRS_CSV).map((h) => h.id);
    assert.deepEqual(a, b);
    assert.equal(new Set(a).size, a.length);
  });
});

describe("T04: rota /api/observatory/firms com chave", () => {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;

  beforeEach(() => {
    resetObservatorySources();
    process.env.NASA_FIRMS_MAP_KEY = "test-key";
    console.warn = () => {};
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    delete process.env.NASA_FIRMS_MAP_KEY;
  });

  test("CSV válido → envelope live com FRP e confiança corretos", async () => {
    globalThis.fetch = (async () => new Response(VIIRS_CSV, { status: 200 })) as typeof fetch;
    const body = await (await firmsGET(firmsReq("?confidence=all"))).json();
    assert.equal(body.meta.source, "live");
    const fires = decodeFirmsColumns(body.data)!;
    assert.equal(fires.length, 3);
    const top = fires.find((h) => h.frp === 48.9)!;
    assert.equal(top.confidence, "high");
  });

  test("resposta em texto (chave inválida) → fallback com motivo indicando a chave", async () => {
    globalThis.fetch = (async () => new Response("Invalid MAP_KEY.", { status: 200 })) as typeof fetch;
    const body = await (await firmsGET(firmsReq())).json();
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.reason, /NASA_FIRMS_MAP_KEY/);
    assert.match(body.meta.reason, /Invalid MAP_KEY/);
  });
});

// Reprovação de 2026-11-20: o VIIRS S-NPP NRT parou de publicar em 2026-11-02 e a API
// passou a responder só o cabeçalho. A rota não pode depender de um único satélite.
describe("T04: FIRMS tenta os satélites em ordem até achar focos", () => {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  let requested: string[] = [];

  function mockFirms(bodies: Record<string, string>) {
    requested = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      const dataset = Object.keys(bodies).find((d) => url.includes(`/${d}/`));
      requested.push(dataset ?? url);
      return new Response(dataset ? bodies[dataset] : VIIRS_HEADER, { status: 200 });
    }) as typeof fetch;
  }

  beforeEach(() => {
    resetObservatorySources();
    process.env.NASA_FIRMS_MAP_KEY = "test-key";
    console.warn = () => {};
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    delete process.env.NASA_FIRMS_MAP_KEY;
  });

  test("satélite sem dados (só cabeçalho) → usa o próximo e informa qual respondeu", async () => {
    mockFirms({ VIIRS_NOAA21_NRT: VIIRS_HEADER, VIIRS_NOAA20_NRT: VIIRS_CSV });
    const body = await (await firmsGET(firmsReq("?confidence=all"))).json();
    assert.equal(body.meta.source, "live");
    assert.equal(body.data.count, 3);
    assert.match(body.meta.provider, /NOAA-20/);
    assert.deepEqual(requested, ["VIIRS_NOAA21_NRT", "VIIRS_NOAA20_NRT"]);
  });

  test("primeiro satélite com dados → não faz chamadas extras", async () => {
    mockFirms({ VIIRS_NOAA21_NRT: VIIRS_CSV });
    const body = await (await firmsGET(firmsReq())).json();
    assert.match(body.meta.provider, /NOAA-21/);
    assert.deepEqual(requested, ["VIIRS_NOAA21_NRT"]);
  });

  test("todos sem dados → fallback listando os satélites consultados", async () => {
    mockFirms({});
    const body = await (await firmsGET(firmsReq())).json();
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.reason, /NOAA-21/);
    assert.match(body.meta.reason, /MODIS/);
    assert.equal(requested.length, 4);
  });

  test("resposta que não é CSV (chave) → não insiste nos outros satélites", async () => {
    requested = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requested.push(String(input));
      return new Response("Invalid MAP_KEY.", { status: 200 });
    }) as typeof fetch;
    const body = await (await firmsGET(firmsReq())).json();
    assert.equal(body.meta.source, "fallback");
    assert.equal(requested.length, 1);
  });

  test("leitura stale mantém o satélite que respondeu por último", async () => {
    mockFirms({ VIIRS_NOAA21_NRT: VIIRS_HEADER, VIIRS_NOAA20_NRT: VIIRS_CSV });
    const { firmsSource } = await import("../src/lib/observatory-sources");
    const t0 = Date.now();
    await firmsSource.get(t0);
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    const later = await firmsSource.get(t0 + 16 * 60 * 1000);
    assert.equal(later.envelope.meta.stale, true);
    assert.match(later.envelope.meta.provider, /NOAA-20/);
  });
});

// ---------------------------------------------------------------------------
// D05: todos os focos (formato colunar), janela, confiança e contagem por país
// ---------------------------------------------------------------------------
import {
  FIRMS_SCHEMA,
  aggregateByCountry,
  buildFirmsPayload,
  decodeFirmsColumns,
  encodeFirmsColumns,
  parseFirmsConfidence,
  parseFirmsWindow,
} from "../src/lib/firms-aggregate";
import { createCountryLookup } from "../src/lib/firms-country";
import type { FirmsHotspot } from "../src/lib/observatory-data";

const hs = (lat: number, lng: number, frp: number, confidence: FirmsHotspot["confidence"] = "nominal", acqDate = "2026-11-19"): FirmsHotspot => ({
  id: `${lat}:${lng}:${frp}`,
  lat,
  lng,
  frp,
  confidence,
  brightness: 330.4,
  satellite: "VIIRS",
  acqDate,
});

describe("D05: formato colunar", () => {
  test("ida e volta preserva os campos do card (3 casas nas coordenadas)", () => {
    const src: FirmsHotspot[] = [
      { ...hs(-9.88123, 33.12456, 12.74, "high", "2026-11-19"), acqTime: "0142", daynight: "N" },
      { ...hs(10.5, -20.25, 3.1, "low", "2026-11-20"), satellite: "MODIS" },
    ];
    const cols = encodeFirmsColumns(src);
    assert.equal(cols.count, 2);
    assert.deepEqual(cols.dates, ["2026-11-19", "2026-11-20"]);
    const back = decodeFirmsColumns(JSON.parse(JSON.stringify(cols)))!;
    assert.equal(back[0].lat, -9.881);
    assert.equal(back[0].lng, 33.125);
    assert.equal(back[0].frp, 12.7);
    assert.equal(back[0].brightness, 330);
    assert.equal(back[0].confidence, "high");
    assert.equal(back[0].acqTime, "0142");
    assert.equal(back[0].daynight, "N");
    assert.equal(back[1].satellite, "MODIS");
    assert.equal(back[1].acqTime, undefined);
    assert.equal(back[1].daynight, undefined);
    assert.notEqual(back[0].id, back[1].id);
  });

  test("estrutura inválida ou resposta antiga (lista de objetos) → null", () => {
    assert.equal(decodeFirmsColumns([{ lat: 1 }]), null);
    assert.equal(decodeFirmsColumns({ format: "firms-columns-v1", count: 2, lat: [1] }), null);
    assert.equal(decodeFirmsColumns(null), null);
  });

  test("filtro padrão oculta baixa confiança; total = todos os focos enviados", () => {
    const p = buildFirmsPayload([hs(1, 1, 5, "low"), hs(1.2, 1.2, 7, "high")], 1, "nominal");
    assert.equal(p.total, 1);
    assert.equal(p.hotspots.length, 1);
    assert.equal(buildFirmsPayload([hs(1, 1, 5, "low")], 1, "all").total, 1);
  });

  test("parâmetros: janelas aceitas pela API (1/2/5) e confiança", () => {
    assert.equal(parseFirmsWindow("2"), 2);
    assert.equal(parseFirmsWindow("5"), 5);
    assert.equal(parseFirmsWindow("7"), 1, "a API do FIRMS recusa mais de 5 dias");
    assert.equal(parseFirmsWindow(null), 1);
    assert.equal(parseFirmsConfidence("all"), "all");
    assert.equal(parseFirmsConfidence("qualquer"), "nominal");
  });
});

describe("D05: focos por país", () => {
  test("lookup de país usa o índice do picking (Natural Earth, zero-padding)", () => {
    const countryOf = createCountryLookup();
    assert.equal(countryOf(-9.5, -55.5), "BRA");
    assert.equal(countryOf(-22.5, -47.5), "BRA", "Sudeste do Brasil");
    assert.equal(countryOf(-2.34, 112.56), "IDN");
    assert.equal(countryOf(39.85, -121.45), "USA");
    assert.equal(countryOf(-30, -30), null, "oceano não tem país");
  });

  test("aggregateByCountry soma contagem, FRP total e máximo por ISO", () => {
    const stats = aggregateByCountry([hs(-9.5, -55.5, 10), hs(-10, -52, 30), hs(39.85, -121.45, 5), hs(-30, -30, 99)], createCountryLookup());
    assert.deepEqual(stats.BRA, { count: 2, frpSum: 40, frpMax: 30 });
    assert.equal(stats.USA.count, 1);
    assert.equal(Object.keys(stats).length, 2);
  });
});

describe("D05: rota", () => {
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  let urls: string[] = [];

  beforeEach(() => {
    resetObservatorySources();
    process.env.NASA_FIRMS_MAP_KEY = "test-key";
    console.warn = () => {};
    urls = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(VIIRS_CSV, { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    delete process.env.NASA_FIRMS_MAP_KEY;
  });

  test("padrão: 24 h, sem baixa confiança, todos os focos em colunas, byCountry e schema", async () => {
    const body = await (await firmsGET(firmsReq())).json();
    assert.match(urls[0], /\/world\/1$/);
    assert.equal(body.data.format, "firms-columns-v1");
    assert.equal(body.data.count, 2, "o foco de confiança 'l' fica de fora");
    assert.equal(body.total, 2);
    assert.equal(body.byCountry.IDN.count, 1);
    assert.equal(body.schema, FIRMS_SCHEMA);
    assert.deepEqual(body.window, { days: 1, confidence: "nominal" });
    assert.equal(body.cells, undefined, "sem manchas sintéticas");
  });

  test("days=5 consulta a janela de 5 dias; cada combinação tem cache próprio", async () => {
    await firmsGET(firmsReq("?days=5&confidence=all"));
    await firmsGET(firmsReq("?days=5&confidence=all"));
    await firmsGET(firmsReq("?days=2"));
    assert.equal(urls.length, 2, "a segunda chamada de 5 dias vem do cache");
    assert.match(urls[0], /\/world\/5$/);
    assert.match(urls[1], /\/world\/2$/);
  });

  test("sem chave: fallback também é filtrado e contado por país", async () => {
    delete process.env.NASA_FIRMS_MAP_KEY;
    const body = await (await firmsGET(firmsReq())).json();
    assert.equal(body.meta.source, "fallback");
    const fires = decodeFirmsColumns(body.data)!;
    assert.ok(fires.length > 0);
    assert.ok(fires.every((h) => h.confidence !== "low"));
    assert.ok(body.byCountry.BRA.count > 0);
  });
});
