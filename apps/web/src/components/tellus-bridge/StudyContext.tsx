"use client";

import React from "react";
import { books, entities, nodes, studyUrl } from "@/lib/tellus-bridge/catalog";
import { useStudySnapshot } from "@/lib/tellus-bridge/snapshot";
import type { CrossLink, TellusLabSnapshotV1 } from "@/lib/tellus-bridge/contract/types.mjs";

export function CurriculumLinks({ link, snapshot }: { link: CrossLink; snapshot: TellusLabSnapshotV1 | null }) {
  return (
    <details className="my-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
      <summary className="cursor-pointer font-semibold text-cyan-300">Aprofundar no TellusLab</summary>
      <div className="mt-3 max-h-72 space-y-4 overflow-y-auto">
        <ul className="space-y-2">
          {link.nodeIds.map(id => {
            const { domain, node } = nodes.get(id)!;
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-2">
                <span className="block">
                  <span className="block">{node.title}</span>
                  <span className="block text-xs text-slate-400">
                    {id} · {snapshot?.proficiency[id]?.state ?? "S0"} · Complexidade {node.complexity}/5
                  </span>
                </span>
                <a aria-label={`Estudar ${node.title}`} className="rounded-lg border border-cyan-800 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-950" href={studyUrl(domain.slug, id, link.entityId)}>
                  Estudar
                </a>
              </li>
            );
          })}
        </ul>
        {link.bookIds.length > 0 && (
          <div>
            <p className="font-semibold text-slate-100">Obras relacionadas</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-300">
              {link.bookIds.map(id => {
                const book = books.get(id)!;
                return <li key={id}>{id} · {book.title} · {book.authors.join(", ")}</li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function ConnectedCurriculum({ link }: { link: CrossLink }) {
  return <CurriculumLinks link={link} snapshot={useStudySnapshot()} />;
}

export function StudyContext({ entityId }: { entityId: string }) {
  const link = entities.get(entityId);
  return link ? <ConnectedCurriculum link={link} /> : null;
}
