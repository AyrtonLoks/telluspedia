import registrySchema from './registry.schema.json' with {type:'json'};
import snapshotSchema from './snapshot.schema.json' with {type:'json'};
import manifestSchema from './manifest.schema.json' with {type:'json'};

export const VERSION = '1.0.0';
export const SNAPSHOT_KEY = 'tellusbridge.snapshot.v1';
export const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const statesMastered = new Set(['S4', 'S5', 'S6']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonicalDate = value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const check = (condition, message) => { if (!condition) throw new Error('TellusBridge · ' + message); };

// Covers the keywords used in the three bundled schemas.
function conforms(value, schema, defs) {
  if (schema.$ref) return conforms(value, defs[schema.$ref.split('/').at(-1)], defs);
  if (schema.enum) return schema.enum.includes(value);
  if (schema.anyOf) return schema.anyOf.some(rule => conforms(value, rule, defs));
  switch (schema.type) {
    case 'null': return value === null;
    case 'string': return typeof value === 'string' && value.length >= schema.minLength &&
      (!schema.pattern || new RegExp(schema.pattern, 'u').test(value)) &&
      (schema.format !== 'date-time' || canonicalDate(value));
    case 'integer':
    case 'number': return (schema.type === 'integer' ? Number.isSafeInteger(value) : Number.isFinite(value)) &&
      value >= schema.minimum && (schema.maximum === undefined || value <= schema.maximum);
    case 'array': return Array.isArray(value) && value.length >= schema.minItems &&
      value.every(item => conforms(item, schema.items, defs));
    case 'object': return record(value) &&
      (schema.required ?? []).every(key => Object.hasOwn(value, key)) &&
      Object.entries(value).every(([key, item]) => {
        if (schema.propertyNames && !conforms(key, schema.propertyNames, defs)) return false;
        const rule = schema.properties && Object.hasOwn(schema.properties, key)
          ? schema.properties[key] : schema.additionalProperties;
        return rule === undefined || (rule !== false && conforms(item, rule, defs));
      });
    default: throw new Error('Tipo de schema não suportado');
  }
}

function schemaCheck(value, schema) {
  check(conforms(value, schema, schema.$defs), 'schema inválido para ' + schema.properties.kind.enum[0]);
}

function unique(items) { return new Set(items).size === items.length; }
function measure(nodes, proficiency) {
  let completed = 0;
  let total = 0;
  for (const node of nodes) {
    total += node.complexity;
    if (statesMastered.has(proficiency[node.id]?.state)) completed += node.complexity;
  }
  return {completed, total, ratio:total ? completed / total : null};
}

export function summarize(registry, proficiency = {}) {
  const domains = Object.fromEntries(registry.domains.map(domain => [domain.id, {
    global:measure(domain.nodes, proficiency),
    tracks:Object.fromEntries(domain.tracks.map(({id}) => [id,
      measure(domain.nodes.filter(node => node.trackId === id), proficiency)])),
    books:Object.fromEntries(domain.books.map(({id}) => [id,
      measure(domain.nodes.filter(node => node.bookIds.includes(id)), proficiency)]))
  }]));
  return {global:measure(registry.domains.flatMap(domain => domain.nodes), proficiency), domains};
}

export function validateRegistry(value) {
  schemaCheck(value, registrySchema);
  const domains = value.domains;
  check(['id','slug','catalogId'].every(key => unique(domains.map(d => d[key]))), 'domínio duplicado');
  const nodes = new Map(domains.flatMap(domain => domain.nodes.map(node => [node.id, node])));
  check(nodes.size === domains.reduce((total, domain) => total + domain.nodes.length, 0), 'nó duplicado');
  for (const domain of domains) {
    const prefix = domain.id + ':';
    const books = domain.books.map(book => book.id);
    const tracks = domain.tracks.map(track => track.id);
    check(unique(books) && unique(tracks), 'obra ou trilha duplicada em ' + domain.id);
    check(books.every(book => book.startsWith('BIB-' + domain.id.slice(4) + '-')), 'namespace de obra inválido');
    const difficulties = Object.keys(domain.difficulties);
    check(difficulties.length === 6 && difficulties.every(tag => tag.startsWith('DIF-' + domain.id.slice(4) + '-')),
      'diagnósticos inválidos em ' + domain.id);
    for (const node of domain.nodes) {
      check(node.id.startsWith(prefix) && tracks.includes(node.trackId) && unique(node.bookIds) &&
        node.bookIds.every(id => books.includes(id)), 'metadados inválidos em ' + node.id);
      check(node.prerequisites.every(id => id.startsWith(prefix)) &&
        node.crossPrerequisites.every(id => !id.startsWith(prefix)), 'namespace de pré-requisito inválido em ' + node.id);
    }
  }
  const done = new Set();
  const visiting = new Set();
  function visit(id) {
    if (done.has(id)) return;
    check(!visiting.has(id), 'ciclo curricular em ' + id);
    const node = nodes.get(id);
    check(node, 'pré-requisito ausente ' + id);
    visiting.add(id);
    const prerequisites = [...node.prerequisites, ...node.crossPrerequisites];
    check(unique(prerequisites), 'pré-requisito duplicado em ' + id);
    prerequisites.forEach(visit);
    visiting.delete(id);
    done.add(id);
  }
  nodes.forEach(node => visit(node.id));
  return value;
}

export function validateManifest(value, registry) {
  schemaCheck(value, manifestSchema);
  check(unique(value.links.map(link => link.entityId)), 'entidade duplicada');
  const nodes = new Map(registry.domains.flatMap(domain => domain.nodes.map(node => [node.id, node])));
  for (const link of value.links) {
    check(link.entityId.startsWith(link.kind + ':') && unique(link.nodeIds) && unique(link.bookIds) &&
      link.nodeIds.every(id => nodes.has(id)) && link.bookIds.every(id => link.nodeIds.some(nodeId =>
        nodes.get(nodeId).bookIds.includes(id))), 'vínculo inválido em ' + link.entityId);
  }
  return value;
}

function sameMeasures(actual, expected) {
  if (!record(actual) || Object.keys(actual).length !== Object.keys(expected).length) return false;
  return Object.entries(expected).every(([key, value]) => Object.hasOwn(actual,key) &&
    (record(value) ? sameMeasures(actual[key], value) : actual[key] === value));
}

export function validateSnapshot(value, registry) {
  schemaCheck(value, snapshotSchema);
  const nodes = registry.domains.flatMap(domain => domain.nodes.map(node => [domain, node.id]));
  check(nodes.length === Object.keys(value.proficiency).length, 'cobertura de proficiência inválida');
  for (const [domain,id] of nodes) {
    const item = value.proficiency[id];
    check(item && (item.lastDiagnosis === null || Object.hasOwn(domain.difficulties, item.lastDiagnosis)) &&
      (item.stability === null || item.stability > 0) &&
      ((item.stability === null) === (item.difficulty === null)), 'proficiência inválida em ' + id);
  }
  check(sameMeasures(value.summary, summarize(registry, value.proficiency)), 'resumo divergente da proficiência');
  const overdue = value.overdue.map(row => row.nodeId);
  check(unique(overdue) && overdue.length === nodes.filter(([,id]) => value.proficiency[id].state === 'S6').length &&
    value.overdue.every(({nodeId,dueAt}) => value.proficiency[nodeId]?.state === 'S6' &&
      value.proficiency[nodeId].nextReviewAt === dueAt && dueAt <= value.exportedAt), 'fila de revisões inválida');
  check(unique(value.suggestions.map(row => row.nodeId)) && value.suggestions.every(({nodeId,reason}) =>
    (reason === 'review' ? ['S6'] : ['S1','S2','S3']).includes(value.proficiency[nodeId]?.state)), 'sugestão inválida');
  if (value.backup) check(Object.keys(value.backup.domains).length === registry.domains.length &&
    registry.domains.every(domain => Object.hasOwn(value.backup.domains, domain.id)), 'backup incompleto');
  return value;
}

export function readSnapshot(text, registry) {
  check(new TextEncoder().encode(text).byteLength <= MAX_SNAPSHOT_BYTES, 'o snapshot excede 10 MiB');
  return validateSnapshot(JSON.parse(text), registry);
}

export function projection(snapshot) {
  const {backup, ...progress} = snapshot;
  return progress;
}

function baseUrl(base, path) {
  const url = new URL(path, base);
  check(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password, 'URL base inválida');
  return url;
}

export function labUrl(base, {slug,nodeId,trackId,entityId}) {
  const url = baseUrl(base, '/lab');
  url.searchParams.set('domain', slug);
  if (nodeId) url.searchParams.set('node', nodeId);
  if (trackId) url.searchParams.set('track', trackId);
  if (entityId) {
    url.searchParams.set('ref', 'telluspedia');
    url.searchParams.set('entity', entityId);
  }
  return url.href;
}

export function pediaUrl(base, link, {slug,nodeId}) {
  const url = baseUrl(base, link.target);
  url.searchParams.set('entity', link.entityId);
  url.searchParams.set('fromDomain', slug);
  url.searchParams.set('fromNode', nodeId);
  return url.href;
}

function paramsFor(search, keys) {
  const params = new URLSearchParams(search);
  for (const key of keys) check(params.getAll(key).length < 2, 'parâmetro repetido ' + key);
  return params;
}

export function parseLabLink(search, registry, manifest) {
  const params = paramsFor(search, ['domain','node','track','ref','entity']);
  const domain = registry.domains.find(item => item.slug === params.get('domain'));
  check(domain, 'domínio desconhecido');
  const nodeId = params.get('node');
  const trackId = params.get('track');
  const entityId = params.get('entity');
  check(!params.has('node') || domain.nodes.some(node => node.id === nodeId &&
    (!params.has('track') || node.trackId === trackId)), 'nó inválido no domínio');
  check(!params.has('track') || domain.tracks.some(track => track.id === trackId), 'trilha inválida no domínio');
  check((!params.has('entity') && !params.has('ref')) || (params.get('ref') === 'telluspedia' &&
    manifest.links.some(link => link.entityId === entityId && (!nodeId || link.nodeIds.includes(nodeId)))),
  'entidade incompatível com o nó');
  return {domain,nodeId,trackId,entityId};
}

export function parsePediaLink(search, registry, manifest) {
  const params = paramsFor(search, ['entity','fromDomain','fromNode']);
  const link = manifest.links.find(item => item.entityId === params.get('entity'));
  check(link, 'entidade desconhecida');
  if (!params.has('fromDomain') && !params.has('fromNode')) return {link,origin:null};
  const domain = registry.domains.find(item => item.slug === params.get('fromDomain'));
  const nodeId = params.get('fromNode');
  check(domain?.nodes.some(node => node.id === nodeId) && link.nodeIds.includes(nodeId), 'origem incompatível com a entidade');
  return {link,origin:{slug:domain.slug,nodeId}};
}
