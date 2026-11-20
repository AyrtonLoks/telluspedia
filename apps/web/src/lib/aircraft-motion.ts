import { MathUtils, Vector3 } from "three";
import { latLngToVector3 } from "./geo-spatial";
import type { AircraftState } from "./observatory-data";
import { AIRCRAFT_POLL_MS } from "./aircraft-config";

const EARTH_RADIUS_METERS = 6_371_000;
const FORECAST_LIMIT_MS = AIRCRAFT_POLL_MS + 15_000;
const CORRECTION_MS = 4500;
export const TRAIL_SAMPLE_COUNT = 6;
const TRAIL_SAMPLE_MS = 12_000;

export interface AircraftTrack {
  state: AircraftState;
  timestamp: number;
  radius: number;
  origin: Vector3;
  forward: Vector3;
  position: Vector3;
  tangent: Vector3;
  correction: Vector3;
  correctionStarted: number;
  correctionRadius: number;
  trail: Vector3[];
  trailIndex: number;
  trailCount: number;
  trailUpdated: number;
}

export function aircraftHeading(lng: number, normal: Vector3, heading: number, target = new Vector3()) {
  const radians = MathUtils.degToRad(lng);
  // East follows longitude on the globe's (X, Y, -Z) map convention.
  const eastX = -Math.sin(radians);
  const eastZ = -Math.cos(radians);
  const angle = MathUtils.degToRad(heading);
  const northWeight = Math.cos(angle);
  const eastWeight = Math.sin(angle);
  return target.set(
    eastZ * normal.y * northWeight + eastX * eastWeight,
    (eastX * normal.z - eastZ * normal.x) * northWeight,
    -eastX * normal.y * northWeight + eastZ * eastWeight,
  ).normalize();
}

function setObservation(track: AircraftTrack, state: AircraftState, receivedAt: number) {
  track.state = state;
  track.timestamp = state.positionTimestamp ?? receivedAt;
  track.radius = Math.max(1.0006, 1 + state.altitudeMeters / EARTH_RADIUS_METERS);
  track.origin.copy(latLngToVector3(state.lat, state.lng));
  aircraftHeading(state.lng, track.origin, state.headingDeg, track.forward);
}

function predict(track: AircraftTrack, now: number) {
  const elapsed = MathUtils.clamp(now - track.timestamp, 0, FORECAST_LIMIT_MS) / 1000;
  const arc = elapsed * track.state.velocityMs / (track.radius * EARTH_RADIUS_METERS);
  const cos = Math.cos(arc);
  const sin = Math.sin(arc);
  track.position.copy(track.origin).multiplyScalar(cos).addScaledVector(track.forward, sin).multiplyScalar(track.radius);
  track.tangent.copy(track.forward).multiplyScalar(cos).addScaledVector(track.origin, -sin);
}

export function advanceAircraft(track: AircraftTrack, now: number) {
  predict(track, now);
  const blend = 1 - MathUtils.smoothstep(now - track.correctionStarted, 0, CORRECTION_MS);
  if (blend > 0) {
    track.position.addScaledVector(track.correction, blend)
      .setLength(Math.max(1.0006, track.radius + track.correctionRadius * blend));
  }
}

export function updateAircraft(previous: AircraftTrack | undefined, state: AircraftState, now: number): AircraftTrack {
  if (previous) {
    if (state.positionTimestamp != null && state.positionTimestamp < previous.timestamp) return previous;
    if (
      state.positionTimestamp === previous.state.positionTimestamp &&
      state.lat === previous.state.lat && state.lng === previous.state.lng &&
      state.altitudeMeters === previous.state.altitudeMeters &&
      state.velocityMs === previous.state.velocityMs && state.headingDeg === previous.state.headingDeg
    ) {
      previous.state = state;
      return previous;
    }

    advanceAircraft(previous, now);
    const positionBeforeUpdate = previous.position.clone();
    setObservation(previous, state, now);
    predict(previous, now);
    previous.correction.copy(positionBeforeUpdate).sub(previous.position);
    previous.correctionStarted = now;
    previous.correctionRadius = positionBeforeUpdate.length() - previous.radius;
    return previous;
  }

  const track: AircraftTrack = {
    state, timestamp: now, radius: 1, origin: new Vector3(), forward: new Vector3(),
    position: new Vector3(), tangent: new Vector3(), correction: new Vector3(), correctionStarted: 0, correctionRadius: 0,
    trail: Array.from({ length: TRAIL_SAMPLE_COUNT }, () => new Vector3()),
    trailIndex: -1, trailCount: 0, trailUpdated: -Infinity,
  };
  setObservation(track, state, now);
  return track;
}

export function sampleAircraftTrail(track: AircraftTrack, now: number) {
  if (now - track.trailUpdated < TRAIL_SAMPLE_MS || now - track.timestamp > FORECAST_LIMIT_MS) return;
  track.trailIndex = (track.trailIndex + 1) % TRAIL_SAMPLE_COUNT;
  track.trail[track.trailIndex].copy(track.position);
  track.trailUpdated = now;
  track.trailCount = Math.min(track.trailCount + 1, TRAIL_SAMPLE_COUNT);
}
