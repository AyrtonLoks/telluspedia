export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

/** Citações de uma seção de dossiê (país ou entidade histórica): por ora, a fonte primária. */
export interface DossierCitations {
  primarySource?: string;
  sourceUrl?: string;
  referenceDate?: string;
  [extra: string]: JsonValue | undefined;
}
