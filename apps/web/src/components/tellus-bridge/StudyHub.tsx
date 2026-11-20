"use client";

import Link from "next/link";
import React, { useState } from "react";
import { manifest, nodes, registry, studyUrl } from "@/lib/tellus-bridge/catalog";
import { MAX_SNAPSHOT_BYTES, summarize } from "@/lib/tellus-bridge/contract/index.mjs";
import { importStudySnapshot, useStudySnapshot } from "@/lib/tellus-bridge/snapshot";

const emptySummary = summarize(registry);
const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value);
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

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
      setStatus(!active ? "Importado. O navegador já recebeu uma atualização mais recente do TellusLab." :
        persistent ? "Progresso importado neste navegador." : "Progresso importado para esta sessão.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível importar o snapshot.");
    }
  }

  return (
    <main className="h-dvh overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-10">
        <Link href="/" className="text-sm text-cyan-300 hover:underline">← Globo TellusPedia</Link>
        <header className="space-y-3">
          <h1 className="font-serif text-4xl text-white">TellusLab Hub</h1>
          <p className="text-slate-300">{registry.domains.length} domínios · {workCount} obras · {nodes.size} macrotemas</p>
        </header>
        <section className="glass-panel grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <h2 className="font-semibold">Progresso por complexidade</h2>
            <p className="text-3xl text-cyan-300">{percent(summary.global.ratio ?? 0)}</p>
            {snapshot && <p className="text-sm text-slate-400">Atualizado em {date.format(new Date(snapshot.exportedAt))}</p>}
          </div>
          <div className="space-y-2 text-sm">
            <label className="block font-semibold" htmlFor="study-import">Importar snapshot JSON</label>
            <input id="study-import" className="max-w-full text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-cyan-950 file:px-3 file:py-2 file:text-cyan-200" type="file" accept=".json,application/json" onChange={event => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void load(file);
            }} />
            <p className="text-slate-400">{snapshot ? "Exporte uma atualização no TellusLab para atualizar este painel." : "Importe o arquivo global exportado pelo TellusLab para acompanhar seus estudos."}</p>
            <p role="status" className="text-cyan-200">{status}</p>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          {registry.domains.map(domain => {
            const metrics = summary.domains[domain.id];
            return (
              <article key={domain.id} className="glass-panel space-y-3 rounded-2xl p-5">
                <h2 className="font-semibold"><a className="hover:text-cyan-300" href={studyUrl(domain.slug)}>{domain.name} ↗</a></h2>
                <p className="text-sm text-slate-400">{percent(metrics.global.ratio ?? 0)} · {domain.books.length} obras · {domain.nodes.length} macrotemas</p>
                <ul className="space-y-2 text-sm">
                  {domain.tracks.map(track => (
                    <li key={track.id} className="flex justify-between gap-2">
                      <a href={studyUrl(domain.slug, undefined, undefined, track.id)} className="text-cyan-300 hover:underline">{track.title}</a>
                      <span className="text-slate-300">{percent(metrics.tracks[track.id].ratio ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
        <section className="glass-panel space-y-3 rounded-2xl p-5">
          <h2 className="font-semibold">Revisões vencidas (S6)</h2>
          {snapshot?.overdue.length ? <ul className="space-y-2">{snapshot.overdue.map(row => {
            const { domain, node } = nodes.get(row.nodeId)!;
            return <li key={node.id}><a className="text-cyan-300 hover:underline" href={studyUrl(domain.slug, node.id)}>{node.title}</a>
              <span className="ml-2 text-sm text-slate-400">{date.format(new Date(row.dueAt))} · {row.cards} cartões</span></li>;
          })}</ul> : <p className="text-sm text-slate-400">{snapshot ? "Nenhuma revisão vencida no snapshot." : "Importe o progresso para consultar a fila de revisão."}</p>}
        </section>
        <nav aria-label="Dossiês e figuras históricas" className="space-y-3">
          <h2 className="font-semibold">Dossiês e figuras históricas</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {manifest.links.filter(link => link.kind === "dossier" || link.kind === "figure").map(link =>
              <li key={link.entityId}><Link href={link.target} className="text-cyan-300 hover:underline">{link.title}</Link></li>)}
          </ul>
        </nav>
      </div>
    </main>
  );
}
