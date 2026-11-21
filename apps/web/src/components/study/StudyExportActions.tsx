"use client";

import React, { useState } from "react";
import { Check, FileCode2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StudyLineageInfo, StudyRecord } from "@/lib/studies-store";
import {
  buildSafeExportFilename,
  buildStudyAcademicMarkdown,
  buildStudyPortableJson,
} from "@/lib/study-export";

export interface StudyExportActionsProps {
  study: StudyRecord;
  lineage?: StudyLineageInfo | null;
  compact?: boolean;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StudyExportActions({
  study,
  lineage = null,
  compact = false,
}: StudyExportActionsProps) {
  const [downloaded, setDownloaded] = useState<"md" | "json" | null>(null);

  const handleExport = (format: "md" | "json") => {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const content =
      format === "md"
        ? buildStudyAcademicMarkdown(study, { origin, lineage })
        : buildStudyPortableJson(study, { origin, lineage });
    const mime =
      format === "md" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8";

    triggerDownload(content, buildSafeExportFilename(study.id, format), mime);
    setDownloaded(format);
    setTimeout(() => setDownloaded((prev) => (prev === format ? null : prev)), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5" data-testid="study-export-actions">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport("md")}
        title="Exportar estudo em Markdown acadêmico (com fontes primárias e citações ABNT/APA)"
        aria-label={`Exportar ${study.title} em Markdown acadêmico`}
      >
        {downloaded === "md" ? (
          <Check aria-hidden="true" className="size-3.5 text-success" />
        ) : (
          <FileText aria-hidden="true" className="size-3.5" />
        )}
        <span>{compact ? ".md" : "Markdown"}</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleExport("json")}
        title="Exportar estudo em JSON portátil"
        aria-label={`Exportar ${study.title} em JSON portátil`}
      >
        {downloaded === "json" ? (
          <Check aria-hidden="true" className="size-3.5 text-success" />
        ) : (
          <FileCode2 aria-hidden="true" className="size-3.5" />
        )}
        <span>{compact ? ".json" : "JSON"}</span>
      </Button>
    </div>
  );
}
