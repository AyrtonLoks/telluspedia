import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FALLBACK_TTL_MS,
  SourceUnavailableError,
  createObservatorySource,
  initialLocalMeta,
  isObservatoryEnvelope,
} from "../src/lib/observatory-source";
import { resetObservatorySources } from "../src/lib/observatory-sources";
import { FALLBACK_EONET_EVENTS, FALLBACK_FIRMS_HOTSPOTS } from "../src/lib/observatory-data";
import { GET as eonetGET } from "../src/app/api/observatory/eonet/route";
import { GET as firmsGET } from "../src/app/api/observatory/firms/route";

const firmsReq = (query = "") => new Request(`http://localhost/api/observatory/firms${query}`);
import { GET as issGET } from "../src/app/api/observatory/iss/route";
import { GET as trafficGET } from "../src/app/api/observatory/traffic/route";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { DataSourceBadge, resolveDataSourceStatus } from "../src/components/observatory/DataSourceBadge";

const realFetch = globalThis.fetch;
const realWarn = console.warn;

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL) => handler(String(input))) as typeof fetch;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  resetObservatorySources();
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  delete process.env.NASA_FIRMS_MAP_KEY;
});

describe("T05: createObservatorySource", () => {
  test("dado do provedor sai como live e fica em cache pelo TTL live", async () => {
    let calls = 0;
    const src = createObservatorySource({
      name: "t", liveProvider: "Prov", liveTtlMs: 10 * 60_000,
      fetchLive: async () => { calls++; return [1, 2]; },
      fallback: () => [0],
    });
    const a = await src.get(1_000_000);
    assert.equal(a.envelope.meta.source, "live");
    assert.equal(a.envelope.meta.provider, "Prov");
    assert.equal(a.envelope.meta.stale, false);
    assert.deepEqual(a.envelope.data, [1, 2]);
    assert.equal(a.cacheHit, false);

    const b = await src.get(1_000_000 + 5 * 60_000);
    assert.equal(b.cacheHit, true);
    assert.equal(calls, 1);
  });

  test("falha sem dado anterior vira fallback com motivo e TTL curto", async () => {
    let calls = 0;
    const src = createObservatorySource({
      name: "t", liveProvider: "Prov", liveTtlMs: 15 * 60_000,
      fetchLive: async () => { calls++; throw new SourceUnavailableError("Chave ausente"); },
      fallback: () => ["local"],
    });
    const a = await src.get(0);
    assert.equal(a.envelope.meta.source, "fallback");
    assert.equal(a.envelope.meta.reason, "Chave ausente");
    assert.deepEqual(a.envelope.data, ["local"]);
    assert.ok(a.maxAgeSeconds <= FALLBACK_TTL_MS / 1000);

    await src.get(FALLBACK_TTL_MS + 1);
    assert.equal(calls, 2, "fallback não pode ficar cacheado pelo TTL live inteiro");
  });

  test("falha com leitura live recente devolve o último dado bom marcado como stale", async () => {
    let fail = false;
    const src = createObservatorySource({
      name: "t", liveProvider: "Prov", liveTtlMs: 60_000,
      fetchLive: async () => { if (fail) throw new Error("boom"); return ["fresh"]; },
      fallback: () => ["local"],
    });
    await src.get(0);
    fail = true;
    const r = await src.get(2 * 60_000);
    assert.equal(r.envelope.meta.source, "live");
    assert.equal(r.envelope.meta.stale, true);
    assert.deepEqual(r.envelope.data, ["fresh"]);
    assert.equal(r.envelope.meta.fetchedAt, new Date(0).toISOString());
    assert.match(r.envelope.meta.reason ?? "", /última leitura válida/);
  });

  test("último dado bom expirado não é reutilizado", async () => {
    let fail = false;
    const src = createObservatorySource({
      name: "t", liveProvider: "Prov", liveTtlMs: 60_000, lastGoodMaxAgeMs: 10 * 60_000,
      fetchLive: async () => { if (fail) throw new Error("boom"); return ["fresh"]; },
      fallback: () => ["local"],
    });
    await src.get(0);
    fail = true;
    const r = await src.get(11 * 60_000);
    assert.equal(r.envelope.meta.source, "fallback");
    assert.deepEqual(r.envelope.data, ["local"]);
  });
});

describe("T05: rotas do Observatório", () => {
  test("EONET com provedor respondendo → envelope live", async () => {
    mockFetch(() =>
      json({ events: [{ id: "EONET_1", title: "Incêndio X", categories: [{ id: "wildfires" }],
        geometry: [{ date: "2026-11-19T00:00:00Z", coordinates: [-60, -10] }], sources: [] }] })
    );
    const res = await eonetGET();
    const body = await res.json();
    assert.ok(isObservatoryEnvelope(body));
    assert.equal(body.meta.source, "live");
    assert.equal((body.data as { id: string }[])[0].id, "EONET_1");
    assert.equal(res.headers.get("X-Cache"), "MISS");
  });

  test("EONET com provedor fora do ar → fallback rotulado, nunca live", async () => {
    mockFetch(() => { throw new TypeError("fetch failed"); });
    const body = await (await eonetGET()).json();
    assert.equal(body.meta.source, "fallback");
    assert.equal(body.data.length, FALLBACK_EONET_EVENTS.length);
    assert.ok(body.meta.reason);
  });

  test("EONET com HTTP 503 → fallback com o status no motivo", async () => {
    mockFetch(() => json({}, 503));
    const body = await (await eonetGET()).json();
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.reason, /503/);
  });

  test("FIRMS sem chave → fallback explicando a chave ausente, sem chamar a rede", async () => {
    let called = false;
    mockFetch(() => { called = true; return json({}); });
    const res = await firmsGET(firmsReq());
    const body = await res.json();
    assert.equal(called, false);
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.reason, /NASA_FIRMS_MAP_KEY/);
    assert.equal(body.data.length, FALLBACK_FIRMS_HOTSPOTS.length);
    assert.match(res.headers.get("Cache-Control") ?? "", /s-maxage=60\b/);
  });

  test("ISS sem provedor → modelo aproximado rotulado como fallback", async () => {
    mockFetch(() => { throw new TypeError("fetch failed"); });
    const body = await (await issGET()).json();
    assert.equal(body.meta.source, "fallback");
    assert.match(body.meta.provider, /modelo orbital aproximado/);
    assert.equal(typeof body.data.latitude, "number");
  });

  test("Tráfego: aviões e rotas marítimas com procedências próprias", async () => {
    mockFetch(() => { throw new TypeError("fetch failed"); });
    const body = await (await trafficGET()).json();
    assert.ok(isObservatoryEnvelope(body.aircraft));
    assert.ok(isObservatoryEnvelope(body.maritimeRoutes));
    assert.equal(body.aircraft.meta.source, "fallback");
    assert.equal(body.maritimeRoutes.meta.source, "fallback");
    assert.match(body.maritimeRoutes.meta.reason, /AIS/);
  });
});

describe("T05: store e badge", () => {
  test("store registra a procedência recebida da rota", async () => {
    mockFetch(() =>
      json({ data: [{ id: "f1", lat: 1, lng: 2, brightness: 300, frp: 10, confidence: "high", satellite: "VIIRS", acqDate: "2026-11-19" }],
        meta: { source: "live", provider: "NASA FIRMS", fetchedAt: "2026-11-19T00:00:00.000Z", stale: false } })
    );
    await useObservatoryStore.getState().loadLayerData("NASA_FIRMS");
    const s = useObservatoryStore.getState();
    assert.equal(s.layerMeta.NASA_FIRMS.source, "live");
    assert.equal(s.layerError.NASA_FIRMS, false);
    assert.equal(s.firmsHotspots[0].id, "f1");
  });

  test("servidor inacessível → camada marcada offline com dados locais", async () => {
    mockFetch(() => { throw new TypeError("fetch failed"); });
    await useObservatoryStore.getState().loadLayerData("FLIGHTS_OPENSKY");
    const s = useObservatoryStore.getState();
    assert.equal(s.layerError.FLIGHTS_OPENSKY, true);
    assert.equal(s.layerError.MARITIME_ROUTES, true);
    assert.equal(s.layerMeta.FLIGHTS_OPENSKY.source, "fallback");
    assert.ok(s.aircraftFleet.length > 0);
  });

  test("badge: fallback mostra 'Simulado' e nunca 'Ao vivo'", () => {
    const html = renderToStaticMarkup(<DataSourceBadge meta={initialLocalMeta()} />);
    const visibleText = html.replace(/<[^>]+>/g, "");
    assert.match(html, /data-source-status="fallback"/);
    assert.equal(visibleText, "Simulado");
    assert.doesNotMatch(visibleText, /ao vivo/i);
  });

  test("badge: estados derivados", () => {
    const base = initialLocalMeta();
    assert.equal(resolveDataSourceStatus({ ...base, source: "live" }), "live");
    assert.equal(resolveDataSourceStatus({ ...base, source: "live", stale: true }), "stale");
    assert.equal(resolveDataSourceStatus({ ...base, source: "computed" }), "computed");
    assert.equal(resolveDataSourceStatus(base, { isOffline: true }), "offline");
    assert.equal(resolveDataSourceStatus(base, { isLoading: true }), "loading");
  });
});
