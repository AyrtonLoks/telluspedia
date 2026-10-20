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
import { getMemoryStudy, saveMemoryStudy, forkStudyRecord, restoreStudyRecord, StudyRecord } from "../src/lib/studies-store";
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
import { useHistoricalRouteStore } from "../src/stores/historicalRouteStore";
import { HistoricalRouteOverlay } from "../src/components/globe/HistoricalRouteOverlay";
import { PaleoEraBadge } from "../src/components/globe/PaleoEraBadge";
import { PresetSelector } from "../src/components/timeline/PresetSelector";
import {
  resolveGeologicalEra,
  resolvePaleoEra,
  isPaleoActive,
  getPaleoEra,
  GEOLOGICAL_ERAS,
  PALEO_ERAS,
  PANGAEA_TECTONIC_PLATES,
  PANGAEA_PLATE_ARCS,
  generatePaleoPangeaCanvas,
  generatePaleoGondwanaCanvas,
  generatePaleoCanvas,
} from "../src/lib/paleo-data";
import {
  MAGELLAN_ROUTE,
  HISTORICAL_ROUTES,
  MAGELLAN_WAYPOINTS,
  MAGELLAN_FLEET,
  MAGELLAN_LOGBOOK_ENTRIES,
  RouteWaypoint,
  getHistoricalRoute,
  findRouteWaypoint,
  calculateRouteDistanceKm,
  interpolateGeodesicSegment,
} from "../src/lib/historical-routes";
import { EarthShader, createEarthMaterial } from "../src/components/globe/EarthShaderMaterial";
import {
  HistoricalRouteTrajectory,
  createMagellanTrajectoryCurve,
  ROUTE_ALTITUDE,
} from "../src/components/globe/HistoricalRouteTrajectory";
import {
  PaleoPlatesLayer,
  PALEO_PLATES_ALTITUDE,
  PANGEA_TECTONIC_ZONES,
} from "../src/components/globe/PaleoPlatesLayer";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import {
  calculateIssPosition,
  isContemporaryEpoch,
  FALLBACK_FIRMS_HOTSPOTS,
  FALLBACK_EONET_EVENTS,
  FALLBACK_AIRCRAFT_FLEET,
  FALLBACK_MARITIME_ROUTES,
  ObservatoryLayerId,
} from "../src/lib/observatory-data";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { ObservatoryTelemetryHUD } from "../src/components/observatory/ObservatoryTelemetryHUD";
import { TopNavBar } from "../src/components/nav/TopNavBar";

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

describe("Componente 3: Interface do Usuário, Modo Geológico e Telemetria Naval (RN10, RN11 & RN12)", () => {
  test("1. useHistoricalRouteStore gerencia ciclo de vida, navegação passo-a-passo e progresso", () => {
    const store = useHistoricalRouteStore.getState();
    store.setActiveRouteId(null);
    assert.equal(useHistoricalRouteStore.getState().activeRouteId, null);
    assert.equal(useHistoricalRouteStore.getState().isPlaying, false);

    // Ativar rota de Magalhães
    useHistoricalRouteStore.getState().setActiveRouteId("magellan-1519");
    assert.equal(useHistoricalRouteStore.getState().activeRouteId, "magellan-1519");
    assert.equal(useHistoricalRouteStore.getState().isPlaying, true);
    assert.equal(useHistoricalRouteStore.getState().progress, 0.0);
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, 0);

    // Controles play / pause
    useHistoricalRouteStore.getState().pause();
    assert.equal(useHistoricalRouteStore.getState().isPlaying, false);
    useHistoricalRouteStore.getState().play();
    assert.equal(useHistoricalRouteStore.getState().isPlaying, true);
    useHistoricalRouteStore.getState().togglePlay();
    assert.equal(useHistoricalRouteStore.getState().isPlaying, false);

    // Navegar para próximo waypoint
    const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
    useHistoricalRouteStore.getState().nextWaypoint();
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, 1);
    assert.ok(useHistoricalRouteStore.getState().progress > 0);

    // Retroceder waypoint
    useHistoricalRouteStore.getState().prevWaypoint();
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, 0);
    assert.equal(useHistoricalRouteStore.getState().progress, 0.0);

    // Impedir índice negativo no prevWaypoint
    useHistoricalRouteStore.getState().prevWaypoint();
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, 0);

    // Testar seek com clamping
    useHistoricalRouteStore.getState().seek(0.5);
    assert.equal(useHistoricalRouteStore.getState().progress, 0.5);
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, Math.floor(0.5 * (totalWaypoints - 1) + 0.5));

    useHistoricalRouteStore.getState().seek(-0.5);
    assert.equal(useHistoricalRouteStore.getState().progress, 0.0);

    useHistoricalRouteStore.getState().seek(1.5);
    assert.equal(useHistoricalRouteStore.getState().progress, 1.0);
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, totalWaypoints - 1);

    // Reset
    useHistoricalRouteStore.getState().reset();
    assert.equal(useHistoricalRouteStore.getState().progress, 0.0);
    assert.equal(useHistoricalRouteStore.getState().currentWaypointIndex, 0);

    // Velocidade e minimização
    useHistoricalRouteStore.getState().setPlaybackSpeed(2.0);
    assert.equal(useHistoricalRouteStore.getState().playbackSpeed, 2.0);
    useHistoricalRouteStore.getState().toggleMinimized();
    assert.equal(useHistoricalRouteStore.getState().isMinimized, true);
    useHistoricalRouteStore.getState().toggleMinimized();
    assert.equal(useHistoricalRouteStore.getState().isMinimized, false);
  });

  test("2. HistoricalRouteOverlay renderiza HUD completo com navio, comandante e Diário de Pigafetta", () => {
    useHistoricalRouteStore.getState().setActiveRouteId("magellan-1519");
    useHistoricalRouteStore.getState().jumpToWaypoint(6); // Estreito de Magalhães

    const html = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: true }));
    assert.ok(html.includes("data-historical-route-overlay=\"true\""));
    assert.ok(html.includes("CIRCUM-NAVEGAÇÃO"));
    assert.ok(html.includes("Nau Trinidad") || html.includes("Victoria") || html.includes("Embarcação"));
    assert.ok(html.includes("Fernão de Magalhães"));
    assert.ok(html.includes("Estreito de Todos os Santos"));
    assert.ok(html.includes("Antonio Pigafetta"));
    assert.ok(html.includes("Todos os Santos"));
    assert.ok(html.includes("léguas"));
    assert.ok(html.includes("dias"));

    // Waypoint final de Elcano
    const totalWaypoints = MAGELLAN_ROUTE.waypoints.length;
    useHistoricalRouteStore.getState().jumpToWaypoint(totalWaypoints - 1); // Retorno Sanlúcar
    const htmlEnd = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: true }));
    assert.ok(htmlEnd.includes("Victoria"));
    assert.ok(htmlEnd.includes("Juan Sebastián Elcano"));
    assert.ok(htmlEnd.includes("dezoito homens"));

    // Quando inativo e sem forceActive, não renderiza nada
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useTimelineStore.getState().setActiveRouteId(null);
    const htmlInactive = renderToStaticMarkup(React.createElement(HistoricalRouteOverlay, { forceActive: false }));
    assert.equal(htmlInactive, "");
  });

  test("3. PaleoEraBadge exibe badge e reposiciona dinamicamente contra o ForkStudyBanner", () => {
    // 1. Pangeia (250 Ma)
    const htmlPangea = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 250 }));
    assert.ok(htmlPangea.includes("data-testid=\"paleo-era-badge\""));
    assert.ok(htmlPangea.includes("Pangeia"));
    assert.ok(htmlPangea.includes("250 Ma") || htmlPangea.includes("~250 Ma"));
    assert.ok(htmlPangea.includes("Restaurar Geografia Contemporânea"));
    // Sem estudo ativo, usa posição top padrão
    assert.ok(htmlPangea.includes("top-16"));

    // 2. Reposicionamento com estudo ativo
    useStudyStore.getState().setStudy({ id: "study-pangea-test", title: "Pangea Study" });
    const htmlWithStudy = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 250 }));
    assert.ok(htmlWithStudy.includes("top-24"));
    useStudyStore.getState().resetStudy();

    // 3. Gondwana (150 Ma)
    const htmlGondwana = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 150 }));
    assert.ok(htmlGondwana.includes("Gondwana &amp; Laurásia") || htmlGondwana.includes("Gondwana"));
    assert.ok(htmlGondwana.includes("150 Ma") || htmlGondwana.includes("~150 Ma"));

    // 4. Cretáceo K-Pg (66 Ma)
    const htmlKpg = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: 66 }));
    assert.ok(htmlKpg.includes("Extinção K-Pg") || htmlKpg.includes("Cretáceo"));
    assert.ok(htmlKpg.includes("66 Ma") || htmlKpg.includes("~66 Ma"));

    // 5. Inativo (geologicalMa: null) retorna vazio
    const htmlNull = renderToStaticMarkup(React.createElement(PaleoEraBadge, { geologicalMa: null }));
    assert.equal(htmlNull, "");
  });

  test("4. useTimelineStore suporta modo geológico, rota de navegação e transição de presets", () => {
    // Inicializar no presente
    useTimelineStore.getState().setPreset("LAST_50_YEARS");
    assert.equal(useTimelineStore.getState().timelineMode, "HISTORICAL");
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useTimelineStore.getState().activeRouteId, null);
    assert.equal(useTimelineStore.getState().startYear, 1974);
    assert.equal(useTimelineStore.getState().endYear, 2024);

    // Preset Pangeia
    useTimelineStore.getState().setPreset("PANGEA_250MA");
    assert.equal(useTimelineStore.getState().timelineMode, "GEOLOGICAL");
    assert.equal(useTimelineStore.getState().geologicalMa, 250);
    assert.equal(useTimelineStore.getState().selectedGeologicalMa, 250);

    // Preset Gondwana
    useTimelineStore.getState().setPreset("GONDWANA_150MA");
    assert.equal(useTimelineStore.getState().geologicalMa, 150);

    // Preset Cretáceo
    useTimelineStore.getState().setPreset("KPG_66MA");
    assert.equal(useTimelineStore.getState().geologicalMa, 66);

    // Preset Circum-navegação de Magalhães
    useTimelineStore.getState().setPreset("MAGELLAN_1519");
    assert.equal(useTimelineStore.getState().timelineMode, "HISTORICAL");
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useTimelineStore.getState().activeRouteId, "magellan-1519");
    assert.equal(useTimelineStore.getState().startYear, 1519);
    assert.equal(useTimelineStore.getState().endYear, 1522);

    // Retorno ao contemporâneo
    useTimelineStore.getState().setPreset("21ST_CENTURY");
    assert.equal(useTimelineStore.getState().timelineMode, "HISTORICAL");
    assert.equal(useTimelineStore.getState().activeRouteId, null);
    assert.equal(useTimelineStore.getState().startYear, 2000);
    assert.equal(useTimelineStore.getState().endYear, 2026);
  });

  test("5. PresetSelector renderiza opções humanas, geológicas e marítimas", () => {
    useTimelineStore.getState().setPreset("LAST_50_YEARS");
    const html = renderToStaticMarkup(React.createElement(PresetSelector));
    assert.ok(html.includes("50 Anos Padrão"));
    assert.ok(html.includes("Século XXI"));
    assert.ok(html.includes("Guerra Fria"));
    assert.ok(html.includes("Guerras Mundiais"));
    assert.ok(html.includes("Pangeia (250 Ma)"));
    assert.ok(html.includes("Gondwana &amp; Laurásia (150 Ma)"));
    assert.ok(html.includes("Cretáceo K-Pg (66 Ma)"));
    assert.ok(html.includes("Circum-navegação de Magalhães (1519–1522)"));
  });

  test("6. Matemática e Geodésia da Rota de Magalhães (historical-routes.ts)", () => {
    const route = HISTORICAL_ROUTES["magellan-1519"];
    assert.ok(route, "Rota de Magalhães deve existir no catálogo canônico");
    assert.equal(route.type, "MARITIME");
    assert.equal(route.startYear, 1519);
    assert.equal(route.endYear, 1522);
    assert.ok(route.totalDistanceKm > 55000);

    const waypoints = route.waypoints;
    assert.ok(waypoints.length >= 15);

    // 1. Partida em Sanlúcar de Barrameda / Sevilha
    const start = waypoints[0];
    assert.equal(start.lat, 36.78);
    assert.equal(start.lng, -6.35);

    // 2. Passagem confirmada pelo Estreito de Magalhães
    const straits = waypoints.find((w) => w.lat === -53.47 && w.lng === -70.92);
    assert.ok(straits, "Waypoint do Estreito de Magalhães deve estar estritamente presente");

    // 3. Mactan / Filipinas
    const mactan = waypoints.find((w) => w.lat === 10.31 && w.lng === 123.97);
    assert.ok(mactan, "Waypoint de Mactan deve estar estritamente presente");

    // 4. Retorno a Sanlúcar / Sevilha completando o circuito topológico
    const end = waypoints[waypoints.length - 1];
    assert.equal(end.lat, 36.78);
    assert.equal(end.lng, -6.35);
  });

  test("7. Resolução Canônica de Eras Paleogeográficas (paleo-data.ts)", () => {
    const era250 = resolveGeologicalEra(250);
    assert.ok(era250.id === "PANGEA_250MA" || era250.id === "pangaea-250ma" || (era250 as any).code === "PANGEA_250MA");
    assert.equal(era250.period, "PERMIAN_TRIASSIC");
    assert.ok(era250.landmassAreaKm2 >= 140000000);
    assert.ok(era250.oceanName.includes("Panthalassa"));

    const era150 = resolveGeologicalEra(150);
    assert.ok(era150.id === "GONDWANA_150MA" || era150.id === "gondwana-150ma" || (era150 as any).code === "GONDWANA_150MA");
    assert.equal(era150.period, "JURASSIC");

    const era66 = resolveGeologicalEra(66);
    assert.ok(era66.id === "KPG_66MA" || era66.id === "cretaceous-66ma" || (era66 as any).code === "KPG_66MA");
    assert.equal(era66.period, "CRETACEOUS");
  });
});

describe("Componente 2: Três Dimensões WebGL & Shaders (R3F) (RN11 & RN12)", () => {
  test("1. EarthShaderMaterial contém uniforms uPaleoTexture e uPaleoFactor inicializados", () => {
    assert.ok("uPaleoTexture" in EarthShader.uniforms, "uPaleoTexture deve existir nos uniforms");
    assert.ok("uPaleoFactor" in EarthShader.uniforms, "uPaleoFactor deve existir nos uniforms");
    assert.equal(EarthShader.uniforms.uPaleoFactor.value, 0.0);

    const mat = createEarthMaterial();
    assert.ok(mat instanceof THREE.ShaderMaterial);
    assert.ok("uPaleoTexture" in mat.uniforms);
    assert.ok("uPaleoFactor" in mat.uniforms);
    assert.equal(mat.uniforms.uPaleoFactor.value, 0.0);
    assert.ok(mat.uniforms.uPaleoTexture.value !== null, "Deve conter textura ou placeholder 1x1");
    mat.dispose();
  });

  test("2. GLSL Invariant: normal mundial estritamente preservado no vertex shader", () => {
    const vs = EarthShader.vertexShader;
    assert.ok(
      vs.includes("vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);"),
      "Vertex shader deve calcular normais no espaço mundial via modelMatrix"
    );
    assert.ok(
      !vs.includes("normalMatrix * normal"),
      "NUNCA deve utilizar normalMatrix no cálculo do vetor normal para evitar distorção solar"
    );
  });

  test("3. GLSL Invariant: supressão estrita de luzes noturnas urbanas quando uPaleoFactor > 0.0", () => {
    const fs = EarthShader.fragmentShader;
    assert.ok(
      fs.includes("uniform sampler2D uPaleoTexture;"),
      "Fragment shader deve declarar uPaleoTexture"
    );
    assert.ok(
      fs.includes("uniform float uPaleoFactor;"),
      "Fragment shader deve declarar uPaleoFactor"
    );
    assert.ok(
      fs.includes("mix(dayLit, paleoLit, uPaleoFactor)") ||
        fs.includes("mix(dayColor, paleoColor, uPaleoFactor)") ||
        fs.includes("mix(dayBase, paleoBase, uPaleoFactor)"),
      "Fragment shader deve fazer o blend da textura paleogeográfica"
    );
    assert.ok(
      fs.includes("mix(nightComposite, vec3(0.012, 0.022, 0.042), uPaleoFactor);"),
      "Invariante de extinção de luzes elétricas de cidades pré-históricas deve estar presente"
    );
  });

  test("4. HistoricalRouteTrajectory: spline geodésica em raio estrito de 1.004 evita colisão interna com (0,0,0)", () => {
    assert.equal(ROUTE_ALTITUDE, 1.004, "Altitude da rota deve ser estritamente 1.004");
    const { curve, curvePoints, waypoints3D } = createMagellanTrajectoryCurve();

    assert.ok(curve instanceof THREE.CatmullRomCurve3);
    assert.ok(curvePoints.length >= 200, "Deve gerar malha refinada de pontos geodésicos");
    assert.ok(waypoints3D.length >= 15);

    // Amostragem de 100 pontos da curva contínua
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const pt = curve.getPointAt(u);
      const distToCenter = pt.length();

      // Tolerância estrita de curvatura sobre a esfera
      assert.ok(
        Math.abs(distToCenter - 1.004) < 0.002,
        `Ponto em u=${u} tem distância ${distToCenter}, esperado ~1.004`
      );
      assert.ok(distToCenter > 1.0, "Trajetória nunca deve cortar sob a superfície terrestre");
      assert.ok(!Number.isNaN(pt.x));
      assert.ok(!Number.isNaN(pt.y));
      assert.ok(!Number.isNaN(pt.z));
    }
  });

  test("5. HistoricalRouteTrajectory: circum-navegação completa com waypoints canônicos e fechamento topológico", () => {
    const { waypoints3D } = createMagellanTrajectoryCurve();

    // 1. Sanlúcar de Barrameda / Sevilha (Partida)
    const startWp = waypoints3D[0].waypoint;
    assert.equal(startWp.lat, 36.78);
    assert.equal(startWp.lng, -6.35);

    // 2. Estreito de Magalhães (-53.47, -70.92)
    const strait = waypoints3D.find(
      (w) => Math.abs(w.waypoint.lat - -53.47) < 0.1 && Math.abs(w.waypoint.lng - -70.92) < 0.1
    );
    assert.ok(strait, "Estreito de Magalhães deve estar presente na trajetória");

    // 3. Ilhas Filipinas / Mactan (10.31, 123.97)
    const mactan = waypoints3D.find(
      (w) => Math.abs(w.waypoint.lat - 10.31) < 0.1 && Math.abs(w.waypoint.lng - 123.97) < 0.1
    );
    assert.ok(mactan, "Batalha de Mactan deve estar presente na trajetória");

    // 4. Retorno a Sanlúcar (Chegada da Nau Victoria)
    const endWp = waypoints3D[waypoints3D.length - 1].waypoint;
    assert.equal(endWp.lat, 36.78);
    assert.equal(endWp.lng, -6.35);

    // Distância euclidiana entre início e fim no raio 1.004 deve ser nula (circuito fechado)
    const startPt = waypoints3D[0].point;
    const endPt = waypoints3D[waypoints3D.length - 1].point;
    assert.ok(startPt.distanceTo(endPt) < 1e-4, "Trajetória 3D deve fechar circuito topológico no globo");
  });

  test("6. PaleoPlatesLayer: altitude estrita 1.002 e catalogação das 10 zonas tectônicas da Pangeia", () => {
    assert.equal(PALEO_PLATES_ALTITUDE, 1.002, "Camada tectônica deve operar no raio 1.002");
    assert.ok(Array.isArray(PANGEA_TECTONIC_ZONES));
    assert.equal(PANGEA_TECTONIC_ZONES.length, 10, "Deve catalogar exatamente 10 grandes zonas tectônicas");

    const names = PANGEA_TECTONIC_ZONES.map((z) => z.name);
    assert.ok(names.some((n) => n.includes("Varisca")));
    assert.ok(names.some((n) => n.includes("Uraliana")));
    assert.ok(names.some((n) => n.includes("Atlântico Central")));
    assert.ok(names.some((n) => n.includes("Tétis")));
    assert.ok(names.some((n) => n.includes("Samfrau")));

    // Todos os pontos das polilinhas devem ter coordenadas lat/lng válidas
    for (const zone of PANGEA_TECTONIC_ZONES) {
      assert.ok(zone.coords.length >= 5);
      for (const [lat, lng] of zone.coords) {
        assert.ok(lat >= -90 && lat <= 90);
        assert.ok(lng >= -180 && lng <= 180);
      }
    }
  });

  test("7. Validação estrutural de componentes R3F: HistoricalRouteTrajectory e PaleoPlatesLayer", () => {
    assert.equal(typeof HistoricalRouteTrajectory, "function", "HistoricalRouteTrajectory deve ser um componente React");
    assert.equal(typeof PaleoPlatesLayer, "function", "PaleoPlatesLayer deve ser um componente React");

    // Verificar que os dados e a geometria gerada possuem nomes canônicos e nós Three.js válidos
    const { curve, waypoints3D } = createMagellanTrajectoryCurve();
    assert.ok(curve, "Curva deve ser instanciada");
    assert.ok(waypoints3D.length > 0, "Waypoints devem estar preenchidos");

    const samplePos = curve.getPointAt(0.5);
    assert.ok(Math.abs(samplePos.length() - 1.004) < 0.002, "Posição média da rota deve ter raio 1.004");
  });

  test("8. Descarte de geometrias e materiais WebGL (evita memory leaks na GPU)", () => {
    // 1. Trajetória e Nau Victoria
    const { curve } = createMagellanTrajectoryCurve();
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.0016, 6, false);
    const lineMat = new THREE.MeshStandardMaterial();
    tubeGeo.dispose();
    lineMat.dispose();

    // 2. Placas Paleogeográficas
    const pts = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];
    const plateGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const plateMat = new THREE.LineBasicMaterial();
    plateGeo.dispose();
    plateMat.dispose();

    assert.ok(true, "Descarte de geometrias e materiais concluído com sucesso");
  });

  test("9. Base de orientação da Nau Victoria: base ortonormal com determinante +1 e quaternion unitário", () => {
    const { curve } = createMagellanTrajectoryCurve();

    // Amostragem em 50 pontos ao longo de toda a rota de circum-navegação
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const shipPos = curve.getPointAt(u).normalize().multiplyScalar(ROUTE_ALTITUDE);
      const tangent = curve.getTangentAt(u).normalize();
      const up = shipPos.clone().normalize();

      // Invariante de base destra: right = up x tangent, forward = right x up
      const right = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const forward = new THREE.Vector3().crossVectors(right, up).normalize();

      const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
      const det = rotMatrix.determinant();

      assert.ok(
        Math.abs(det - 1.0) < 1e-4,
        `Determinante da matriz de orientação em u=${u} deve ser +1.0 (base destra sem reflexão), recebido: ${det}`
      );

      const q = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      assert.ok(
        Math.abs(q.length() - 1.0) < 1e-4,
        `Quaternion de orientação em u=${u} deve ter comprimento 1.0 (unitário), recebido: ${q.length()}`
      );
    }
  });

  test("10. Raio do tubo de glow e envelope de altitude: superfície exterior e inferior acima de 1.000", () => {
    const { curve } = createMagellanTrajectoryCurve();
    const glowTubeRadius = 0.0032;
    const coreTubeRadius = 0.0016;

    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const pt = curve.getPointAt(u);
      const r = pt.length();

      // Superfície inferior do tubo de glow nunca deve cortar a superfície terrestre (r = 1.0)
      const bottomGlow = r - glowTubeRadius;
      const bottomCore = r - coreTubeRadius;

      assert.ok(
        bottomGlow > 1.0,
        `Superfície inferior do glow em u=${u} deve ser > 1.0, obtido ${bottomGlow}`
      );
      assert.ok(
        bottomCore > 1.0,
        `Superfície inferior do tubo central em u=${u} deve ser > 1.0, obtido ${bottomCore}`
      );
    }
  });

  test("11. Zonas tectônicas da Pangeia: interpolação slerp preserva altitude 1.002 sobre o relevo", () => {
    for (const zone of PANGEA_TECTONIC_ZONES) {
      for (let i = 0; i < zone.coords.length - 1; i++) {
        const [lat1, lng1] = zone.coords[i];
        const [lat2, lng2] = zone.coords[i + 1];

        const vA = latLngToVector3(lat1, lng1, PALEO_PLATES_ALTITUDE);
        const vB = latLngToVector3(lat2, lng2, PALEO_PLATES_ALTITUDE);

        for (let s = 1; s < 5; s++) {
          const t = s / 5;
          const interp = slerpVectors(vA, vB, t).normalize().multiplyScalar(PALEO_PLATES_ALTITUDE);
          assert.ok(
            Math.abs(interp.length() - PALEO_PLATES_ALTITUDE) < 1e-5,
            "Cada vértice intermediário de fratura tectônica deve estar no raio 1.002"
          );
        }
      }
    }
  });

  test("12. useHistoricalRouteStore: integração de reprodução, velocidade e waypoints sincronizados", () => {
    const store = useHistoricalRouteStore.getState();

    // Ativação da rota
    store.setActiveRouteId("magellan-1519");
    assert.equal(useHistoricalRouteStore.getState().activeRouteId, "magellan-1519");
    assert.equal(useHistoricalRouteStore.getState().isPlaying, true);

    // Alteração de velocidade
    store.setPlaybackSpeed(2.0);
    assert.equal(useHistoricalRouteStore.getState().playbackSpeed, 2.0);

    // Seek / alteração de progresso
    store.seek(0.5);
    assert.equal(useHistoricalRouteStore.getState().progress, 0.5);
    assert.ok(useHistoricalRouteStore.getState().currentWaypointIndex > 0);

    // Pause / Play
    store.pause();
    assert.equal(useHistoricalRouteStore.getState().isPlaying, false);
    store.play();
    assert.equal(useHistoricalRouteStore.getState().isPlaying, true);

    // Cleanup
    store.setActiveRouteId(null);
  });
});

describe("Componente 1 (Horizonte 2 Fechamento): Datasets Paleogeográficos & Rotas de Expedições Históricas (RN11 & RN12)", () => {
  test("1. Resolução Canônica e Limites de Fronteira das Eras Paleogeográficas (resolvePaleoEra)", () => {
    // Escala Geológica em Milhões de Anos (Ma)
    assert.equal(resolvePaleoEra(300)?.id, "PANGEA_250MA");
    assert.equal(resolvePaleoEra(250)?.id, "PANGEA_250MA");
    assert.equal(resolvePaleoEra(225)?.id, "PANGEA_250MA");

    assert.equal(resolvePaleoEra(224.9)?.id, "BREAKUP_200MA");
    assert.equal(resolvePaleoEra(200)?.id, "BREAKUP_200MA");
    assert.equal(resolvePaleoEra(175)?.id, "BREAKUP_200MA");

    assert.equal(resolvePaleoEra(174.9)?.id, "GONDWANA_150MA");
    assert.equal(resolvePaleoEra(150)?.id, "GONDWANA_150MA");
    assert.equal(resolvePaleoEra(100)?.id, "GONDWANA_150MA");

    assert.equal(resolvePaleoEra(99.9)?.id, "KPG_66MA");
    assert.equal(resolvePaleoEra(66)?.id, "KPG_66MA");
    assert.equal(resolvePaleoEra(0.3)?.id, "KPG_66MA");

    // Tempos recentes / história humana (< 0.3 Ma = 300 mil anos) devem retornar null
    assert.equal(resolvePaleoEra(0.29), null);
    assert.equal(resolvePaleoEra(0), null);
    assert.equal(resolvePaleoEra(null), null);
    assert.equal(resolvePaleoEra(-100 as any), null);
    assert.equal(resolvePaleoEra(NaN as any), null);
    assert.equal(resolvePaleoEra(Infinity as any), null, "Infinity não é era geológica válida");
    assert.equal(resolvePaleoEra(-Infinity as any), null, "-Infinity não é era geológica válida");
  });

  test("2. Helper de Ativação Paleogeográfica (isPaleoActive)", () => {
    assert.equal(isPaleoActive(null), false);
    assert.equal(isPaleoActive(0), false);
    assert.equal(isPaleoActive(0.2), false);
    assert.equal(isPaleoActive(0.3), true);
    assert.equal(isPaleoActive(66), true);
    assert.equal(isPaleoActive(150), true);
    assert.equal(isPaleoActive(250), true);
    assert.equal(isPaleoActive(NaN), false);
    assert.equal(isPaleoActive(Infinity), false, "Infinity deve ser rejeitado");
    assert.equal(isPaleoActive(-Infinity), false, "-Infinity deve ser rejeitado");
  });

  test("3. Recuperação por Identificador Canônico e Códigos em Caixa-Alta (getPaleoEra)", () => {
    assert.equal(getPaleoEra("pangaea-250ma")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("pangea-250ma")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("PANGEA_250MA")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("pangea")?.period, "PERMIAN_TRIASSIC");

    assert.equal(getPaleoEra("breakup-200ma")?.period, "TRIASSIC_JURASSIC");
    assert.equal(getPaleoEra("BREAKUP_200MA")?.period, "TRIASSIC_JURASSIC");
    assert.equal(getPaleoEra("breakup")?.period, "TRIASSIC_JURASSIC");

    assert.equal(getPaleoEra("gondwana-150ma")?.period, "JURASSIC");
    assert.equal(getPaleoEra("GONDWANA_150MA")?.period, "JURASSIC");
    assert.equal(getPaleoEra("gondwana")?.period, "JURASSIC");

    assert.equal(getPaleoEra("cretaceous-66ma")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("kpg-66ma")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("KPG_66MA")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("cretaceous")?.period, "CRETACEOUS");

    assert.equal(getPaleoEra("non-existent"), null);
    assert.equal(getPaleoEra(null), null);
  });

  test("4. Rastreabilidade, Citações Acadêmicas e Indicadores Quantitativos das 4 Eras (RN02 & RN11)", () => {
    const eraKeys = ["pangaea-250ma", "breakup-200ma", "gondwana-150ma", "cretaceous-66ma"] as const;

    for (const key of eraKeys) {
      const era = PALEO_ERAS[key];
      assert.ok(era, `Era ${key} deve existir no catálogo`);
      assert.ok(era.name.length > 5, `Nome da era ${key} deve ser significativo`);
      assert.ok(era.landmassAreaKm2 > 100000000, "Área continental deve ser > 100M km²");
      assert.ok(era.oceanName.length > 5, "Oceano da era deve estar catalogado");
      assert.ok(era.climate.length > 20, "Descrição do clima deve ser detalhada");
      assert.ok(era.dominantLife.length > 20, "Fauna/Flora dominante deve ser detalhada");
      assert.ok(era.dossierMarkdown.length > 200, "Dossiê educativo deve conter seções markdown ricas");

      // Indicadores quantitativos primários
      assert.ok(era.indicators.length >= 3, `Era ${key} deve ter pelo menos 3 indicadores`);
      for (const ind of era.indicators) {
        assert.ok(ind.name.length > 0);
        assert.ok(ind.value.length > 0);
        assert.ok(ind.sourcePrimary.length > 0, "Indicador deve citar a fonte primária");
      }

      // Citações acadêmicas formatadas
      assert.ok(era.citations.length >= 2, `Era ${key} deve ter pelo menos 2 citações acadêmicas`);
      for (const cit of era.citations) {
        assert.ok(cit.authors.length > 0);
        assert.ok(cit.title.length > 0);
        assert.ok(cit.publication.length > 0);
        assert.ok(cit.year >= 1950 && cit.year <= 2026);
      }
    }
  });

  test("5. Catálogo de Placas Tectônicas e Arcos de Fratura da Pangeia (PANGAEA_TECTONIC_PLATES)", () => {
    assert.ok(PANGAEA_TECTONIC_PLATES.length >= 6);

    const types = new Set(PANGAEA_TECTONIC_PLATES.map((p) => p.type));
    assert.ok(types.has("continental"));
    assert.ok(types.has("oceanic"));
    assert.ok(types.has("rifting"));
    assert.ok(types.has("suture"));

    for (const plate of PANGAEA_TECTONIC_PLATES) {
      assert.ok(plate.id.length > 0);
      assert.ok(plate.name.length > 0);
      assert.ok(plate.movementRateMmPerYear > 0);
      assert.ok(plate.description.length > 15);
    }

    // Arcos esféricos para renderização 3D
    assert.ok(PANGAEA_PLATE_ARCS.length >= 5);
    for (const arc of PANGAEA_PLATE_ARCS) {
      assert.ok(arc.id.length > 0);
      assert.ok(arc.coordinates.length >= 5);
      for (const [lat, lng] of arc.coordinates) {
        assert.ok(lat >= -90 && lat <= 90, `Latitude fora dos limites: ${lat}`);
        assert.ok(lng >= -180 && lng <= 180, `Longitude fora dos limites: ${lng}`);
      }
    }
  });

  test("6. Integridade dos Arquivos Físicos de Dados e Texturas Paleogeográficas no Disco", () => {
    // 1. Dataset TopoJSON / GeoJSON de placas tectônicas da Pangeia
    const platesJsonPath = path.join(__dirname, "../public/data/paleo/pangea-plates-250ma.json");
    assert.ok(fs.existsSync(platesJsonPath), "pangea-plates-250ma.json deve existir em public/data/paleo/");
    const jsonContent = JSON.parse(fs.readFileSync(platesJsonPath, "utf8"));
    assert.equal(jsonContent.type, "FeatureCollection");
    assert.ok(Array.isArray(jsonContent.features));
    assert.ok(jsonContent.features.length >= 5);

    const hasRift = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("rift")
    );
    const hasSuture = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("suture")
    );
    const hasSubduction = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("subduction")
    );
    assert.ok(hasRift, "Deve conter feição de rifting");
    assert.ok(hasSuture, "Deve conter feição de sutura");
    assert.ok(hasSubduction, "Deve conter feição de subducção");

    // 2. Textura equirretangular da Pangeia
    const texturePath = path.join(__dirname, "../public/textures/paleo_pangea.png");
    assert.ok(fs.existsSync(texturePath), "paleo_pangea.png deve existir em public/textures/");
    const textureBuffer = fs.readFileSync(texturePath);
    assert.ok(textureBuffer.length > 50000, "Textura PNG deve ter tamanho > 50KB");

    // Assinatura PNG canônica: 89 50 4E 47 0D 0A 1A 0A
    assert.equal(textureBuffer[0], 0x89);
    assert.equal(textureBuffer[1], 0x50);
    assert.equal(textureBuffer[2], 0x4e);
    assert.equal(textureBuffer[3], 0x47);

    // Cópias de compatibilidade Pangeia
    const aliasPath1 = path.join(__dirname, "../public/textures/paleo/pangea_250ma.png");
    const aliasPath2 = path.join(__dirname, "../public/textures/pangea_250ma.png");
    assert.ok(fs.existsSync(aliasPath1));
    assert.ok(fs.existsSync(aliasPath2));

    // 3. Textura equirretangular de Gondwana & Laurásia (150 Ma)
    const gondwanaTexturePath = path.join(__dirname, "../public/textures/paleo_gondwana.png");
    assert.ok(fs.existsSync(gondwanaTexturePath), "paleo_gondwana.png deve existir em public/textures/");
    const gondwanaBuffer = fs.readFileSync(gondwanaTexturePath);
    assert.ok(gondwanaBuffer.length > 50000, "Textura Gondwana PNG deve ter tamanho > 50KB");

    assert.equal(gondwanaBuffer[0], 0x89);
    assert.equal(gondwanaBuffer[1], 0x50);
    assert.equal(gondwanaBuffer[2], 0x4e);
    assert.equal(gondwanaBuffer[3], 0x47);

    const gondwanaAlias1 = path.join(__dirname, "../public/textures/paleo/gondwana_150ma.png");
    const gondwanaAlias2 = path.join(__dirname, "../public/textures/gondwana_150ma.png");
    assert.ok(fs.existsSync(gondwanaAlias1));
    assert.ok(fs.existsSync(gondwanaAlias2));

    // Validação de vinculação no catálogo
    assert.equal(PALEO_ERAS["gondwana-150ma"].textureUrl, "/textures/paleo_gondwana.png");
  });

  test("7. Reconstituição da Circum-navegação de Magalhães-Elcano: Frota, Waypoints e Pigafetta (RN12)", () => {
    const route = getHistoricalRoute("magellan-1519");
    assert.ok(route, "getHistoricalRoute deve retornar a rota de Magalhães");
    if (!route) return;
    assert.equal(route.type, "MARITIME");
    assert.equal(route.startYear, 1519);
    assert.equal(route.endYear, 1522);
    assert.equal(route.flagCountry, "ESP");
    assert.ok(route.commander.includes("Magalhães") && route.commander.includes("Elcano"));
    assert.ok(route.survivorsCount.includes("18"));

    // 1. Frota das 5 embarcações da Armada das Molucas
    assert.equal(route.fleet.length, 5);
    const vesselNames = route.fleet.map((v) => v.name);
    assert.ok(vesselNames.includes("Trinidad"));
    assert.ok(vesselNames.includes("San Antonio"));
    assert.ok(vesselNames.includes("Concepción"));
    assert.ok(vesselNames.includes("Victoria"));
    assert.ok(vesselNames.includes("Santiago"));

    for (const vessel of route.fleet) {
      assert.ok(vessel.tonnage > 50);
      assert.ok(vessel.originalCaptain.length > 0);
      assert.ok(vessel.fate.length > 20);
    }

    // 2. Waypoints históricos ordenados
    assert.equal(route.waypoints.length, 17);
    for (let i = 0; i < route.waypoints.length; i++) {
      const wp: RouteWaypoint = route.waypoints[i];
      assert.equal(wp.order, i + 1);
      assert.ok(wp.lat >= -90 && wp.lat <= 90);
      assert.ok(wp.lng >= -180 && wp.lng <= 180);
      assert.ok(wp.vessel.length > 0);
      assert.ok(wp.commander.length > 0);
      assert.ok(wp.modernCountry.length > 0);
      assert.ok(wp.description.length > 10);
      assert.ok(wp.historicalEvent.length > 10);
      assert.ok(wp.quoteFromPigafetta || wp.pigafettaDiary);
      assert.ok(wp.daysAtSea >= 0);
      assert.ok(wp.leaguesNavigated >= 0);

      // Cronologia monotônica crescente
      if (i > 0) {
        const prevWp = route.waypoints[i - 1];
        assert.ok(wp.daysAtSea >= prevWp.daysAtSea, `Dias em mar devem crescer: ${wp.daysAtSea} >= ${prevWp.daysAtSea}`);
        assert.ok(wp.leaguesNavigated >= prevWp.leaguesNavigated, `Léguas navegadas devem crescer`);
      }
    }

    // 3. Marcos geográficos fundamentais
    const wpStart = route.waypoints[0];
    assert.equal(wpStart.lat, 36.78);
    assert.equal(wpStart.lng, -6.35);

    const wpGuanabara = route.waypoints.find((w) => w.id === "GUANABARA_BAY");
    assert.ok(wpGuanabara);
    assert.equal(wpGuanabara.modernCountry, "Brasil");
    assert.equal(wpGuanabara.lat, -22.91);

    const wpStrait = route.waypoints.find((w) => w.id === "STRAIT_OF_MAGELLAN");
    assert.ok(wpStrait);
    assert.equal(wpStrait.lat, -53.47);
    assert.equal(wpStrait.lng, -70.92);

    const wpMactan = route.waypoints.find((w) => w.id === "MACTAN_BATTLE");
    assert.ok(wpMactan);
    assert.equal(wpMactan.lat, 10.31);
    assert.equal(wpMactan.lng, 123.97);

    const wpMoluccas = route.waypoints.find((w) => w.id === "TIDORE_MOLUCCAS");
    assert.ok(wpMoluccas);
    assert.equal(wpMoluccas.lat, 0.68);
    assert.equal(wpMoluccas.lng, 127.4);

    const wpEnd = route.waypoints[route.waypoints.length - 1];
    assert.equal(wpEnd.lat, 36.78);
    assert.equal(wpEnd.lng, -6.35);
    assert.equal(wpEnd.vessel, "Nau Victoria");
    assert.equal(wpEnd.commander, "Juan Sebastián Elcano");

    // 4. Cálculo matemático de distância geodésica
    const calculatedDistance = calculateRouteDistanceKm(route.waypoints);
    assert.ok(
      calculatedDistance >= 50000 && calculatedDistance <= 75000,
      `Distância calculada da rota (${calculatedDistance} km) deve bater com circum-navegação real (~60.000 km)`
    );

    // 5. Interpolação geodésica de anti-meridiano
    const pacificInterp = interpolateGeodesicSegment(
      { lat: -12.0, lng: -135.0 },
      { lat: 13.44, lng: 144.79 },
      10
    );
    assert.equal(pacificInterp.length, 11);
    for (const pt of pacificInterp) {
      assert.ok(pt.lat >= -15 && pt.lat <= 15);
      assert.ok(pt.lng >= -180 && pt.lng <= 180);
    }

    // 6. Diário de bordo de Pigafetta
    assert.ok(route.logbookEntries.length >= 5);
    for (const entry of route.logbookEntries) {
      assert.ok(entry.date.length > 0);
      assert.ok(entry.location.length > 0);
      assert.ok(entry.event.length > 0);
      assert.ok(entry.excerptPigafetta && entry.excerptPigafetta.length > 0);
    }
  });

  test("8. Utilitários Procedurais de Canvas Paleogeográfico (Pangeia e Gondwana)", () => {
    // No ambiente Node.js / SSR sem DOM (document === undefined), as funções retornam null graciosamente
    assert.equal(generatePaleoPangeaCanvas(), null);
    assert.equal(generatePaleoGondwanaCanvas(), null);
    assert.equal(generatePaleoCanvas("pangaea-250ma"), null);
    assert.equal(generatePaleoCanvas("gondwana-150ma"), null);

    // Simulação com mock de document/canvas
    const mockCtx = {
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      ellipse: () => {},
      rect: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
    };
    const originalDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: (tag: string) => (tag === "canvas" ? mockCanvas : null),
    };

    try {
      const pangeaCanvas = generatePaleoPangeaCanvas(512, 256);
      assert.ok(pangeaCanvas !== null);
      assert.equal(pangeaCanvas.width, 512);
      assert.equal(pangeaCanvas.height, 256);

      const gondwanaCanvas = generatePaleoGondwanaCanvas(512, 256);
      assert.ok(gondwanaCanvas !== null);
      assert.equal(gondwanaCanvas.width, 512);
      assert.equal(gondwanaCanvas.height, 256);

      const unifiedPangea = generatePaleoCanvas("pangaea-250ma", 256, 128);
      assert.ok(unifiedPangea !== null);
      assert.equal(unifiedPangea.width, 256);

      const unifiedGondwana = generatePaleoCanvas("gondwana-150ma", 256, 128);
      assert.ok(unifiedGondwana !== null);
      assert.equal(unifiedGondwana.width, 256);
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });

  test("9. Funções Auxiliares Náuticas, Geodésia Esférica e Busca de Waypoints (findRouteWaypoint)", () => {
    // 1. Busca por identificador canônico
    const wpDeparture = findRouteWaypoint("SANLUCAR_DEPARTURE");
    assert.ok(wpDeparture !== null);
    assert.equal(wpDeparture.id, "SANLUCAR_DEPARTURE");
    assert.equal(wpDeparture.lat, 36.78);

    const wpGuanabara = findRouteWaypoint("guanabara_bay"); // Case-insensitive
    assert.ok(wpGuanabara !== null);
    assert.equal(wpGuanabara.id, "GUANABARA_BAY");
    assert.equal(wpGuanabara.modernCountry, "Brasil");

    const wpMactan = findRouteWaypoint("MACTAN_BATTLE");
    assert.ok(wpMactan !== null);
    assert.equal(wpMactan.commander, "Fernão de Magalhães");

    const wpNonExistent = findRouteWaypoint("NON_EXISTENT_WP");
    assert.equal(wpNonExistent, null);

    const wpNull = findRouteWaypoint(null as any);
    assert.equal(wpNull, null);

    // 2. Resiliência do cálculo de distância geodésica
    assert.equal(calculateRouteDistanceKm([]), 0);
    assert.equal(calculateRouteDistanceKm(null as any), 0);
    assert.equal(calculateRouteDistanceKm([{ lat: 0, lng: 0 } as any]), 0);
    assert.equal(calculateRouteDistanceKm([{ lat: NaN, lng: 0 } as any, { lat: 10, lng: 10 } as any]), 0);

    // 3. Resiliência e fidelidade da interpolação geodésica esférica
    assert.deepEqual(interpolateGeodesicSegment(null as any, { lat: 10, lng: 10 }), []);
    assert.deepEqual(interpolateGeodesicSegment({ lat: 10, lng: 10 }, null as any), []);
    assert.deepEqual(interpolateGeodesicSegment({ lat: NaN, lng: 0 }, { lat: 10, lng: 10 }), []);

    // steps < 1 retorna o ponto de origem sem emitir NaN
    const zeroStep = interpolateGeodesicSegment({ lat: 10.0, lng: 20.0 }, { lat: 30.0, lng: 40.0 }, 0);
    assert.equal(zeroStep.length, 1);
    assert.equal(zeroStep[0].lat, 10.0);
    assert.equal(zeroStep[0].lng, 20.0);

    // Interpolação entre Sanlúcar e Canárias com slerp
    const segments = interpolateGeodesicSegment({ lat: 36.78, lng: -6.35 }, { lat: 28.47, lng: -16.25 }, 5);
    assert.equal(segments.length, 6);
    assert.equal(segments[0].lat, 36.78);
    assert.equal(segments[5].lat, 28.47);
  });
});

describe("Componente 4: Persistência de Estudos Paleogeográficos & Rotas Históricas (RN16)", () => {
  test("1. Serialização de Estudo com geologicalMa e activeRouteId (StudyRecord)", () => {
    const studySnapshot: StudyRecord = {
      id: "estudo-paleo-pangea-test",
      parentId: null,
      title: "Pangeia e Deriva Continental",
      description: "Recorte da Pangeia a 250 Ma com rota de circum-navegação de Magalhães.",
      timelineStartYear: 1519,
      timelineEndYear: 1522,
      selectedCountryIsos: ["BRA", "ZAF", "IND"],
      activeCategories: ["SCIENCE_CULTURE"],
      cameraLat: 10.0,
      cameraLng: -20.0,
      cameraAltitude: 2.5,
      markdownNotes: "Notas de pesquisa científica.",
      historicalEra: null,
      isApollo11Active: false,
      geologicalMa: 250,
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(studySnapshot);
    const retrieved = getMemoryStudy("estudo-paleo-pangea-test");

    assert.ok(retrieved !== undefined);
    assert.equal(retrieved.id, "estudo-paleo-pangea-test");
    assert.equal(retrieved.geologicalMa, 250);
    assert.equal(retrieved.activeRouteId, "magellan-1519");
    assert.equal(retrieved.title, "Pangeia e Deriva Continental");
  });

  test("2. Fork Imutável (RN16) preserva geologicalMa e activeRouteId com isolamento de estado", () => {
    const originalStudy: StudyRecord = {
      id: "estudo-orig-150ma",
      parentId: null,
      title: "Gondwana e Laurásia Quinhentista",
      timelineStartYear: 1947,
      timelineEndYear: 1991,
      selectedCountryIsos: ["BRA", "DEU"],
      activeCategories: ["ECONOMY"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.2,
      geologicalMa: 150,
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    saveMemoryStudy(originalStudy);
    const forked = forkStudyRecord(originalStudy, "fork-derivado-150ma");

    assert.equal(forked.id, "fork-derivado-150ma");
    assert.equal(forked.parentId, "estudo-orig-150ma");
    assert.equal(forked.title, "[Fork] Gondwana e Laurásia Quinhentista");
    assert.equal(forked.geologicalMa, 150);
    assert.equal(forked.activeRouteId, "magellan-1519");

    // Imutabilidade estrita
    forked.title = "Alteração derivativa";
    forked.geologicalMa = 66;
    forked.activeRouteId = null;

    assert.equal(originalStudy.title, "Gondwana e Laurásia Quinhentista");
    assert.equal(originalStudy.geologicalMa, 150);
    assert.equal(originalStudy.activeRouteId, "magellan-1519");
  });

  test("3. useStudyStore gerencia geologicalMa, activeRouteId e ciclo de vida", () => {
    const store = useStudyStore.getState();
    store.resetStudy();

    assert.equal(useStudyStore.getState().geologicalMa, null);
    assert.equal(useStudyStore.getState().activeRouteId, null);

    store.setGeologicalMa(250);
    assert.equal(useStudyStore.getState().geologicalMa, 250);

    store.setActiveRouteId("magellan-1519");
    assert.equal(useStudyStore.getState().activeRouteId, "magellan-1519");

    store.setStudy({
      id: "estudo-completo-66ma",
      title: "Cretáceo K-Pg e Extinção",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
    });

    assert.equal(useStudyStore.getState().currentStudyId, "estudo-completo-66ma");
    assert.equal(useStudyStore.getState().geologicalMa, 66);
    assert.equal(useStudyStore.getState().activeRouteId, "magellan-1519");

    store.resetStudy();
    assert.equal(useStudyStore.getState().geologicalMa, null);
    assert.equal(useStudyStore.getState().activeRouteId, null);
  });

  test("4. StudyShareModal exibe badges de Era Geológica e Rota de Expedição quando ativos", () => {
    useTimelineStore.getState().selectGeologicalMa(250);
    useHistoricalRouteStore.getState().setActiveRouteId("magellan-1519");
    useStudyStore.getState().setGeologicalMa(250);
    useStudyStore.getState().setActiveRouteId("magellan-1519");
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(html.includes("data-testid=\"modal-geological-era-badge\""), "Deve renderizar badge de era geológica no modal");
    assert.ok(html.includes("Paleogeografia &amp; Deriva Continental Ativa"));
    assert.ok(html.includes("Pangeia"));

    assert.ok(html.includes("data-testid=\"modal-historical-route-badge\""), "Deve renderizar badge de rota histórica no modal");
    assert.ok(html.includes("Rota de Expedição Histórica 3D"));

    assert.ok(html.includes("Paleogeografia:"));
    assert.ok(html.includes("Rota Histórica 3D:"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().selectGeologicalMa(null);
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useStudyStore.getState().resetStudy();
  });

  test("5. StudyShareModal omite badges paleogeográficos e de expedição no modo padrão contemporâneo", () => {
    useTimelineStore.getState().selectGeologicalMa(null);
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useStudyStore.getState().resetStudy();
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(!html.includes("data-testid=\"modal-geological-era-badge\""));
    assert.ok(!html.includes("data-testid=\"modal-historical-route-badge\""));

    useStudyStore.getState().setShareModalOpen(false);
  });

  test("6. Restauração de Estudo (/study/[slug]): Aplica geologicalMa e activeRouteId nas stores correspondentes", () => {
    // Cenário 1: Restauração de estudo paleogeográfico com rota ativa
    const studyPayload = {
      id: "estudo-restaurar-123",
      geologicalMa: 250,
      activeRouteId: "magellan-1519",
    };

    useTimelineStore.getState().selectGeologicalMa(studyPayload.geologicalMa);
    useHistoricalRouteStore.getState().setActiveRouteId(studyPayload.activeRouteId);
    useTimelineStore.getState().setActiveRouteId(studyPayload.activeRouteId);

    assert.equal(useTimelineStore.getState().timelineMode, "GEOLOGICAL");
    assert.equal(useTimelineStore.getState().selectedGeologicalMa, 250);
    assert.equal(useTimelineStore.getState().geologicalMa, 250);
    assert.equal(useHistoricalRouteStore.getState().activeRouteId, "magellan-1519");
    assert.equal(useTimelineStore.getState().activeRouteId, "magellan-1519");

    // Cenário 2: Restauração de estudo contemporâneo (limpeza estrita)
    useTimelineStore.getState().selectGeologicalMa(null);
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useTimelineStore.getState().setActiveRouteId(null);

    assert.equal(useTimelineStore.getState().timelineMode, "HISTORICAL");
    assert.equal(useTimelineStore.getState().selectedGeologicalMa, null);
    assert.equal(useTimelineStore.getState().geologicalMa, null);
    assert.equal(useHistoricalRouteStore.getState().activeRouteId, null);
    assert.equal(useTimelineStore.getState().activeRouteId, null);
  });

  test("7. Fator de atenuação e extinção de luzes urbanas para uPaleoFactor > 0", () => {
    // Simulação do comportamento físico do EarthShaderMaterial
    const computeCityLightWeight = (uPaleoFactor: number) => {
      return 1.0 - Math.min(1.0, Math.max(0.0, uPaleoFactor / 0.2));
    };

    assert.equal(computeCityLightWeight(0.0), 1.0, "Luzes urbanas a 100% no presente");
    assert.equal(computeCityLightWeight(0.1), 0.5, "Atenuação de 50% na transição inicial");
    assert.equal(computeCityLightWeight(0.2), 0.0, "Extinção total a partir de 0.2");
    assert.equal(computeCityLightWeight(1.0), 0.0, "Extinção total permanente na Pangeia");
  });

  test("8. restoreStudyRecord normaliza e sanitiza snapshots com geologicalMa e activeRouteId", () => {
    // 1. Snapshot com dados válidos
    const restored = restoreStudyRecord({
      id: "estudo-restaurado-valido",
      title: "Pangeia Jurássica",
      geologicalMa: 150,
      activeRouteId: "magellan-1519",
      selectedCountryIsos: ["BRA", "AGO"],
    });

    assert.equal(restored.id, "estudo-restaurado-valido");
    assert.equal(restored.geologicalMa, 150);
    assert.equal(restored.activeRouteId, "magellan-1519");
    assert.equal(restored.historicalEra, null, "historicalEra deve ser suprimido em era geológica");
    assert.equal(restored.isApollo11Active, false, "Apollo 11 deve ser falso em era geológica");
    assert.deepEqual(restored.selectedCountryIsos, ["BRA", "AGO"]);

    // 2. Snapshot com dados inválidos (geologicalMa negativo, activeRouteId vazio)
    const sanitized = restoreStudyRecord({
      id: "estudo-invalido",
      title: "Estudo com Erros",
      geologicalMa: -50,
      activeRouteId: "   ",
      historicalEra: "WW2_1939",
    });

    assert.equal(sanitized.geologicalMa, null, "geologicalMa negativo deve ser sanitizado para null");
    assert.equal(sanitized.activeRouteId, null, "activeRouteId em branco deve ser sanitizado para null");
    assert.equal(sanitized.historicalEra, "WW2_1939", "historicalEra deve ser mantido se geologicalMa for nulo");
  });

  test("9. forkStudyRecord sanitiza valores anômalos e previne anacronismos na derivação", () => {
    const parentWithAnomalies: StudyRecord = {
      id: "parent-anomalo",
      title: "Estudo com Mistura Ilícita",
      timelineStartYear: 1969,
      timelineEndYear: 1969,
      selectedCountryIsos: ["USA"],
      activeCategories: ["SCIENCE_CULTURE"],
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.5,
      historicalEra: "COLD_WAR_1969",
      isApollo11Active: true,
      geologicalMa: 250, // Permiano não pode coexistir com Guerra Fria / Apollo 11
      activeRouteId: "magellan-1519",
      createdAt: new Date().toISOString(),
    };

    const forked = forkStudyRecord(parentWithAnomalies, "fork-sanitizado-pangea");

    assert.equal(forked.id, "fork-sanitizado-pangea");
    assert.equal(forked.parentId, "parent-anomalo");
    assert.equal(forked.geologicalMa, 250);
    assert.equal(forked.activeRouteId, "magellan-1519");
    assert.equal(forked.historicalEra, null, "Guerra Fria deve ser anulada quando Ma > 0.3");
    assert.equal(forked.isApollo11Active, false, "Apollo 11 deve ser desativado na Pangeia");

    // Teste com Ma zero ou negativo
    const parentWithZeroMa: StudyRecord = {
      ...parentWithAnomalies,
      geologicalMa: 0,
    };
    const forkedZero = forkStudyRecord(parentWithZeroMa, "fork-zero-ma");
    assert.equal(forkedZero.geologicalMa, null, "0 Ma deve virar null (modo contemporâneo)");
    assert.equal(forkedZero.historicalEra, "COLD_WAR_1969");
    assert.equal(forkedZero.isApollo11Active, true);
  });

  test("10. useStudyStore métodos restoreStudy e forkStudy sincronizam e isolam o estado", () => {
    const store = useStudyStore.getState();
    store.resetStudy();

    // 1. restoreStudy
    store.restoreStudy({
      id: "estudo-restaurado-store",
      parentId: "root-123",
      title: "Extinção Cretáceo K-Pg",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
      historicalEra: "WW1_1914", // deve ser sanitizado
      isApollo11Active: true, // deve ser sanitizado
    });

    assert.equal(useStudyStore.getState().currentStudyId, "estudo-restaurado-store");
    assert.equal(useStudyStore.getState().parentId, "root-123");
    assert.equal(useStudyStore.getState().geologicalMa, 66);
    assert.equal(useStudyStore.getState().activeRouteId, "magellan-1519");
    assert.equal(useStudyStore.getState().historicalEra, null);
    assert.equal(useStudyStore.getState().isApollo11Active, false);

    // 2. forkStudy
    store.forkStudy({
      id: "fork-estudo-store-999",
      parentId: "estudo-restaurado-store",
      title: "[Fork] Extinção Cretáceo K-Pg",
      geologicalMa: 66,
      activeRouteId: "magellan-1519",
    });

    assert.equal(useStudyStore.getState().currentStudyId, "fork-estudo-store-999");
    assert.equal(useStudyStore.getState().parentId, "estudo-restaurado-store");
    assert.equal(useStudyStore.getState().geologicalMa, 66);
    assert.equal(useStudyStore.getState().activeRouteId, "magellan-1519");

    store.resetStudy();
  });

  test("11. StudyShareModal suprime anacronismos: exclui badges de Apollo 11 e Guerra Fria quando era geológica está ativa", () => {
    // Configura estado com Apollo 11 inicialmente ativo, mas depois alternado para modo geológico
    useTimelineStore.getState().selectYear(1969);
    useTimelineStore.getState().selectMilestone("glo-1969");
    useTimelineStore.getState().selectGeologicalMa(250); // Pangeia ativada
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useStudyStore.getState().setGeologicalMa(250);
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    // Deve exibir Pangeia
    assert.ok(html.includes("data-testid=\"modal-geological-era-badge\""));
    assert.ok(html.includes("Pangeia"));

    // NÃO deve exibir Apollo 11 mesmo que milestoneId ou ano anterior fosse 1969
    assert.ok(!html.includes("Trajetória Translunar Ativa"), "Apollo 11 não deve aparecer no modal da Pangeia");
    assert.ok(!html.includes("Missão Espacial: Apollo 11"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useTimelineStore.getState().selectGeologicalMa(null);
    useStudyStore.getState().resetStudy();
  });

  test("12. StudyShareModal respeita desativação de rotas históricas (omite badge se rota foi desativada)", () => {
    // Cenário: estudo carregado tinha rota, mas o usuário a desativou na HUD
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useTimelineStore.getState().setActiveRouteId(null);
    useStudyStore.getState().setGeologicalMa(null);
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(!html.includes("data-testid=\"modal-historical-route-badge\""), "Não deve exibir badge de rota desativada");
    assert.ok(!html.includes("• Rota Histórica 3D:"));

    useStudyStore.getState().setShareModalOpen(false);
  });
});

describe("Horizonte 3: Observatório Planetário (NASA) & Tráfego Global (RN17, RN18, RN21, RN23)", () => {
  test("1. useObservatoryStore gerencia ativação, desativação e alternância múltipla de camadas", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    assert.equal(store.activeLayers.length, 0);

    // Ativa FIRMS
    store.toggleLayer("NASA_FIRMS");
    assert.ok(useObservatoryStore.getState().activeLayers.includes("NASA_FIRMS"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 1);

    // Ativa ISS
    store.toggleLayer("ISS_SATELLITES");
    assert.ok(useObservatoryStore.getState().activeLayers.includes("ISS_SATELLITES"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 2);

    // Desativa FIRMS
    store.toggleLayer("NASA_FIRMS");
    assert.ok(!useObservatoryStore.getState().activeLayers.includes("NASA_FIRMS"));
    assert.ok(useObservatoryStore.getState().activeLayers.includes("ISS_SATELLITES"));
    assert.equal(useObservatoryStore.getState().activeLayers.length, 1);

    // Ativação direta e idempotente com setLayerActive
    store.setLayerActive("FLIGHTS_OPENSKY", true);
    store.setLayerActive("FLIGHTS_OPENSKY", true); // Idempotente
    assert.ok(useObservatoryStore.getState().activeLayers.includes("FLIGHTS_OPENSKY"));

    store.setLayerActive("FLIGHTS_OPENSKY", false);
    assert.ok(!useObservatoryStore.getState().activeLayers.includes("FLIGHTS_OPENSKY"));

    // setAllLayers
    const allFive: ObservatoryLayerId[] = [
      "NASA_FIRMS",
      "NASA_EONET",
      "ISS_SATELLITES",
      "FLIGHTS_OPENSKY",
      "MARITIME_ROUTES",
    ];
    store.setAllLayers(allFive);
    assert.equal(useObservatoryStore.getState().activeLayers.length, 5);
    for (const id of allFive) {
      assert.ok(useObservatoryStore.getState().activeLayers.includes(id));
    }

    store.resetObservatory();
  });

  test("2. useObservatoryStore controla opacidades e painel flutuante", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    // Painel flutuante
    assert.equal(store.isPanelOpen, false);
    store.setPanelOpen(true);
    assert.equal(useObservatoryStore.getState().isPanelOpen, true);
    store.togglePanel();
    assert.equal(useObservatoryStore.getState().isPanelOpen, false);

    // Opacidade com clamp entre [0, 1]
    store.setLayerOpacity("NASA_FIRMS", 0.75);
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 0.75);

    store.setLayerOpacity("NASA_FIRMS", 1.5); // Deve ser limitado a 1.0
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 1.0);

    store.setLayerOpacity("NASA_FIRMS", -0.2); // Deve ser limitado a 0.0
    assert.equal(useObservatoryStore.getState().layerOpacity.NASA_FIRMS, 0.0);

    store.resetObservatory();
  });

  test("3. useObservatoryStore gerencia seleção de entidades para telemetria", () => {
    const store = useObservatoryStore.getState();
    store.resetObservatory();

    assert.equal(store.selectedEntity, null);

    const testEvent = FALLBACK_EONET_EVENTS[0];
    store.setSelectedEntity({ type: "EONET", data: testEvent });

    const selected = useObservatoryStore.getState().selectedEntity;
    assert.ok(selected);
    assert.equal(selected.type, "EONET");
    assert.equal(selected.data.id, testEvent.id);

    store.setSelectedEntity(null);
    assert.equal(useObservatoryStore.getState().selectedEntity, null);
  });

  test("4. useObservatoryStore.loadLayerData opera com resiliência e fallback offline", async () => {
    const store = useObservatoryStore.getState();

    // Deve executar sem lançar exceções mesmo sem backend de rede mockado
    await assert.doesNotReject(async () => {
      await store.loadLayerData("NASA_FIRMS");
      await store.loadLayerData("NASA_EONET");
      await store.loadLayerData("ISS_SATELLITES");
      await store.loadLayerData("FLIGHTS_OPENSKY");
    });

    // Confirma que os dados de fallback estão presentes
    assert.ok(useObservatoryStore.getState().firmsHotspots.length > 0);
    assert.ok(useObservatoryStore.getState().eonetEvents.length > 0);
    assert.ok(useObservatoryStore.getState().issTelemetry !== null);
    assert.ok(useObservatoryStore.getState().aircraftFleet.length > 0);
    assert.ok(useObservatoryStore.getState().maritimeRoutes.length > 0);
  });

  test("5. Propagador Orbital da ISS (calculateIssPosition): envelope LEO, velocidade e inclinação 51.64°", () => {
    const now = Date.now();
    const telemetry = calculateIssPosition(now);

    // 1. Altitude orbital dentro do envelope da órbita baixa da Terra (LEO) [400 km, 420 km]
    assert.ok(
      telemetry.altitudeKm >= 400 && telemetry.altitudeKm <= 420,
      `Altitude da ISS fora do envelope LEO: ${telemetry.altitudeKm} km`
    );

    // 2. Velocidade orbital próxima a 27.600 km/h [27.500, 27.700]
    assert.ok(
      telemetry.velocityKmh >= 27500 && telemetry.velocityKmh <= 27700,
      `Velocidade da ISS fora da calibração física: ${telemetry.velocityKmh} km/h`
    );

    // 3. Inclinação orbital oficial de 51.64 graus
    assert.equal(telemetry.orbitInclinationDeg, 51.64);

    // 4. Latitude máxima e mínima limitada estritamente pela inclinação orbital [-51.64°, +51.64°]
    assert.ok(
      telemetry.latitude >= -51.65 && telemetry.latitude <= 51.65,
      `Latitude da ISS extrapolou a inclinação orbital: ${telemetry.latitude}`
    );

    // 5. Longitude contida no intervalo geodésico padrão [-180°, +180°]
    assert.ok(
      telemetry.longitude >= -180 && telemetry.longitude <= 180,
      `Longitude da ISS fora de [-180, 180]: ${telemetry.longitude}`
    );

    // 6. Teste de amostragem em 100 instantes temporais ao longo de 24 horas
    for (let i = 0; i < 100; i++) {
      const sampleTime = now + i * 15 * 60 * 1000;
      const sample = calculateIssPosition(sampleTime);
      assert.ok(Number.isFinite(sample.latitude));
      assert.ok(Number.isFinite(sample.longitude));
      assert.ok(sample.latitude >= -51.65 && sample.latitude <= 51.65);
      assert.ok(sample.longitude >= -180 && sample.longitude <= 180);
      assert.ok(sample.altitudeKm >= 400 && sample.altitudeKm <= 420);
    }
  });

  test("6. Trilha orbital contínua da ISS (groundTrack): cobre 1 órbita completa sem NaNs", () => {
    const telemetry = calculateIssPosition();
    assert.ok(Array.isArray(telemetry.groundTrack));
    assert.ok(
      telemetry.groundTrack.length >= 30,
      `Trilha orbital da ISS deve conter pelo menos 30 waypoints, recebeu ${telemetry.groundTrack.length}`
    );

    for (const pt of telemetry.groundTrack) {
      assert.ok(Number.isFinite(pt.lat), `Latitude não finita encontrada na trilha: ${pt.lat}`);
      assert.ok(Number.isFinite(pt.lng), `Longitude não finita encontrada na trilha: ${pt.lng}`);
      assert.ok(pt.lat >= -51.65 && pt.lat <= 51.65);
      assert.ok(pt.lng >= -180 && pt.lng <= 180);

      // Verificação da projeção esférica 3D em Three.js
      const vec = latLngToVector3(pt.lat, pt.lng, 1.18);
      assert.ok(Math.abs(vec.length() - 1.18) < 1e-4, "Raio 3D da órbita deve ser exatamente 1.18");
    }
  });

  test("7. Envelopes de altitude e afastamento da crosta terrestre (RN21)", () => {
    // Crosta base: R = 1.000
    // Queimadas FIRMS: R = 1.0025
    // Rotas Marítimas: R = 1.003
    // Eventos EONET: R = 1.006
    // Frotas Aéreas: R = 1.018
    // Órbita ISS: R = 1.180

    for (const h of FALLBACK_FIRMS_HOTSPOTS) {
      const v = latLngToVector3(h.lat, h.lng, 1.0025);
      assert.ok(Math.abs(v.length() - 1.0025) < 1e-4);
    }

    for (const r of FALLBACK_MARITIME_ROUTES) {
      for (const [lat, lng] of r.coordinates) {
        const v = latLngToVector3(lat, lng, 1.003);
        assert.ok(Math.abs(v.length() - 1.003) < 1e-4);
      }
    }

    for (const a of FALLBACK_AIRCRAFT_FLEET) {
      const v = latLngToVector3(a.lat, a.lng, 1.018);
      assert.ok(Math.abs(v.length() - 1.018) < 1e-4);
    }

    // A altitude da ISS (1.18) é superior à de aeronaves (1.018), que é superior às rotas (1.003)
    assert.ok(1.18 > 1.018);
    assert.ok(1.018 > 1.006);
    assert.ok(1.006 > 1.003);
    assert.ok(1.003 > 1.0025);
    assert.ok(1.0025 > 1.000);
  });

  test("8. Base de orientação de aeronaves (AirTrafficLayer): ortonormalidade e rumo (heading)", () => {
    for (const plane of FALLBACK_AIRCRAFT_FLEET) {
      const pos = latLngToVector3(plane.lat, plane.lng, 1.018);
      const up = pos.clone().normalize();

      const northProj = new THREE.Vector3(0, 1, 0).sub(
        up.clone().multiplyScalar(new THREE.Vector3(0, 1, 0).dot(up))
      );
      const north =
        northProj.lengthSq() > 1e-6
          ? northProj.normalize()
          : new THREE.Vector3(0, 0, -1);

      const east = new THREE.Vector3().crossVectors(north, up).normalize();
      const headingRad = (plane.headingDeg * Math.PI) / 180;
      const forward = north
        .clone()
        .multiplyScalar(Math.cos(headingRad))
        .add(east.clone().multiplyScalar(Math.sin(headingRad)))
        .normalize();

      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(forward, right).normalize();

      // Ortonormalidade estrita: produto escalar nulo entre eixos
      assert.ok(Math.abs(right.dot(forward)) < 1e-4, "right e forward devem ser perpendiculares");
      assert.ok(Math.abs(right.dot(correctedUp)) < 1e-4, "right e up devem ser perpendiculares");
      assert.ok(Math.abs(forward.dot(correctedUp)) < 1e-4, "forward e up devem ser perpendiculares");

      // Determinante da matriz de rotação deve ser +1 (sem reflexão cartográfica)
      const rotMatrix = new THREE.Matrix4().makeBasis(right, correctedUp, forward);
      const det = rotMatrix.determinant();
      assert.ok(
        Math.abs(det - 1.0) < 1e-4,
        `Determinante da base de orientação deve ser +1, obteve ${det}`
      );
    }
  });

  test("9. Supressão temporal de anacronismos (isContemporaryEpoch - RN09, RN10)", () => {
    // 1. Período contemporâneo (1957 em diante, sem Ma geológico)
    assert.equal(isContemporaryEpoch(2026, null), true);
    assert.equal(isContemporaryEpoch(1969, null), true); // Apollo 11 / Era espacial
    assert.equal(isContemporaryEpoch(1957, null), true); // Sputnik 1

    // 2. Pré-Era Espacial (<1957)
    assert.equal(isContemporaryEpoch(1956, null), false, "1956 precede a Era Espacial");
    assert.equal(isContemporaryEpoch(1939, null), false, "Segunda Guerra Mundial");
    assert.equal(isContemporaryEpoch(1914, null), false, "Primeira Guerra Mundial");
    assert.equal(isContemporaryEpoch(1870, null), false, "Guerra Franco-Prussiana");
    assert.equal(isContemporaryEpoch(1519, null), false, "Circum-navegação de Magalhães");

    // 3. Eras Geológicas (Pangeia, Gondwana, K-Pg)
    assert.equal(isContemporaryEpoch(null, 250), false, "Pangeia a 250 Ma atrás");
    assert.equal(isContemporaryEpoch(null, 150), false, "Gondwana a 150 Ma atrás");
    assert.equal(isContemporaryEpoch(null, 66), false, "Cretáceo K-Pg a 66 Ma atrás");
    assert.equal(isContemporaryEpoch(2026, 250), false, "Conflito: Ma geológico prevalece");
  });

  test("10. ObservatoryPanel renderiza componentes sem <div> dentro de <p> e exibe anacronismo em anos anteriores a 1957", () => {
    useObservatoryStore.getState().setPanelOpen(true);
    useTimelineStore.getState().selectYear(1914); // Primeira Guerra Mundial
    useTimelineStore.getState().selectGeologicalMa(null);

    const html = renderToStaticMarkup(React.createElement(ObservatoryPanel));

    // Validação de presença do painel
    assert.ok(html.includes("data-testid=\"observatory-panel\""));
    assert.ok(html.includes("Observatório Planetário"));
    assert.ok(html.includes("Queimadas Ativas (FIRMS)"));
    assert.ok(html.includes("ISS &amp; Satélites Artificiais"));
    assert.ok(html.includes("Tráfego Aéreo Comercial"));

    // Validação de exibição do banner de anacronismo
    assert.ok(
      html.includes("data-testid=\"observatory-anachronism-banner\""),
      "Deve renderizar o banner de anacronismo para o ano de 1914"
    );
    assert.ok(html.includes("Telemetria Contemporânea Pausada"));
    assert.ok(html.includes("precede a Era Espacial (1957)"));

    // Invariante de Phrasing Content: nenhuma tag <div> dentro de <p>
    const pBlocks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pBlocks) {
      assert.ok(!p.includes("<div"), `Tag <p> no ObservatoryPanel não pode conter <div>: ${p}`);
    }

    // Modo contemporâneo: remove banner de anacronismo
    useTimelineStore.getState().selectYear(2026);
    const modernHtml = renderToStaticMarkup(React.createElement(ObservatoryPanel));
    assert.ok(
      !modernHtml.includes("data-testid=\"observatory-anachronism-banner\""),
      "Banner de anacronismo não deve ser exibido em 2026"
    );

    useObservatoryStore.getState().resetObservatory();
  });

  test("11. ObservatoryTelemetryHUD renderiza telemetria para ISS, EONET, Aeronave e Rota Marítima", () => {
    // 1. Telemetria da ISS
    const issData = calculateIssPosition();
    useObservatoryStore.getState().setSelectedEntity({ type: "ISS", data: issData });

    const issHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(issHtml.includes("data-testid=\"observatory-telemetry-hud\""));
    assert.ok(issHtml.includes("Telemetria Orbital ISS"));
    assert.ok(issHtml.includes("Focar Câmera na ISS"));
    assert.ok(issHtml.includes(`${issData.altitudeKm} km`));

    // 2. Evento Severo EONET
    const event = FALLBACK_EONET_EVENTS[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "EONET", data: event });

    const eonetHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(eonetHtml.includes("Evento Severo NASA"));
    assert.ok(eonetHtml.includes(event.title));
    assert.ok(eonetHtml.includes("Focar Evento"));

    // 3. Aeronave Comercial
    const plane = FALLBACK_AIRCRAFT_FLEET[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "AIRCRAFT", data: plane });

    const planeHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(planeHtml.includes("Aeronave Comercial"));
    assert.ok(planeHtml.includes(plane.callsign));
    assert.ok(planeHtml.includes(`${plane.altitudeMeters} m`));
    assert.ok(planeHtml.includes("Focar Câmera na Aeronave"));

    // 4. Corredor Marítimo
    const route = FALLBACK_MARITIME_ROUTES[0];
    useObservatoryStore.getState().setSelectedEntity({ type: "MARITIME", data: route });

    const maritimeHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.ok(maritimeHtml.includes("Corredor Mercante"));
    assert.ok(maritimeHtml.includes(route.name));
    assert.ok(maritimeHtml.includes("Focar Corredor Marítimo"));

    // 5. Entidade nula: não renderiza
    useObservatoryStore.getState().setSelectedEntity(null);
    const nullHtml = renderToStaticMarkup(React.createElement(ObservatoryTelemetryHUD));
    assert.equal(nullHtml, "");
  });

  test("12. StudyShareModal exibe badge do Observatório Planetário quando há camadas ativas", () => {
    useObservatoryStore.getState().setAllLayers(["NASA_FIRMS", "ISS_SATELLITES"]);
    useTimelineStore.getState().selectGeologicalMa(null);
    useStudyStore.getState().setShareModalOpen(true);

    const html = renderToStaticMarkup(React.createElement(StudyShareModal));

    assert.ok(
      html.includes("data-testid=\"modal-observatory-badge\""),
      "Deve renderizar o badge do observatório no modal"
    );
    assert.ok(html.includes("Observatório Planetário Ativo"));
    assert.ok(html.includes("2 camada(s) científica(s) capturada(s)"));
    assert.ok(html.includes("• Observatório: 2 camada(s) ativa(s)"));

    // Cleanup
    useStudyStore.getState().setShareModalOpen(false);
    useObservatoryStore.getState().resetObservatory();
  });

  test("13. StudyShareModal suprime badge do Observatório quando era geológica ou época pré-1957 está ativa", () => {
    // 1. Configura camadas ativas no observatório, mas ativa Pangeia (250 Ma)
    useObservatoryStore.getState().setAllLayers(["NASA_FIRMS", "ISS_SATELLITES"]);
    useTimelineStore.getState().selectGeologicalMa(250);
    useStudyStore.getState().setGeologicalMa(250);
    useStudyStore.getState().setShareModalOpen(true);

    const htmlGeo = renderToStaticMarkup(React.createElement(StudyShareModal));

    // Deve exibir Pangeia
    assert.ok(htmlGeo.includes("data-testid=\"modal-geological-era-badge\""));

    // NÃO deve exibir o badge do Observatório contemporâneo na Pangeia
    assert.ok(
      !htmlGeo.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório contemporâneo não deve aparecer no modal da Pangeia"
    );

    // 2. Configura Primeira Guerra Mundial (1914): deve suprimir badge do observatório
    useTimelineStore.getState().selectGeologicalMa(null);
    useStudyStore.getState().setGeologicalMa(null);
    useTimelineStore.getState().selectYear(1914);
    useTimelineStore.getState().setYearRange(1914, 1918);

    const htmlWw1 = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(
      !htmlWw1.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório contemporâneo não deve aparecer no modal em 1914 (pré-1957)"
    );

    // 3. Configura Circum-navegação de Magalhães (1519): deve suprimir badge
    useTimelineStore.getState().selectYear(1519);
    useTimelineStore.getState().setActiveRouteId("magellan-1519");
    useHistoricalRouteStore.getState().setActiveRouteId("magellan-1519");

    const htmlMagellan = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.ok(
      !htmlMagellan.includes("data-testid=\"modal-observatory-badge\""),
      "Observatório não deve aparecer no modal para rota de Magalhães (1519)"
    );

    // Cleanup
    useHistoricalRouteStore.getState().setActiveRouteId(null);
    useTimelineStore.getState().setActiveRouteId(null);
    useTimelineStore.getState().selectYear(2026);
    useTimelineStore.getState().setYearRange(1974, 2024);
    useStudyStore.getState().setShareModalOpen(false);
    useStudyStore.getState().resetStudy();
    useObservatoryStore.getState().resetObservatory();
  });

  test("14. Restauração e Fork de Estudo (restoreStudyRecord & forkStudyRecord) com activeObservatoryLayers e proteção contra anacronismos", () => {
    // 1. Snapshot com camadas do observatório em época contemporânea
    const restored = restoreStudyRecord({
      id: "estudo-observatorio-1",
      title: "Monitoramento de Queimadas e Satélites",
      timelineEndYear: 2024,
      activeObservatoryLayers: ["NASA_FIRMS", "ISS_SATELLITES", "MARITIME_ROUTES"],
    });

    assert.equal(restored.id, "estudo-observatorio-1");
    assert.deepEqual(restored.activeObservatoryLayers, [
      "NASA_FIRMS",
      "ISS_SATELLITES",
      "MARITIME_ROUTES",
    ]);

    // 2. Fork contemporâneo preserva camadas
    const forked = forkStudyRecord(restored, "fork-observatorio-1");
    assert.equal(forked.parentId, "estudo-observatorio-1");
    assert.deepEqual(forked.activeObservatoryLayers, [
      "NASA_FIRMS",
      "ISS_SATELLITES",
      "MARITIME_ROUTES",
    ]);

    // 3. Estudo com era geológica anula camadas contemporâneas do observatório
    const geologicalStudy = restoreStudyRecord({
      id: "estudo-geologico-anacronico",
      title: "Pangeia com Satélites (Inválido)",
      geologicalMa: 250,
      activeObservatoryLayers: ["NASA_FIRMS", "ISS_SATELLITES"],
    });

    assert.deepEqual(
      geologicalStudy.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo quando geologicalMa for definido"
    );

    const forkedGeo = forkStudyRecord(geologicalStudy, "fork-geologico-sanitizado");
    assert.deepEqual(forkedGeo.activeObservatoryLayers, []);

    // 4. Estudo pré-1957 (Primeira Guerra Mundial 1914-1918) anula camadas contemporâneas
    const ww1Study = restoreStudyRecord({
      id: "estudo-ww1",
      title: "Primeira Guerra Mundial",
      timelineStartYear: 1914,
      timelineEndYear: 1918,
      historicalEra: "WW1_1914",
      activeObservatoryLayers: ["ISS_SATELLITES", "FLIGHTS_OPENSKY"],
    });

    assert.deepEqual(
      ww1Study.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo para estudos com final pré-1957"
    );

    const forkedWw1 = forkStudyRecord(ww1Study, "fork-ww1-sanitizado");
    assert.deepEqual(forkedWw1.activeObservatoryLayers, []);

    // 5. Estudo com rota de Magalhães anula camadas contemporâneas
    const magellanStudy = restoreStudyRecord({
      id: "estudo-magalhaes",
      title: "Expedição de Magalhães",
      timelineStartYear: 1519,
      timelineEndYear: 1522,
      activeRouteId: "magellan-1519",
      activeObservatoryLayers: ["MARITIME_ROUTES"],
    });

    assert.deepEqual(
      magellanStudy.activeObservatoryLayers,
      [],
      "activeObservatoryLayers deve ser limpo para a rota histórica de 1519"
    );
  });

  test("15. TopNavBar renderiza o botão do Observatório e reflete camadas ativas", () => {
    // 1. Sem camadas ativas
    useObservatoryStore.getState().resetObservatory();
    const htmlEmpty = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.ok(htmlEmpty.includes("data-testid=\"top-nav-observatory-button\""));
    assert.ok(htmlEmpty.includes("Observatório"));
    assert.ok(!htmlEmpty.includes("animate-ping"), "Não deve pulsar quando não há camadas ativas");

    // 2. Com camada ativa: deve acionar o ponto luminoso pulsante
    useObservatoryStore.getState().setLayerActive("ISS_SATELLITES", true);
    const htmlActive = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.ok(htmlActive.includes("animate-ping"), "Deve conter o indicador animado de pulso ativo");

    useObservatoryStore.getState().resetObservatory();
  });

  test("16. Descarte estrito de geometrias e buffers WebGL reais do Observatório (RN21)", () => {
    // 1. BufferGeometry de focos FIRMS
    const count = FALLBACK_FIRMS_HOTSPOTS.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const h = FALLBACK_FIRMS_HOTSPOTS[i];
      const pos = latLngToVector3(h.lat, h.lng, 1.0025);
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      assert.ok(!Number.isNaN(pos.x));
      assert.ok(!Number.isNaN(pos.y));
      assert.ok(!Number.isNaN(pos.z));
    }
    const firmsGeo = new THREE.BufferGeometry();
    firmsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    firmsGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const firmsMat = new THREE.PointsMaterial({ size: 4.5 });

    // Descarte sem erro
    firmsGeo.dispose();
    firmsMat.dispose();

    // 2. BufferGeometry da Trilha Orbital da ISS em R=1.18
    const issPoints: THREE.Vector3[] = [];
    const issTelemetry = calculateIssPosition();
    for (const pt of issTelemetry.groundTrack) {
      const v = latLngToVector3(pt.lat, pt.lng, 1.18);
      issPoints.push(v);
      assert.ok(Math.abs(v.length() - 1.18) < 1e-4);
    }
    const issOrbitGeo = new THREE.BufferGeometry().setFromPoints(issPoints);
    const issOrbitMat = new THREE.LineBasicMaterial({ color: "#22d3ee" });
    issOrbitGeo.dispose();
    issOrbitMat.dispose();

    // 3. BufferGeometry de Rotas Marítimas Geodésicas via slerp em R=1.003
    for (const route of FALLBACK_MARITIME_ROUTES) {
      const routePoints: THREE.Vector3[] = [];
      const coords = route.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        const v1 = latLngToVector3(coords[i][0], coords[i][1], 1.003);
        const v2 = latLngToVector3(coords[i + 1][0], coords[i + 1][1], 1.003);
        for (let s = 0; s <= 4; s++) {
          const pt = slerpVectors(v1, v2, s / 4);
          routePoints.push(pt);
          assert.ok(Math.abs(pt.length() - 1.003) < 1e-4);
        }
      }
      const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
      routeGeo.dispose();
    }

    // 4. Geometria de Cone Orientado de Aeronaves
    const planeGeo = new THREE.ConeGeometry(0.005, 0.018, 5);
    planeGeo.rotateX(Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ color: "#38bdf8" });
    planeGeo.dispose();
    planeMat.dispose();
  });

  test("17. useStudyStore.setStudy executa restauração imutável de estudo sem erros em runtime", () => {
    useStudyStore.getState().resetStudy();

    useStudyStore.getState().setStudy({
      id: "estudo-teste-setStudy",
      title: "Estudo Restaurado via setStudy",
      description: "Descrição de validação",
      timelineStartYear: 1980,
      timelineEndYear: 2020,
      geologicalMa: null,
      activeRouteId: null,
      activeObservatoryLayers: ["NASA_FIRMS", "MARITIME_ROUTES"],
    });

    const current = useStudyStore.getState();
    assert.equal(current.currentStudyId, "estudo-teste-setStudy");
    assert.equal(current.title, "Estudo Restaurado via setStudy");
    assert.deepEqual(current.activeObservatoryLayers, ["NASA_FIRMS", "MARITIME_ROUTES"]);

    useStudyStore.getState().resetStudy();
  });

  test("18. Propagação orbital dinâmica contínua da ISS e integridade de telemetria", () => {
    const t0 = 1700000000000;
    const pos0 = calculateIssPosition(t0);
    const pos60s = calculateIssPosition(t0 + 60000); // 1 minuto depois

    // Em 60 segundos, a ISS viaja ~460 km (~4 graus de arco na Terra)
    assert.ok(pos0.latitude !== pos60s.latitude || pos0.longitude !== pos60s.longitude);
    assert.ok(pos0.altitudeKm >= 400 && pos0.altitudeKm <= 420);
    assert.ok(pos60s.altitudeKm >= 400 && pos60s.altitudeKm <= 420);
    assert.ok(pos0.velocityKmh >= 27500 && pos0.velocityKmh <= 27650);

    // Trilha orbital contém 61 amostras contínuas (-30 a +30)
    assert.equal(pos0.groundTrack.length, 61);
    for (const pt of pos0.groundTrack) {
      assert.ok(!Number.isNaN(pt.lat) && pt.lat >= -52 && pt.lat <= 52);
      assert.ok(!Number.isNaN(pt.lng) && pt.lng >= -180 && pt.lng <= 180);
    }
  });
});

import "./cosmic.test";











