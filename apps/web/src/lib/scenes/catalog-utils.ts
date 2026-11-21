/** Ano inteiro do início de uma cena (sem dependências, usável no cliente e no schema). */
export function sceneStartYear(scene: { date: { start: string } }): number {
  return parseInt(scene.date.start, 10);
}
