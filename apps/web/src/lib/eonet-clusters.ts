import Supercluster from "supercluster";
import type { EonetEvent } from "./observatory-data";

const MAX_ZOOM = 7;
const WORLD: [number, number, number, number] = [-180, -90, 180, 90];

export function createEonetIndex(events: EonetEvent[]) {
  return new Supercluster<{ event: EonetEvent }>({ radius: 36, maxZoom: MAX_ZOOM }).load(
    events.map((event) => ({
      type: "Feature",
      properties: { event },
      geometry: { type: "Point", coordinates: [event.lng, event.lat] },
    }))
  );
}

export interface EonetMarker {
  lat: number;
  lng: number;
  events: EonetEvent[];
}

export function getEonetMarkers(index: ReturnType<typeof createEonetIndex>, diameter: number): EonetMarker[] {
  const zoom = Math.max(0, Math.min(MAX_ZOOM + 1, Math.floor(Math.log2(Math.PI * diameter / 512))));
  return index.getClusters(WORLD, zoom).map(({ geometry, properties }) => {
    const [lng, lat] = geometry.coordinates;
    const events = "cluster_id" in properties
      ? index.getLeaves(properties.cluster_id, properties.point_count).map((leaf) => leaf.properties.event)
      : [properties.event];
    return { lat, lng, events };
  });
}
