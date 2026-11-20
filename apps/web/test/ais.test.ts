import assert from "node:assert/strict";
import test from "node:test";
import { createAisAccumulator } from "../src/lib/ais-accumulator";
import { AIS_MAX_VESSELS, AIS_POSITION_TTL_MS, AIS_REGIONS, simulatedAisSnapshot, vesselIsMoving } from "../src/lib/ais-data";
import { createAisFeed } from "../src/lib/ais-source";
import { groupProjectedVessels } from "../src/lib/maritime-markers";

const NOW = Date.parse("2026-11-20T15:00:00Z");

function position(mmsi: number, lat: number, lng: number, fields = {}, time = "2026-11-20 14:59:50.123456 +0000 UTC") {
  return {
    MessageType: "PositionReport",
    MetaData: { MMSI: mmsi, time_utc: time },
    Message: {
      PositionReport: { Valid: true, Latitude: lat, Longitude: lng, Sog: 11.3, Cog: 113, TrueHeading: 110, ...fields },
    },
  };
}

test("AIS merges static fields by MMSI, retains the most recent position and handles missing telemetry", () => {
  const fleet = createAisAccumulator();
  fleet.ingest(position(563123456, 1.3, 103.7, { Sog: 102.3, Cog: 360, TrueHeading: 511 }), NOW);
  fleet.ingest({
    MessageType: "ShipStaticData",
    MetaData: { MMSI: 563123456 },
    Message: { ShipStaticData: { Type: 80, Name: "TEST@@", Destination: " PORT TEST @ " } },
  }, NOW);
  fleet.ingest(position(563123456, 1.8, 103.1, {}, "2026-11-20T14:59:00Z"), NOW);
  fleet.ingest(position(563123456, 91, 181), NOW);
  const data = fleet.snapshot(NOW);
  assert.equal(data.corridorCounts["route-malacca"], 1);
  assert.deepEqual(data.vessels[0], {
    id: "563123456", mmsi: "563123456", region: "route-malacca",
    flag: "Singapura", name: "TEST", destination: "PORT TEST",
    kind: "tanker", speedKnots: null, courseDeg: null, headingDeg: null,
    lat: 1.3, lng: 103.7, observedAt: Date.parse("2026-11-20T14:59:50.123Z"),
  });
  assert.equal(fleet.snapshot(NOW + AIS_POSITION_TTL_MS).vessels.length, 0);
});

test("AIS supports Class B metadata and interleaves busy and sparse monitored regions", () => {
  const fleet = createAisAccumulator();
  for (let index = 0; index < AIS_MAX_VESSELS + 20; index++) {
    fleet.ingest(position(563000000 + index, 2.5, 102), NOW);
  }
  fleet.ingest(position(622123456, 30.1, 32.5), NOW);
  fleet.ingest({
    MessageType: "StandardClassBPositionReport",
    MetaData: { MMSI: 235123456, Latitude: 50.2, Longitude: -1.4 },
    Message: { StandardClassBPositionReport: { Cog: 21, Sog: 6 } },
  }, NOW);
  fleet.ingest({
    MessageType: "StaticDataReport",
    MetaData: { MMSI: 235123456 },
    Message: { StaticDataReport: { ReportA: { Name: "CLASS B" }, ReportB: { ShipType: 30 } } },
  }, NOW);

  for (const [index, region] of AIS_REGIONS.slice(3).entries()) {
    fleet.ingest(position(710123450 + index, (region.south + region.north) / 2, (region.west + region.east) / 2), NOW);
  }
  const sample = fleet.snapshot(NOW);
  assert.equal(sample.vessels.length, AIS_MAX_VESSELS);
  assert.deepEqual(sample.corridorCounts, {
    "route-malacca": AIS_MAX_VESSELS + 20, "route-suez": 1, "route-english-channel": 1,
    "route-santos": 1, "route-panama": 1, "route-cape-good-hope": 1,
  });
  assert.deepEqual(sample.vessels.slice(0, AIS_REGIONS.length).map(({ region }) => region), AIS_REGIONS.map(({ id }) => id));
  assert.equal(sample.vessels[2].kind, "fishing");
  assert.equal(sample.vessels[2].name, "CLASS B");
});

test("simulation covers all monitored regions and never assigns a vessel MMSI", () => {
  const data = simulatedAisSnapshot();
  assert.ok(AIS_REGIONS.every(({ id }) => data.corridorCounts[id] > 0));
  assert.ok(data.vessels.every(({ mmsi, observedAt }) => mmsi === null && observedAt === 0));
});

test("server sends the key only in the provider subscription and shares a binary feed", async () => {
  const socket = new EventTarget() as WebSocket;
  let subscription: string | undefined;
  Object.defineProperty(socket, "readyState", { value: 1 });
  socket.send = (data) => { subscription = String(data); };
  socket.close = () => { socket.dispatchEvent(new Event("close")); };
  let connections = 0;
  const feed = createAisFeed(() => { connections++; return socket; });
  const first = feed.snapshot("TEST_KEY_SERVER_ONLY");
  const second = feed.snapshot("TEST_KEY_SERVER_ONLY");
  socket.dispatchEvent(new Event("open"));
  const bytes = new TextEncoder().encode(JSON.stringify(position(563123456, 1.4, 103.8, {}, new Date().toISOString())));
  socket.dispatchEvent(new MessageEvent("message", { data: bytes.buffer }));
  const snapshots = await Promise.all([first, second]);

  assert.equal(connections, 1);
  const request = JSON.parse(subscription!);
  assert.equal(request.APIKey, "TEST_KEY_SERVER_ONLY");
  assert.equal(request.BoundingBoxes.length, AIS_REGIONS.length);
  assert.ok(snapshots.every(({ vessels }) => vessels.length === 1));
  assert.doesNotMatch(JSON.stringify(snapshots), /TEST_KEY_SERVER_ONLY|APIKey/);
  socket.close();
});

test("AIS groups overlapping markers with every vessel still individually selectable", () => {
  const positions = [
    ...Array.from({ length: 375 }, (_, i) => ({ x: 100 + i / 400, y: 110, vessel: i })),
    { x: 140, y: 110, vessel: 375 },
    { x: 180, y: 111, vessel: 376 },
  ];
  const groups = groupProjectedVessels(positions, 34);
  assert.deepEqual(groups.map(({ members }) => members.length), [375, 1, 1]);
  assert.deepEqual(groups.flatMap(({ members }) => members), positions.map(({ vessel }) => vessel));
});

test("AIS movement filter uses measured speed and excludes unknown readings", () => {
  assert.equal(vesselIsMoving({ speedKnots: null }), false);
  assert.equal(vesselIsMoving({ speedKnots: 0.9 }), false);
  assert.equal(vesselIsMoving({ speedKnots: 1 }), true);
});
