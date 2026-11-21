import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpLeft,
  Calendar,
  Compass,
  GitFork,
  Globe2,
  Orbit,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StudyExportActions } from "@/components/study/StudyExportActions";
import { getCountryData, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { HISTORICAL_ERAS, type HistoricalEraId } from "@/lib/historical-entities";
import { formatStudyPeriod } from "@/lib/server-loaders";
import {
  buildStudiesGalleryHref,
  listStudies,
  parseStudyListQuery,
} from "@/lib/study-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galeria de Estudos Públicos — TellusPedia",
  description:
    "Explore estudos geopolíticos, históricos e cósmicos compartilhados na TellusPedia, filtre por era, país ou modo de visualização, navegue pela árvore de forks e exporte em Markdown acadêmico ou JSON.",
  openGraph: {
    title: "Galeria de Estudos Públicos — TellusPedia",
    description:
      "Descoberta de estudos imutáveis, linhagem de forks e exportação acadêmica (ABNT/APA) na TellusPedia.",
    type: "website",
    locale: "pt_BR",
    siteName: "TellusPedia",
    url: "/studies",
  },
};

interface StudiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDatePtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function StudiesGalleryPage({ searchParams }: StudiesPageProps) {
  const resolvedParams = await searchParams;
  const query = parseStudyListQuery(resolvedParams);
  const result = await listStudies(query);

  const hasActiveFilters = Boolean(
    query.q || query.era || query.country || query.cosmic !== null
  );

  const countryOptions = Object.entries(WORLD_COUNTRIES_CATALOG)
    .map(([iso, entry]) => ({ iso, name: entry.nameCommon }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const eraOptions = Object.values(HISTORICAL_ERAS);

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-2">
            <nav
              aria-label="Navegação principal"
              className="flex flex-wrap items-center gap-4 text-label text-accent"
            >
              <Link href="/" className="hover:text-accent-hover hover:underline">
                Globo 3D
              </Link>
              <Link href="/compare" className="hover:text-accent-hover hover:underline">
                Comparador
              </Link>
              <Link href="/telluslab" className="hover:text-accent-hover hover:underline">
                TellusLab
              </Link>
            </nav>
            <h1 className="text-display font-semibold text-fg">
              Galeria de Estudos Públicos
            </h1>
            <p className="max-w-2xl text-body text-fg-secondary">
              Snapshots imutáveis criados pela comunidade com recorte histórico, países selecionados, linhagem de forks e exportação acadêmica (ABNT/APA).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">
              <span className="font-mono tabular-nums">{result.pagination.total}</span>{" "}
              {result.pagination.total === 1 ? "estudo" : "estudos"}
            </Badge>
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
            >
              <Globe2 aria-hidden="true" className="size-4" />
              <span>Criar novo estudo</span>
            </Link>
          </div>
        </header>

        <section aria-label="Filtros de busca" className="mt-6">
          <form
            method="get"
            action="/studies"
            data-testid="studies-filter-form"
            className="grid grid-cols-1 gap-3 rounded-panel border border-line bg-surface p-4 shadow-e1 sm:grid-cols-2 lg:grid-cols-12"
          >
            <div className="lg:col-span-4">
              <label
                htmlFor="studies-q"
                className="mb-1 block text-caption font-medium text-fg-secondary"
              >
                Buscar por título ou descrição
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                />
                <input
                  id="studies-q"
                  name="q"
                  type="search"
                  defaultValue={query.q}
                  placeholder="Ex.: Guerra Fria, Brasil, Apolo…"
                  className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken pl-9 pr-3 text-label text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="studies-era"
                className="mb-1 block text-caption font-medium text-fg-secondary"
              >
                Era histórica
              </label>
              <select
                id="studies-era"
                name="era"
                defaultValue={query.era ?? ""}
                className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken px-3 text-label text-fg focus:border-accent focus:outline-none"
              >
                <option value="">Todas as eras</option>
                {eraOptions.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="studies-country"
                className="mb-1 block text-caption font-medium text-fg-secondary"
              >
                País incluído
              </label>
              <select
                id="studies-country"
                name="country"
                defaultValue={query.country ?? ""}
                className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken px-3 text-label text-fg focus:border-accent focus:outline-none"
              >
                <option value="">Todos os países</option>
                {countryOptions.map((item) => (
                  <option key={item.iso} value={item.iso}>
                    {item.name} ({item.iso})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="studies-cosmic"
                className="mb-1 block text-caption font-medium text-fg-secondary"
              >
                Modo
              </label>
              <select
                id="studies-cosmic"
                name="cosmic"
                defaultValue={
                  query.cosmic === true ? "true" : query.cosmic === false ? "false" : ""
                }
                className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken px-3 text-label text-fg focus:border-accent focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="false">Terrestre</option>
                <option value="true">Cósmico</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2 lg:col-span-12">
              {hasActiveFilters && (
                <Link
                  href="/studies"
                  className="inline-flex h-9 items-center rounded-control border border-line bg-surface-raised px-3.5 text-label font-medium text-fg-secondary transition-colors duration-fast ease-out hover:border-line-strong hover:text-fg"
                >
                  Limpar filtros
                </Link>
              )}
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
              >
                <Search aria-hidden="true" className="size-4" />
                <span>Filtrar estudos</span>
              </button>
            </div>
          </form>
        </section>

        {result.persistence === "memory" && (
          <div
            role="status"
            className="mt-4 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-caption text-warning"
          >
            Banco PostgreSQL indisponível neste ambiente de desenvolvimento — exibindo estudos temporários armazenados em memória.
          </div>
        )}

        {result.persistence === "unavailable" && (
          <div
            role="alert"
            className="mt-6 rounded-panel border border-danger/40 bg-danger/10 p-6 text-center"
          >
            <p className="text-title font-semibold text-fg">
              Banco de dados de estudos temporariamente indisponível
            </p>
            <p className="mt-2 text-body text-fg-secondary">
              Não foi possível consultar a galeria pública no momento. Tente atualizar a página em instantes.
            </p>
          </div>
        )}

        {result.persistence !== "unavailable" && result.items.length === 0 && (
          <div
            data-testid="studies-empty-state"
            className="mt-8 rounded-panel border border-line bg-surface p-10 text-center"
          >
            <p className="text-title font-semibold text-fg">
              Nenhum estudo encontrado para este recorte
            </p>
            <p className="mt-2 text-body text-fg-secondary">
              Ajuste os filtros acima ou abra o globo 3D para registrar um novo snapshot imutável.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasActiveFilters && (
                <Link
                  href="/studies"
                  className="inline-flex h-9 items-center rounded-control border border-line bg-surface-raised px-4 text-label font-medium text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
                >
                  Ver todos os estudos
                </Link>
              )}
              <Link
                href="/"
                className="inline-flex h-9 items-center rounded-control bg-accent px-4 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
              >
                Abrir globo 3D
              </Link>
            </div>
          </div>
        )}

        {result.items.length > 0 && (
          <section
            aria-label="Lista de estudos públicos"
            className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {result.items.map((study) => {
              const eraDef =
                study.historicalEra && Object.hasOwn(HISTORICAL_ERAS, study.historicalEra)
                  ? HISTORICAL_ERAS[study.historicalEra as HistoricalEraId]
                  : null;
              const countryLabels = study.selectedCountryIsos
                .slice(0, 4)
                .map((iso) => ({ iso, name: getCountryData(iso)?.nameCommon ?? iso }));
              const extraCountries = Math.max(0, study.selectedCountryIsos.length - 4);

              return (
                <Card
                  key={study.id}
                  data-testid="study-gallery-card"
                  className="flex flex-col justify-between gap-4 p-5"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-caption text-fg-muted tabular-nums">
                        <Calendar aria-hidden="true" className="size-3.5" />
                        {formatStudyPeriod(study)}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {study.isCosmicMode ? (
                          <Badge tone="warning">
                            <Orbit aria-hidden="true" className="size-3" />
                            <span>Cósmico</span>
                          </Badge>
                        ) : eraDef && eraDef.id !== "CONTEMPORARY" ? (
                          <Badge tone="cat-politics">
                            <Sparkles aria-hidden="true" className="size-3" />
                            <span>{eraDef.label}</span>
                          </Badge>
                        ) : (
                          <Badge tone="neutral">
                            <Compass aria-hidden="true" className="size-3" />
                            <span>Globo</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h2 className="text-title font-semibold text-fg">
                        <Link
                          href={`/study/${encodeURIComponent(study.id)}`}
                          className="transition-colors duration-fast ease-out hover:text-accent"
                        >
                          {study.title}
                        </Link>
                      </h2>
                      {study.description && (
                        <p className="mt-1.5 line-clamp-3 text-label text-fg-secondary">
                          {study.description}
                        </p>
                      )}
                    </div>

                    {countryLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {countryLabels.map((c) => (
                          <span
                            key={c.iso}
                            className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-sunken px-2 py-0.5 text-caption text-fg-secondary"
                          >
                            <span className="font-mono text-fg-muted">{c.iso}</span>
                            <span>{c.name}</span>
                          </span>
                        ))}
                        {extraCountries > 0 && (
                          <span className="inline-flex items-center rounded-control border border-line bg-surface-sunken px-2 py-0.5 font-mono text-caption text-fg-muted tabular-nums">
                            +{extraCountries}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-fg-muted">
                      {study.parentId && (
                        <Link
                          href={`/study/${encodeURIComponent(study.parentId)}`}
                          className="inline-flex max-w-full items-center gap-1 truncate text-accent hover:text-accent-hover hover:underline"
                        >
                          <ArrowUpLeft aria-hidden="true" className="size-3 shrink-0" />
                          <span className="truncate">
                            Fork de {study.parentTitle || study.parentId}
                          </span>
                        </Link>
                      )}
                      {study.forkCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-fg-secondary tabular-nums">
                          <GitFork aria-hidden="true" className="size-3" />
                          {study.forkCount} {study.forkCount === 1 ? "fork" : "forks"}
                        </span>
                      )}
                      <span className="font-mono tabular-nums">
                        {formatDatePtBr(study.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <Link
                      href={`/study/${encodeURIComponent(study.id)}`}
                      className="inline-flex h-8 items-center rounded-control bg-accent px-3 text-caption font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
                    >
                      Abrir estudo
                    </Link>
                    <StudyExportActions study={study} compact />
                  </div>
                </Card>
              );
            })}
          </section>
        )}

        {result.pagination.totalPages > 1 && (
          <nav
            aria-label="Paginação da galeria"
            className="mt-8 flex items-center justify-between border-t border-line pt-5 text-label"
          >
            {result.pagination.page > 1 ? (
              <Link
                href={buildStudiesGalleryHref({
                  ...query,
                  page: result.pagination.page - 1,
                })}
                className="inline-flex h-9 items-center rounded-control border border-line bg-surface-raised px-4 text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center rounded-control border border-line px-4 text-fg-muted opacity-50">
                ← Anterior
              </span>
            )}

            <span className="font-mono text-caption text-fg-secondary tabular-nums">
              Página {result.pagination.page} de {result.pagination.totalPages}
            </span>

            {result.pagination.page < result.pagination.totalPages ? (
              <Link
                href={buildStudiesGalleryHref({
                  ...query,
                  page: result.pagination.page + 1,
                })}
                className="inline-flex h-9 items-center rounded-control border border-line bg-surface-raised px-4 text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
              >
                Próxima →
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center rounded-control border border-line px-4 text-fg-muted opacity-50">
                Próxima →
              </span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
