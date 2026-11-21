/**
 * Cenas carregadas sob demanda (D24): o arquivo completo só é baixado quando a cena abre; o índice
 * leve (`scene-index.json`, gerado por `scripts/scenes-build-index.ts`) fica no bundle.
 * Sem dependências: lido pelo script, pelo catálogo e pelos testes.
 */
export const LAZY_SCENE_FILES = [
  "polo-1271.json",
  "gama-1497.json",
  "glo-1914.json",
  "glo-1939.json",
  "glo-1989.json",
] as const;

/** Cenas que ficam no bundle, mas com detalhes (participantes, crônica) num arquivo à parte. */
export const LAZY_DETAIL_FILES = ["glo-1969.details.json"] as const;
