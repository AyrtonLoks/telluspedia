import type { CrossLink, CurriculumDomain, NodeId, Proficiency, TellusCrossLinkManifestV1,
  TellusDomainRegistryV1, TellusLabSnapshotV1 } from './types.mjs';

export const VERSION: '1.0.0';
export const SNAPSHOT_KEY: string;
export const MAX_SNAPSHOT_BYTES: number;
export function summarize(registry: TellusDomainRegistryV1, proficiency?: Partial<Record<NodeId, Proficiency>>): TellusLabSnapshotV1['summary'];
export function validateRegistry(value: unknown): TellusDomainRegistryV1;
export function validateManifest(value: unknown, registry: TellusDomainRegistryV1): TellusCrossLinkManifestV1;
export function validateSnapshot(value: unknown, registry: TellusDomainRegistryV1): TellusLabSnapshotV1;
export function readSnapshot(text: string, registry: TellusDomainRegistryV1): TellusLabSnapshotV1;
export function projection(snapshot: TellusLabSnapshotV1): Omit<TellusLabSnapshotV1, 'backup'>;
export function labUrl(base: string, target: {slug: string; nodeId?: NodeId; trackId?: string; entityId?: string}): string;
export function pediaUrl(base: string, link: CrossLink, origin: {slug: string; nodeId: NodeId}): string;
export function parseLabLink(search: string | URLSearchParams, registry: TellusDomainRegistryV1,
  manifest: TellusCrossLinkManifestV1): {domain: CurriculumDomain; nodeId: NodeId | null; trackId: string | null; entityId: string | null};
export function parsePediaLink(search: string | URLSearchParams, registry: TellusDomainRegistryV1,
  manifest: TellusCrossLinkManifestV1): {link: CrossLink; origin: {slug: string; nodeId: NodeId} | null};
