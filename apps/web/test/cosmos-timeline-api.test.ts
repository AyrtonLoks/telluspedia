import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { LruCache } from "../src/lib/lru-cache";
import { parseCosmosBody, parseCosmosYear, parseTimelineQuery } from "../src/lib/cosmos-validation";
import { GET as getCosmos } from "../src/app/api/observatory/cosmos/route";
import { GET as getTimeline } from "../src/app/api/timeline/route";

describe("T09 — Bounded LRU cache & input validation on /api/observatory/cosmos and /api/timeline", () => {
  test("1. LruCache never exceeds maxEntries and evicts least-recently-used keys", () => {
    const lru = new LruCache<string, number>({ maxEntries: 3 });

    lru.set("a", 1, 100);
    lru.set("b", 2, 100);
    lru.set("c", 3, 100);
    assert.equal(lru.size, 3);

    // Touch "a" so "b" becomes least recently used
    assert.equal(lru.get("a", 110), 1);

    // Insert "d" -> must evict "b", preserving "a", "c", "d"
    lru.set("d", 4, 120);
    assert.equal(lru.size, 3);
    assert.equal(lru.get("b", 130), undefined);
    assert.equal(lru.get("a", 130), 1);
    assert.equal(lru.get("c", 130), 3);
    assert.equal(lru.get("d", 130), 4);

    // Updating existing key refreshes recency without growing size
    lru.set("a", 10, 140);
    assert.equal(lru.size, 3);
    assert.equal(lru.get("a", 150), 10);

    // Stress test: 2000 distinct keys never exceed capacity 500
    const bounded = new LruCache<number, number>({ maxEntries: 500 });
    for (let i = 0; i < 2000; i++) {
      bounded.set(i, i * 2, 1000);
      assert.ok(bounded.size <= 500, `Cache size ${bounded.size} exceeded 500`);
    }
    assert.equal(bounded.size, 500);
    assert.equal(bounded.get(0, 1000), undefined);
    assert.equal(bounded.get(1999, 1000), 3998);
  });

  test("2. LruCache expires entries after ttlMs", () => {
    const lru = new LruCache<string, string>({ maxEntries: 5, ttlMs: 1000 });
    lru.set("k", "val", 5000);
    assert.equal(lru.get("k", 5999), "val");
    assert.equal(lru.get("k", 6000), undefined);
    assert.equal(lru.size, 0);
  });

  test("3. parseCosmosYear and parseCosmosBody reject invalid inputs and normalize valid ones", () => {
    assert.equal(parseCosmosYear("abc").ok, false);
    assert.equal(parseCosmosYear("1e308").ok, false);
    assert.equal(parseCosmosYear("NaN").ok, false);
    assert.equal(parseCosmosYear("Infinity").ok, false);
    assert.equal(parseCosmosYear("-Infinity").ok, false);
    assert.equal(parseCosmosYear("2024abc").ok, false);
    assert.equal(parseCosmosYear("").ok, false);
    assert.equal(parseCosmosYear("3000.01").ok, false);
    assert.equal(parseCosmosYear("-3000.01").ok, false);

    const rounded = parseCosmosYear("2024.126");
    assert.equal(rounded.ok, true);
    if (rounded.ok) assert.equal(rounded.value, 2024.13);

    const negZero = parseCosmosYear("-0.0001");
    assert.equal(negZero.ok, true);
    if (negZero.ok) assert.ok(Object.is(negZero.value, 0));

    assert.equal(parseCosmosBody("INVALID").ok, false);
    assert.equal(parseCosmosBody("").ok, false);
    assert.equal(parseCosmosBody("__proto__").ok, false);
    assert.equal(parseCosmosBody("constructor").ok, false);

    const mars = parseCosmosBody("mars");
    assert.equal(mars.ok, true);
    if (mars.ok) assert.equal(mars.value, "MARS");
  });

  test("4. GET /api/observatory/cosmos returns 400 for invalid year/body and 200 with bounded LRU cache", async () => {
    const badUrls = [
      "http://127.0.0.1:3003/api/observatory/cosmos?year=abc",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=1e308",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=NaN",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=Infinity",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=9999",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=2024&body=DEATHSTAR",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=2024&body=__proto__",
      "http://127.0.0.1:3003/api/observatory/cosmos?year=2024&body=",
    ];

    for (const url of badUrls) {
      const res = await getCosmos(new Request(url));
      assert.equal(res.status, 400, `Expected 400 for ${url}, got ${res.status}`);
    }

    // Valid year rounds to 2 decimals and hits cache on equivalent rounded value
    const res1 = await getCosmos(
      new Request("http://127.0.0.1:3003/api/observatory/cosmos?year=2024.126&body=mars")
    );
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get("X-Cache"), "MISS");
    const json1 = await res1.json();
    assert.equal(json1.body, "MARS");
    assert.equal(json1.year, 2024.13);

    const res2 = await getCosmos(
      new Request("http://127.0.0.1:3003/api/observatory/cosmos?year=2024.129&body=MARS")
    );
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get("X-Cache"), "HIT");

    // Valid Halley request
    const resHalley = await getCosmos(
      new Request("http://127.0.0.1:3003/api/observatory/cosmos?year=1986&body=halley")
    );
    assert.equal(resHalley.status, 200);
    const jsonHalley = await resHalley.json();
    assert.equal(jsonHalley.body, "HALLEY");
    assert.ok(jsonHalley.telemetry);

    // Flood >500 distinct valid years: oldest entry (2024.13_MARS) must be evicted
    for (let i = 0; i < 510; i++) {
      const yr = (1000 + i * 0.5).toFixed(2);
      const r = await getCosmos(
        new Request(`http://127.0.0.1:3003/api/observatory/cosmos?year=${yr}&body=EARTH`)
      );
      assert.equal(r.status, 200);
    }

    const resEvicted = await getCosmos(
      new Request("http://127.0.0.1:3003/api/observatory/cosmos?year=2024.13&body=MARS")
    );
    assert.equal(resEvicted.status, 200);
    assert.equal(
      resEvicted.headers.get("X-Cache"),
      "MISS",
      "Entry 2024.13_MARS must have been evicted once cache exceeded 500 entries"
    );
  });

  test("5. GET /api/timeline validates startYear, endYear and categories", async () => {
    const invalidTimelineUrls = [
      "http://127.0.0.1:3003/api/timeline?startYear=abc",
      "http://127.0.0.1:3003/api/timeline?endYear=1e308",
      "http://127.0.0.1:3003/api/timeline?startYear=NaN",
      "http://127.0.0.1:3003/api/timeline?startYear=1950.5",
      "http://127.0.0.1:3003/api/timeline?startYear=2025&endYear=1990",
      "http://127.0.0.1:3003/api/timeline?categories=INVALID_CAT",
      "http://127.0.0.1:3003/api/timeline?categories=",
      "http://127.0.0.1:3003/api/timeline?categories=POLITICS_REGIMES,,ECONOMY",
    ];

    for (const url of invalidTimelineUrls) {
      const res = await getTimeline(new NextRequest(url));
      assert.equal(res.status, 400, `Expected 400 for ${url}, got ${res.status}`);
    }

    const parsed = parseTimelineQuery(
      new URLSearchParams("startYear=1947&endYear=1991&categories=politics_regimes,WAR_MILITARY")
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.startYear, 1947);
      assert.equal(parsed.value.endYear, 1991);
      assert.deepEqual(parsed.value.categories, ["POLITICS_REGIMES", "WAR_MILITARY"]);
    }

    const okRes = await getTimeline(
      new NextRequest(
        "http://127.0.0.1:3003/api/timeline?startYear=1947&endYear=1991&categories=POLITICS_REGIMES,WAR_MILITARY"
      )
    );
    assert.equal(okRes.status, 200);
    const items = (await okRes.json()) as Array<{ year: number; category: string }>;
    assert.ok(Array.isArray(items) && items.length > 0);
    for (const item of items) {
      assert.ok(item.year >= 1947 && item.year <= 1991);
      assert.ok(item.category === "POLITICS_REGIMES" || item.category === "WAR_MILITARY");
    }
  });
});
