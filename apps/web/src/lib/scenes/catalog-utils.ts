/** Ano inteiro do início de uma cena (sem dependências, usável no cliente e no schema). */
export function sceneStartYear(scene: { date: { start: string } }): number {
  return parseInt(scene.date.start, 10);
}

/**
 * Campos pesados de uma cena (D24): ficam fora do bundle inicial e chegam por `import()` quando a
 * cena abre (o HUD, os fatos e o subtítulo também: só servem com a cena aberta). Todo o resto (título,
 * data, local, câmera, fontes…) entra no índice leve, que
 * basta para a linha do tempo, a busca, os links e para saber se a cena é tocável.
 */
export const HEAVY_SCENE_FIELDS = ["trajectories", "pointsOfInterest", "participants", "chronicle", "media", "dossierMarkdown", "hud", "facts", "subtitle"] as const;

export type TrajectoryKind = "surface" | "cislunar";

/** Entrada do índice leve: a cena sem os campos pesados, mais os tipos das suas trajetórias. */
export function sceneIndexEntry(raw: Record<string, unknown>): Record<string, unknown> & { trajectoryKinds: TrajectoryKind[] } {
  const entry: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) if (!(HEAVY_SCENE_FIELDS as readonly string[]).includes(k)) entry[k] = v;
  // Só a primeira fonte (a da linha do tempo); as demais chegam com a cena, que é quando o painel as mostra.
  if (Array.isArray(raw.sources)) entry.sources = raw.sources.slice(0, 1);
  const trajectories = (raw.trajectories as Array<{ kind: TrajectoryKind }> | undefined) ?? [];
  return { ...entry, trajectoryKinds: trajectories.map((t) => t.kind) };
}
