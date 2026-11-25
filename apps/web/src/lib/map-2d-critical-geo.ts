/**
 * Renderização 2D (`d3-geo` Canvas) das Lentes de Geografia Crítica — Milton Santos (D36).
 * Carregada apenas no chunk lazy do Mapa 2D (0 bytes no First Load JS de `/`).
 */

import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import {
  FOUR_BRAZILS_REGIONS,
  VERTICALITY_CORRIDORS,
  VERTICALITY_HUBS,
  type MtciDataset,
} from "@/lib/critical-geo-catalog";
import {
  isFourBrazilsRegionId,
  type CriticalGeoLensId,
  type FourBrazilsRegionId,
} from "@/lib/critical-geo-ids";
import type { FourBrazilsDataset } from "@/lib/four-brazils-data";
import type { CountryProperties } from "@/lib/historical-topology";
import { resolveTopologyFeatureIso } from "@/lib/map-projections";

export interface FlatMapCriticalGeoState {
  lens: CriticalGeoLensId;
  opacity: number;
  mtciDataset: MtciDataset | null;
  fourBrazilsDataset: FourBrazilsDataset | null;
  selectedRegionId: FourBrazilsRegionId | null;
  showIbgeComparison: boolean;
}

export function renderCriticalGeo2dLayer(
  ctx: CanvasRenderingContext2D,
  projection: GeoProjection,
  countryFeatures: ReadonlyArray<GeoJSON.Feature<GeoJSON.Geometry, CountryProperties>>,
  state: FlatMapCriticalGeoState
): void {
  const path = geoPath(projection, ctx);

  if (state.lens === "MTCI" && state.mtciDataset) {
    ctx.save();
    for (const feature of countryFeatures) {
      const iso = resolveTopologyFeatureIso(
        { ...feature.properties, id: feature.id ?? feature.properties?.id },
        null
      );
      if (!iso) continue;
      const entry = state.mtciDataset.entries[iso];
      if (!entry) continue;
      ctx.globalAlpha = entry.available ? state.opacity : state.opacity * 0.55;
      ctx.fillStyle = entry.color;
      ctx.beginPath();
      path(feature as GeoPermissibleObjects);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (state.lens === "FOUR_BRAZILS" && state.fourBrazilsDataset) {
    ctx.save();
    ctx.lineJoin = "round";
    for (const feature of state.fourBrazilsDataset.fourBrazils.features) {
      const id = feature.properties?.id;
      if (!isFourBrazilsRegionId(id)) continue;
      const meta = FOUR_BRAZILS_REGIONS[id];
      const isSelected = state.selectedRegionId === id;

      ctx.globalAlpha = state.selectedRegionId
        ? isSelected
          ? Math.min(1, state.opacity + 0.12)
          : state.opacity * 0.45
        : state.opacity;
      ctx.fillStyle = meta.hex;
      ctx.beginPath();
      path(feature as GeoPermissibleObjects);
      ctx.fill();

      ctx.globalAlpha = isSelected ? 0.96 : 0.7;
      ctx.strokeStyle = isSelected ? "#F8FAFC" : "#0B1120";
      ctx.lineWidth = isSelected ? 2.0 : 0.9;
      ctx.stroke();
    }

    if (state.showIbgeComparison) {
      ctx.strokeStyle = "#F8FAFC";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      for (const feature of state.fourBrazilsDataset.ibgeRegions.features) {
        ctx.beginPath();
        path(feature as GeoPermissibleObjects);
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }

  if (state.lens === "VERTICALITIES") {
    const hubById = new Map(VERTICALITY_HUBS.map((h) => [h.id, h]));
    ctx.save();
    ctx.strokeStyle = "#38BDF8";
    ctx.globalAlpha = Math.min(1, state.opacity + 0.08);
    ctx.lineWidth = 1.5;

    for (const [fromId, toId] of VERTICALITY_CORRIDORS) {
      const a = hubById.get(fromId);
      const b = hubById.get(toId);
      if (!a || !b) continue;
      const line: GeoJSON.LineString = {
        type: "LineString",
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      };
      ctx.beginPath();
      path(line as GeoPermissibleObjects);
      ctx.stroke();
    }

    ctx.fillStyle = "#7BE3F6";
    ctx.strokeStyle = "#0B1120";
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.96;
    for (const hub of VERTICALITY_HUBS) {
      const pt = projection([hub.lng, hub.lat]);
      if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}
