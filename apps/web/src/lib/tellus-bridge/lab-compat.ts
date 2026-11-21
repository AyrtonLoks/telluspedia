/**
 * Espelho dos pares (entityId -> nodeIds) já sincronizados no repositório do TellusLab
 * (versão base de 31 vínculos antes da expansão D26).
 *
 * O `parseLabLink` do TellusLab rejeita o deep-link inteiro (e cai na tela padrão de Matemática)
 * quando recebe `ref=telluspedia&entity=<id>` para um par que ainda não existe na cópia local
 * de `manifest.json` do TellusLab. Omitir `ref`/`entity` nesses vínculos novos preserva o
 * deep-link `/lab?domain=<slug>&node=<nodeId>`, que abre diretamente o domínio e macrotema corretos
 * porque todos os 299 nós já existem no `registry.json` do TellusLab.
 *
 * Quando o TellusLab sincronizar o manifesto expandido (`npm run bridge:sync`), basta definir
 * `NEXT_PUBLIC_TELLUSBRIDGE_LAB_SYNCED=true` (ou atualizar este mapa) para reativar o retorno
 * contextual `ref=telluspedia&entity=...` em todos os 73 vínculos.
 */
export const TELLUSLAB_SYNCED_ENTITY_NODES: Readonly<Record<string, readonly string[]>> = {
  "dossier:astronomia-optica": [
    "DOM-PHYS:2.4",
    "DOM-PHYS:6.2",
    "DOM-PHYS:6.3",
    "DOM-PHYS:6.4",
    "DOM-PHYS:6.5",
    "DOM-PHYS:6.6",
    "DOM-PHYS:7.1",
    "DOM-PHYS:7.2",
    "DOM-PHYS:7.3",
    "DOM-ENG:6.1",
    "DOM-ENG:6.2",
    "DOM-ENG:6.3",
    "DOM-ENG:6.4",
    "DOM-ENG:7.1",
    "DOM-ENG:7.2",
    "DOM-ENG:7.3",
    "DOM-ENG:7.4"
  ],
  "dossier:industria-energia-transporte": [
    "DOM-ENG:2.1",
    "DOM-ENG:2.2",
    "DOM-ENG:2.3",
    "DOM-ENG:2.4",
    "DOM-ENG:3.1",
    "DOM-ENG:3.2",
    "DOM-ENG:3.3",
    "DOM-ENG:3.4",
    "DOM-ENG:4.1",
    "DOM-ENG:4.2",
    "DOM-ENG:4.3",
    "DOM-ENG:4.4",
    "DOM-ENG:5.1",
    "DOM-ENG:5.2",
    "DOM-ENG:5.3",
    "DOM-PHYS:3.3",
    "DOM-PHYS:3.4",
    "DOM-PHYS:3.5",
    "DOM-PHYS:3.6"
  ],
  "dossier:sistemas-monetarios": [
    "DOM-ECON:2.2",
    "DOM-ECON:2.3",
    "DOM-ECON:2.4",
    "DOM-ECON:2.5",
    "DOM-ECON:3.1",
    "DOM-ECON:3.2",
    "DOM-ECON:3.3",
    "DOM-ECON:3.4",
    "DOM-ECON:7.2",
    "DOM-ECON:7.3",
    "DOM-ECON:7.4",
    "DOM-ECON:8.1",
    "DOM-ECON:8.2",
    "DOM-ECON:8.3",
    "DOM-ECON:8.4"
  ],
  "dossier:computacao": [
    "DOM-PROG:1.1",
    "DOM-PROG:1.2",
    "DOM-PROG:1.3",
    "DOM-PROG:1.4",
    "DOM-PROG:1.5",
    "DOM-PROG:2.1",
    "DOM-PROG:2.2",
    "DOM-PROG:2.3",
    "DOM-PROG:2.4",
    "DOM-PROG:2.5",
    "DOM-PROG:2.6",
    "DOM-PROG:3.1",
    "DOM-PROG:3.2",
    "DOM-PROG:3.3",
    "DOM-PROG:3.4",
    "DOM-PROG:3.5",
    "DOM-PROG:3.6",
    "DOM-PROG:4.1",
    "DOM-PROG:4.2",
    "DOM-PROG:4.3",
    "DOM-PROG:4.4",
    "DOM-PROG:4.5",
    "DOM-PROG:5.1",
    "DOM-PROG:5.2",
    "DOM-PROG:5.3",
    "DOM-PROG:5.4",
    "DOM-PROG:6.1",
    "DOM-PROG:6.2",
    "DOM-PROG:6.3",
    "DOM-PROG:6.4",
    "DOM-PROG:7.1",
    "DOM-PROG:7.2",
    "DOM-PROG:7.3",
    "DOM-PROG:7.4",
    "DOM-PROG:7.5",
    "DOM-PROG:7.6",
    "DOM-PROG:8.1",
    "DOM-PROG:8.2",
    "DOM-PROG:8.3",
    "DOM-PROG:8.4",
    "DOM-PROG:8.5",
    "DOM-PROG:8.6",
    "DOM-PROG:8.7",
    "DOM-PROG:8.8",
    "DOM-PROG:9.1",
    "DOM-PROG:9.2",
    "DOM-PROG:9.3",
    "DOM-PROG:9.4",
    "DOM-PROG:9.5",
    "DOM-MATH:2.1",
    "DOM-MATH:2.2",
    "DOM-MATH:2.3",
    "DOM-MATH:2.4",
    "DOM-MATH:2.5",
    "DOM-MATH:6.1",
    "DOM-MATH:6.2",
    "DOM-MATH:6.3",
    "DOM-MATH:6.4",
    "DOM-MATH:6.5",
    "DOM-MATH:6.6",
    "DOM-MATH:6.7",
    "DOM-MATH:7.1",
    "DOM-MATH:7.2",
    "DOM-MATH:7.3",
    "DOM-MATH:7.4",
    "DOM-MATH:7.5",
    "DOM-MATH:7.6",
    "DOM-MATH:7.7",
    "DOM-MATH:7.8",
    "DOM-MATH:7.9",
    "DOM-MATH:7.10",
    "DOM-MATH:7.11",
    "DOM-HUM:3.2",
    "DOM-HUM:3.3"
  ],
  "dossier:historia-e-filosofia": [
    "DOM-HUM:2.1",
    "DOM-HUM:2.2",
    "DOM-HUM:2.3",
    "DOM-HUM:2.4",
    "DOM-HUM:3.1",
    "DOM-HUM:3.2",
    "DOM-HUM:3.3",
    "DOM-HUM:3.4",
    "DOM-HUM:4.1",
    "DOM-HUM:4.2",
    "DOM-HUM:4.3",
    "DOM-HUM:4.4",
    "DOM-HUM:4.5",
    "DOM-HUM:5.1",
    "DOM-HUM:5.2",
    "DOM-HUM:5.3",
    "DOM-HUM:5.4",
    "DOM-HUM:5.5",
    "DOM-HUM:6.1",
    "DOM-HUM:6.2",
    "DOM-HUM:6.3",
    "DOM-HUM:6.4",
    "DOM-HUM:6.5",
    "DOM-HUM:7.1",
    "DOM-HUM:7.2",
    "DOM-HUM:7.3",
    "DOM-HUM:7.4",
    "DOM-HUM:7.5"
  ],
  "dossier:literaturas": [
    "DOM-LIT:1.1",
    "DOM-LIT:2.1",
    "DOM-LIT:2.2",
    "DOM-LIT:2.3",
    "DOM-LIT:2.4",
    "DOM-LIT:3.1",
    "DOM-LIT:3.2",
    "DOM-LIT:3.3",
    "DOM-LIT:4.1",
    "DOM-LIT:4.2",
    "DOM-LIT:4.3",
    "DOM-LIT:5.1",
    "DOM-LIT:5.2",
    "DOM-LIT:5.3",
    "DOM-LIT:6.1",
    "DOM-LIT:6.2"
  ],
  "dossier:idiomas": [
    "DOM-LANG:1.1",
    "DOM-LANG:1.2",
    "DOM-LANG:1.3",
    "DOM-LANG:2.1",
    "DOM-LANG:2.2",
    "DOM-LANG:2.3",
    "DOM-LANG:3.1",
    "DOM-LANG:3.2",
    "DOM-LANG:3.3",
    "DOM-LANG:4.1",
    "DOM-LANG:4.2",
    "DOM-LANG:4.3",
    "DOM-LANG:5.1"
  ],
  "country:BRA": [
    "DOM-HUM:6.4",
    "DOM-HUM:6.5",
    "DOM-LIT:2.2",
    "DOM-LIT:2.3",
    "DOM-LIT:2.4",
    "DOM-LIT:3.2",
    "DOM-LIT:3.3",
    "DOM-LIT:4.1",
    "DOM-LIT:4.2",
    "DOM-LIT:4.3",
    "DOM-LIT:5.1",
    "DOM-LIT:5.2",
    "DOM-LIT:5.3",
    "DOM-LIT:6.2"
  ],
  "country:PRT": [
    "DOM-LIT:1.1",
    "DOM-LIT:2.1",
    "DOM-LIT:3.1",
    "DOM-LANG:5.1"
  ],
  "country:FRA": [
    "DOM-LIT:3.1",
    "DOM-HUM:4.5",
    "DOM-HUM:6.1"
  ],
  "country:MOZ": [
    "DOM-LIT:6.1"
  ],
  "country:JPN": [
    "DOM-LANG:4.1",
    "DOM-LANG:4.2",
    "DOM-LANG:4.3"
  ],
  "event:glo-2021": [
    "DOM-PHYS:2.4",
    "DOM-PHYS:6.2",
    "DOM-PHYS:6.3",
    "DOM-PHYS:6.4",
    "DOM-PHYS:6.5",
    "DOM-PHYS:6.6",
    "DOM-PHYS:7.1",
    "DOM-PHYS:7.2",
    "DOM-PHYS:7.3",
    "DOM-ENG:6.1",
    "DOM-ENG:6.2",
    "DOM-ENG:6.3",
    "DOM-ENG:6.4",
    "DOM-ENG:7.1",
    "DOM-ENG:7.2",
    "DOM-ENG:7.3",
    "DOM-ENG:7.4"
  ],
  "event:glo-1969": [
    "DOM-PHYS:2.4",
    "DOM-ENG:3.3",
    "DOM-ENG:5.2",
    "DOM-ENG:5.3"
  ],
  "event:usa-1969": [
    "DOM-PHYS:2.4",
    "DOM-ENG:3.3",
    "DOM-ENG:5.2",
    "DOM-ENG:5.3"
  ],
  "event:glo-1973": [
    "DOM-ENG:2.1",
    "DOM-ENG:2.2",
    "DOM-ENG:2.3",
    "DOM-ENG:2.4",
    "DOM-ENG:3.1",
    "DOM-ENG:3.2",
    "DOM-ENG:3.3",
    "DOM-ENG:3.4",
    "DOM-ENG:4.1",
    "DOM-ENG:4.2",
    "DOM-ENG:4.3",
    "DOM-ENG:4.4",
    "DOM-ENG:5.1",
    "DOM-ENG:5.2",
    "DOM-ENG:5.3",
    "DOM-PHYS:3.3",
    "DOM-PHYS:3.4",
    "DOM-PHYS:3.5",
    "DOM-PHYS:3.6",
    "DOM-ECON:2.2",
    "DOM-ECON:2.3"
  ],
  "event:glo-2008": [
    "DOM-ECON:2.2",
    "DOM-ECON:2.3",
    "DOM-ECON:2.4",
    "DOM-ECON:2.5",
    "DOM-ECON:3.1",
    "DOM-ECON:3.2",
    "DOM-ECON:3.3",
    "DOM-ECON:3.4",
    "DOM-ECON:7.2",
    "DOM-ECON:7.3",
    "DOM-ECON:7.4",
    "DOM-ECON:8.1",
    "DOM-ECON:8.2",
    "DOM-ECON:8.3",
    "DOM-ECON:8.4"
  ],
  "event:glo-1991": [
    "DOM-PROG:6.4",
    "DOM-PROG:8.1",
    "DOM-PROG:8.2",
    "DOM-PROG:8.3",
    "DOM-PROG:8.4",
    "DOM-PROG:8.5",
    "DOM-PROG:8.6",
    "DOM-PROG:8.7",
    "DOM-PROG:8.8",
    "DOM-HUM:3.3",
    "DOM-LANG:3.3"
  ],
  "event:jpn-1964": [
    "DOM-ENG:2.2",
    "DOM-ENG:4.1",
    "DOM-ENG:4.4",
    "DOM-ENG:5.3"
  ],
  "event:bra-1822": [
    "DOM-HUM:6.4",
    "DOM-HUM:6.5",
    "DOM-LIT:2.2",
    "DOM-LIT:2.3",
    "DOM-LIT:2.4",
    "DOM-LIT:3.2",
    "DOM-LIT:3.3",
    "DOM-LIT:4.1",
    "DOM-LIT:4.2",
    "DOM-LIT:4.3",
    "DOM-LIT:5.1",
    "DOM-LIT:5.2",
    "DOM-LIT:5.3",
    "DOM-LIT:6.2"
  ],
  "event:bra-1889": [
    "DOM-HUM:6.4",
    "DOM-HUM:6.5",
    "DOM-LIT:2.2",
    "DOM-LIT:2.3",
    "DOM-LIT:2.4",
    "DOM-LIT:3.2",
    "DOM-LIT:3.3",
    "DOM-LIT:4.1",
    "DOM-LIT:4.2",
    "DOM-LIT:4.3",
    "DOM-LIT:5.1",
    "DOM-LIT:5.2",
    "DOM-LIT:5.3",
    "DOM-LIT:6.2"
  ],
  "event:magellan-1519": [
    "DOM-LIT:1.1",
    "DOM-LIT:2.1",
    "DOM-LIT:3.1",
    "DOM-LANG:5.1"
  ],
  "era:COLD_WAR": [
    "DOM-HUM:4.1",
    "DOM-HUM:4.2",
    "DOM-HUM:4.4",
    "DOM-PHYS:2.4",
    "DOM-ECON:2.3"
  ],
  "figure:dom-pedro-ii": [
    "DOM-HUM:6.4",
    "DOM-LIT:2.3",
    "DOM-LIT:3.2"
  ],
  "figure:luis-de-camoes": [
    "DOM-LIT:1.1",
    "DOM-LIT:2.1",
    "DOM-LIT:3.1",
    "DOM-LANG:5.1"
  ],
  "observatory:COSMOS": [
    "DOM-PHYS:2.4",
    "DOM-PHYS:6.2",
    "DOM-PHYS:6.3",
    "DOM-PHYS:6.4",
    "DOM-PHYS:6.5",
    "DOM-PHYS:6.6",
    "DOM-PHYS:7.1",
    "DOM-PHYS:7.2",
    "DOM-PHYS:7.3",
    "DOM-ENG:6.1",
    "DOM-ENG:6.2",
    "DOM-ENG:6.3",
    "DOM-ENG:6.4",
    "DOM-ENG:7.1",
    "DOM-ENG:7.2",
    "DOM-ENG:7.3",
    "DOM-ENG:7.4"
  ],
  "observatory:ISS_SATELLITES": [
    "DOM-PHYS:2.4",
    "DOM-ENG:5.2",
    "DOM-ENG:5.3"
  ],
  "observatory:FLIGHTS_OPENSKY": [
    "DOM-ENG:2.2",
    "DOM-ENG:3.3",
    "DOM-ENG:5.3",
    "DOM-LANG:3.3"
  ],
  "observatory:MARITIME_ROUTES": [
    "DOM-ECON:2.3",
    "DOM-ENG:2.1",
    "DOM-ENG:2.3"
  ],
  "observatory:NASA_FIRMS": [
    "DOM-PHYS:3.3",
    "DOM-PHYS:4.7",
    "DOM-ENG:5.2"
  ],
  "observatory:NASA_EONET": [
    "DOM-MATH:7.1",
    "DOM-MATH:7.8",
    "DOM-ENG:5.2"
  ]
};

const syncedSets = new Map<string, ReadonlySet<string>>(
  Object.entries(TELLUSLAB_SYNCED_ENTITY_NODES).map(([entityId, nodeIds]) => [
    entityId,
    new Set(nodeIds),
  ])
);

export function isTellusLabSyncedPair(entityId: string, nodeId?: string): boolean {
  const allowedNodes = syncedSets.get(entityId);
  if (!allowedNodes) return false;
  return nodeId ? allowedNodes.has(nodeId) : true;
}

export function resolveLabEntityParam(
  entityId: string | undefined,
  nodeId?: string
): string | undefined {
  if (!entityId) return undefined;
  if (process.env.NEXT_PUBLIC_TELLUSBRIDGE_LAB_SYNCED === "true") {
    return entityId;
  }
  return isTellusLabSyncedPair(entityId, nodeId) ? entityId : undefined;
}
