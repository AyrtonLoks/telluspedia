import registryJson from "./contract/registry.json";
import manifestJson from "./contract/manifest.json";
import { labUrl, parsePediaLink, validateManifest, validateRegistry } from "./contract/index.mjs";
import type { CurriculumNode } from "./contract/types.mjs";
import { resolveLabEntityParam } from "./lab-compat";

export const registry = validateRegistry(registryJson);
export const manifest = validateManifest(manifestJson, registry);
export const entities = new Map(manifest.links.map(link => [link.entityId, link]));
export const nodes = new Map(registry.domains.flatMap(domain => domain.nodes.map(node => [node.id, { domain, node }] as const)));
export const books = new Map(registry.domains.flatMap(domain => domain.books.map(book => [book.id, book] as const)));

export function studyUrl(slug: string, nodeId?: CurriculumNode["id"], entityId?: string, trackId?: string) {
  const base = process.env.NEXT_PUBLIC_TELLUSLAB_URL || "http://127.0.0.1:4175";
  const compatibleEntityId = resolveLabEntityParam(entityId, nodeId);
  return labUrl(base, { slug, nodeId, entityId: compatibleEntityId, trackId });
}

export function resolveLaunch(query: URLSearchParams) {
  if (!query.has("entity")) return null;
  try {
    return parsePediaLink(query, registry, manifest);
  } catch {
    // A public entity remains accessible if the optional study origin is invalid.
    try {
      const entity = new URLSearchParams(query);
      entity.delete("fromDomain");
      entity.delete("fromNode");
      return parsePediaLink(entity, registry, manifest);
    } catch {
      return null;
    }
  }
}
