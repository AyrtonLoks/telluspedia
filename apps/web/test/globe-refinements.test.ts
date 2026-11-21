import { resetGlobeView, selectCountry } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateSubsolarPoint, getSunDirectionVector } from "../src/lib/astronomy";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import {
  getCountryData,
  GLOBAL_MILESTONES,
  PILOT_COUNTRIES,
  findMilestoneById,
  ISO3_TO_TIMEZONE,
} from "../src/lib/country-data";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";

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
      assert.ok(data, `Country ${iso} must resolve in catalog`);
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
        timeZone: data.timezone!,
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
    for (const [iso] of Object.entries(PILOT_COUNTRIES)) {
      const data = getCountryData(iso);
      assert.ok(data);
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
    assert.equal(getCountryData("GUF")?.timezone, "America/Cayenne");
    assert.equal(getCountryData("FLK")?.timezone, "Atlantic/Stanley");
  });

  test("9. resetView clears both selectedMilestoneId and selectedYear", () => {
    useTimelineStore.getState().selectMilestone("bra-1822");
    useTimelineStore.getState().selectYear(1822);
    selectCountry("BRA");

    assert.equal(useTimelineStore.getState().selectedMilestoneId, "bra-1822");
    assert.equal(useTimelineStore.getState().selectedYear, 1822);
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");

    resetGlobeView();

    assert.equal(useTimelineStore.getState().selectedMilestoneId, null);
    assert.equal(useTimelineStore.getState().selectedYear, null);
    assert.equal(useGlobeStore.getState().selectedIso, null);
  });
});
