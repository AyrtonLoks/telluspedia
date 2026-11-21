import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateSubsolarPoint, getSunDirectionVector, getLunarPhase } from "../src/lib/astronomy";

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
