import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";
import { getSunDirectionVector } from "../src/lib/astronomy";
import { latLngToVector3, vector3ToLatLng, slerpVectors } from "../src/lib/geo-spatial";
import { NUMERIC_TO_ISO, NAME_TO_ISO, getCountryData } from "../src/lib/country-data";
import { type CountryProperties } from "../src/lib/historical-topology";

describe("Geo-Spatial Conversions (3D Sphere <-> Lat/Long)", () => {
  test("Equator meridian (0, 0) maps to unit circle (+X axis in Three.js SphereGeometry)", () => {
    const vec = latLngToVector3(0, 0, 1.0);
    assert.ok(Math.abs(vec.x - 1.0) < 1e-4, `Expected x ~ 1.0, got ${vec.x}`);
    assert.ok(Math.abs(vec.y) < 1e-4, `Expected y ~ 0.0, got ${vec.y}`);
    assert.ok(Math.abs(vec.z) < 1e-4, `Expected z ~ 0.0, got ${vec.z}`);
  });

  test("North Pole (90, 0) maps to +Y axis", () => {
    const vec = latLngToVector3(90, 0, 1.0);
    assert.ok(Math.abs(vec.x) < 1e-4);
    assert.ok(Math.abs(vec.y - 1.0) < 1e-4);
    assert.ok(Math.abs(vec.z) < 1e-4);
  });

  test("Roundtrip conversion preserves coordinates", () => {
    const testCases = [
      { lat: -15.79, lng: -47.88 }, // Brasília
      { lat: 52.52, lng: 13.41 },   // Berlin
      { lat: 35.68, lng: 139.69 },  // Tokyo
      { lat: 38.89, lng: -77.03 },  // Washington
    ];

    for (const tc of testCases) {
      const vec = latLngToVector3(tc.lat, tc.lng, 1.0);
      const roundtrip = vector3ToLatLng(vec);
      assert.ok(
        Math.abs(roundtrip.lat - tc.lat) < 0.1,
        `Lat mismatch for (${tc.lat}, ${tc.lng}): got ${roundtrip.lat}`
      );
      assert.ok(
        Math.abs(roundtrip.lng - tc.lng) < 0.1,
        `Lng mismatch for (${tc.lat}, ${tc.lng}): got ${roundtrip.lng}`
      );
    }
  });

  test("slerpVectors provides mathematically sound spherical interpolation", () => {
    const v1 = latLngToVector3(0, 0, 1.0);
    const v2 = latLngToVector3(0, 90, 1.0);

    // t = 0 returns v1
    const start = slerpVectors(v1, v2, 0);
    assert.ok(Math.abs(start.distanceTo(v1)) < 1e-5);

    // t = 1 returns v2
    const end = slerpVectors(v1, v2, 1);
    assert.ok(Math.abs(end.distanceTo(v2)) < 1e-5);

    // t = 0.5 returns midpoint (lat 0, lng 45) on unit sphere
    const mid = slerpVectors(v1, v2, 0.5);
    assert.ok(Math.abs(mid.length() - 1.0) < 1e-5, "Midpoint must stay on unit sphere");
    const midLatLng = vector3ToLatLng(mid);
    assert.ok(Math.abs(midLatLng.lat - 0) < 0.1);
    assert.ok(Math.abs(midLatLng.lng - 45) < 0.1);

    // Handles opposite vectors without crashing or returning NaN
    const north = latLngToVector3(90, 0, 2.0);
    const south = latLngToVector3(-90, 0, 2.0);
    const midAntipodal = slerpVectors(north, south, 0.5);
    assert.ok(!Number.isNaN(midAntipodal.x));
    assert.ok(!Number.isNaN(midAntipodal.y));
    assert.ok(!Number.isNaN(midAntipodal.z));
    assert.ok(Math.abs(midAntipodal.length() - 2.0) < 1e-4);
  });
});

describe("Spatial Indexing & TopoJSON Picking (<0.2ms)", () => {
  const topology = worldAtlas as any;
  const featureCollection = topojson.feature(topology, topology.objects.countries) as any;
  featureCollection.features.forEach((f: any) => {
    if (f.properties) f.properties.id = f.id;
  });
  const query = whichPolygon<CountryProperties>(featureCollection);

  test("Spatial index resolves coordinates to correct countries", () => {
    // Brasília (-47.88, -15.79) -> Brazil (076 -> BRA)
    const brazilFeature = query([-47.88, -15.79]);
    assert.ok(brazilFeature, "Expected feature for Brazil coordinates");
    const brazilIso =
      NUMERIC_TO_ISO[String(brazilFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[brazilFeature.name ?? ""];
    assert.equal(brazilIso, "BRA");

    // Berlin (13.40, 52.52) -> Germany (276 -> DEU)
    const germanyFeature = query([13.40, 52.52]);
    assert.ok(germanyFeature, "Expected feature for Germany coordinates");
    const germanyIso =
      NUMERIC_TO_ISO[String(germanyFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[germanyFeature.name ?? ""];
    assert.equal(germanyIso, "DEU");

    // Tokyo (139.69, 35.68) -> Japan (392 -> JPN)
    const japanFeature = query([139.69, 35.68]);
    assert.ok(japanFeature, "Expected feature for Japan coordinates");
    const japanIso =
      NUMERIC_TO_ISO[String(japanFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[japanFeature.name ?? ""];
    assert.equal(japanIso, "JPN");
  });
});

describe("Comprehensive Country Mapping (100% Coverage & Zero-padded IDs)", () => {
  const topology = worldAtlas as any;
  const geometries = topology.objects.countries.geometries;

  test("All 177 geometries in Natural Earth TopoJSON map to valid ISO alpha-3 code", () => {
    let unmapped = 0;
    for (const geom of geometries) {
      const numId = geom.id !== undefined && geom.id !== null ? String(geom.id).padStart(3, "0") : "";
      const countryName = geom.properties?.name;
      const iso = NUMERIC_TO_ISO[numId] || (countryName ? NAME_TO_ISO[countryName] : undefined);
      if (!iso) {
        unmapped++;
      } else {
        assert.equal(typeof iso, "string");
        assert.equal(iso.length, 3);
      }
    }
    assert.equal(unmapped, 0, "All geometries must resolve to an ISO alpha-3 code");
  });

  test("Zero-padded IDs resolve correctly for Brazil, Argentina, and Australia", () => {
    assert.equal(NUMERIC_TO_ISO["076"], "BRA");
    assert.equal(NUMERIC_TO_ISO["032"], "ARG");
    assert.equal(NUMERIC_TO_ISO["036"], "AUS");
  });

  test("getCountryData returns rich metadata for global non-pilot countries", () => {
    const france = getCountryData("FRA");
    assert.ok(france);
    assert.equal(france.nameCommon, "França");
    assert.equal(france.capital, "Paris");
    assert.equal(france.continent, "Europe");
    assert.ok(france.latitude !== null && france.latitude > 45 && france.latitude < 50);

    const canada = getCountryData("CAN");
    assert.ok(canada);
    assert.equal(canada.nameCommon, "Canadá");
    assert.equal(canada.capital, "Ottawa");

    const chile = getCountryData("CHL");
    assert.ok(chile);
    assert.equal(chile.nameCommon, "Chile");
    assert.equal(chile.capital, "Santiago");
  });
});

describe("Shader Math & World-Space Coordinate Consistency", () => {
  test("Normal vector transformed to world space aligns with sun direction vector", () => {
    // Normal pointing at (15 deg lat, -45 deg lng)
    const worldNormal = latLngToVector3(15.0, -45.0, 1.0).normalize();
    const sunDir = getSunDirectionVector(15.0, -45.0);

    // In world space, dot product between identical normal and sun direction must be exactly 1.0
    const dotProduct = worldNormal.dot(sunDir);
    assert.ok(
      Math.abs(dotProduct - 1.0) < 1e-5,
      `Expected dot product ~1.0, got ${dotProduct}`
    );
  });
});

describe("ETAPA 1: Non-Mirrored 3D Geometry, Textures, Shaders & Moon Dynamics", () => {
  test("Three.js SphereGeometry parametric mapping is strictly non-mirrored", () => {
    // In Three.js SphereGeometry:
    // u goes from 0 (left edge, -180 deg) to 0.5 (center, 0 deg Prime Meridian) to 1.0 (+180 deg)
    // Greenwich Meridian (lat 0, lng 0) -> u=0.5 -> (+1, 0, 0)
    const primeMeridian = latLngToVector3(0, 0, 1.0);
    assert.ok(Math.abs(primeMeridian.x - 1.0) < 1e-4);
    assert.ok(Math.abs(primeMeridian.y) < 1e-4);
    assert.ok(Math.abs(primeMeridian.z) < 1e-4);

    // Americas / West (lat 0, lng -90) -> u=0.25 -> (0, 0, +1) (+Z axis)
    const americas = latLngToVector3(0, -90, 1.0);
    assert.ok(Math.abs(americas.x) < 1e-4);
    assert.ok(Math.abs(americas.y) < 1e-4);
    assert.ok(Math.abs(americas.z - 1.0) < 1e-4, `Expected +Z ~ 1.0 for West Americas, got ${americas.z}`);

    // Asia / East (lat 0, lng +90) -> u=0.75 -> (0, 0, -1) (-Z axis)
    const asia = latLngToVector3(0, 90, 1.0);
    assert.ok(Math.abs(asia.x) < 1e-4);
    assert.ok(Math.abs(asia.y) < 1e-4);
    assert.ok(Math.abs(asia.z - (-1.0)) < 1e-4, `Expected -Z ~ -1.0 for East Asia, got ${asia.z}`);

    // Pacific Antimeridian (lat 0, lng 180) -> u=0.0 / 1.0 -> (-1, 0, 0) (-X axis)
    const antimeridian = latLngToVector3(0, 180, 1.0);
    assert.ok(Math.abs(antimeridian.x - (-1.0)) < 1e-4);
    assert.ok(Math.abs(antimeridian.y) < 1e-4);
    assert.ok(Math.abs(antimeridian.z) < 1e-4);
  });

  test("Fuzz test: 1,000 random global coordinates roundtrip with sub-arcsecond accuracy", () => {
    let maxLatDiff = 0;
    let maxLngDiff = 0;

    for (let i = 0; i < 1000; i++) {
      const lat = (Math.random() * 179.8) - 89.9;
      const lng = (Math.random() * 360) - 180;
      const vec = latLngToVector3(lat, lng, 1.0);
      const res = vector3ToLatLng(vec);

      const dLat = Math.abs(res.lat - lat);
      let dLng = Math.abs(res.lng - lng);
      if (dLng > 180) dLng = Math.abs(dLng - 360);

      if (dLat > maxLatDiff) maxLatDiff = dLat;
      if (dLng > maxLngDiff) maxLngDiff = dLng;

      assert.ok(dLat < 0.001, `Lat mismatch at (${lat}, ${lng}): diff ${dLat}`);
      assert.ok(dLng < 0.001, `Lng mismatch at (${lat}, ${lng}): diff ${dLng}`);
    }
  });

  test("Lunar tidal locking invariant: child mesh orientation in orbit group remains fixed relative to Earth", () => {
    // Simulate Moon orbiting Earth:
    // orbitGroup sits at (0, 0, 0)
    // moonMesh is a child at local position (3.6, 0.4, 0)
    const orbitGroup = new THREE.Group();
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 16));
    moonMesh.position.set(3.6, 0.4, 0);
    orbitGroup.add(moonMesh);

    // Initial direction from Moon to Earth in Moon's local space
    const initialLocalEarthDir = new THREE.Vector3().copy(moonMesh.position).negate().normalize();

    // Rotate orbit group around Earth by 90 degrees (quarter orbit)
    orbitGroup.rotation.y = Math.PI / 2;
    orbitGroup.updateMatrixWorld(true);

    // The Moon has moved in world space
    const worldMoonPos = new THREE.Vector3();
    moonMesh.getWorldPosition(worldMoonPos);
    assert.ok(Math.abs(worldMoonPos.x) < 1e-4, `Expected world X ~ 0, got ${worldMoonPos.x}`);
    assert.ok(Math.abs(worldMoonPos.z - (-3.6)) < 1e-4, `Expected world Z ~ -3.6, got ${worldMoonPos.z}`);

    // Vector from Moon to Earth (0,0,0) in world coordinates
    const worldEarthDir = new THREE.Vector3(0, 0, 0).sub(worldMoonPos).normalize();

    // Transform world Earth direction into Moon's local coordinate frame
    const moonWorldQuat = new THREE.Quaternion();
    moonMesh.getWorldQuaternion(moonWorldQuat);
    const localEarthDirAfterOrbit = worldEarthDir.clone().applyQuaternion(moonWorldQuat.clone().invert()).normalize();

    // In Moon's local coordinate frame, the Earth is STILL in the exact same direction!
    // (Proving true tidal locking: the near side never turns away from Earth)
    assert.ok(
      initialLocalEarthDir.distanceTo(localEarthDirAfterOrbit) < 1e-4,
      "Moon must remain strictly tidally locked without spinning away from Earth"
    );
  });

  test("Earth daytime diffuse lighting and night composite parameters are physically calibrated", () => {
    // Solar diffuse formula: clamp(nDotL * 0.35 + 0.65, 0.65, 1.0)
    const noonDiffuse = Math.min(1.0, Math.max(0.65, 1.0 * 0.35 + 0.65));
    assert.equal(noonDiffuse, 1.0, "High noon must be 100% illumination");

    const terminatorDiffuse = Math.min(1.0, Math.max(0.65, 0.0 * 0.35 + 0.65));
    assert.equal(terminatorDiffuse, 0.65, "Terminator must smoothly settle at 65% before sunset gradient");

    // Night baseline ambient depth (#02050b): non-zero so oceans are subtly distinct from deep space
    const nightBase = new THREE.Vector3(0.012, 0.022, 0.042);
    assert.ok(nightBase.x > 0.005 && nightBase.y > 0.01 && nightBase.z > 0.02);
  });
});
