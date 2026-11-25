/**
 * Carregador sob demanda dos Perfis Editoriais Multidisciplinares (D35 / RN13).
 *
 * Cada pacote regional em `src/data/editorial/*.json` só é baixado via `import()`
 * dinâmico quando o usuário abre o Reader Mode de um país daquele bloco, preservando
 * 0 bytes de impacto no First Load JS de `/`.
 */

import type { CountryData } from "./country-types";
import type { Locale } from "./i18n/types";
import {
  getEditorialPackId,
  type EditorialDimension,
  type EditorialPackId,
} from "./editorial-registry";

export interface EditorialSectionRecord {
  dimension: EditorialDimension;
  estimatedReadMin: number;
  titlePt: string;
  titleEn: string;
  contentPt: string;
  contentEn: string;
  primarySource: string;
  primarySourceEn?: string;
  sourceUrl: string;
  referenceDate: string;
}

export interface EditorialCountryRecord {
  isoCode: string;
  referenceDate: string;
  sections: EditorialSectionRecord[];
}

export type EditorialPackData = Record<string, EditorialCountryRecord>;

const packCache = new Map<EditorialPackId, EditorialPackData>();
const packInflight = new Map<EditorialPackId, Promise<EditorialPackData>>();

const PACK_LOADERS: Record<EditorialPackId, () => Promise<{ default: EditorialPackData }>> = {
  pilots: () => import("@/data/editorial/pilots.json") as Promise<{ default: EditorialPackData }>,
  "g20-asia-oceania": () =>
    import("@/data/editorial/g20-asia-oceania.json") as Promise<{ default: EditorialPackData }>,
  "g20-europe-northamerica": () =>
    import("@/data/editorial/g20-europe-northamerica.json") as Promise<{
      default: EditorialPackData;
    }>,
  lusophony: () =>
    import("@/data/editorial/lusophony.json") as Promise<{ default: EditorialPackData }>,
  "latin-america": () =>
    import("@/data/editorial/latin-america.json") as Promise<{ default: EditorialPackData }>,
};

export async function loadEditorialPack(packId: EditorialPackId): Promise<EditorialPackData> {
  const cached = packCache.get(packId);
  if (cached) return cached;
  const pending = packInflight.get(packId);
  if (pending) return pending;

  const promise = PACK_LOADERS[packId]()
    .then((mod) => {
      const data = mod.default;
      packCache.set(packId, data);
      return data;
    })
    .finally(() => {
      packInflight.delete(packId);
    });

  packInflight.set(packId, promise);
  return promise;
}

export function getEditorialProfileSync(
  iso: string | null | undefined
): EditorialCountryRecord | null {
  const packId = getEditorialPackId(iso);
  if (!packId || !iso) return null;
  const pack = packCache.get(packId);
  return pack ? (pack[iso.toUpperCase()] ?? null) : null;
}

export async function loadEditorialProfile(
  iso: string | null | undefined
): Promise<EditorialCountryRecord | null> {
  const packId = getEditorialPackId(iso);
  if (!packId || !iso) return null;
  const pack = await loadEditorialPack(packId);
  return pack[iso.toUpperCase()] ?? null;
}

/**
 * Converte um perfil editorial curado para `CountryData["dossierSections"]` no idioma ativo
 * (`pt-BR` ou `en`), preservando compatibilidade integral com `ReaderContent` e `CitationModal`.
 */
export function buildLocalizedDossierSections(
  country: CountryData,
  editorial: EditorialCountryRecord | null,
  locale: Locale
): CountryData["dossierSections"] {
  const isEn = locale === "en";
  if (!editorial || editorial.sections.length === 0) {
    return country.dossierSections;
  }

  const byDimension = new Map<string, CountryData["dossierSections"][number]>();

  // Base existente (ex.: pilotos em pt-BR)
  for (const sec of country.dossierSections) {
    byDimension.set(sec.dimension, sec);
  }

  // Sobrepõe ou complementa com seções curadas bilíngues do pacote editorial
  for (const rec of editorial.sections) {
    const existing = byDimension.get(rec.dimension);
    const useCuratedText = isEn || !existing || rec.contentPt.trim().length > 0;
    if (!useCuratedText && existing) continue;

    byDimension.set(rec.dimension, {
      dimension: rec.dimension,
      title: isEn ? rec.titleEn : rec.titlePt,
      contentMarkdown: isEn ? rec.contentEn : rec.contentPt,
      estimatedReadMin: rec.estimatedReadMin,
      citationsJson: {
        primarySource: isEn ? (rec.primarySourceEn || rec.primarySource) : rec.primarySource,
        sourceUrl: rec.sourceUrl,
        referenceDate: rec.referenceDate,
      },
    });
  }

  return Array.from(byDimension.values());
}

/** Apenas para isolamento em testes unitários. */
export function resetEditorialCacheForTest(): void {
  packCache.clear();
  packInflight.clear();
}
