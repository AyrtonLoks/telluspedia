"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { manifest, nodes, registry, studyUrl } from "@/lib/tellus-bridge/catalog";
import { MAX_SNAPSHOT_BYTES, summarize } from "@/lib/tellus-bridge/contract/index.mjs";
import { importStudySnapshot, useStudySnapshot } from "@/lib/tellus-bridge/snapshot";
import { Panel } from "@/components/ui/Panel";
import { LocaleToggleButton } from "@/components/nav/LocaleToggleButton";
import { useI18n } from "@/lib/i18n/useT";

const emptySummary = summarize(registry);

export function StudyHub() {
  const { locale, t, tRaw } = useI18n();
  const snapshot = useStudySnapshot();
  const summary = snapshot?.summary ?? emptySummary;
  const [status, setStatus] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const workCount = registry.domains.reduce((count, domain) => count + domain.books.length, 0);

  const percent = useMemo(
    () => (value: number) => new Intl.NumberFormat(locale, { style: "percent" }).format(value),
    [locale]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: locale === "en" ? "UTC" : "America/Sao_Paulo",
      }),
    [locale]
  );

  async function load(file?: File) {
    if (!file) return;
    setSelectedFileName(file.name);
    try {
      if (file.size > MAX_SNAPSHOT_BYTES) {
        throw new Error(t("telluslab.errExceedsLimit", "O snapshot excede 10 MiB."));
      }
      const { persistent, active } = importStudySnapshot(await file.text());
      setStatus(
        !active
          ? t(
              "telluslab.statusNewerExists",
              "Importado. O navegador já recebeu uma atualização mais recente do TellusLab."
            )
          : persistent
            ? t("telluslab.statusPersistent", "Progresso importado neste navegador.")
            : t("telluslab.statusSession", "Progresso importado para esta sessão.")
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : t("telluslab.errImportFailed", "Não foi possível importar o snapshot.")
      );
    }
  }

  const worksLabel = t("telluslab.works", "obras");
  const macrotopicsLabel = t("telluslab.macrotopics", "macrotemas");
  const domainsLabel = t("telluslab.domains", "domínios");
  const dossiersHeading = t("telluslab.dossiersHeading", "Dossiês e figuras históricas");

  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-label text-accent hover:text-accent-hover hover:underline">
            {t("telluslab.backToGlobe", "← Globo TellusPedia")}
          </Link>
          <LocaleToggleButton />
        </div>
        <header className="space-y-3">
          <h1 className="font-serif text-display font-semibold text-fg">TellusLab Hub</h1>
          <p className="text-body text-fg-secondary">
            {registry.domains.length} {domainsLabel} · {workCount} {worksLabel} · {nodes.size}{" "}
            {macrotopicsLabel}
          </p>
        </header>
        <Panel as="section" className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-title font-semibold text-fg">
              {t("telluslab.progressTitle", "Progresso por complexidade")}
            </h2>
            <p className="font-mono text-display font-semibold tabular-nums text-accent">
              {percent(summary.global.ratio ?? 0)}
            </p>
            {snapshot && (
              <p className="text-caption text-fg-muted">
                {t("telluslab.updatedOn", "Atualizado em")}{" "}
                {dateFormatter.format(new Date(snapshot.exportedAt))}
              </p>
            )}
          </div>
          <div className="space-y-2 text-label">
            <label className="block font-semibold text-fg" htmlFor="study-import">
              {t("telluslab.importLabel", "Importar snapshot JSON")}
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                id="study-import"
                className="sr-only"
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void load(file);
                }}
              />
              <label
                htmlFor="study-import"
                className="inline-flex cursor-pointer items-center rounded-control border border-line-strong bg-surface-raised px-3 py-1.5 text-label font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover"
              >
                {t("telluslab.chooseFile", "Escolher arquivo JSON")}
              </label>
              <span className="truncate text-caption text-fg-secondary">
                {selectedFileName || t("telluslab.noFileSelected", "Nenhum arquivo escolhido")}
              </span>
            </div>
            <p className="text-caption text-fg-muted">
              {snapshot
                ? t(
                    "telluslab.importHintUpdate",
                    "Exporte uma atualização no TellusLab para atualizar este painel."
                  )
                : t(
                    "telluslab.importHintEmpty",
                    "Importe o arquivo global exportado pelo TellusLab para acompanhar seus estudos."
                  )}
            </p>
            <p role="status" className="text-caption text-accent">
              {status}
            </p>
          </div>
        </Panel>
        <section className="grid gap-4 sm:grid-cols-2">
          {registry.domains.map((domain) => {
            const metrics = summary.domains[domain.id];
            const domainName = tRaw(`telluslab.domain.${domain.id}`, domain.name);
            return (
              <Panel as="article" key={domain.id} className="space-y-3 p-5">
                <h2 className="text-title font-semibold text-fg">
                  <a className="hover:text-accent" href={studyUrl(domain.slug)}>
                    {domainName} ↗
                  </a>
                </h2>
                <p className="font-mono text-caption tabular-nums text-fg-muted">
                  {percent(metrics.global.ratio ?? 0)} · {domain.books.length} {worksLabel} ·{" "}
                  {domain.nodes.length} {macrotopicsLabel}
                </p>
                <ul className="space-y-2 text-label">
                  {domain.tracks.map((track) => (
                    <li key={track.id} className="flex justify-between gap-2">
                      <a
                        href={studyUrl(domain.slug, undefined, undefined, track.id)}
                        className="text-accent hover:text-accent-hover hover:underline"
                      >
                        {tRaw(`telluslab.track.${track.id}`, track.title)}
                      </a>
                      <span className="font-mono tabular-nums text-fg-secondary">
                        {percent(metrics.tracks[track.id].ratio ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </section>
        <Panel as="section" className="space-y-3 p-5">
          <h2 className="text-title font-semibold text-fg">
            {t("telluslab.overdueTitle", "Revisões vencidas (S6)")}
          </h2>
          {snapshot?.overdue.length ? (
            <ul className="space-y-2 text-label">
              {snapshot.overdue.map((row) => {
                const { domain, node } = nodes.get(row.nodeId)!;
                return (
                  <li key={node.id}>
                    <a
                      className="text-accent hover:text-accent-hover hover:underline"
                      href={studyUrl(domain.slug, node.id)}
                    >
                      {node.title}
                    </a>
                    <span className="ml-2 font-mono text-caption tabular-nums text-fg-muted">
                      {dateFormatter.format(new Date(row.dueAt))} · {row.cards}{" "}
                      {t("telluslab.cards", "cartões")}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-label text-fg-muted">
              {snapshot
                ? t("telluslab.overdueEmptySnapshot", "Nenhuma revisão vencida no snapshot.")
                : t(
                    "telluslab.overdueEmptyNoSnapshot",
                    "Importe o progresso para consultar a fila de revisão."
                  )}
            </p>
          )}
        </Panel>
        <nav aria-label={dossiersHeading} className="space-y-3">
          <h2 className="text-title font-semibold text-fg">{dossiersHeading}</h2>
          <ul className="grid gap-2 text-label sm:grid-cols-2">
            {manifest.links
              .filter((link) => link.kind === "dossier" || link.kind === "figure")
              .map((link) => (
                <li key={link.entityId}>
                  <Link
                    href={link.target}
                    className="text-accent hover:text-accent-hover hover:underline"
                  >
                    {tRaw(`telluslab.link.${link.entityId}`, link.title)}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
