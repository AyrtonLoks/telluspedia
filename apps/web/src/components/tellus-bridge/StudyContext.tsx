"use client";

import React from "react";
import { books, entities, nodes, studyUrl } from "@/lib/tellus-bridge/catalog";
import { useStudySnapshot } from "@/lib/tellus-bridge/snapshot";
import type { CrossLink, TellusLabSnapshotV1 } from "@/lib/tellus-bridge/contract/types.mjs";

export function CurriculumLinks({ link, snapshot }: { link: CrossLink; snapshot: TellusLabSnapshotV1 | null }) {
  return (
    <details className="group/curriculum mt-2 rounded-card border border-line bg-surface-sunken text-label text-fg-secondary">
      <summary className="cursor-pointer list-none rounded-card px-3 py-2 font-medium text-accent transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-accent-hover">Aprofundar no TellusLab</summary>
      <div className="max-h-72 space-y-4 overflow-y-auto border-t border-line px-3 py-3">
        <ul className="space-y-2">
          {link.nodeIds.map(id => {
            const { domain, node } = nodes.get(id)!;
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-1 border-b border-line pb-2">
                <span className="block">
                  <span className="block text-fg">{node.title}</span>
                  <span className="block text-caption text-fg-muted">
                    {id} · {snapshot?.proficiency[id]?.state ?? "S0"} · Complexidade {node.complexity}/5
                  </span>
                </span>
                <a aria-label={`Estudar ${node.title}`} className="rounded-control border border-line-strong px-2 py-1 text-caption font-medium text-fg transition-colors duration-fast ease-out hover:bg-surface-hover" href={studyUrl(domain.slug, id, link.entityId)}>
                  Estudar
                </a>
              </li>
            );
          })}
        </ul>
        {link.bookIds.length > 0 && (
          <div>
            <p className="font-medium text-fg">Obras relacionadas</p>
            <ul className="mt-1 space-y-1 text-caption text-fg-secondary">
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
