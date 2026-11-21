"use client";

import Link from "next/link";
import React, { useState } from "react";
import { manifest, nodes, registry, studyUrl } from "@/lib/tellus-bridge/catalog";
import { MAX_SNAPSHOT_BYTES, summarize } from "@/lib/tellus-bridge/contract/index.mjs";
import { importStudySnapshot, useStudySnapshot } from "@/lib/tellus-bridge/snapshot";
import { Panel } from "@/components/ui/Panel";

const emptySummary = summarize(registry);
const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value);
const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function StudyHub() {
  const snapshot = useStudySnapshot();
  const summary = snapshot?.summary ?? emptySummary;
  const [status, setStatus] = useState("");
  const workCount = registry.domains.reduce((count, domain) => count + domain.books.length, 0);

  async function load(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_SNAPSHOT_BYTES) throw new Error("O snapshot excede 10 MiB.");
      const { persistent, active } = importStudySnapshot(await file.text());
      setStatus(
        !active
          ? "Importado. O navegador já recebeu uma atualização mais recente do TellusLab."
          : persistent
          ? "Progresso importado neste navegador."
          : "Progresso importado para esta sessão."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível importar o snapshot.");
    }
  }

  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-10">
        <Link href="/" className="text-label text-accent hover:text-accent-hover hover:underline">
          ← Globo TellusPedia
        </Link>
        <header className="space-y-3">
          <h1 className="font-serif text-display font-semibold text-fg">TellusLab Hub</h1>
          <p className="text-body text-fg-secondary">
            {registry.domains.length} domínios · {workCount} obras · {nodes.size} macrotemas
          </p>
        </header>
        <Panel as="section" className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-title font-semibold text-fg">Progresso por complexidade</h2>
            <p className="font-mono text-display font-semibold tabular-nums text-accent">
              {percent(summary.global.ratio ?? 0)}
            </p>
            {snapshot && (
              <p className="text-caption text-fg-muted">
                Atualizado em {date.format(new Date(snapshot.exportedAt))}
              </p>
            )}
          </div>
          <div className="space-y-2 text-label">
            <label className="block font-semibold text-fg" htmlFor="study-import">
              Importar snapshot JSON
            </label>
            <input
              id="study-import"
              className="max-w-full text-label text-fg-secondary file:mr-2 file:rounded-control file:border file:border-line-strong file:bg-surface-raised file:px-3 file:py-1.5 file:text-label file:font-medium file:text-fg hover:file:bg-surface-hover"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void load(file);
              }}
            />
            <p className="text-caption text-fg-muted">
              {snapshot
                ? "Exporte uma atualização no TellusLab para atualizar este painel."
                : "Importe o arquivo global exportado pelo TellusLab para acompanhar seus estudos."}
            </p>
            <p role="status" className="text-caption text-accent">
              {status}
            </p>
          </div>
        </Panel>
        <section className="grid gap-4 sm:grid-cols-2">
          {registry.domains.map((domain) => {
            const metrics = summary.domains[domain.id];
            return (
              <Panel as="article" key={domain.id} className="space-y-3 p-5">
                <h2 className="text-title font-semibold text-fg">
                  <a className="hover:text-accent" href={studyUrl(domain.slug)}>
                    {domain.name} ↗
                  </a>
                </h2>
                <p className="font-mono text-caption tabular-nums text-fg-muted">
                  {percent(metrics.global.ratio ?? 0)} · {domain.books.length} obras · {domain.nodes.length} macrotemas
                </p>
                <ul className="space-y-2 text-label">
                  {domain.tracks.map((track) => (
                    <li key={track.id} className="flex justify-between gap-2">
                      <a
                        href={studyUrl(domain.slug, undefined, undefined, track.id)}
                        className="text-accent hover:text-accent-hover hover:underline"
                      >
                        {track.title}
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
          <h2 className="text-title font-semibold text-fg">Revisões vencidas (S6)</h2>
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
                      {date.format(new Date(row.dueAt))} · {row.cards} cartões
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-label text-fg-muted">
              {snapshot
                ? "Nenhuma revisão vencida no snapshot."
                : "Importe o progresso para consultar a fila de revisão."}
            </p>
          )}
        </Panel>
        <nav aria-label="Dossiês e figuras históricas" className="space-y-3">
          <h2 className="text-title font-semibold text-fg">Dossiês e figuras históricas</h2>
          <ul className="grid gap-2 text-label sm:grid-cols-2">
            {manifest.links
              .filter((link) => link.kind === "dossier" || link.kind === "figure")
              .map((link) => (
                <li key={link.entityId}>
                  <Link href={link.target} className="text-accent hover:text-accent-hover hover:underline">
                    {link.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
