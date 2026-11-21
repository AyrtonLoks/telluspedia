/**
 * Pré-carregamento sob demanda de chunks dinâmicos de painéis e modais (T25).
 *
 * Cada função dispara o `import()` do módulo correspondente apenas uma vez (cache em memória
 * da Promise pelo módulo e pelo runtime do webpack), evitando latência perceptível quando o
 * usuário passa o ponteiro ou foca o botão antes de clicar.
 */

let rightDockPromise: Promise<unknown> | null = null;
let cosmicHudPromise: Promise<unknown> | null = null;
let comparatorPromise: Promise<unknown> | null = null;
let studySharePromise: Promise<unknown> | null = null;
let readerModePromise: Promise<unknown> | null = null;
let citationModalPromise: Promise<unknown> | null = null;

export function preloadRightDock(): void {
  if (!rightDockPromise) {
    rightDockPromise = import("@/components/layout/RightDock").catch(() => {
      rightDockPromise = null;
    });
  }
}

export function preloadCosmicHud(): void {
  if (!cosmicHudPromise) {
    cosmicHudPromise = import("@/components/hud/CosmicInspectorHUD").catch(() => {
      cosmicHudPromise = null;
    });
  }
}

export function preloadCountryComparator(): void {
  if (!comparatorPromise) {
    comparatorPromise = Promise.all([
      import("@/components/comparator/CountryComparator"),
      import("@/components/comparator/ComparisonCharts"),
    ]).catch(() => {
      comparatorPromise = null;
    });
  }
}

export function preloadStudyShareModal(): void {
  if (!studySharePromise) {
    studySharePromise = import("@/components/study/StudyShareModal").catch(() => {
      studySharePromise = null;
    });
  }
}

export function preloadReaderMode(): void {
  if (!readerModePromise) {
    readerModePromise = import("@/components/reader/ReaderMode").catch(() => {
      readerModePromise = null;
    });
  }
}

export function preloadCitationModal(): void {
  if (!citationModalPromise) {
    citationModalPromise = import("@/components/reader/CitationModal").catch(() => {
      citationModalPromise = null;
    });
  }
}
