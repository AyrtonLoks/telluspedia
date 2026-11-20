import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { parseFirmsCsv } from "../src/lib/firms-csv";
import { resetObservatorySources } from "../src/lib/observatory-sources";
import { GET as firmsGET } from "../src/app/api/observatory/firms/route";

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
    const body = await (await firmsGET()).json();
    assert.equal(body.meta.source, "live");
    assert.equal(body.data.length, 3);
    const top = body.data.find((h: { frp: number }) => h.frp === 48.9);
    assert.equal(top.confidence, "high");
  });

  test("resposta em texto (chave inválida) → fallback com motivo indicando a chave", async () => {
    globalThis.fetch = (async () => new Response("Invalid MAP_KEY.", { status: 200 })) as typeof fetch;
    const body = await (await firmsGET()).json();
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
    const body = await (await firmsGET()).json();
    assert.equal(body.meta.source, "live");
    assert.equal(body.data.length, 3);
    assert.match(body.meta.provider, /NOAA-20/);
    assert.deepEqual(requested, ["VIIRS_NOAA21_NRT", "VIIRS_NOAA20_NRT"]);
  });

  test("primeiro satélite com dados → não faz chamadas extras", async () => {
    mockFirms({ VIIRS_NOAA21_NRT: VIIRS_CSV });
    const body = await (await firmsGET()).json();
    assert.match(body.meta.provider, /NOAA-21/);
    assert.deepEqual(requested, ["VIIRS_NOAA21_NRT"]);
  });

  test("todos sem dados → fallback listando os satélites consultados", async () => {
    mockFirms({});
    const body = await (await firmsGET()).json();
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
    const body = await (await firmsGET()).json();
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
