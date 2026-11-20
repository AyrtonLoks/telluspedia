import assert from "node:assert/strict";
import { test } from "node:test";
import { createEonetIndex, getEonetMarkers } from "../src/lib/eonet-clusters";
import { normalizeEonetEvents } from "../src/lib/eonet-data";
import { useObservatoryStore } from "../src/stores/observatoryStore";

const point = { type: "Point", coordinates: [179, 15], date: "2026-11-18T06:00:00Z", magnitudeValue: 0, magnitudeUnit: "kts" };
const cyclone = {
  id: "EONET_test",
  title: "Ciclone de teste",
  link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_test",
  categories: [{ id: "severeStorms" }],
  sources: [{ id: "NOAA", url: "https://www.noaa.gov/" }, { id: "invalid", url: "javascript:alert(1)" }],
  geometry: [
    { ...point, date: "2026-11-19T06:00:00Z", coordinates: [-179, 15], magnitudeValue: 50 },
    point,
    { ...point, coordinates: [222, 15] },
  ],
};

test("EONET retains dated observations, orders the track and attributes valid sources", () => {
  const [event] = normalizeEonetEvents({ events: [cyclone] });
  assert.equal(event.category, "severeStorms");
  assert.equal(event.geometry?.length, 2);
  assert.equal(event.geometry[0].magnitudeValue, 0);
  assert.equal(event.geometry[0].date, point.date);
  assert.equal(event.lng, -179);
  assert.equal(event.magnitudeValue, 50);
  assert.deepEqual(event.sources.map(({ id }) => id), ["NOAA", "NASA EONET"]);
});

test("EONET keeps polygon geometry and the drought category", () => {
  const polygon = {
    type: "Polygon",
    coordinates: [[[179, 15], [-179, 15], [-179, 16], [179, 16], [179, 15]]],
    date: point.date,
  };
  const [event] = normalizeEonetEvents({
    events: [{ ...cyclone, categories: [{ id: "drought" }], geometry: [polygon] }],
  });
  assert.equal(event.category, "drought");
  assert.deepEqual(event.geometry?.[0].coordinates, polygon.coordinates);
  assert.ok(Math.abs(event.lng) > 179, "The representative pin stays by the antimeridian");
});

test("EONET clusters conserve events and split as the globe enlarges", () => {
  const events = normalizeEonetEvents({
    events: [0, 5, 115].map((longitude, index) => ({
      ...cyclone,
      id: String(index),
      geometry: [{ ...point, coordinates: [longitude, 0] }],
    })),
  });
  const index = createEonetIndex(events);
  const distant = getEonetMarkers(index, 440);
  assert.deepEqual(distant.map((marker) => marker.events.length).sort(), [1, 2]);
  assert.deepEqual(getEonetMarkers(index, 2200).map((marker) => marker.events.length), [1, 1, 1]);
  const store = useObservatoryStore.getState();
  store.setSelectedEntity({ type: "EONET", data: events[0] });
  store.setEonetCategory("floods");
  assert.equal(useObservatoryStore.getState().selectedEntity, null);
  store.resetObservatory();
  assert.equal(useObservatoryStore.getState().eonetCategory, "all");
});
