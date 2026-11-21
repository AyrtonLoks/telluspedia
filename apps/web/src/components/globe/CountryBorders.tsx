"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, InstancedInterleavedBuffer, InterleavedBufferAttribute, MathUtils, Sphere, Vector3, type Mesh, type MeshBasicMaterial, type Object3D } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { useFrame, useThree } from "@react-three/fiber";
import { useGlobeStore } from "@/stores/globeStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { findMilestoneById } from "@/lib/country-data";
import { getBaseBorderPositions, getCountryFill, getCountryOutline } from "@/lib/country-border-geometry";
import { resolveHistoricalEntity, HISTORICAL_ERAS } from "@/lib/historical-entities";
import { useEpochState } from "@/lib/epoch/useEpochState";
import {
  contemporaryTopology,
  type CountryTopology,
  loadHistoricalTopology,
  getHistoricalTopologySync,
} from "@/lib/historical-topology";
import { ChoroplethOverlay } from "./ChoroplethOverlay";

const ignoreRaycast = () => null;

function getBorderZoom(object: Object3D, cameraPosition: Vector3, center: Vector3) {
  object.getWorldPosition(center);
  return 1 - MathUtils.smoothstep(cameraPosition.distanceTo(center), 1.5, 5);
}

function makeWideLine(geometry: LineSegmentsGeometry, color: string, width: number, opacity: number, order: number) {
  const material = new LineMaterial({
    color,
    linewidth: width,
    opacity,
    transparent: true,
    // Keep the requested opacity on the rounded caps of translucent lines.
    alphaToCoverage: false,
    depthWrite: false,
  });
  const line = new LineSegments2(geometry, material);
  line.renderOrder = order;
  line.raycast = ignoreRaycast;
  return line;
}

function BaseBorders({ topology, opacity, onFadedOut }: {
  topology: CountryTopology;
  opacity: number;
  onFadedOut?: () => void;
}) {
  const line = useMemo(() => {
    const geometry = new LineSegmentsGeometry().setPositions(getBaseBorderPositions(topology));
    return makeWideLine(geometry, "#58c9ff", 1, 0, 1);
  }, [topology]);
  const center = useMemo(() => new Vector3(), []);

  useEffect(() => () => {
    line.geometry.dispose();
    line.material.dispose();
  }, [line]);

  useFrame(({ camera }, delta) => {
    const zoom = getBorderZoom(line, camera.position, center);
    line.material.linewidth = MathUtils.lerp(0.7, 1.65, zoom);
    line.material.opacity = MathUtils.damp(line.material.opacity, opacity * (0.6 + 0.4 * zoom), 5, delta);
    line.visible = line.material.opacity > 0.005;
    if (!line.visible && opacity === 0) onFadedOut?.();
  });

  return <primitive object={line} />;
}

function combinePositions(isos: ReadonlySet<string>, positionsFor: (iso: string) => Float32Array | undefined) {
  const arrays: Float32Array[] = [];
  let length = 0;
  for (const iso of isos) {
    const positions = positionsFor(iso);
    if (!positions?.length) continue;
    arrays.push(positions);
    length += positions.length;
  }
  if (!length) return null;
  if (arrays.length === 1) return arrays[0];

  const combined = new Float32Array(length);
  let offset = 0;
  for (const positions of arrays) {
    combined.set(positions, offset);
    offset += positions.length;
  }
  return combined;
}

type HighlightKind = "related" | "hover" | "selected";

type ZoomRange = readonly [far: number, near: number];

interface BorderStroke {
  color: string;
  width: ZoomRange;
  opacity: ZoomRange;
  order: number;
}

const highlightStyles = {
  related: { color: "#45a4b7", width: [0.85, 1.35], opacity: [0.43, 0.62], order: 2 },
  hover: { color: "#78b5c3", width: [1, 1.45], opacity: [0.53, 0.72], order: 3 },
  selected: { color: "#7ec9d7", width: [1.15, 1.8], opacity: [0.74, 0.86], order: 5 },
} satisfies Record<HighlightKind, BorderStroke>;

const selectionHalo: BorderStroke = {
  color: "#559eaf",
  width: [1.35, 2.65],
  opacity: [0, 0.14],
  order: 4,
};

function makeHighlightBuffer(segmentCapacity: number) {
  const geometry = new LineSegmentsGeometry();
  const buffer = new InstancedInterleavedBuffer(new Float32Array(segmentCapacity * 6), 6);
  buffer.setUsage(DynamicDrawUsage);
  geometry.setAttribute("instanceStart", new InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute("instanceEnd", new InterleavedBufferAttribute(buffer, 3, 3));
  geometry.instanceCount = 0;
  // Every cached outline is at radius 1.004. Padding the buffer needn't affect culling.
  geometry.boundingSphere = new Sphere(new Vector3(), 1.01);
  return { geometry, buffer };
}

function HighlightBorders({ positions, kind }: { positions: Float32Array | null; kind: HighlightKind }) {
  const invalidate = useThree((state) => state.invalidate);
  const resource = useRef<ReturnType<typeof makeHighlightBuffer> | null>(null);
  const { lines, center } = useMemo(() => {
    const strokes = kind === "selected" ? [selectionHalo, highlightStyles.selected] : [highlightStyles[kind]];
    const geometry = new LineSegmentsGeometry();
    geometry.instanceCount = 0;
    return {
      center: new Vector3(),
      lines: strokes.map((stroke) => {
        const line = makeWideLine(geometry, stroke.color, stroke.width[0], stroke.opacity[0], stroke.order);
        line.visible = false;
        return { stroke, line };
      }),
    };
  }, [kind]);

  useLayoutEffect(() => {
    const first = lines[0].line;
    const count = positions ? positions.length / 6 : 0;
    if (!positions || !count) {
      first.geometry.instanceCount = 0;
      for (const { line } of lines) line.visible = false;
      invalidate();
      return;
    }

    let current = resource.current;
    if (!current || count > current.buffer.count) {
      const next = makeHighlightBuffer(Math.max(64, 2 ** Math.ceil(Math.log2(count))));
      // Both selection strokes share a single buffer. Retire it once on growth.
      first.geometry.dispose();
      for (const { line } of lines) line.geometry = next.geometry;
      resource.current = current = next;
    }
    current.buffer.array.set(positions);
    current.buffer.clearUpdateRanges();
    current.buffer.addUpdateRange(0, positions.length);
    current.buffer.needsUpdate = true;
    current.geometry.instanceCount = count;
    invalidate();
  }, [positions, lines, invalidate]);

  useFrame(({ camera }) => {
    const first = lines[0].line;
    if (first.geometry.instanceCount === 0) return;
    const zoom = getBorderZoom(first, camera.position, center);
    for (const { line, stroke } of lines) {
      line.material.linewidth = MathUtils.lerp(...stroke.width, zoom);
      line.material.opacity = MathUtils.lerp(...stroke.opacity, zoom);
      line.visible = line.material.opacity > 0.005;
    }
  });

  useEffect(() => () => {
    lines[0].line.geometry.dispose();
    for (const { line } of lines) line.material.dispose();
    resource.current = null;
  }, [lines]);

  return lines.map(({ line }) => <primitive key={line.renderOrder} object={line} />);
}

function SelectedCountryFill({ positions }: { positions: Float32Array }) {
  const fill = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null);
  const center = useMemo(() => new Vector3(), []);
  const geometry = useMemo(() => {
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  }, [positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }) => {
    if (!fill.current) return;
    const zoom = getBorderZoom(fill.current, camera.position, center);
    fill.current.material.opacity = MathUtils.lerp(0.05, 0.12, zoom);
  });

  return (
    <mesh ref={fill} geometry={geometry} raycast={ignoreRaycast}>
      <meshBasicMaterial color="#3d9ca8" transparent opacity={0.05} depthWrite={false} />
    </mesh>
  );
}

function addHighlight(isos: Set<string>, iso: string | null | undefined, effectiveYear: number | null) {
  if (!iso) return;
  isos.add(iso);
  const historicalIso = resolveHistoricalEntity(iso, effectiveYear);
  if (historicalIso) isos.add(historicalIso);
}

export function CountryBorders() {
  const selectedIso = useGlobeStore((state) => state.selectedIso);
  const hoveredIso = useGlobeStore((state) => state.hoveredIso);
  const isComparatorOpen = useComparatorStore((state) => state.isOpen);
  const comparatorIsos = useComparatorStore((state) => state.selectedIsos);
  const selectedMilestoneId = useTimelineStore((state) => state.selectedMilestoneId);

  const epoch = useEpochState();
  const isGeological = epoch.mode === "GEOLOGICAL";
  const effectiveYear = epoch.effectiveYear;
  const era = HISTORICAL_ERAS[epoch.historicalEraId];
  const isHistorical = era.id !== "CONTEMPORARY";
  const [historicalTopology, setHistoricalTopology] = useState<CountryTopology | null>(
    () => era.topoJsonPath ? getHistoricalTopologySync(era.topoJsonPath) : null
  );

  useEffect(() => {
    if (!isHistorical || !era.topoJsonPath) return;

    const cached = getHistoricalTopologySync(era.topoJsonPath);
    if (cached) {
      setHistoricalTopology(cached);
      return;
    }

    let active = true;
    loadHistoricalTopology(era.topoJsonPath).then((topology) => {
      if (active && topology) setHistoricalTopology(topology);
    });
    return () => { active = false; };
  }, [isHistorical, era.topoJsonPath]);

  const topology = isHistorical && historicalTopology ? historicalTopology : contemporaryTopology;
  const selected = useMemo(() => {
    const isos = new Set<string>();
    addHighlight(isos, selectedIso, effectiveYear);
    return isos;
  }, [selectedIso, effectiveYear]);

  const selectedPositions = useMemo(
    () => isGeological ? null : combinePositions(selected, (iso) => getCountryOutline(topology, iso)),
    [isGeological, topology, selected]
  );
  const selectedFill = useMemo(
    () => isGeological ? null : combinePositions(selected, (iso) => getCountryFill(topology, iso)),
    [isGeological, topology, selected]
  );
  const hoverPositions = useMemo(() => {
    if (isGeological) return null;
    const isos = new Set<string>();
    addHighlight(isos, hoveredIso, effectiveYear);
    for (const iso of selected) isos.delete(iso);
    return combinePositions(isos, (iso) => getCountryOutline(topology, iso));
  }, [isGeological, topology, hoveredIso, effectiveYear, selected]);
  const relatedPositions = useMemo(() => {
    if (isGeological) return null;
    const isos = new Set<string>();
    if (isComparatorOpen) {
      for (const iso of comparatorIsos) addHighlight(isos, iso, effectiveYear);
    }
    const milestone = selectedMilestoneId ? findMilestoneById(selectedMilestoneId) : null;
    addHighlight(isos, milestone?.countryIso, effectiveYear);
    for (const iso of milestone?.blocIsos ?? []) addHighlight(isos, iso, effectiveYear);
    for (const iso of selected) isos.delete(iso);
    return combinePositions(isos, (iso) => getCountryOutline(topology, iso));
  }, [isGeological, topology, isComparatorOpen, comparatorIsos, selectedMilestoneId, effectiveYear, selected]);

  return (
    <group>
      <ChoroplethOverlay visible={!isHistorical && !isGeological} />
      <BaseBorders topology={contemporaryTopology} opacity={isHistorical || isGeological ? 0 : 0.46} />
      {historicalTopology && (
        <BaseBorders
          topology={historicalTopology}
          opacity={isHistorical && !isGeological ? 0.54 : 0}
          onFadedOut={isHistorical ? undefined : () => setHistoricalTopology(null)}
        />
      )}
      {selectedFill && <SelectedCountryFill positions={selectedFill} />}
      <HighlightBorders positions={relatedPositions} kind="related" />
      <HighlightBorders positions={hoverPositions} kind="hover" />
      <HighlightBorders positions={selectedPositions} kind="selected" />
    </group>
  );
}
