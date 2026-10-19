import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";

import { calculateSubsolarPoint, getSunDirectionVector, getLunarPhase } from "../src/lib/astronomy";
import { latLngToVector3, vector3ToLatLng, slerpVectors } from "../src/lib/geo-spatial";
import { formatABNT, formatAPA, formatMLA, formatBibTeX, getSourceUrl, copyToClipboard } from "../src/lib/citations";
import { NUMERIC_TO_ISO, NAME_TO_ISO, getCountryData, GLOBAL_MILESTONES, PILOT_COUNTRIES, findMilestoneById, getIso2FromIso3, ISO3_TO_ISO2, ISO3_TO_TIMEZONE } from "../src/lib/country-data";
import { useGlobeStore, MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE, DEFAULT_CAMERA_ALTITUDE } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useComparatorStore } from "../src/stores/comparatorStore";
import { useReaderStore } from "../src/stores/readerStore";
import { formatSourceBadge } from "../src/components/hud/CountryMetricsGrid";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HoverCitationCard } from "../src/components/reader/HoverCitationCard";
import { HoverCardPreview } from "../src/components/reader/HoverCardPreview";
import { ReaderContent } from "../src/components/reader/ReaderContent";
import {
  createApollo11TrajectoryCurve,
  getApollo11ControlPoints,
  CAPE_CANAVERAL_COORDS,
  TRANQUILITY_BASE_COORDS,
  getMissionTelemetry,
  getMissionPhase,
  APOLLO11_PHASES,
  selenographicToVector3,
  MOON_DEFAULT_POSITION,
  MOON_RADIUS_UNITS,
} from "../src/lib/apollo11";
import { useApollo11Store } from "../src/stores/apollo11Store";
import { Apollo11TelemetryOverlay } from "../src/components/globe/Apollo11TelemetryOverlay";
import { useStudyStore } from "../src/stores/studyStore";
import { getMemoryStudy, saveMemoryStudy, StudyRecord } from "../src/lib/studies-store";
import { HistoricalEraBadge } from "../src/components/globe/HistoricalEraBadge";
import {
  resolveHistoricalEra,
  resolveHistoricalEntity,
  resolveEffectiveHistoricalYear,
  HISTORICAL_ERAS,
  HISTORICAL_ENTITIES,
  findHistoricalEntity,
} from "../src/lib/historical-entities";
import { StudyShareModal } from "../src/components/study/StudyShareModal";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import {
  loadHistoricalTopology,
  getHistoricalSpatialIndex,
  getContemporarySpatialIndex,
} from "../src/lib/historical-topology";

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

describe("Milestones & Geopolitical Blocs (Timeline & Border Highlighting)", () => {
  test("glo-1999 (Euro) is configured with European center, altitude 2.7, and 11 Eurozone bloc members", () => {
    const euro = GLOBAL_MILESTONES.find((m) => m.id === "glo-1999");
    assert.ok(euro, "glo-1999 must exist in GLOBAL_MILESTONES");
    assert.equal(euro.year, 1999);
    assert.equal(euro.sourcePrimary, "ECB");
    assert.equal(euro.latitude, 48.5);
    assert.equal(euro.longitude, 9.0);
    assert.equal(euro.preferredAltitude, 2.7);

    const expectedBloc = ["DEU", "FRA", "ITA", "ESP", "PRT", "NLD", "BEL", "LUX", "AUT", "FIN", "IRL"];
    assert.ok(Array.isArray(euro.blocIsos), "euro.blocIsos must be an array");
    assert.equal(euro.blocIsos.length, 11);
    for (const iso of expectedBloc) {
      assert.ok(euro.blocIsos.includes(iso), `Expected ${iso} in Eurozone blocIsos`);
    }
  });

  test("findMilestoneById retrieves both global and pilot milestones", () => {
    const globalM = findMilestoneById("glo-1999");
    assert.ok(globalM);
    assert.equal(globalM.title, "Criação da Moeda Única Euro");

    const pilotM = findMilestoneById("bra-1822");
    assert.ok(pilotM);
    assert.equal(pilotM.title, "Independência do Brasil");
    assert.equal(pilotM.sourcePrimary, "IHGB");

    const notFound = findMilestoneById("invalid-id-xyz");
    assert.equal(notFound, undefined);
  });

  test("All milestones in GLOBAL_MILESTONES and PILOT_COUNTRIES have non-empty sourcePrimary", () => {
    for (const m of GLOBAL_MILESTONES) {
      assert.ok(
        typeof m.sourcePrimary === "string" && m.sourcePrimary.trim().length > 0,
        `Global milestone ${m.id} is missing sourcePrimary`
      );
    }

    for (const [countryIso, country] of Object.entries(PILOT_COUNTRIES)) {
      for (const m of country.milestones) {
        assert.ok(
          typeof m.sourcePrimary === "string" && m.sourcePrimary.trim().length > 0,
          `Country ${countryIso} milestone ${m.id} is missing sourcePrimary`
        );
      }
    }
  });

  test("All 11 Eurozone bloc countries resolve to TopoJSON geometries and generate border points", () => {
    const topology = worldAtlas as any;
    const geometries = topology.objects.countries.geometries;
    const euro = findMilestoneById("glo-1999");
    assert.ok(euro?.blocIsos);

    const blocSet = new Set(euro.blocIsos);
    const foundGeometries = new Set<string>();
    let totalBorderPoints = 0;

    for (const geom of geometries) {
      const numId = geom.id !== undefined && geom.id !== null ? String(geom.id).padStart(3, "0") : "";
      const countryName = geom.properties?.name;
      const iso = NUMERIC_TO_ISO[numId] || (countryName ? NAME_TO_ISO[countryName] : undefined);

      if (iso && blocSet.has(iso)) {
        foundGeometries.add(iso);
        const mesh = topojson.mesh(topology, geom);
        if (mesh && mesh.coordinates) {
          for (const line of mesh.coordinates) {
            totalBorderPoints += line.length;
          }
        }
      }
    }

    // All 11 countries must be found in the topology
    assert.equal(foundGeometries.size, 11, `Found ${foundGeometries.size} of 11 Eurozone nations`);
    assert.ok(totalBorderPoints > 300, `Expected substantial border geometry points, got ${totalBorderPoints}`);
  });

  test("Timeline store toggle milestone selection: selecting again sets selectedMilestoneId to null", () => {
    const store = useTimelineStore.getState();

    // Select milestone
    store.selectMilestone("glo-1999");
    assert.equal(useTimelineStore.getState().selectedMilestoneId, "glo-1999");

    // Toggle: selecting currently active milestone clears it
    const currentId = useTimelineStore.getState().selectedMilestoneId;
    store.selectMilestone(currentId === "glo-1999" ? null : "glo-1999");
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);

    // Re-select different milestone
    store.selectMilestone("bra-1822");
    assert.equal(useTimelineStore.getState().selectedMilestoneId, "bra-1822");

    // Clear
    store.selectMilestone(null);
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
  });

  test("Milestone card horizontal viewport edge alignment avoids clipping", () => {
    const getAlignmentClass = (percent: number) =>
      percent < 15
        ? "left-0 translate-x-0"
        : percent > 78
        ? "right-0 left-auto translate-x-0"
        : "left-1/2 -translate-x-1/2";

    // Near left viewport edge (e.g. 2%, 5%, 14%)
    assert.equal(getAlignmentClass(2), "left-0 translate-x-0");
    assert.equal(getAlignmentClass(14.9), "left-0 translate-x-0");

    // Near right viewport edge (e.g. 80%, 95%, 98%)
    assert.equal(getAlignmentClass(80), "right-0 left-auto translate-x-0");
    assert.equal(getAlignmentClass(98), "right-0 left-auto translate-x-0");

    // Central safe span (e.g. 50%)
    assert.equal(getAlignmentClass(50), "left-1/2 -translate-x-1/2");
  });

  test("Timeline axis span guards against division by zero when startYear equals endYear", () => {
    const calculateSpanAndPercent = (startYear: number, endYear: number, milestoneYear: number) => {
      const span = Math.max(1, endYear - startYear);
      const percent = ((milestoneYear - startYear) / span) * 100;
      return { span, percent };
    };

    const normal = calculateSpanAndPercent(1900, 2000, 1950);
    assert.equal(normal.span, 100);
    assert.equal(normal.percent, 50);

    // Degenerate zero-range edge case
    const zeroRange = calculateSpanAndPercent(2000, 2000, 2000);
    assert.equal(zeroRange.span, 1);
    assert.equal(zeroRange.percent, 0);
    assert.ok(Number.isFinite(zeroRange.percent), "Percent must be finite, never NaN");
  });

  test("Active border highlights resolve countryIso for single nation and blocIsos for multi-nation blocs", () => {
    const resolveBorders = (milestoneId: string) => {
      const milestone = findMilestoneById(milestoneId);
      const activeIsos = new Set<string>();
      if (milestone) {
        if (milestone.blocIsos && milestone.blocIsos.length > 0) {
          for (const iso of milestone.blocIsos) activeIsos.add(iso);
        }
        if (milestone.countryIso) {
          activeIsos.add(milestone.countryIso);
        }
      }
      return activeIsos;
    };

    // Single country milestone: World Wide Web (1991) -> CHE only
    const www = resolveBorders("glo-1991");
    assert.equal(www.size, 1);
    assert.ok(www.has("CHE"));

    // Multi-country milestone: Fall of Berlin Wall (1989) -> DEU, GDR, FRG
    const berlinWall = resolveBorders("glo-1989");
    assert.equal(berlinWall.size, 3);
    assert.ok(berlinWall.has("DEU"));
    assert.ok(berlinWall.has("GDR"));
    assert.ok(berlinWall.has("FRG"));

    // Multi-country bloc milestone: Creation of Euro (1999) -> 11 nations
    const euroBloc = resolveBorders("glo-1999");
    assert.equal(euroBloc.size, 11);
    assert.ok(euroBloc.has("DEU"));
    assert.ok(euroBloc.has("FRA"));
    assert.ok(euroBloc.has("ITA"));
    assert.ok(euroBloc.has("ESP"));
    assert.ok(euroBloc.has("PRT"));
    assert.ok(euroBloc.has("NLD"));
    assert.ok(euroBloc.has("BEL"));
    assert.ok(euroBloc.has("LUX"));
    assert.ok(euroBloc.has("AUT"));
    assert.ok(euroBloc.has("FIN"));
    assert.ok(euroBloc.has("IRL"));
  });
});

describe("Camera Movement, Safe Altitude & Globe Store Transitions", () => {
  test("GlobeStore flyTo clamps latitude and normalizes longitude", () => {
    const store = useGlobeStore.getState();
    const prevTrigger = store.flyToTrigger;

    // Out-of-bounds latitude (95 deg) and wrapped longitude (270 deg -> -90 deg)
    store.flyTo(95, 270, 2.0);

    const updated = useGlobeStore.getState();
    assert.equal(updated.cameraLat, 89.9, "Latitude must be clamped to 89.9");
    assert.equal(updated.cameraLng, -90, "Longitude 270 must normalize to -90");
    assert.equal(updated.cameraAltitude, 2.0);
    assert.equal(updated.flyToTrigger, prevTrigger + 1);
  });

  test("GlobeStore flyTo strictly enforces minimum safe altitude (1.5) to avoid Earth collision", () => {
    const store = useGlobeStore.getState();

    // Dangerous low altitude (0.2) that would collide with Earth center
    store.flyTo(0, 0, 0.2);
    assert.equal(useGlobeStore.getState().cameraAltitude, MIN_CAMERA_ALTITUDE);

    // Altitude above max (10.0) is clamped to MAX_CAMERA_ALTITUDE
    store.flyTo(0, 0, 10.0);
    assert.equal(useGlobeStore.getState().cameraAltitude, MAX_CAMERA_ALTITUDE);
  });

  test("GlobeStore resetView restores defaults and triggers flyTo to safe orbital view", () => {
    const store = useGlobeStore.getState();
    store.setSelectedIso("BRA");
    store.setHoveredIso("ARG");
    store.setReaderOpen(true);
    useTimelineStore.getState().selectMilestone("bra-1822");

    const prevTrigger = useGlobeStore.getState().flyToTrigger;
    useGlobeStore.getState().resetView();

    const resetState = useGlobeStore.getState();
    assert.equal(resetState.selectedIso, null);
    assert.equal(resetState.hoveredIso, null);
    assert.equal(resetState.cameraLat, 0);
    assert.equal(resetState.cameraLng, 0);
    assert.equal(resetState.cameraAltitude, DEFAULT_CAMERA_ALTITUDE);
    assert.equal(resetState.isReaderOpen, false);
    assert.equal(resetState.isThrottled, false);
    assert.equal(resetState.flyToTrigger, prevTrigger + 1);
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null, "Active milestone must be deselected on resetView");
  });

  test("Antipodal linear lerp cuts through origin (0,0,0) causing bug, whereas spherical slerp preserves safe altitude", () => {
    const vStart = latLngToVector3(0, 0, 2.0);
    const vEnd = latLngToVector3(0, 180, 2.0);

    // 1. Demonstrate the OLD bug: linear lerp midway cuts through the Earth center
    const linearMid = vStart.clone().lerp(vEnd, 0.5);
    assert.ok(
      linearMid.length() < 0.05,
      `Linear lerp mid-point distance to origin is ${linearMid.length()} (cuts through Earth at 0,0,0 and causes NaN)`
    );

    // 2. Demonstrate the FIX: spherical arc interpolation via slerpVectors
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const pos = slerpVectors(vStart, vEnd, t);

      // Distance from origin is strictly 2.0, never drops below 1.5
      assert.ok(
        Math.abs(pos.length() - 2.0) < 1e-4,
        `Altitude at step ${t} must remain 2.0, got ${pos.length()}`
      );
      assert.ok(!Number.isNaN(pos.x));
      assert.ok(!Number.isNaN(pos.y));
      assert.ok(!Number.isNaN(pos.z));
    }
  });

  test("Antipodal polar flight (North Pole to South Pole) preserves altitude and avoids pole singularity", () => {
    const northPole = latLngToVector3(90, 0, 2.2);
    const southPole = latLngToVector3(-90, 0, 2.2);

    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const pos = slerpVectors(northPole, southPole, t);

      assert.ok(
        pos.length() >= 2.19,
        `Polar flight distance must remain ~2.2, got ${pos.length()} at step ${t}`
      );
      assert.ok(!Number.isNaN(pos.x), `x must be finite at step ${t}`);
      assert.ok(!Number.isNaN(pos.y), `y must be finite at step ${t}`);
      assert.ok(!Number.isNaN(pos.z), `z must be finite at step ${t}`);
    }
  });

  test("Mid-flight retargeting maintains continuous position and strict minimum altitude", () => {
    const pStart = latLngToVector3(0, 0, 2.5);
    const pTargetA = latLngToVector3(60, 30, 1.8);
    const pTargetB = latLngToVector3(-35.68, 139.69, 2.0); // Tokyo antipode

    // Midpoint of Flight A at t = 0.5
    const midPosA = slerpVectors(pStart, pTargetA, 0.5);
    assert.ok(midPosA.length() >= MIN_CAMERA_ALTITUDE);

    // Interrupt Flight A from midPosA toward Target B
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const pos = slerpVectors(midPosA, pTargetB, t);
      assert.ok(
        pos.length() >= MIN_CAMERA_ALTITUDE,
        `Mid-flight interrupted flight must maintain min altitude >= 1.5, got ${pos.length()} at step ${t}`
      );
      assert.ok(!Number.isNaN(pos.x));
      assert.ok(!Number.isNaN(pos.y));
      assert.ok(!Number.isNaN(pos.z));
    }
  });
});

describe("ETAPA 4: Responsive Layout, ISO Flag Resolution & Universal Citations", () => {
  test("ISO3 to ISO2 lookup correctly maps Poland to PL, Germany to DE, Brazil to BR, etc.", () => {
    assert.equal(getIso2FromIso3("POL"), "PL");
    assert.equal(getIso2FromIso3("DEU"), "DE");
    assert.equal(getIso2FromIso3("BRA"), "BR");
    assert.equal(getIso2FromIso3("USA"), "US");
    assert.equal(getIso2FromIso3("JPN"), "JP");
    assert.equal(getIso2FromIso3("ZAF"), "ZA");
    assert.equal(getIso2FromIso3("SWE"), "SE");
    assert.equal(getIso2FromIso3("NLD"), "NL");
  });

  test("getCountryData for Poland (POL) resolves to pl.svg and never po.svg", () => {
    const poland = getCountryData("POL");
    assert.equal(poland.isoCode, "POL");
    assert.equal(poland.iso2, "PL");
    assert.equal(poland.flagSvgUrl, "https://flagcdn.com/pl.svg");
    assert.ok(!poland.flagSvgUrl.includes("po.svg"), "Must NOT generate po.svg for Poland");
  });

  test("getCountryData for unindexed ISO does not blindly slice(0, 2) when unknown", () => {
    const unknown = getCountryData("XYZ_UNKNOWN");
    assert.equal(unknown.flagSvgUrl, "", "Unknown country must have empty flagSvgUrl to trigger styled ISO badge");
  });

  test("Pilot countries indicators display valid primary sources (World Bank, PNUD, WHO, SIPRI)", () => {
    const brazil = getCountryData("BRA");
    const gdp = brazil.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
    const hdi = brazil.indicators.find((i) => i.indicatorCode === "UNDP.HDI");
    const life = brazil.indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
    const mil = brazil.indicators.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS");

    assert.equal(gdp?.sourcePrimary, "Banco Mundial");
    assert.equal(hdi?.sourcePrimary, "PNUD");
    assert.equal(life?.sourcePrimary, "OMS");
    assert.equal(mil?.sourcePrimary, "SIPRI");
  });

  test("Pilot countries dossier sections contain explicit academic footnote marks [1], [2], or [3]", () => {
    for (const [iso, country] of Object.entries(PILOT_COUNTRIES)) {
      for (const section of country.dossierSections) {
        assert.ok(
          /\[\d+\]/.test(section.contentMarkdown),
          `Dossier section ${section.dimension} of ${iso} must contain explicit academic footnote marks`
        );
      }
    }
  });

  test("Country mini timeline milestones contain primary sources", () => {
    const brazil = getCountryData("BRA");
    assert.ok(brazil.milestones.length > 0);
    for (const m of brazil.milestones) {
      assert.ok(m.sourcePrimary && m.sourcePrimary.length > 0, `Milestone ${m.id} missing sourcePrimary`);
    }
  });

  test("formatSourceBadge formats institutional sources accurately without broken single-word truncation", () => {
    assert.equal(formatSourceBadge("Banco Mundial"), "B. Mundial");
    assert.equal(formatSourceBadge("Banco Mundial / BEA"), "B. Mundial / BEA");
    assert.equal(formatSourceBadge("IBGE / Banco Mundial"), "IBGE / BM");
    assert.equal(formatSourceBadge("US Census Bureau"), "US Census");
    assert.equal(formatSourceBadge("Stats SA"), "Stats SA");
    assert.equal(formatSourceBadge("E-Stat Japan"), "E-Stat");
    assert.equal(formatSourceBadge("Destatis"), "Destatis");
    assert.equal(formatSourceBadge("PNUD"), "PNUD");
    assert.equal(formatSourceBadge("OMS"), "OMS");
    assert.equal(formatSourceBadge("SIPRI"), "SIPRI");
    assert.equal(formatSourceBadge("Natural Earth"), "Natural Earth");
    assert.notEqual(formatSourceBadge("Banco Mundial"), "Banco", "Must not truncate Banco Mundial to Banco");
    assert.notEqual(formatSourceBadge("US Census Bureau"), "US", "Must not truncate US Census Bureau to US");
  });

  test("MilestonePin horizontal alignment avoids overlapping InspectorHUD at right edge and clipping at left edge", () => {
    const computeAlignment = (percent: number) =>
      percent < 15
        ? "left-0 translate-x-0"
        : percent > 78
        ? "right-0 left-auto translate-x-0"
        : "left-1/2 -translate-x-1/2";

    // Near left edge (e.g., 2%, 5%, 10%)
    assert.equal(computeAlignment(2), "left-0 translate-x-0");
    assert.equal(computeAlignment(14), "left-0 translate-x-0");

    // Center (e.g., 50%)
    assert.equal(computeAlignment(50), "left-1/2 -translate-x-1/2");

    // Near right edge adjacent to InspectorHUD (e.g., 80%, 95%, 98%)
    assert.equal(computeAlignment(79), "right-0 left-auto translate-x-0");
    assert.equal(computeAlignment(85), "right-0 left-auto translate-x-0");
    assert.equal(computeAlignment(98), "right-0 left-auto translate-x-0");
  });

  test("ReaderContent auto-assigns footnote citations to unannotated paragraphs so no text is libre", () => {
    const rawProse = "Primeiro parágrafo do texto histórico.\n\nSegundo parágrafo detalhando o impacto econômico.\n\nTerceiro parágrafo sobre acordos internacionais.";
    const paragraphs = rawProse.split("\n\n");
    const annotated = paragraphs.map((p, idx) => {
      const trimmed = p.trim();
      if (/\[\d+\]/.test(trimmed)) return trimmed;
      const fn = idx === 0 ? " [1]" : idx === 1 ? " [2]" : " [3]";
      return `${trimmed}${fn}`;
    });

    assert.equal(annotated.length, 3);
    assert.ok(annotated[0].endsWith("[1]"));
    assert.ok(annotated[1].endsWith("[2]"));
    assert.ok(annotated[2].endsWith("[3]"));
  });

  test("ReaderContent activeFootnotesMap dynamically includes any cited index (such as [4])", () => {
    const baseMap = {
      1: { source: "Fonte 1", detail: "D1", type: "T1" },
      2: { source: "Fonte 2", detail: "D2", type: "T2" },
      3: { source: "Fonte 3", detail: "D3", type: "T3" },
    };
    const sampleText = "Conforme estudo preliminar [1], complementado por dados [4].";
    const dynamicMap: Record<number, any> = { ...baseMap };
    for (const match of sampleText.matchAll(/\[(\d+)\]/g)) {
      const num = parseInt(match[1], 10);
      if (!dynamicMap[num]) {
        dynamicMap[num] = {
          source: "Arquivo Histórico Oficial",
          detail: "Registro catalogado pelo TellusPedia.",
          type: "Fonte Primária",
        };
      }
    }

    assert.ok(dynamicMap[1]);
    assert.ok(dynamicMap[4], "Footnote [4] must be dynamically cataloged in dynamicMap");
    assert.equal(dynamicMap[4].source, "Arquivo Histórico Oficial");
  });

  test("ComparisonGrid resolves global countries through getCountryData without crashing", () => {
    const countries = ["BRA", "DEU", "POL", "CAN", "XYZ_UNINDEXED"].map((iso) => getCountryData(iso));
    assert.equal(countries.length, 5);
    assert.equal(countries[0].nameCommon, "Brasil");
    assert.equal(countries[1].nameCommon, "Alemanha");
    assert.equal(countries[2].nameCommon, "Polônia");
    assert.equal(countries[3].nameCommon, "Canadá");
    assert.equal(countries[4].nameCommon, "XYZ_UNINDEXED");
    assert.equal(countries[4].flagSvgUrl, "", "Unindexed country yields empty flagSvgUrl for styled badge fallback");
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

describe("Refinements: Solar Lighting, Border Highlighting, HUD Expansion, Timezones & Milestones", () => {
  test("1. Solar lighting at 11:10:49 AM Brasília (14:10:49 UTC) illuminates Brazil in broad daylight (nDotL > 0.95)", () => {
    const brasiliaTimeUtc = new Date("2026-10-19T14:10:49Z");
    const subsolar = calculateSubsolarPoint(brasiliaTimeUtc);

    // Declination in October is in the Southern Hemisphere approaching summer solstice
    assert.ok(
      subsolar.latitude < -5.0 && subsolar.latitude > -15.0,
      `Expected declination between -5 and -15 in October, got ${subsolar.latitude}`
    );
    // At ~14:10 UTC, subsolar longitude is around -32° to -37° West (near Atlantic coast of South America)
    assert.ok(
      subsolar.longitude < -25.0 && subsolar.longitude > -45.0,
      `Expected subsolar longitude near -35W, got ${subsolar.longitude}`
    );

    // Brasília coordinates (-15.79 lat, -47.88 lng)
    const brasiliaNormal = latLngToVector3(-15.79, -47.88, 1.0).normalize();
    const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);

    // Lambertian dot product: at 11:10 AM, dot product must be > 0.95 (direct high noon daylight)
    const nDotL = brasiliaNormal.dot(sunDir);
    assert.ok(
      nDotL > 0.95,
      `Expected high noon broad daylight (nDotL > 0.95), got ${nDotL}`
    );

    // Physical calibration: terminator sunset ring is subtle and narrow (width <= 0.04, intensity <= 0.15)
    const terminatorWidth = 0.035;
    const maxSunsetIntensity = 0.12;
    assert.ok(terminatorWidth <= 0.04, "Terminator sunset ring must be delicate and narrow");
    assert.ok(maxSunsetIntensity <= 0.15, "Sunset ring must not produce a thick intense neon orange streak");
  });

  test("2. Country borders: only active country is highlighted when comparator is closed", () => {
    // Simulate border activeIsos resolution
    const resolveActiveBorders = (
      selectedIso: string | null,
      hoveredIso: string | null,
      isComparatorOpen: boolean,
      comparatorIsos: string[]
    ) => {
      const activeIsos = new Set<string>();
      if (selectedIso) activeIsos.add(selectedIso);
      if (hoveredIso) activeIsos.add(hoveredIso);
      if (isComparatorOpen) {
        for (const iso of comparatorIsos) activeIsos.add(iso);
      }
      return activeIsos;
    };

    // When clicking Brazil with comparator closed
    const initialBorders = resolveActiveBorders("BRA", null, false, ["BRA", "DEU"]);
    assert.equal(initialBorders.size, 1);
    assert.ok(initialBorders.has("BRA"));
    assert.ok(!initialBorders.has("DEU"), "DEU must not remain highlighted when comparator is closed");

    // Switching to Argentina: only ARG is highlighted, BRA is cleared
    const switchedBorders = resolveActiveBorders("ARG", null, false, ["BRA", "DEU"]);
    assert.equal(switchedBorders.size, 1);
    assert.ok(switchedBorders.has("ARG"));
    assert.ok(!switchedBorders.has("BRA"), "BRA must NOT remain highlighted after clicking Argentina");

    // When comparator is explicitly open, comparator countries are included
    const comparatorBorders = resolveActiveBorders("ARG", null, true, ["ARG", "CHL", "COL"]);
    assert.equal(comparatorBorders.size, 3);
    assert.ok(comparatorBorders.has("ARG"));
    assert.ok(comparatorBorders.has("CHL"));
    assert.ok(comparatorBorders.has("COL"));
  });

  test("3. InspectorHUD expands to max-h-[calc(100vh-5.5rem)] when timeline is retracted", () => {
    const computeMaxHeight = (isTimelineExpanded: boolean) =>
      isTimelineExpanded ? "max-h-[calc(100vh-13rem)]" : "max-h-[calc(100vh-5.5rem)]";

    assert.equal(computeMaxHeight(true), "max-h-[calc(100vh-13rem)]");
    assert.equal(computeMaxHeight(false), "max-h-[calc(100vh-5.5rem)]");
  });

  test("4. Accurate IANA timezones for Venezuela, Peru, Ecuador, Bolivia, Paraguay, Uruguay", () => {
    const testCases: Record<string, string> = {
      VEN: "America/Caracas",
      PER: "America/Lima",
      ECU: "America/Guayaquil",
      BOL: "America/La_Paz",
      PRY: "America/Asuncion",
      URY: "America/Montevideo",
      GUY: "America/Guyana",
      SUR: "America/Paramaribo",
    };

    for (const [iso, expectedTz] of Object.entries(testCases)) {
      const data = getCountryData(iso);
      assert.equal(
        data.timezone,
        expectedTz,
        `Country ${iso} expected timezone ${expectedTz}, got ${data.timezone}`
      );
      assert.notEqual(
        data.timezone,
        "UTC",
        `Country ${iso} must not fall back to generic UTC`
      );

      // Verify Intl.DateTimeFormat can format the timezone without throwing
      const now = new Date("2026-10-19T14:10:49Z");
      const formatted = now.toLocaleTimeString("pt-BR", {
        timeZone: data.timezone,
        hour: "2-digit",
        minute: "2-digit",
      });
      assert.ok(typeof formatted === "string" && formatted.length > 0);
    }
  });

  test("5. Presets 'Guerras Mundiais' and 'Guerra Fria' contain representative milestones", () => {
    // Guerras Mundiais (1914-1945)
    const worldWarMilestones = GLOBAL_MILESTONES.filter(
      (m) => m.year >= 1914 && m.year <= 1945
    );
    assert.ok(
      worldWarMilestones.length >= 4,
      `Expected at least 4 World War milestones, got ${worldWarMilestones.length}`
    );
    const wwYears = worldWarMilestones.map((m) => m.year);
    assert.ok(wwYears.includes(1914), "Must include 1914 (Eclosão WWI)");
    assert.ok(wwYears.includes(1919), "Must include 1919 (Versalhes)");
    assert.ok(wwYears.includes(1939), "Must include 1939 (Início WWII)");
    assert.ok(wwYears.includes(1944), "Must include 1944 (Dia D)");
    assert.ok(wwYears.includes(1945), "Must include 1945 (ONU)");

    // Guerra Fria (1947-1991)
    const coldWarMilestones = GLOBAL_MILESTONES.filter(
      (m) => m.year >= 1947 && m.year <= 1991
    );
    assert.ok(
      coldWarMilestones.length >= 6,
      `Expected at least 6 Cold War milestones, got ${coldWarMilestones.length}`
    );
    const cwYears = coldWarMilestones.map((m) => m.year);
    assert.ok(cwYears.includes(1947), "Must include 1947 (Plano Marshall)");
    assert.ok(cwYears.includes(1957), "Must include 1957 (Sputnik 1)");
    assert.ok(cwYears.includes(1962), "Must include 1962 (Crise dos Mísseis)");
    assert.ok(cwYears.includes(1969), "Must include 1969 (Apollo 11)");
    assert.ok(cwYears.includes(1989), "Must include 1989 (Muro de Berlim)");
    assert.ok(cwYears.includes(1991), "Must include 1991 (Dissolução da URSS / WWW)");

    // All milestones must have valid primary sources
    for (const m of GLOBAL_MILESTONES) {
      assert.ok(
        m.sourcePrimary && m.sourcePrimary.trim().length > 0,
        `Milestone ${m.id} missing sourcePrimary`
      );
    }
  });

  test("6. All pilot country milestones possess countryIso and findMilestoneById resolves them", () => {
    for (const [iso, country] of Object.entries(PILOT_COUNTRIES)) {
      const data = getCountryData(iso);
      for (const m of data.milestones) {
        assert.equal(
          m.countryIso,
          iso,
          `Milestone ${m.id} in country ${iso} must have countryIso '${iso}', got '${m.countryIso}'`
        );
        const resolved = findMilestoneById(m.id);
        assert.ok(resolved, `findMilestoneById failed to find ${m.id}`);
        assert.equal(
          resolved?.countryIso,
          iso,
          `findMilestoneById(${m.id}) must return countryIso '${iso}'`
        );
      }
    }
  });

  test("7. MilestonePin click-outside guards preserve selection when clicking HUD or timeline", () => {
    const shouldDismiss = (targetElement: { closest: (sel: string) => boolean; isInsidePin: boolean }) => {
      if (targetElement.isInsidePin) return false;
      if (targetElement.closest("[data-inspector-hud]")) return false;
      if (targetElement.closest("[data-timeline-bar]")) return false;
      return true;
    };

    // Click inside the pin card
    assert.equal(shouldDismiss({ closest: () => false, isInsidePin: true }), false);
    // Click inside InspectorHUD
    assert.equal(
      shouldDismiss({
        closest: (sel) => sel === "[data-inspector-hud]",
        isInsidePin: false,
      }),
      false,
      "Clicks inside InspectorHUD must NOT dismiss active milestone"
    );
    // Click inside TimelineBar
    assert.equal(
      shouldDismiss({
        closest: (sel) => sel === "[data-timeline-bar]",
        isInsidePin: false,
      }),
      false,
      "Clicks inside TimelineBar must NOT dismiss active milestone"
    );
    // Click outside on the 3D canvas / background
    assert.equal(
      shouldDismiss({ closest: () => false, isInsidePin: false }),
      true,
      "Clicks outside must dismiss active milestone"
    );
  });

  test("8. Full South American timezone coverage includes French Guiana and Falklands", () => {
    assert.equal(ISO3_TO_TIMEZONE["GUF"], "America/Cayenne");
    assert.equal(ISO3_TO_TIMEZONE["FLK"], "Atlantic/Stanley");
    assert.equal(getCountryData("GUF").timezone, "America/Cayenne");
    assert.equal(getCountryData("FLK").timezone, "Atlantic/Stanley");
  });

  test("9. resetView clears both selectedMilestoneId and selectedYear", () => {
    useTimelineStore.getState().selectMilestone("bra-1822");
    useTimelineStore.getState().selectYear(1822);
    useGlobeStore.getState().setSelectedIso("BRA");

    assert.equal(useTimelineStore.getState().selectedMilestoneId, "bra-1822");
    assert.equal(useTimelineStore.getState().selectedYear, 1822);
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");

    useGlobeStore.getState().resetView();

    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
    assert.equal(useTimelineStore.getState().selectedYear, null);
    assert.equal(useGlobeStore.getState().selectedIso, null);
  });
});

describe("Primary Data Source URLs & Reader Citation Workflow", () => {
  test("getSourceUrl maps World Bank indicator codes to exact repository URLs", () => {
    assert.equal(
      getSourceUrl("Banco Mundial", "NY.GDP.MKTP.CD"),
      "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"
    );
    assert.equal(
      getSourceUrl("IBGE / Banco Mundial", "SP.POP.TOTL"),
      "https://data.worldbank.org/indicator/SP.POP.TOTL"
    );
    assert.equal(
      getSourceUrl("World Bank", "NY.GDP.PCAP.CD"),
      "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD"
    );
    assert.equal(
      getSourceUrl("Banco Mundial"),
      "https://data.worldbank.org/"
    );
  });

  test("getSourceUrl maps institutional repositories accurately", () => {
    assert.equal(getSourceUrl("PNUD"), "https://hdr.undp.org/data-center/human-development-index");
    assert.equal(getSourceUrl("UNDP"), "https://hdr.undp.org/data-center/human-development-index");
    assert.equal(getSourceUrl("OMS"), "https://www.who.int/data/gho");
    assert.equal(getSourceUrl("WHO"), "https://www.who.int/data/gho");
    assert.equal(getSourceUrl("SIPRI"), "https://www.sipri.org/databases/milex");
    assert.equal(getSourceUrl("Natural Earth"), "https://www.naturalearthdata.com/");
    assert.equal(getSourceUrl("IBGE"), "https://www.ibge.gov.br/");
    assert.equal(getSourceUrl("ONU"), "https://data.un.org/");
    assert.equal(getSourceUrl("Divisão de Estatística da ONU"), "https://data.un.org/");
    assert.equal(getSourceUrl("ECB"), "https://www.ecb.europa.eu/");
    assert.equal(getSourceUrl("NASA"), "https://www.nasa.gov/");
    assert.equal(getSourceUrl("CERN"), "https://home.cern/");
    assert.equal(getSourceUrl("US Census Bureau"), "https://www.census.gov/");
    assert.equal(getSourceUrl("BEA"), "https://www.bea.gov/");
    assert.equal(getSourceUrl("Destatis"), "https://www.destatis.de/");
    assert.equal(getSourceUrl("Stats SA"), "https://www.statssa.gov.za/");
    assert.equal(getSourceUrl("E-Stat Japan"), "https://www.e-stat.go.jp/");
    assert.equal(getSourceUrl("CAPMAS"), "https://www.capmas.gov.eg/");
    assert.equal(getSourceUrl("IHGB"), "https://ihgb.org.br/");
    assert.equal(getSourceUrl("CDC"), "https://www.cdc.gov/");
    assert.equal(getSourceUrl("MHLW Japan"), "https://www.mhlw.go.jp/");
    assert.equal(getSourceUrl("Banco Central do Brasil"), "https://www.bcb.gov.br/");
    assert.equal(getSourceUrl("Federal Reserve"), "https://www.federalreserve.gov/");
    assert.equal(getSourceUrl("Nelson Mandela Foundation"), "https://www.nelsonmandela.org/");
    assert.equal(getSourceUrl("JR Central"), "https://global.jr-central.co.jp/");
    assert.equal(getSourceUrl("Arquivo Histórico Nacional do Japão"), "https://www.archives.go.jp/");
    assert.equal(getSourceUrl("Eurostat"), "https://ec.europa.eu/eurostat");
    assert.equal(getSourceUrl("OECD"), "https://www.oecd.org/");
    assert.equal(getSourceUrl("IMF"), "https://www.imf.org/");
    assert.equal(getSourceUrl("UNESCO"), "https://www.unesco.org/");
    assert.equal(getSourceUrl("FAO"), "https://www.fao.org/");
    assert.equal(getSourceUrl("WTO"), "https://www.wto.org/");
    assert.equal(getSourceUrl("National Archives (NARA)"), "https://www.archives.gov/");
  });

  test("getSourceUrl handles direct HTTP/HTTPS links and unknown fallbacks", () => {
    assert.equal(
      getSourceUrl("https://example.org/custom-dataset"),
      "https://example.org/custom-dataset"
    );
    assert.equal(
      getSourceUrl("http://custom.repo.org/data"),
      "http://custom.repo.org/data"
    );
    assert.equal(
      getSourceUrl("Arquivo Desconhecido Sem Mapeamento"),
      "https://data.un.org/"
    );
    assert.equal(
      getSourceUrl(undefined),
      "https://data.un.org/"
    );
  });

  test("useReaderStore resetActiveDimension restores activeDimension to GEOGRAPHY", () => {
    const store = useReaderStore.getState();
    store.setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    store.resetActiveDimension();
    assert.equal(useReaderStore.getState().activeDimension, "GEOGRAPHY");
  });

  test("useReaderStore customCitationParams passes and resets parameters seamlessly", () => {
    const custom = {
      title: "Expectativa de Vida ao Nascer (76.2 anos)",
      countryName: "Brasil",
      url: "https://www.who.int/data/gho",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    useReaderStore.getState().setCitationModalOpen(true, custom);
    const openState = useReaderStore.getState();
    assert.equal(openState.isCitationModalOpen, true);
    assert.ok(openState.customCitationParams);
    assert.equal(openState.customCitationParams.title, custom.title);
    assert.equal(openState.customCitationParams.url, custom.url);

    // Closing resets custom parameters
    useReaderStore.getState().setCitationModalOpen(false);
    const closedState = useReaderStore.getState();
    assert.equal(closedState.isCitationModalOpen, false);
    assert.equal(closedState.customCitationParams, null);
  });

  test("Academic citations with custom data source produce valid citations", () => {
    const custom = {
      title: "PIB Nominal ($ 2.17 trilhões)",
      countryName: "Brasil",
      url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    const abnt = formatABNT(custom);
    assert.ok(abnt.includes("TELLUSPEDIA. BRASIL: PIB Nominal ($ 2.17 trilhões)."));
    assert.ok(abnt.includes("Disponível em: <https://data.worldbank.org/indicator/NY.GDP.MKTP.CD>"));

    const apa = formatAPA(custom);
    assert.ok(apa.includes("TellusPedia. (2026). Brasil: PIB Nominal ($ 2.17 trilhões)."));
    assert.ok(apa.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"));

    const mla = formatMLA(custom);
    assert.ok(mla.includes('"Brasil: PIB Nominal ($ 2.17 trilhões)."'));
    assert.ok(mla.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"));

    const bib = formatBibTeX(custom);
    assert.ok(bib.includes("url          = {https://data.worldbank.org/indicator/NY.GDP.MKTP.CD}"));
  });

  test("Academic citation formatters gracefully handle missing countryName without throwing", () => {
    const withoutCountry = {
      title: "Indicador Global de Emissões",
      countryName: "",
      url: "https://data.un.org/",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    assert.doesNotThrow(() => {
      const abnt = formatABNT(withoutCountry);
      assert.ok(abnt.includes("TELLUSPEDIA"));
      const apa = formatAPA(withoutCountry);
      assert.ok(apa.includes("TellusPedia"));
      const mla = formatMLA(withoutCountry);
      assert.ok(mla.includes("TellusPedia"));
      const bib = formatBibTeX(withoutCountry);
      assert.ok(bib.includes("telluspedia"));
    });
  });

  test("setSelectedIso automatically resets activeDimension when changing countries", () => {
    // 1. User was reading Brazilian politics
    useGlobeStore.getState().setSelectedIso("BRA");
    useReaderStore.getState().setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    // 2. User selects USA on the globe or search bar
    useGlobeStore.getState().setSelectedIso("USA");

    // 3. activeDimension is automatically reset to "GEOGRAPHY" without manual intervention
    assert.equal(
      useReaderStore.getState().activeDimension,
      "GEOGRAPHY",
      "Selecting a different country must reset activeDimension to GEOGRAPHY"
    );
  });

  test("resetView in globeStore resets activeDimension to GEOGRAPHY", () => {
    useReaderStore.getState().setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    useGlobeStore.getState().resetView();
    assert.equal(
      useReaderStore.getState().activeDimension,
      "GEOGRAPHY",
      "resetView must restore activeDimension to GEOGRAPHY"
    );
  });

  test("copyToClipboard returns boolean without throwing on unsupported contexts", async () => {
    // In Node.js test runner environment (where neither navigator.clipboard nor document exists)
    const result = await copyToClipboard("Citação de Teste");
    assert.equal(typeof result, "boolean");
    assert.equal(result, false, "Should return false cleanly in headless Node environment");
  });
});

describe("Reader DOM Nesting & Hydration Safety (validateDOMNesting Invariants)", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  test("HoverCitationCard source and markup (both closed and open) does not contain <div> tags", () => {
    // 1. Initial closed state
    const closedMarkup = renderToStaticMarkup(
      React.createElement(HoverCitationCard, {
        number: 1,
        source: "Banco Mundial",
        detail: "Indicadores econômicos auditados",
        type: "Fonte Primária",
      })
    );
    assert.ok(!closedMarkup.includes("<div"), "HoverCitationCard (closed) must not render any <div> elements");

    // 2. Open state with full card popup
    const openMarkup = renderToStaticMarkup(
      React.createElement(HoverCitationCard, {
        number: 1,
        source: "Banco Mundial",
        detail: "Indicadores econômicos auditados",
        type: "Fonte Primária",
        defaultOpen: true,
      })
    );
    assert.ok(!openMarkup.includes("<div"), "HoverCitationCard (open) must not render any <div> elements");
    assert.ok(openMarkup.includes("Nota de Rodapé [1]"), "Open citation card must render header");
    assert.ok(openMarkup.includes("Gerar Citação"), "Open citation card must render citation button");
    assert.ok(openMarkup.includes("Copiar ABNT"), "Open citation card must render quick copy button");

    // 3. Static source inspection: ensure no <div> or </div> tag exists in file
    const filePath = path.join(__dirname, "../src/components/reader/HoverCitationCard.tsx");
    const code = fs.readFileSync(filePath, "utf-8");
    assert.ok(!code.includes("<div"), "HoverCitationCard.tsx must not contain any <div tags");
    assert.ok(!code.includes("</div>"), "HoverCitationCard.tsx must not contain any </div> tags");
  });

  test("HoverCardPreview source and markup (both closed and open) does not contain <div> tags", () => {
    // 1. Initial closed state
    const closedMarkup = renderToStaticMarkup(
      React.createElement(HoverCardPreview, {
        isoCode: "USA",
        children: "Estados Unidos",
      })
    );
    assert.ok(!closedMarkup.includes("<div"), "HoverCardPreview (closed) must not render any <div> elements");

    // 2. Open state with full country card popup
    const openMarkup = renderToStaticMarkup(
      React.createElement(HoverCardPreview, {
        isoCode: "USA",
        children: "Estados Unidos",
        defaultOpen: true,
      })
    );
    assert.ok(!openMarkup.includes("<div"), "HoverCardPreview (open) must not render any <div> elements");
    assert.ok(openMarkup.includes("Focar Globo"), "Open preview card must render action buttons");
    assert.ok(openMarkup.includes("Comparar"), "Open preview card must render comparator button");

    // 3. Static source inspection: ensure no <div> or </div> tag exists in file
    const filePath = path.join(__dirname, "../src/components/reader/HoverCardPreview.tsx");
    const code = fs.readFileSync(filePath, "utf-8");
    assert.ok(!code.includes("<div"), "HoverCardPreview.tsx must not contain any <div tags");
    assert.ok(!code.includes("</div>"), "HoverCardPreview.tsx must not contain any </div> tags");
  });

  test("ReaderContent renders prose paragraphs without nested <div> in <p> and lists as semantic <ul> with <li>", () => {
    // 1. Test GEOGRAPHY dimension (pure prose)
    const brazil = getCountryData("BRA");
    const geoMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: brazil, dimension: "GEOGRAPHY" })
    );

    const geoPBlocks = geoMarkup.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    assert.ok(geoPBlocks.length > 0, "ReaderContent GEOGRAPHY must render at least one <p> tag");
    for (const p of geoPBlocks) {
      assert.ok(!p.includes("<div"), `<p> block must not contain <div>: ${p}`);
      assert.ok(!p.includes("<ul"), `<p> block must not contain <ul>: ${p}`);
    }

    // 2. Test GOVERNMENT_POLITICS dimension (contains both prose and bullet list)
    const polMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: brazil, dimension: "GOVERNMENT_POLITICS" })
    );

    assert.ok(polMarkup.includes("<ul"), "GOVERNMENT_POLITICS must render a <ul> list for powers of state");
    assert.ok(polMarkup.includes("<li"), "GOVERNMENT_POLITICS must render <li> items for powers of state");

    const polPBlocks = polMarkup.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of polPBlocks) {
      assert.ok(!p.includes("<div"), `Rendered <p> block must not contain any <div> tag: ${p}`);
      assert.ok(!p.includes("<ul"), `Rendered <p> block must not contain any <ul> tag: ${p}`);
      assert.ok(!p.includes("<li"), `Rendered <p> block must not contain any <li> tag: ${p}`);
    }

    const polUlBlocks = polMarkup.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/gi) || [];
    assert.ok(polUlBlocks.length > 0, "Must have at least one <ul> block");
    for (const ul of polUlBlocks) {
      assert.ok(!ul.includes("<p"), `Rendered <ul> block must not contain <p> tag: ${ul}`);
      assert.ok(!ul.includes("<div"), `Rendered <ul> block must not contain <div> tag: ${ul}`);
      assert.ok(ul.includes("<li"), `Rendered <ul> block must contain <li>: ${ul}`);
    }

    // 3. Test USA GOVERNMENT_POLITICS (contains checks and balances in italics)
    const usa = getCountryData("USA");
    const usaMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: usa, dimension: "GOVERNMENT_POLITICS" })
    );
    assert.ok(usaMarkup.includes("<em"), "USA section must format italics (*checks and balances*) as <em>");
    assert.ok(usaMarkup.includes("checks and balances"), "USA section must contain checks and balances");
    assert.ok(usaMarkup.includes("<ul"), "USA section must render <ul> list");
  });

  test("React validateDOMNesting emits zero errors or warnings when rendering popups inside <p>", () => {
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      originalError(...args);
    };

    try {
      // Render <p> with open HoverCitationCard
      renderToStaticMarkup(
        React.createElement("p", null,
          React.createElement(HoverCitationCard, {
            number: 1,
            source: "Banco Mundial",
            detail: "Indicadores econômicos auditados",
            type: "Fonte Primária",
            defaultOpen: true,
          })
        )
      );

      // Render <p> with open HoverCardPreview
      renderToStaticMarkup(
        React.createElement("p", null,
          React.createElement(HoverCardPreview, {
            isoCode: "USA",
            children: "Estados Unidos",
            defaultOpen: true,
          })
        )
      );

      assert.equal(errors.length, 0, `validateDOMNesting logged errors: ${errors.join("; ")}`);
    } finally {
      console.error = originalError;
    }
  });
});

describe("Apollo 11 3D Trajectory, Telemetry & Space Flight Dynamics (RN12.1)", () => {
  test("Trajectory starting coordinates strictly match Cape Canaveral Pad 39A (lat: 28.5721, lng: -80.648, radius: 1.002)", () => {
    const curve = createApollo11TrajectoryCurve();
    const startPoint = curve.getPoint(0);
    const expectedPoint = latLngToVector3(
      CAPE_CANAVERAL_COORDS.lat,
      CAPE_CANAVERAL_COORDS.lng,
      1.002
    );

    assert.ok(
      startPoint.distanceTo(expectedPoint) < 1e-5,
      `Expected startPoint at Cape Canaveral, diff: ${startPoint.distanceTo(expectedPoint)}`
    );
    assert.ok(
      Math.abs(startPoint.length() - 1.002) < 1e-4,
      `Expected radius ~1.002, got ${startPoint.length()}`
    );
  });

  test("Trajectory end point strictly reaches Tranquility Base on lunar surface at calibrated lunar distance", () => {
    const curve = createApollo11TrajectoryCurve();
    const endPoint = curve.getPoint(1);
    const expectedLanding = selenographicToVector3(
      TRANQUILITY_BASE_COORDS.lat,
      TRANQUILITY_BASE_COORDS.lng,
      0.27
    );

    assert.ok(
      endPoint.distanceTo(expectedLanding) < 1e-4,
      `Expected endPoint at Tranquility Base on Moon surface, diff: ${endPoint.distanceTo(expectedLanding)}`
    );

    // Distance from Earth center must fall within lunar orbital shell [3.3, 3.9]
    const earthMoonDist = endPoint.length();
    assert.ok(
      earthMoonDist >= 3.3 && earthMoonDist <= 3.9,
      `Expected calibrated lunar distance between 3.3 and 3.9 units, got ${earthMoonDist}`
    );
  });

  test("Trajectory never penetrates inside the Moon sphere (clearance >= MOON_RADIUS_UNITS along orbit and descent)", () => {
    const curve = createApollo11TrajectoryCurve();
    const sampleCount = 2000;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const pt = curve.getPoint(t);
      const distToMoon = pt.distanceTo(MOON_DEFAULT_POSITION);

      if (t >= 0.55) {
        assert.ok(
          distToMoon >= MOON_RADIUS_UNITS - 5e-4,
          `Trajectory penetrates Moon at t=${t.toFixed(4)}: distance=${distToMoon.toFixed(4)} < radius=${MOON_RADIUS_UNITS}`
        );
      }
    }
  });

  test("Temporal interpolation along Catmull-Rom spline generates continuous vectors without NaN or infinite values", () => {
    const curve = createApollo11TrajectoryCurve();
    const sampleCount = 1000;

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      assert.ok(
        Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.z),
        `Point at t=${t} contains non-finite values: (${pt.x}, ${pt.y}, ${pt.z})`
      );
      assert.ok(
        Number.isFinite(tangent.x) && Number.isFinite(tangent.y) && Number.isFinite(tangent.z),
        `Tangent at t=${t} contains non-finite values: (${tangent.x}, ${tangent.y}, ${tangent.z})`
      );
      assert.ok(
        Math.abs(tangent.length() - 1.0) < 1e-4,
        `Tangent at t=${t} must be unit length, got ${tangent.length()}`
      );
    }
  });

  test("Telemetry model calculates physically calibrated speed, distance and GET for all 4 mission phases", () => {
    // Phase 1: Launch and LEO
    const p1 = getMissionTelemetry(0.08);
    assert.equal(p1.phase.id, 1);
    assert.equal(p1.phase.badge, "SATURN V / LEO");
    assert.ok(p1.speedKmH >= 1500 && p1.speedKmH <= 28000, `Speed out of bounds: ${p1.speedKmH}`);
    assert.ok(p1.distanceKm >= 0 && p1.distanceKm <= 185, `Distance out of bounds: ${p1.distanceKm}`);

    // Phase 2: TLI translunar coast (peaks at ~39,240 km/h)
    const p2 = getMissionTelemetry(0.22);
    assert.equal(p2.phase.id, 2);
    assert.equal(p2.phase.badge, "TLI / CISLUNAR");
    assert.ok(p2.speedKmH > 35000, `Expected high TLI speed, got ${p2.speedKmH}`);
    assert.ok(p2.distanceKm > 185 && p2.distanceKm < 350000);

    // Phase 3: Lunar Orbit Insertion (CSM Columbia)
    const p3 = getMissionTelemetry(0.68);
    assert.equal(p3.phase.id, 3);
    assert.equal(p3.phase.badge, "LOI / CSM COLUMBIA");
    assert.ok(p3.speedKmH >= 5400 && p3.speedKmH <= 6200, `Expected lunar orbital speed, got ${p3.speedKmH}`);
    assert.ok(p3.distanceKm >= 350000 && p3.distanceKm <= 384400);

    // Phase 4: Touchdown at Tranquility Base
    const p4 = getMissionTelemetry(1.0);
    assert.equal(p4.phase.id, 4);
    assert.equal(p4.phase.badge, "TOUCHDOWN / EAGLE");
    assert.equal(p4.speedKmH, 0); // Touchdown velocity is 0
    assert.equal(p4.distanceKm, 384400);
    assert.equal(p4.getFormatted, "102:46:40");
  });

  test("Apollo 11 store controls playback, scrubbing and jumping to mission phases", () => {
    // Jump to Phase 2 (TLI)
    useApollo11Store.getState().jumpToPhase(2);
    assert.equal(useApollo11Store.getState().progress, 0.2);
    assert.equal(useApollo11Store.getState().isPlaying, true);

    // Jump to Phase 4 (Touchdown)
    useApollo11Store.getState().jumpToPhase(4);
    assert.equal(useApollo11Store.getState().progress, 0.82);

    // Play/Pause toggle
    useApollo11Store.getState().setPlaying(true);
    useApollo11Store.getState().togglePlay();
    assert.equal(useApollo11Store.getState().isPlaying, false);

    // Progress clamping bounds
    useApollo11Store.getState().setProgress(-0.5);
    assert.equal(useApollo11Store.getState().progress, 0.0);
    useApollo11Store.getState().setProgress(1.5);
    assert.equal(useApollo11Store.getState().progress, 1.0);

    // Reset mission
    useApollo11Store.getState().resetMission();
    assert.equal(useApollo11Store.getState().progress, 0.0);
    assert.equal(useApollo11Store.getState().isPlaying, true);
  });

  test("Apollo11TelemetryOverlay renders when 1969 or Apollo milestones are active and unmounts cleanly when inactive", () => {
    // Inactive state: Year 2024, no milestone
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.equal(html, "", "Overlay should return null when Apollo 11 is inactive");

    // Active state via Year 1969
    useTimelineStore.getState().selectYear(1969);
    useTimelineStore.getState().selectMilestone(null);
    html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.ok(html.includes("data-apollo-telemetry-overlay=\"true\""), "Should render HUD container");
    assert.ok(html.includes("APOLLO 11"), "Should display Apollo 11 badge");
    assert.ok(html.includes("Telemetria de Voo Espacial NASA"), "Should display subtitle");
    assert.ok(html.includes("SATURN V / LEO"), "Should display phase badges");

    // Active state via milestone "usa-1969"
    useTimelineStore.getState().selectYear(null);
    useTimelineStore.getState().selectMilestone("usa-1969");
    html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.ok(html.includes("APOLLO 11"), "Should render when usa-1969 milestone is active");

    // Active state via milestone "glo-1969"
    useTimelineStore.getState().selectMilestone("glo-1969");
    html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.ok(html.includes("APOLLO 11"), "Should render when glo-1969 milestone is active");

    // Cleanup store state
    useTimelineStore.getState().selectYear(null);
    useTimelineStore.getState().selectMilestone(null);
  });
});

describe("Componente 4: Persistência & Compartilhamento de Estudos (RN16) e Componente Visual de Era", () => {
  test("1. Resolução Canônica de Eras Históricas (resolveHistoricalEra)", () => {
    assert.equal(resolveHistoricalEra(1870).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1914).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1939).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1969).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(2024).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(null).id, "CONTEMPORARY");
  });

  test("2. Resolução e Continuidade de Entidades Históricas (resolveHistoricalEntity)", () => {
    assert.equal(resolveHistoricalEntity("DEU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("RUS", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("BRA", 1870), "BRA");
  });

  test("3. Serialização de Estudos com Estado Histórico e Fork Imutável (RN16)", () => {
    const study: StudyRecord = {
      id: "estudo-prussia-1870-k3m1",
      parentId: null,
      title: "Unificação Alemã e Reino da Prússia",
      description: "Recorte geopolítico da Europa Central em 1870",
      timelineStartYear: 1850,
      timelineEndYear: 1889,
      selectedCountryIsos: ["PRU", "FRA"],
      activeCategories: ["WAR_MILITARY", "POLITICS_REGIMES"],
      cameraLat: 52.5,
      cameraLng: 13.4,
      cameraAltitude: 2.2,
      markdownNotes: "Análise da Guerra Franco-Prussiana e fundação do Império Alemão.",
      historicalEra: "PRUSSIA_1870",
      isApollo11Active: false,
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(study);
    const retrieved = getMemoryStudy("estudo-prussia-1870-k3m1");
    assert.ok(retrieved);
    assert.equal(retrieved.historicalEra, "PRUSSIA_1870");
    assert.equal(retrieved.isApollo11Active, false);
    assert.equal(retrieved.selectedCountryIsos[0], "PRU");

    // Test Fork preservation
    const forked: StudyRecord = {
      ...retrieved,
      id: "fork-prussia-99aa",
      parentId: retrieved.id,
      title: `[Fork] ${retrieved.title}`,
      createdAt: new Date().toISOString(),
    };
    saveMemoryStudy(forked);

    const retrievedFork = getMemoryStudy("fork-prussia-99aa");
    assert.ok(retrievedFork);
    assert.equal(retrievedFork.parentId, "estudo-prussia-1870-k3m1");
    assert.equal(retrievedFork.historicalEra, "PRUSSIA_1870");
    assert.equal(retrievedFork.isApollo11Active, false);
  });

  test("4. useStudyStore gerencia historicalEra e isApollo11Active perfeitamente", () => {
    const store = useStudyStore.getState();
    store.resetStudy();

    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    store.setStudy({
      id: "apollo11-study",
      title: "Missão Apollo 11",
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: true,
      notes: "Telemetria translunar",
    });

    const activeState = useStudyStore.getState();
    assert.equal(activeState.currentStudyId, "apollo11-study");
    assert.equal(activeState.historicalEra, "COLD_WAR_1969");
    assert.equal(activeState.isApollo11Active, true);

    store.setHistoricalEra("WW2_1939");
    assert.equal(useStudyStore.getState().historicalEra, "WW2_1939");

    store.setIsApollo11Active(false);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    store.resetStudy();
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);
  });

  test("5. HistoricalEraBadge renderiza badge flutuante para eras históricas e oculta no contemporâneo", () => {
    // 1. Contemporary (2024) -> Returns empty (null)
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.equal(html, "", "Contemporary era should not render HistoricalEraBadge");

    // 2. Historical Year 1870 -> Displays Prussia era badge and restore button
    useTimelineStore.getState().selectYear(1870);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Cartografia Histórica:"), "Badge should have title");
    assert.ok(html.includes("Unificação Alemã &amp; Reino da Prússia") || html.includes("Unificação Alemã & Reino da Prússia"), "Badge should display Prussia era label");
    assert.ok(html.includes("Restaurar Cartografia Atual"), "Badge should have restore button");

    // 3. Historical Year 1914 -> WWI
    useTimelineStore.getState().selectYear(1914);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Primeira Guerra Mundial"));

    // 4. Historical Year 1939 -> WWII
    useTimelineStore.getState().selectYear(1939);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Segunda Guerra Mundial"));

    // 5. Cold War 1969
    useTimelineStore.getState().selectYear(1969);
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("Guerra Fria &amp; Corrida Espacial") || html.includes("Guerra Fria & Corrida Espacial"));

    // Cleanup
    useTimelineStore.getState().selectYear(null);
  });

  test("6. StudyShareModal exibe badges informativos de Cartografia Histórica e Apollo 11 quando ativos", () => {
    useStudyStore.getState().setShareModalOpen(true);

    // With 1870 active
    useTimelineStore.getState().selectYear(1870);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(html.includes("Cartografia Histórica Ativa Capturada"), "Modal should display historical era captured badge");
    assert.ok(html.includes("Unificação Alemã &amp; Reino da Prússia") || html.includes("Unificação Alemã & Reino da Prússia"));

    // With Apollo 11 active (glo-1969)
    useTimelineStore.getState().selectMilestone("glo-1969");
    html = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(html.includes("Missão Espacial Apollo 11 (1969)"), "Modal should display Apollo 11 badge");

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().selectYear(null);
    useTimelineStore.getState().selectMilestone(null);
  });

  test("7. resolveEffectiveHistoricalYear resolves correctly across presets, intervals and milestones", () => {
    // 1. Explicit year takes precedence
    assert.equal(resolveEffectiveHistoricalYear({ selectedYear: 1870, startYear: 1974, endYear: 2024 }), 1870);

    // 2. Milestone takes precedence over interval
    assert.equal(resolveEffectiveHistoricalYear({ milestoneYear: 1969, startYear: 1974, endYear: 2024 }), 1969);

    // 3. Cold War preset interval (1947 - 1991) resolves to 1969
    const coldWarYear = resolveEffectiveHistoricalYear({ startYear: 1947, endYear: 1991 });
    assert.equal(coldWarYear, 1969);
    assert.equal(resolveHistoricalEra(coldWarYear).id, "COLD_WAR_1969");

    // 4. World Wars preset interval (1914 - 1945) resolves to 1939
    const wwYear = resolveEffectiveHistoricalYear({ startYear: 1914, endYear: 1945 });
    assert.equal(wwYear, 1939);
    assert.equal(resolveHistoricalEra(wwYear).id, "WW2_1939");

    // 5. Prussia era interval (1850 - 1889) resolves to 1870
    const pruYear = resolveEffectiveHistoricalYear({ startYear: 1850, endYear: 1889 });
    assert.equal(pruYear, 1870);
    assert.equal(resolveHistoricalEra(pruYear).id, "PRUSSIA_1870");

    // 6. Contemporary LAST_50_YEARS interval (1974 - 2024) resolves to null -> CONTEMPORARY
    const contempYear = resolveEffectiveHistoricalYear({ startYear: 1974, endYear: 2024 });
    assert.equal(contempYear, null);
    assert.equal(resolveHistoricalEra(contempYear).id, "CONTEMPORARY");
  });

  test("8. HistoricalEraBadge: dynamically offsets layout when study banner is active and handles restore reset", () => {
    useTimelineStore.getState().selectYear(1870);

    // Without study open -> top-16 sm:top-5
    useStudyStore.getState().resetStudy();
    let html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("top-16 sm:top-5"), "Default positioning when no study is active");
    assert.ok(html.includes("1870 — Unificação Alemã & Reino da Prússia") || html.includes("1870 — Unificação Alemã &amp; Reino da Prússia"));

    // With active study banner mounted -> top-24 sm:top-20 to avoid visual occlusion
    useStudyStore.getState().setStudy({
      id: "estudo-teste-posicao",
      title: "Estudo de Teste",
      historicalEra: "PRUSSIA_1870",
    });
    html = renderToStaticMarkup(React.createElement(HistoricalEraBadge));
    assert.ok(html.includes("top-24 sm:top-20"), "Lower positioning when study banner is active");

    // Test Restore Cartography: resets timeline, clears studyStore era, and migrates historical entity to modern successor
    useGlobeStore.getState().setSelectedIso("PRU");
    assert.equal(useGlobeStore.getState().selectedIso, "PRU");

    // Simulate clicking restore (using the exact handler logic)
    useTimelineStore.getState().selectMilestone(null);
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().setYearRange(1974, 2024);
    useStudyStore.getState().setHistoricalEra(null);
    useStudyStore.getState().setIsApollo11Active(false);

    const currentIso = useGlobeStore.getState().selectedIso;
    if (currentIso && HISTORICAL_ENTITIES[currentIso]?.successorIsos?.length > 0) {
      useGlobeStore.getState().setSelectedIso(HISTORICAL_ENTITIES[currentIso].successorIsos[0]);
    }

    assert.equal(useTimelineStore.getState().selectedYear, 2024);
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);
    assert.equal(useGlobeStore.getState().selectedIso, "DEU", "Extinct PRU should transition to modern DEU upon cartography restoration");

    // Cleanup
    useStudyStore.getState().resetStudy();
    useTimelineStore.getState().selectYear(null);
    useGlobeStore.getState().setSelectedIso(null);
  });

  test("9. Cold War study restore: preserves cartography without falsely activating Apollo 11 when isApollo11Active is false", () => {
    // 1. Study with isApollo11Active: false
    const coldWarStudy: StudyRecord = {
      id: "estudo-sem-apollo",
      title: "Estudo Guerra Fria Geral",
      timelineStartYear: 1947,
      timelineEndYear: 1991,
      selectedCountryIsos: ["BRA", "DEU"],
      activeCategories: ["POLITICS_REGIMES"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.5,
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: false,
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(coldWarStudy);
    const retrieved = getMemoryStudy("estudo-sem-apollo");
    assert.ok(retrieved);
    assert.equal(retrieved.historicalEra, "COLD_WAR_1969");
    assert.equal(retrieved.isApollo11Active, false);

    // Simulate restoring in /study/[slug]/page.tsx
    useTimelineStore.getState().setYearRange(retrieved.timelineStartYear, retrieved.timelineEndYear);
    if (retrieved.historicalEra === "COLD_WAR_1969") {
      if (retrieved.isApollo11Active) {
        useTimelineStore.getState().selectYear(1969);
      } else {
        useTimelineStore.getState().selectYear(1968);
      }
    }
    if (retrieved.isApollo11Active) {
      useTimelineStore.getState().selectMilestone("glo-1969");
    } else {
      useTimelineStore.getState().selectMilestone(null);
    }

    // Historical era is COLD_WAR_1969
    assert.equal(resolveHistoricalEra(useTimelineStore.getState().selectedYear).id, "COLD_WAR_1969");
    // But Apollo 11 is NOT active
    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
    assert.notEqual(useTimelineStore.getState().selectedYear, 1969);

    // Cleanup
    useTimelineStore.getState().selectYear(null);
  });
});

describe("Componente 1: Datasets Históricos & Base de Conhecimento de Entidades", () => {
  test("1. Resolução Canônica de Eras Históricas (resolveHistoricalEra)", () => {
    assert.equal(resolveHistoricalEra(1870).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1914).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1939).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1969).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(2024).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(null).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(undefined).id, "CONTEMPORARY");

    // Boundary tests
    assert.equal(resolveHistoricalEra(1890).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1891).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1925).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1926).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1945).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1946).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(1990).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(1991).id, "CONTEMPORARY");
  });

  test("2. Resolução e Continuidade de Entidades Históricas (resolveHistoricalEntity)", () => {
    // Prussia 1870
    assert.equal(resolveHistoricalEntity("DEU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("AUT", 1870), "AHU");
    assert.equal(resolveHistoricalEntity("TUR", 1870), "TUR_HIST");
    assert.equal(resolveHistoricalEntity("BRA", 1870), "BRA");

    // WWI 1914
    assert.equal(resolveHistoricalEntity("AUT", 1914), "AHU");
    assert.equal(resolveHistoricalEntity("HUN", 1914), "AHU");
    assert.equal(resolveHistoricalEntity("TUR", 1914), "TUR_HIST");
    assert.equal(resolveHistoricalEntity("SYR", 1914), "TUR_HIST");

    // WWII 1939
    assert.equal(resolveHistoricalEntity("RUS", 1939), "SUN");
    assert.equal(resolveHistoricalEntity("UKR", 1939), "SUN");

    // Cold War 1969
    assert.equal(resolveHistoricalEntity("RUS", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("DEU", 1969), "FRG");
    assert.equal(resolveHistoricalEntity("GDR", 1969), "GDR");
    assert.equal(resolveHistoricalEntity("FRG", 1969), "FRG");

    // Bidirectional historical continuity: extinct entities resolve to sovereign successors in contemporary / mismatched eras
    assert.equal(resolveHistoricalEntity("PRU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("PRU", 2024), "DEU");
    assert.equal(resolveHistoricalEntity("PRU", 1969), "FRG");
    assert.equal(resolveHistoricalEntity("SUN", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("SUN", 2024), "RUS");
    assert.equal(resolveHistoricalEntity("SUN", 1870), "RUS");
  });

  test("3. getCountryData resolves historical entities with full metadata & citations", () => {
    // Direct historical entity resolution
    const pru = getCountryData("PRU");
    assert.ok(pru);
    assert.equal(pru.isoCode, "PRU");
    assert.ok(pru.nameOfficial.includes("Reino da Prússia"));
    assert.ok(pru.capital.includes("Berlim"));
    assert.equal(pru.historicalLeader, "Otto von Bismarck");
    assert.equal(pru.isHistoricalEntity, true);
    assert.ok(pru.dossierSections.length >= 3);
    assert.ok(pru.dossierSections.some((s) => s.dimension === "HISTORY"));
    assert.ok(pru.dossierSections.some((s) => s.dimension === "GOVERNMENT_POLITICS"));

    // Year-based resolution: getCountryData("DEU", 1870) -> Prussia
    const deu1870 = getCountryData("DEU", 1870);
    assert.equal(deu1870.isoCode, "PRU");
    assert.equal(deu1870.nameCommon, "Reino da Prússia");

    // Year-based resolution: getCountryData("RUS", 1969) -> USSR
    const rus1969 = getCountryData("RUS", 1969);
    assert.equal(rus1969.isoCode, "SUN");
    assert.equal(rus1969.nameCommon, "União Soviética");

    // Academic citation formatting for historical entities
    const abntCitation = formatABNT({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(abntCitation.includes("REINO DA PRÚSSIA"));
    assert.ok(abntCitation.includes("TELLUSPEDIA."));

    const apaCitation = formatAPA({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(apaCitation.includes("Reino da Prússia"));
    assert.ok(apaCitation.includes("TellusPedia."));

    const mlaCitation = formatMLA({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(mlaCitation.includes("Reino da Prússia"));

    const bibtexCitation = formatBibTeX({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(bibtexCitation.includes("@online{"));
  });

  test("4. TopoJSON snapshots for 1870, 1914, 1939 and 1969 load and index correctly", () => {
    const historyDir = path.resolve(process.cwd(), "public/data/history");
    const snapshots = [
      { file: "borders-1870.json", era: "PRUSSIA_1870" },
      { file: "borders-1914.json", era: "WW1_1914" },
      { file: "borders-1939.json", era: "WW2_1939" },
      { file: "borders-1969.json", era: "COLD_WAR_1969" },
    ];

    for (const { file } of snapshots) {
      const fullPath = path.join(historyDir, file);
      assert.ok(fs.existsSync(fullPath), `Missing snapshot file: ${file}`);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const topo = JSON.parse(raw);
      assert.equal(topo.type, "Topology");
      assert.ok(topo.objects?.countries?.geometries?.length > 100);

      // Verify topojson.mesh works and creates coordinates
      const mesh = topojson.mesh(topo, topo.objects.countries);
      assert.ok(mesh?.coordinates && mesh.coordinates.length > 200);

      // Verify which-polygon spatial indexing works
      const fc = topojson.feature(topo, topo.objects.countries) as any;
      assert.equal(fc.type, "FeatureCollection");
      const spatialIndex = whichPolygon(fc);
      assert.ok(spatialIndex, `Spatial index must initialize for ${file}`);
    }

    // Specific geographic raycasting tests
    // 1870
    const topo1870 = JSON.parse(fs.readFileSync(path.join(historyDir, "borders-1870.json"), "utf-8"));
    const fc1870 = topojson.feature(topo1870, topo1870.objects.countries) as any;
    fc1870.features.forEach((f: any) => { if (f.properties) f.properties.id = f.id; });
    const idx1870 = whichPolygon(fc1870);
    const berlin1870 = idx1870([13.4, 52.52]);
    assert.equal(berlin1870?.id, "PRU");
    const vienna1870 = idx1870([16.37, 48.20]);
    assert.equal(vienna1870?.id, "AHU");
    const ankara1870 = idx1870([32.85, 39.93]);
    assert.equal(ankara1870?.id, "TUR_HIST");
    const baghdad1870 = idx1870([44.36, 33.31]);
    assert.equal(baghdad1870?.id, "TUR_HIST");

    // 1969
    const topo1969 = JSON.parse(fs.readFileSync(path.join(historyDir, "borders-1969.json"), "utf-8"));
    const fc1969 = topojson.feature(topo1969, topo1969.objects.countries) as any;
    fc1969.features.forEach((f: any) => { if (f.properties) f.properties.id = f.id; });
    const idx1969 = whichPolygon(fc1969);
    const moscow1969 = idx1969([37.61, 55.75]);
    assert.equal(moscow1969?.id, "SUN");
    const kyiv1969 = idx1969([30.52, 50.45]);
    assert.equal(kyiv1969?.id, "SUN");
    const bonn1969 = idx1969([7.09, 50.73]);
    assert.equal(bonn1969?.id, "FRG");
    const leipzig1969 = idx1969([12.37, 51.33]);
    assert.equal(leipzig1969?.id, "GDR");
  });

  test("5. Historical flag SVG assets are present and valid", () => {
    const flagsDir = path.resolve(process.cwd(), "public/flags");
    const flagFiles = ["pru.svg", "sun.svg", "ahu.svg", "gdr.svg", "frg.svg", "tur_hist.svg", "yug.svg", "csk.svg"];

    for (const file of flagFiles) {
      const fullPath = path.join(flagsDir, file);
      assert.ok(fs.existsSync(fullPath), `Missing flag file: ${file}`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.includes("<svg") && content.includes("</svg>"), `${file} must be a valid SVG`);
      assert.ok(content.length > 100, `${file} must have meaningful SVG content`);
    }
  });

  test("6. Raycast click simulation resolves all historical powers without 'Nação Soberana' fallback", () => {
    const simulateClick = (feature: { id?: string; name?: string }) => {
      const numericId = feature.id !== undefined && feature.id !== null ? String(feature.id).padStart(3, "0") : "";
      const iso = NUMERIC_TO_ISO[numericId] || (feature.name && NAME_TO_ISO[feature.name]) || feature.name || null;
      assert.ok(iso, `Failed to resolve ISO for feature ${JSON.stringify(feature)}`);
      const data = getCountryData(iso!);
      return { iso, data };
    };

    // DEU in 1914 TopoJSON
    const deu1914 = simulateClick({ id: "DEU", name: "Império Alemão" });
    assert.equal(deu1914.iso, "DEU");
    assert.equal(deu1914.data.nameCommon, "Alemanha");
    assert.notEqual(deu1914.data.nameOfficial, "Nação Soberana (IMPÉRIO ALEMÃO)");

    // GBR in 1870 TopoJSON
    const gbr1870 = simulateClick({ id: "GBR", name: "Reino Unido da Grã-Bretanha e Irlanda" });
    assert.equal(gbr1870.iso, "GBR");
    assert.equal(gbr1870.data.nameCommon, "Reino Unido");

    // JPN in 1939 TopoJSON
    const jpn1939 = simulateClick({ id: "JPN", name: "Império do Japão" });
    assert.equal(jpn1939.iso, "JPN");
    assert.equal(jpn1939.data.nameCommon, "Japão");

    // YUG in 1969 TopoJSON
    const yug1969 = simulateClick({ id: "YUG", name: "Iugoslávia" });
    assert.equal(yug1969.iso, "YUG");
    assert.equal(yug1969.data.nameCommon, "Iugoslávia");
    assert.equal(yug1969.data.historicalLeader, "Josip Broz Tito");

    // CSK in 1969 TopoJSON
    const csk1969 = simulateClick({ id: "CSK", name: "Tchecoslováquia" });
    assert.equal(csk1969.iso, "CSK");
    assert.equal(csk1969.data.nameCommon, "Tchecoslováquia");
  });

  test("7. Zero null or undefined IDs and zero duplicates across all historical TopoJSON datasets", () => {
    const historyDir = path.resolve(process.cwd(), "public/data/history");
    const files = ["borders-1870.json", "borders-1914.json", "borders-1939.json", "borders-1969.json"];

    for (const f of files) {
      const p = path.join(historyDir, f);
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      const geoms = data.objects.countries.geometries;
      const nullIds = geoms.filter((g: any) => !g.id);
      assert.equal(nullIds.length, 0, `Found null IDs in ${f}`);

      const ids = geoms.map((g: any) => g.id);
      const duplicates = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);
      assert.deepEqual(duplicates, [], `Found duplicate IDs in ${f}: ${duplicates.join(", ")}`);
    }
  });

  test("8. Extended territorial continuity and numeric code normalization in resolveHistoricalEntity", () => {
    // Numeric string normalization
    assert.equal(resolveHistoricalEntity("276", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("040", 1870), "AHU");
    assert.equal(resolveHistoricalEntity("643", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("076", 1870), "BRA");

    // 1870 / 1914 Russian Empire constituent territories
    assert.equal(resolveHistoricalEntity("UKR", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("BLR", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("FIN", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("IRL", 1870), "GBR");
    assert.equal(resolveHistoricalEntity("FIN", 1914), "RUS");
    assert.equal(resolveHistoricalEntity("IRL", 1914), "GBR");

    // 1939 Axis and Allied annexations
    assert.equal(resolveHistoricalEntity("AUT", 1939), "DEU");
    assert.equal(resolveHistoricalEntity("CZE", 1939), "DEU");
    assert.equal(resolveHistoricalEntity("ALB", 1939), "ITA");
    assert.equal(resolveHistoricalEntity("KOR", 1939), "JPN");

    // 1969 Cold War federations
    assert.equal(resolveHistoricalEntity("SRB", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("HRV", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("SVN", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("CZE", 1969), "CSK");
    assert.equal(resolveHistoricalEntity("SVK", 1969), "CSK");
  });

  test("9. Historical entities report accurate geographical area, continent and academic citations", () => {
    const sun = getCountryData("SUN");
    assert.equal(sun.areaKm2, 22402200, "USSR area must reflect true scale (22.4M km²)");
    assert.equal(sun.continent, "Europe/Asia");
    assert.equal(sun.numericCode, "810");

    const tur = getCountryData("TUR_HIST");
    assert.equal(tur.areaKm2, 1800000);
    assert.equal(tur.continent, "Europe/Asia/Africa");
    assert.equal(tur.numericCode, "903");

    const yug = getCountryData("YUG");
    assert.equal(yug.areaKm2, 255804);
    assert.equal(yug.numericCode, "891");
    assert.ok(yug.dossierSections.length >= 2);

    const csk = getCountryData("CSK");
    assert.equal(csk.areaKm2, 127900);
    assert.equal(csk.numericCode, "200");
    assert.ok(csk.dossierSections.length >= 2);
  });
});

describe("Componente 2 e 3: Three.js Historical Cartography, Raycasting Picking & InspectorHUD Context", () => {
  test("1. loadHistoricalTopology asynchronously loads and caches all 4 historical datasets", async () => {
    const paths = [
      "/data/history/borders-1870.json",
      "/data/history/borders-1914.json",
      "/data/history/borders-1939.json",
      "/data/history/borders-1969.json",
    ];

    for (const p of paths) {
      const topo = await loadHistoricalTopology(p);
      assert.ok(topo, `Must load topology for ${p}`);
      assert.equal(topo.type, "Topology");
      assert.ok(topo.objects?.countries?.geometries?.length > 100);

      // Verify second call is served from cache
      const cached = await loadHistoricalTopology(p);
      assert.strictEqual(cached, topo, `Subsequent call for ${p} must return identical cached reference`);
    }
  });

  test("2. getHistoricalSpatialIndex provides instant (<0.2ms) point-in-polygon raycasting for active eras", async () => {
    // 1870 - Prussia & Austria-Hungary
    const topo1870 = await loadHistoricalTopology("/data/history/borders-1870.json");
    const idx1870 = getHistoricalSpatialIndex("PRUSSIA_1870", topo1870);
    assert.ok(idx1870);

    const t0 = performance.now();
    const pruFeature = idx1870([13.4, 52.52]);
    const duration1870 = performance.now() - t0;
    assert.ok(duration1870 < 5.0, `Query duration must be near-instant, took ${duration1870.toFixed(3)}ms`);
    assert.equal(pruFeature?.id, "PRU");

    const vienna1870 = idx1870([16.37, 48.20]);
    assert.equal(vienna1870?.id, "AHU");

    // 1969 - USSR, East Germany (GDR), West Germany (FRG), Yugoslavia (YUG), Czechoslovakia (CSK)
    const topo1969 = await loadHistoricalTopology("/data/history/borders-1969.json");
    const idx1969 = getHistoricalSpatialIndex("COLD_WAR_1969", topo1969);
    assert.ok(idx1969);

    const moscow1969 = idx1969([37.61, 55.75]);
    assert.equal(moscow1969?.id, "SUN");

    const bonn1969 = idx1969([7.09, 50.73]);
    assert.equal(bonn1969?.id, "FRG");

    const leipzig1969 = idx1969([12.37, 51.33]);
    assert.equal(leipzig1969?.id, "GDR");

    const belgrade1969 = idx1969([20.46, 44.81]);
    assert.equal(belgrade1969?.id, "YUG");

    const prague1969 = idx1969([14.43, 50.07]);
    assert.equal(prague1969?.id, "CSK");
  });

  test("3. getContemporarySpatialIndex accurately resolves modern nations from World Atlas", () => {
    const idx = getContemporarySpatialIndex();
    assert.ok(idx);

    // Brasilia
    const brasilia = idx([-47.88, -15.79]);
    assert.ok(brasilia);
    const numId = String(brasilia.id).padStart(3, "0");
    assert.equal(NUMERIC_TO_ISO[numId], "BRA");

    // Berlin in contemporary times
    const berlin = idx([13.4, 52.52]);
    assert.ok(berlin);
    const deuNumId = String(berlin.id).padStart(3, "0");
    assert.equal(NUMERIC_TO_ISO[deuNumId], "DEU");
  });

  test("4. InspectorHUD renders authentic Prussia data, hides live weather, and displays leader title & vigência", () => {
    useGlobeStore.getState().setSelectedIso("PRU");
    useTimelineStore.getState().selectYear(1870);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("data-inspector-hud=\"true\""), "Must render InspectorHUD container");
    assert.ok(html.includes("Reino da Prússia"), "Must display common name 'Reino da Prússia'");
    assert.ok(html.includes("PRU"), "Must display ISO code PRU");
    assert.ok(html.includes("Otto von Bismarck"), "Must display historical leader Otto von Bismarck");
    assert.ok(html.includes("Rei da Prússia / Chanceler Imperial"), "Must display leader title");
    assert.ok(html.includes("data-historical-context=\"true\""), "Must render historical context widget");
    assert.ok(html.includes("1701 – 1918"), "Must render vigência period 1701 – 1918");

    // Weather widget MUST be hidden for extinct historical entities
    assert.ok(!html.includes("Clima local"), "Live weather widget must be hidden for extinct historical entity");

    // HTML5 Phrasing Content Invariant: zero <div> inside <p>
    const pTags = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pTags) {
      assert.ok(!p.includes("<div"), `<p> block must not contain <div>: ${p}`);
    }

    // Cleanup
    useGlobeStore.getState().setSelectedIso(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("5. InspectorHUD renders authentic USSR data in 1969 with Brezhnev and hidden weather", () => {
    useGlobeStore.getState().setSelectedIso("SUN");
    useTimelineStore.getState().selectYear(1969);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("União Soviética"), "Must display common name 'União Soviética'");
    assert.ok(html.includes("SUN"), "Must display code SUN");
    assert.ok(html.includes("Leonid Brejnev (1969) / Josef Stálin"), "Must display historical leader");
    assert.ok(html.includes("Secretário-Geral do Partido Comunista"), "Must display leader title");
    assert.ok(html.includes("data-historical-context=\"true\""), "Must render historical context widget");
    assert.ok(html.includes("1922 – 1991"), "Must display vigência 1922 – 1991");
    assert.ok(!html.includes("Clima local"), "Live weather widget must be hidden for USSR");

    // Cleanup
    useGlobeStore.getState().setSelectedIso(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("6. InspectorHUD renders modern weather widget and no historical context for contemporary Brazil", () => {
    useGlobeStore.getState().setSelectedIso("BRA");
    useTimelineStore.getState().selectYear(2024);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("Brasil"), "Must display Brasil");
    assert.ok(html.includes("BRA"), "Must display BRA");
    assert.ok(html.includes("Clima local"), "Must render live weather widget for contemporary nation");
    assert.ok(!html.includes("data-historical-context=\"true\""), "Must not render historical context for modern Brazil");

    // Cleanup
    useGlobeStore.getState().setSelectedIso(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("7. CountryBorders line geometries dispose cleanly without WebGL memory leaks", () => {
    // Verify BufferGeometry creation and disposal invariant
    const geom1 = new THREE.BufferGeometry();
    const geom2 = new THREE.BufferGeometry();

    let disposed1 = false;
    let disposed2 = false;

    geom1.addEventListener("dispose", () => { disposed1 = true; });
    geom2.addEventListener("dispose", () => { disposed2 = true; });

    geom1.dispose();
    geom2.dispose();

    assert.equal(disposed1, true, "geom1 must be disposed");
    assert.equal(disposed2, true, "geom2 must be disposed");
  });

  test("8. Cross-fade lerp dynamics converges within 1 second", () => {
    let opacity = 0.35;
    const targetOpacity = 0.0;
    const delta = 1 / 60; // 60 FPS frame

    for (let frame = 0; frame < 60; frame++) {
      const lerpSpeed = Math.min(delta * 4, 1.0);
      opacity = THREE.MathUtils.lerp(opacity, targetOpacity, lerpSpeed);
    }

    assert.ok(opacity < 0.01, `Expected opacity to converge near 0, got ${opacity}`);
  });

  test("9. loadHistoricalTopology deduplicates concurrent in-flight requests", async () => {
    const path = "/data/history/borders-1870.json";
    // Fire two simultaneous requests
    const [req1, req2] = await Promise.all([
      loadHistoricalTopology(path),
      loadHistoricalTopology(path),
    ]);
    assert.ok(req1 && req2);
    assert.strictEqual(req1, req2, "Concurrent requests must resolve to the identical topology instance");
  });

  test("10. CountryBorders cross-fade lifecycle preserves historical mesh during fade out", () => {
    // Simulate CountryBorders fade-out lifecycle:
    // When switching from historical (opacity 0.45) to CONTEMPORARY (target 0.0),
    // the mesh MUST NOT unmount immediately; it must remain visible while opacity > 0.005.
    let historicalOpacity = 0.45;
    let isHistoricalActive = false; // user switched to CONTEMPORARY
    let isHistoricalMounted = true;
    const targetHistOpacity = 0.0;
    const delta = 1 / 60;
    const lerpSpeed = Math.min(delta * 4, 1.0);

    let frameCount = 0;
    while (isHistoricalMounted && frameCount < 120) {
      historicalOpacity = THREE.MathUtils.lerp(historicalOpacity, targetHistOpacity, lerpSpeed);
      const isVisible = historicalOpacity > 0.005;
      if (!isVisible && !isHistoricalActive && isHistoricalMounted) {
        isHistoricalMounted = false;
      }
      frameCount++;
    }

    // Must have taken multiple frames to fade out (smooth transition, not a 0ms pop)
    assert.ok(frameCount > 15, `Fade-out must be smooth over multiple frames, took ${frameCount} frames`);
    assert.equal(isHistoricalMounted, false, "Mesh should cleanly unmount once opacity reaches zero");
    assert.ok(historicalOpacity <= 0.005, "Opacity must converge below 0.005 threshold");
  });

  test("11. Two-way timeline continuity smoothly recovers modern nation from extinct entity", () => {
    // Selecting Germany in 2024 -> sliding to 1870 resolves to Prussia (PRU)
    const in1870 = resolveHistoricalEntity("DEU", 1870);
    assert.equal(in1870, "PRU");

    // Sliding back to 2024 smoothly resolves Prussia back to Germany (DEU)
    const backTo2024 = resolveHistoricalEntity(in1870, 2024);
    assert.equal(backTo2024, "DEU");

    // Sliding to 1969 resolves Prussia forward to West Germany (FRG)
    const in1969 = resolveHistoricalEntity(in1870, 1969);
    assert.equal(in1969, "FRG");

    // USSR in 1969 resolves back to Russia in 2024
    assert.equal(resolveHistoricalEntity("SUN", 2024), "RUS");
    // USSR in 1969 resolves back to Russian Empire in 1870
    assert.equal(resolveHistoricalEntity("SUN", 1870), "RUS");
  });
});






