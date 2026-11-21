import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as topojson from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import {
  NUMERIC_TO_ISO,
  NAME_TO_ISO,
  GLOBAL_MILESTONES,
  PILOT_COUNTRIES,
  findMilestoneById,
} from "../src/lib/country-data";
import { useTimelineStore } from "../src/stores/timelineStore";

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
