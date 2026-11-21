import { resetGlobeView } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { latLngToVector3, slerpVectors } from "../src/lib/geo-spatial";
import {
  useGlobeStore,
  MIN_CAMERA_ALTITUDE,
  MAX_CAMERA_ALTITUDE,
  DEFAULT_CAMERA_ALTITUDE,
} from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";

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
    resetGlobeView();

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
