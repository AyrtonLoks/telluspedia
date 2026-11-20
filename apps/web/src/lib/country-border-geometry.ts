import { ShapeUtils, Vector2, Vector3 } from "three";
import * as topojson from "topojson-client";
import { NAME_TO_ISO, NUMERIC_TO_ISO } from "./country-data";
import { latLngToVector3 } from "./geo-spatial";
import { HISTORICAL_ENTITIES } from "./historical-entities";
import type { CountryTopology } from "./historical-topology";

type CountryGeometry = CountryTopology["objects"]["countries"]["geometries"][number];

const BASE_RADIUS = 1.0015;
const FILL_RADIUS = 1.002;
const HIGHLIGHT_RADIUS = 1.004;
// Chords of at most 3° stay above the unit Earth at every point.
const MIN_EDGE_DOT = Math.cos(Math.PI / 60);

function appendVertex(output: number[], point: Vector3, radius: number) {
  output.push(point.x * radius, point.y * radius, point.z * radius);
}

function appendSegment(output: number[], a: Vector3, b: Vector3, radius: number) {
  const dot = a.dot(b);
  if (dot < MIN_EDGE_DOT) {
    const midpoint = a.clone().add(b);
    // Antipodal vertices have no unique shortest arc.
    if (midpoint.lengthSq() < 1e-16) return;
    midpoint.normalize();
    appendSegment(output, a, midpoint, radius);
    appendSegment(output, midpoint, b, radius);
  } else if (dot < 1 - 1e-12) {
    appendVertex(output, a, radius);
    appendVertex(output, b, radius);
  }
}

function appendBorders(
  output: number[],
  topology: CountryTopology,
  geometry: CountryGeometry,
  radius: number,
) {
  for (const line of topojson.mesh(topology, geometry).coordinates) {
    let previous: Vector3 | undefined;
    for (const [lng, lat] of line) {
      const point = latLngToVector3(lat, lng);
      if (previous) appendSegment(output, previous, point, radius);
      previous = point;
    }
  }
}

export function getBaseBorderPositions(topology: CountryTopology): Float32Array {
  const positions: number[] = [];
  appendBorders(positions, topology, topology.objects.countries, BASE_RADIUS);
  return new Float32Array(positions);
}

interface CountryBorder {
  geometries: CountryGeometry[];
  outline?: Float32Array;
  fill?: Float32Array;
}

const topologyCountries = new WeakMap<CountryTopology, Map<string, CountryBorder>>();

function getCountries(topology: CountryTopology) {
  const cached = topologyCountries.get(topology);
  if (cached) return cached;

  const countries = new Map<string, CountryBorder>();
  for (const geometry of topology.objects.countries.geometries) {
    const id = String(geometry.id ?? "");
    const name = geometry.properties?.name;
    const iso = HISTORICAL_ENTITIES[id] ? id :
      NUMERIC_TO_ISO[id.padStart(3, "0")] || (name ? NAME_TO_ISO[name] : undefined) || id;
    if (!iso) continue;

    const country = countries.get(iso);
    if (country) country.geometries.push(geometry);
    else countries.set(iso, { geometries: [geometry] });
  }
  topologyCountries.set(topology, countries);
  return countries;
}

export function getCountryOutline(topology: CountryTopology, iso: string): Float32Array | undefined {
  const country = getCountries(topology).get(iso);
  if (!country) return;

  if (!country.outline) {
    const positions: number[] = [];
    for (const geometry of country.geometries) appendBorders(positions, topology, geometry, HIGHLIGHT_RADIUS);
    country.outline = new Float32Array(positions);
  }
  return country.outline;
}

function appendTriangle(output: number[], a: Vector3, b: Vector3, c: Vector3) {
  const ab = a.dot(b);
  const bc = b.dot(c);
  const ca = c.dot(a);

  // Bisect the longest spherical edge. Adjacent faces subdivide shared edges
  // on the same great circle, even when their third vertices are far apart.
  if (ab < MIN_EDGE_DOT && ab <= bc && ab <= ca) {
    const midpoint = a.clone().add(b).normalize();
    appendTriangle(output, a, midpoint, c);
    appendTriangle(output, midpoint, b, c);
  } else if (bc < MIN_EDGE_DOT && bc <= ca) {
    const midpoint = b.clone().add(c).normalize();
    appendTriangle(output, a, b, midpoint);
    appendTriangle(output, a, midpoint, c);
  } else if (ca < MIN_EDGE_DOT) {
    const midpoint = c.clone().add(a).normalize();
    appendTriangle(output, a, b, midpoint);
    appendTriangle(output, midpoint, b, c);
  } else {
    appendVertex(output, a, FILL_RADIUS);
    appendVertex(output, b, FILL_RADIUS);
    appendVertex(output, c, FILL_RADIUS);
  }
}

function toOpenRing(coordinates: number[][]): Vector3[] {
  const ring: Vector3[] = [];
  for (const [lng, lat] of coordinates) {
    const point = latLngToVector3(lat, lng);
    const previous = ring[ring.length - 1];
    if (!previous || point.distanceToSquared(previous) > 1e-16) ring.push(point);
  }
  if (ring.length > 1 && ring[0].distanceToSquared(ring[ring.length - 1]) <= 1e-16) ring.pop();
  return ring;
}

function appendPolygon(output: number[], coordinates: number[][][]) {
  const rings = coordinates.map(toOpenRing);
  const exterior = rings[0];
  if (!exterior || exterior.length < 3) return;

  // A local gnomonic projection keeps great-circle edges straight and avoids
  // discontinuities when a polygon crosses the antimeridian or a pole.
  const center = new Vector3();
  for (const point of exterior) center.add(point);
  center.normalize();
  const validRings = rings.filter((ring) => ring.length >= 3);
  const vertices = validRings.flat();
  if (vertices.some((point) => center.dot(point) <= 1e-6)) return;
  const reference = Math.abs(center.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const xAxis = reference.cross(center).normalize();
  const yAxis = new Vector3().crossVectors(center, xAxis);
  const [contour, ...holes] = validRings.map((ring) => ring.map((point) => {
    const depth = center.dot(point);
    return new Vector2(xAxis.dot(point) / depth, yAxis.dot(point) / depth);
  }));

  const normal = new Vector3();
  for (const [i, j, k] of ShapeUtils.triangulateShape(contour, holes)) {
    const a = vertices[i];
    const b = vertices[j];
    const c = vertices[k];
    if (normal.crossVectors(b, c).dot(a) < 0) appendTriangle(output, a, c, b);
    else appendTriangle(output, a, b, c);
  }
}

export function getCountryFill(topology: CountryTopology, iso: string): Float32Array | undefined {
  const country = getCountries(topology).get(iso);
  if (!country) return;

  if (!country.fill) {
    const positions: number[] = [];
    for (const geometry of country.geometries) {
      const feature = topojson.feature(topology, geometry);
      if (feature.type !== "Feature") continue;
      const polygon = feature.geometry;
      if (polygon?.type === "Polygon") appendPolygon(positions, polygon.coordinates);
      if (polygon?.type === "MultiPolygon") {
        for (const coordinates of polygon.coordinates) appendPolygon(positions, coordinates);
      }
    }
    country.fill = new Float32Array(positions);
  }
  return country.fill;
}
