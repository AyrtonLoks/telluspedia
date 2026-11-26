import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import type { RulerWaypoint } from "./geodesic-ruler";
import type { StudyAnnotation, StudyAnnotationTone } from "./study-annotations";

export interface Studio2dRenderState {
  rulerPoints: readonly RulerWaypoint[];
  annotations: readonly StudyAnnotation[];
  pendingPinCoords: { lat: number; lng: number } | null;
  selectedAnnotationId: string | null;
}

const TONE_COLOR: Record<StudyAnnotationTone, string> = {
  accent: "#38bdd4",
  warning: "#f59e0b",
  success: "#34d399",
  danger: "#f87171",
};

/**
 * Desenha a Régua Geodésica (arcos de grande círculo projetados pelo `d3.geoPath`) e os
 * Pinos Anotados de Estudo sobre o Canvas 2D das projeções comparativas (D33 + D37).
 */
export function renderStudio2dOverlay(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  studio: Studio2dRenderState
): void {
  const { rulerPoints, annotations, pendingPinCoords, selectedAnnotationId } = studio;
  if (rulerPoints.length === 0 && annotations.length === 0 && !pendingPinCoords) return;

  const path = geoPath(projection, ctx);

  // 1. Arcos ortodrômicos da Régua Geodésica (d3.geoPath reamostra grandes círculos esféricos)
  if (rulerPoints.length >= 2) {
    const lineString: GeoJSON.LineString = {
      type: "LineString",
      coordinates: rulerPoints.map((p) => [p.lng, p.lat]),
    };
    ctx.save();
    ctx.beginPath();
    path(lineString as GeoPermissibleObjects);
    ctx.strokeStyle = "rgba(11, 17, 32, 0.75)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    path(lineString as GeoPermissibleObjects);
    ctx.strokeStyle = "#38bdd4";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < rulerPoints.length; i++) {
    const wp = rulerPoints[i]!;
    const pt = projection([wp.lng, wp.lat]);
    if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
    ctx.fillStyle =
      i === 0 ? "#34d399" : i === rulerPoints.length - 1 && rulerPoints.length > 1 ? "#f59e0b" : "#38bdd4";
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Pinos anotados do Estudo
  for (const pin of annotations) {
    const pt = projection([pin.lng, pin.lat]);
    if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
    const isSelected = selectedAnnotationId === pin.id;
    const fill = TONE_COLOR[pin.tone] ?? TONE_COLOR.accent;

    ctx.save();
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 212, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pt[0], pt[1], isSelected ? 6.2 : 5, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#0b1120";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  if (pendingPinCoords) {
    const pt = projection([pendingPinCoords.lng, pendingPinCoords.lat]);
    if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function pickStudio2dAnnotation(
  projection: GeoProjection,
  annotations: readonly StudyAnnotation[],
  x: number,
  y: number,
  hitRadiusPx: number = 10
): StudyAnnotation | null {
  let closest: StudyAnnotation | null = null;
  let bestDist = hitRadiusPx;

  for (const pin of annotations) {
    const pt = projection([pin.lng, pin.lat]);
    if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
    const dist = Math.hypot(pt[0] - x, pt[1] - y);
    if (dist <= bestDist) {
      bestDist = dist;
      closest = pin;
    }
  }
  return closest;
}

/**
 * Intercepta cliques no Canvas 2D quando a Régua Geodésica ou a marcação de Pino de Estudo
 * estiverem ativas (inclusive sobre oceanos via `projection.invert`), ou quando o usuário
 * clicar diretamente sobre um pino existente. Retorna `true` se o clique foi consumido.
 */
export function interceptStudio2dClick(
  projection: GeoProjection,
  x: number,
  y: number,
  options: {
    isRulerActive: boolean;
    isPinPlacementActive: boolean;
    annotations: readonly StudyAnnotation[];
    onAddRulerPoint: (lat: number, lng: number) => void;
    onPickPinCoords: (lat: number, lng: number) => void;
    onSelectAnnotation: (pin: StudyAnnotation) => void;
  }
): boolean {
  const inverted = projection.invert ? projection.invert([x, y]) : null;
  const validCoord =
    inverted &&
    Number.isFinite(inverted[0]) &&
    Number.isFinite(inverted[1]) &&
    Math.abs(inverted[0]) <= 180.5 &&
    Math.abs(inverted[1]) <= 90.5
      ? {
          lng: Math.max(-180, Math.min(180, inverted[0])),
          lat: Math.max(-90, Math.min(90, inverted[1])),
        }
      : null;

  if (options.isRulerActive && validCoord) {
    options.onAddRulerPoint(validCoord.lat, validCoord.lng);
    return true;
  }
  if (options.isPinPlacementActive && validCoord) {
    options.onPickPinCoords(validCoord.lat, validCoord.lng);
    return true;
  }

  const hitPin = pickStudio2dAnnotation(projection, options.annotations, x, y);
  if (hitPin) {
    options.onSelectAnnotation(hitPin);
    return true;
  }

  return false;
}

