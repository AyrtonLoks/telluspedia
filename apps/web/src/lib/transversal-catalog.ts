import { useCosmicStore } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useSceneStore } from "@/stores/sceneStore";
import { ALL_CATEGORIES, useTimelineStore } from "@/stores/timelineStore";
import { TRANSVERSAL_PERSONALITIES } from "./transversal-catalog-personalities";
import { TRANSVERSAL_THEMES } from "./transversal-catalog-themes";
import { registerTransversalMilestones } from "./transversal-milestone-registry";
import type {
  StudyTrailStep,
  TransversalEntityId,
  TransversalEntityRecord,
  TransversalMilestone,
} from "./transversal-types";

export const TRANSVERSAL_CATALOG: readonly TransversalEntityRecord[] = [
  ...TRANSVERSAL_PERSONALITIES,
  ...TRANSVERSAL_THEMES,
];

export const TRANSVERSAL_BY_ID: Readonly<Record<TransversalEntityId, TransversalEntityRecord>> =
  Object.fromEntries(TRANSVERSAL_CATALOG.map((item) => [item.id, item])) as Record<
    TransversalEntityId,
    TransversalEntityRecord
  >;

const milestoneMap = new Map<string, TransversalMilestone>();
for (const entity of TRANSVERSAL_CATALOG) {
  registerTransversalMilestones(entity.milestones);
  for (const milestone of entity.milestones) {
    if (!milestoneMap.has(milestone.id)) {
      milestoneMap.set(milestone.id, milestone);
    }
  }
}

export function getTransversalEntity(id: TransversalEntityId): TransversalEntityRecord | undefined {
  return TRANSVERSAL_BY_ID[id];
}

export function getTransversalMilestoneById(id: string): TransversalMilestone | undefined {
  return milestoneMap.get(id);
}

export function applyTransversalActivation(
  record: TransversalEntityRecord,
  shouldFly: boolean
): StudyTrailStep {
  const cosmic = useCosmicStore.getState();
  if (cosmic.isCosmicMode || cosmic.focusedBodyId) {
    cosmic.exitToEarthView();
  }
  useSceneStore.getState().closeScene({ restore: false });

  const firstMilestone = record.milestones[0];
  useTimelineStore.setState({
    geologicalMa: null,
    startYear: record.startYear,
    endYear: record.endYear,
    activeCategories: [...ALL_CATEGORIES],
    isExpanded: true,
    ...(firstMilestone
      ? { selectedYear: firstMilestone.year, selectedMilestoneId: firstMilestone.id }
      : {}),
  });

  if (shouldFly) {
    useGlobeStore
      .getState()
      .flyTo(record.defaultCamera.lat, record.defaultCamera.lng, record.defaultCamera.altitude);
  }

  return {
    key: `transversal:${record.id}`,
    kind: "transversal",
    id: record.id,
    labelPt: record.shortLabelPt,
    labelEn: record.shortLabelEn,
    year: record.startYear,
    lat: record.defaultCamera.lat,
    lng: record.defaultCamera.lng,
    altitude: record.defaultCamera.altitude,
  };
}
