export type CameraOffset = [number, number, number];

export interface ViewCamera {
  offset: CameraOffset;
  restore: CameraOffset | null;
  onChange: (() => void) | null;
}

export const DEFAULT_CAMERA_OFFSET: CameraOffset = [0, 0, 2.5];

export function parseCameraOffset(value: string | null): CameraOffset | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 3 || parts.some((part) => !/^-?\d+(?:\.\d+)?$/.test(part))) return null;
  const offset = parts.map(Number) as CameraOffset;
  const radius = Math.hypot(...offset);
  return radius >= 0.099 && radius <= 1200.01 ? offset : null;
}
