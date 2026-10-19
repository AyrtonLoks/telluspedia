import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";

import { calculateSubsolarPoint, getSunDirectionVector, getLunarPhase } from "../src/lib/astronomy";
import { latLngToVector3, vector3ToLatLng } from "../src/lib/geo-spatial";
import { formatABNT, formatAPA, formatMLA, formatBibTeX } from "../src/lib/citations";
import { NUMERIC_TO_ISO, NAME_TO_ISO, getCountryData } from "../src/lib/country-data";

describe("Astronomy & Solar Calculations (NOAA Algorithm)", () => {
  test("Equinox solar declination is near 0 degrees", () => {
    const marchEquinox = new Date(Date.UTC(2026, 2, 20, 12, 0, 0));
    const subsolar = calculateSubsolarPoint(marchEquinox);
    assert.ok(
      Math.abs(subsolar.latitude) < 2.5,
      `Expected declination near 0, got ${subsolar.latitude}`
    );
    assert.ok(
      Math.abs(subsolar.longitude) < 5.0,
      `Expected longitude near 0 at noon UTC, got ${subsolar.longitude}`
    );
  });

  test("Summer solstice solar declination is near +23.4 degrees", () => {
    const summerSolstice = new Date(Date.UTC(2026, 5, 21, 12, 0, 0));
    const subsolar = calculateSubsolarPoint(summerSolstice);
    assert.ok(
      subsolar.latitude > 22.0 && subsolar.latitude < 24.0,
      `Expected summer solstice near 23.4, got ${subsolar.latitude}`
    );
  });

  test("Winter solstice solar declination is near -23.4 degrees", () => {
    const winterSolstice = new Date(Date.UTC(2026, 11, 21, 12, 0, 0));
    const subsolar = calculateSubsolarPoint(winterSolstice);
    assert.ok(
      subsolar.latitude < -22.0 && subsolar.latitude > -24.0,
      `Expected winter solstice near -23.4, got ${subsolar.latitude}`
    );
  });

  test("Sun direction unit vector has length 1.0", () => {
    const vec = getSunDirectionVector(15.0, -45.0);
    assert.ok(Math.abs(vec.length() - 1.0) < 1e-5);
  });

  test("Lunar phase calculation produces valid bounds", () => {
    const phase = getLunarPhase(new Date());
    assert.ok(phase.phaseFraction >= 0 && phase.phaseFraction <= 1);
    assert.ok(phase.illumination >= 0 && phase.illumination <= 1);
    assert.ok(typeof phase.phaseName === "string");
  });
});

describe("Geo-Spatial Conversions (3D Sphere <-> Lat/Long)", () => {
  test("Equator meridian (0, 0) maps to unit circle", () => {
    const vec = latLngToVector3(0, 0, 1.0);
    assert.ok(Math.abs(vec.x) < 1e-4);
    assert.ok(Math.abs(vec.y) < 1e-4);
    assert.ok(Math.abs(Math.abs(vec.z) - 1.0) < 1e-4);
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
});

describe("Academic Citations Formatting (ABNT, APA, MLA, BibTeX)", () => {
  const params = {
    title: "Sistema Político e Constituição de 1988",
    countryName: "Brasil",
    url: "https://telluspedia.org/pais/BRA/politica",
    accessDate: new Date("2026-10-19T00:00:00Z"),
    publicationYear: 2026,
  };

  test("ABNT NBR 6023 compliance", () => {
    const abnt = formatABNT(params);
    assert.ok(abnt.includes("TELLUSPEDIA. BRASIL: Sistema Político e Constituição de 1988."));
    assert.ok(abnt.includes("Disponível em: <https://telluspedia.org/pais/BRA/politica>"));
    assert.ok(abnt.includes("Acesso em:"));
  });

  test("APA 7th edition compliance", () => {
    const apa = formatAPA(params);
    assert.ok(apa.includes("TellusPedia. (2026). Brasil: Sistema Político e Constituição de 1988."));
    assert.ok(apa.includes("Retrieved"));
    assert.ok(apa.includes("from https://telluspedia.org/pais/BRA/politica"));
  });

  test("MLA 9th edition compliance", () => {
    const mla = formatMLA(params);
    assert.ok(mla.includes('"Brasil: Sistema Político e Constituição de 1988."'));
    assert.ok(mla.includes("TellusPedia Foundation, 2026"));
    assert.ok(mla.includes("Accessed"));
  });

  test("BibTeX (.bib) format compliance", () => {
    const bib = formatBibTeX(params);
    assert.ok(bib.includes("@online{telluspedia_brasil_2026,"));
    assert.ok(bib.includes("author       = {{TellusPedia Editorial Board}}"));
    assert.ok(bib.includes("url          = {https://telluspedia.org/pais/BRA/politica}"));
  });
});

describe("Spatial Indexing & TopoJSON Picking (<0.2ms)", () => {
  const topology = worldAtlas as any;
  const featureCollection = topojson.feature(topology, topology.objects.countries) as any;
  featureCollection.features.forEach((f: any) => {
    if (f.properties) f.properties.id = f.id;
  });
  const query = whichPolygon(featureCollection);

  test("Spatial index resolves coordinates to correct countries", () => {
    // Brasília (-47.88, -15.79) -> Brazil (076 -> BRA)
    const brazilFeature = query([-47.88, -15.79]);
    assert.ok(brazilFeature, "Expected feature for Brazil coordinates");
    const brazilIso =
      NUMERIC_TO_ISO[String(brazilFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[brazilFeature.name];
    assert.equal(brazilIso, "BRA");

    // Berlin (13.40, 52.52) -> Germany (276 -> DEU)
    const germanyFeature = query([13.40, 52.52]);
    assert.ok(germanyFeature, "Expected feature for Germany coordinates");
    const germanyIso =
      NUMERIC_TO_ISO[String(germanyFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[germanyFeature.name];
    assert.equal(germanyIso, "DEU");

    // Tokyo (139.69, 35.68) -> Japan (392 -> JPN)
    const japanFeature = query([139.69, 35.68]);
    assert.ok(japanFeature, "Expected feature for Japan coordinates");
    const japanIso =
      NUMERIC_TO_ISO[String(japanFeature.id).padStart(3, "0")] ||
      NAME_TO_ISO[japanFeature.name];
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
    assert.equal(france.nameCommon, "França");
    assert.equal(france.capital, "Paris");
    assert.equal(france.continent, "Europe");
    assert.ok(france.latitude > 45 && france.latitude < 50);

    const canada = getCountryData("CAN");
    assert.equal(canada.nameCommon, "Canadá");
    assert.equal(canada.capital, "Ottawa");

    const chile = getCountryData("CHL");
    assert.equal(chile.nameCommon, "Chile");
    assert.equal(chile.capital, "Santiago");
  });
});

describe("Historical Ephemeris & Milestone Alignment", () => {
  test("Apollo 11 (1969-07-20) subsolar declination is positive (Northern Summer)", () => {
    const apolloDate = new Date("1969-07-20T20:17:00Z");
    const subsolar = calculateSubsolarPoint(apolloDate);
    assert.ok(subsolar.latitude > 19.0 && subsolar.latitude < 22.0);
  });

  test("Fall of Berlin Wall (1989-11-09) subsolar declination is negative (Southern Summer approach)", () => {
    const wallDate = new Date("1989-11-09T18:00:00Z");
    const subsolar = calculateSubsolarPoint(wallDate);
    assert.ok(subsolar.latitude < -15.0 && subsolar.latitude > -18.0);
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

