import { MathUtils, Vector3 } from "three";
import { dateToJulianDay } from "./astronomy";
import constellations from "./sky-constellations.json";

export const STAR_CATALOG_URL = "/data/sky/hyg-v4.1.bin";
export const IAU_CONSTELLATIONS = constellations;
export const J2000_OBLIQUITY = MathUtils.degToRad(23.4392911);
const RECORD_SIZE = 24;
const HEADER_SIZE = 12;

export interface CatalogStar {
  hip: number;
  name?: string;
  ra: number;
  dec: number;
  vMag: number;
  bv: number;
}

export function decodeHygCatalog(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_SIZE || view.getUint32(0) !== 0x48594731) {
    throw new Error("Invalid HYG1 catalog");
  }
  const count = view.getUint32(4, true);
  const visibleCount = view.getUint32(8, true);
  const namesStart = HEADER_SIZE + count * RECORD_SIZE;
  if (visibleCount > count || namesStart >= buffer.byteLength) throw new Error("Truncated HYG1 catalog");

  const names = new Uint8Array(buffer, namesStart);
  const decoder = new TextDecoder();
  const stars: CatalogStar[] = [];
  for (let i = 0; i < count; i++) {
    const offset = HEADER_SIZE + i * RECORD_SIZE;
    const nameOffset = view.getUint32(offset + 20, true);
    const end = nameOffset ? names.indexOf(0, nameOffset) : 0;
    if (end < 0) throw new Error("Invalid HYG1 name offset");

    stars.push({
      hip: view.getUint32(offset, true),
      ra: view.getFloat32(offset + 4, true),
      dec: view.getFloat32(offset + 8, true),
      vMag: view.getFloat32(offset + 12, true),
      bv: view.getFloat32(offset + 16, true),
      name: nameOffset ? decoder.decode(names.subarray(nameOffset, end)) : undefined,
    });
  }
  return { stars, visibleCount };
}

export type StarCatalog = ReturnType<typeof decodeHygCatalog>;

/** X points to RA 0h, Y to the north celestial pole and -Z to RA 6h. */
export function equatorialToVector3(ra: number, dec: number, radius = 1) {
  const raRad = MathUtils.degToRad(ra);
  const decRad = MathUtils.degToRad(dec);
  return new Vector3(
    radius * Math.cos(decRad) * Math.cos(raRad),
    radius * Math.sin(decRad),
    -radius * Math.cos(decRad) * Math.sin(raRad),
  );
}

export function greenwichSiderealAngle(date: Date) {
  const days = dateToJulianDay(date) - 2451545;
  const centuries = days / 36525;
  const degrees = 280.46061837 + 360.98564736629 * days
    + 0.000387933 * centuries ** 2 - centuries ** 3 / 38710000;
  return MathUtils.degToRad(MathUtils.euclideanModulo(degrees, 360));
}

export function bvToRgb(bv: number): [number, number, number] {
  if (!Number.isFinite(bv)) return [0.93, 0.94, 1];
  if (bv < 0) return [0.65, 0.78, 1];
  if (bv < 0.3) return [0.85, 0.91, 1];
  if (bv < 0.6) return [0.96, 0.97, 1];
  if (bv < 0.8) return [1, 0.95, 0.82];
  if (bv < 1.4) return [1, 0.78, 0.52];
  return [1, 0.55, 0.38];
}

export function starAppearance(magnitude: number) {
  const strength = MathUtils.clamp((6.5 - magnitude) / 8, 0, 1);
  return {
    diameter: 1.25 + 3.1 * strength ** 1.4,
    opacity: 0.27 + 0.73 * strength,
  };
}
