"use client";

import { useEffect, useMemo, useState } from "react";
import { BufferAttribute, BufferGeometry, MathUtils, Vector3 } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { useFrame } from "@react-three/fiber";
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

const ignoreRaycast = () => null;

function makeWideLine(geometry: LineSegmentsGeometry, color: string, width: number, opacity: number, order: number) {
  const material = new LineMaterial({
    color,
    linewidth: width,
    opacity,
    transparent: true,
    // In Three r170, alpha-to-coverage replaces opacity on segment caps.
    // Restrict it to the opaque stroke and let MSAA smooth the translucent passes.
    alphaToCoverage: opacity === 1,
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
    line.getWorldPosition(center);
    const distance = camera.position.distanceTo(center);
    const zoom = 1 - MathUtils.smoothstep(distance, 1.5, 5);
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

const highlightStyles = {
  related: { color: "#22d3ee", width: 1.85, opacity: 0.76, order: 2 },
  hover: { color: "#79e9ff", width: 2.15, opacity: 0.93, order: 3 },
  selected: { color: "#b5f7ff", width: 3, opacity: 1, order: 5 },
} satisfies Record<HighlightKind, { color: string; width: number; opacity: number; order: number }>;

function HighlightBorders({ positions, kind }: { positions: Float32Array; kind: HighlightKind }) {
  const lines = useMemo(() => {
    const geometry = new LineSegmentsGeometry().setPositions(positions);
    const { color, width, opacity, order } = highlightStyles[kind];
    const border = makeWideLine(geometry, color, width, opacity, order);
    if (kind !== "selected") return [border];

    return [
      makeWideLine(geometry, "#22d3ee", 7, 0.24, order - 2),
      makeWideLine(geometry, "#22d3ee", 4.7, 0.5, order - 1),
      border,
    ];
  }, [positions, kind]);

  useEffect(() => () => {
    lines[0].geometry.dispose();
    for (const line of lines) line.material.dispose();
  }, [lines]);

  return lines.map((line) => <primitive key={line.renderOrder} object={line} />);
}

function SelectedCountryFill({ positions }: { positions: Float32Array }) {
  const geometry = useMemo(() => {
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  }, [positions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} raycast={ignoreRaycast}>
      <meshBasicMaterial color="#17d8f5" transparent opacity={0.22} depthWrite={false} />
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
      <BaseBorders topology={contemporaryTopology} opacity={isHistorical || isGeological ? 0 : 0.46} />
      {historicalTopology && (
        <BaseBorders
          topology={historicalTopology}
          opacity={isHistorical && !isGeological ? 0.54 : 0}
          onFadedOut={isHistorical ? undefined : () => setHistoricalTopology(null)}
        />
      )}
      {selectedFill && <SelectedCountryFill positions={selectedFill} />}
      {relatedPositions && <HighlightBorders positions={relatedPositions} kind="related" />}
      {hoverPositions && <HighlightBorders positions={hoverPositions} kind="hover" />}
      {selectedPositions && <HighlightBorders positions={selectedPositions} kind="selected" />}
    </group>
  );
}
