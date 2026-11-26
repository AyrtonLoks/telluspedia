import type { TransversalMilestone } from "./transversal-types";

const registeredMilestones = new Map<string, TransversalMilestone>();

export function registerTransversalMilestones(items: readonly TransversalMilestone[]): void {
  for (const item of items) {
    registeredMilestones.set(item.id, item);
  }
}

export function getRegisteredTransversalMilestone(id: string): TransversalMilestone | undefined {
  return registeredMilestones.get(id);
}
