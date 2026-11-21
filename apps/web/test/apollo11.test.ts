import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import { useTimelineStore } from "../src/stores/timelineStore";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createApollo11TrajectoryCurve,
  CAPE_CANAVERAL_COORDS,
  TRANQUILITY_BASE_COORDS,
  getMissionTelemetry,
  selenographicToVector3,
  MOON_DEFAULT_POSITION,
  MOON_RADIUS_UNITS,
} from "../src/lib/apollo11";
import { useSceneStore } from "../src/stores/sceneStore";
import { ScenePlayerOverlay } from "../src/components/scenes/ScenePlayerOverlay";

// D12c: os painéis por evento foram substituídos pelo painel genérico do player de cenas.
const Apollo11TelemetryOverlay: React.FC = () => React.createElement(ScenePlayerOverlay);

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

  test("store único de cenas controla reprodução, barra e salto para as fases da missão", () => {
    const scenes = useSceneStore.getState();
    scenes.closeScene();
    assert.equal(scenes.openScene("glo-1969"), true);
    assert.equal(useSceneStore.getState().progress, 0.15, "abre no progresso inicial dos dados");
    assert.equal(useSceneStore.getState().isPlaying, true);

    // Fase 2 (TLI) e fase 4 (pouso): início vindo dos fatos da fase
    useSceneStore.getState().jumpToStep(1);
    assert.equal(useSceneStore.getState().progress, 0.2);
    useSceneStore.getState().jumpToStep(3);
    assert.equal(useSceneStore.getState().progress, 0.82);
    assert.equal(useSceneStore.getState().stepIndex, 3);

    useSceneStore.getState().play();
    useSceneStore.getState().togglePlay();
    assert.equal(useSceneStore.getState().isPlaying, false);

    useSceneStore.getState().seek(-0.5);
    assert.equal(useSceneStore.getState().progress, 0.0);
    useSceneStore.getState().seek(1.5);
    assert.equal(useSceneStore.getState().progress, 1.0);

    useSceneStore.getState().reset();
    assert.equal(useSceneStore.getState().progress, 0.0);
    useSceneStore.getState().closeScene();
    assert.equal(useSceneStore.getState().activeSceneId, null);
  });

  test("Apollo11TelemetryOverlay renders only when an Apollo milestone is explicitly active (never by year alone — T12)", () => {
    // Inactive state: Year 2024, no milestone
    useTimelineStore.getState().selectYear(2024);
    useTimelineStore.getState().selectMilestone(null);
    let html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.equal(html, "", "Overlay should return null when Apollo 11 is inactive");

    // T12: o ano 1969 sozinho (ex.: playback da timeline) NÃO ativa a cena
    useTimelineStore.getState().selectYear(1969);
    useTimelineStore.getState().selectMilestone(null);
    html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.equal(html, "", "Year 1969 alone must not activate the Apollo 11 scene");

    // Active state via explicit milestone selection
    useTimelineStore.getState().selectMilestone("glo-1969");
    html = renderToStaticMarkup(React.createElement(Apollo11TelemetryOverlay));
    assert.ok(html.includes("data-scene-player-overlay=\"true\""), "Should render HUD container");
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
