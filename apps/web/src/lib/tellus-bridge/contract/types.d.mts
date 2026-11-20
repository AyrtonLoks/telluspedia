export type DomainId = `DOM-${string}`;
export type NodeId = `${DomainId}:${number}.${number}`;
export type BookId = `BIB-${string}`;
export type State = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
export type Complexity = 1 | 2 | 3 | 4 | 5;
export type EntityKind = "dossier" | "country" | "event" | "era" | "figure" | "observatory";

export interface CurriculumNode {
  id: NodeId;
  title: string;
  complexity: Complexity;
  trackId: string;
  prerequisites: NodeId[];
  crossPrerequisites: NodeId[];
  modalities: string[];
  bookIds: BookId[];
}
export interface CurriculumDomain {
  id: DomainId;
  slug: string;
  name: string;
  catalogId: string;
  difficulties: Record<string, string>;
  tracks: { id: string; title: string; description: string }[];
  books: { id: BookId; title: string; authors: string[] }[];
  nodes: CurriculumNode[];
}
export interface TellusDomainRegistryV1 {
  kind: "TellusDomainRegistryV1";
  schemaVersion: "1.0.0";
  domains: CurriculumDomain[];
}
export interface Measure { completed: number; total: number; ratio: number | null }
export interface Proficiency {
  state: State;
  stability: number | null;
  difficulty: number | null;
  nextReviewAt: string | null;
  sessions: number;
  lastDiagnosis: string | null;
}
export interface TellusLabSnapshotV1 {
  kind: "TellusLabSnapshotV1";
  schemaVersion: "1.0.0";
  exportedAt: string;
  sourceApp: "telluslab";
  summary: {
    global: Measure;
    domains: Record<DomainId, { global: Measure; tracks: Record<string, Measure>; books: Record<BookId, Measure> }>;
  };
  proficiency: Record<NodeId, Proficiency>;
  overdue: { nodeId: NodeId; dueAt: string; cards: number }[];
  suggestions: { nodeId: NodeId; reason: "advance" | "review" }[];
  backup?: { prerequisiteMode: "flexible" | "strict"; domains: Record<DomainId, Record<string, unknown>> };
}
export interface CrossLink {
  entityId: string;
  kind: EntityKind;
  title: string;
  target: string;
  nodeIds: NodeId[];
  bookIds: BookId[];
}
export interface TellusCrossLinkManifestV1 {
  kind: "TellusCrossLinkManifestV1";
  schemaVersion: "1.0.0";
  links: CrossLink[];
}
