"use client";

import React, { useState } from "react";
import { GitFork, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

interface ForkStudyBannerProps {
  studyId: string;
  parentId?: string | null;
  title: string;
}

export const ForkStudyBanner: React.FC<ForkStudyBannerProps> = ({
  studyId,
  parentId,
  title,
}) => {
  const router = useRouter();
  const [forking, setForking] = useState<boolean>(false);
  const [forkSuccess, setForkSuccess] = useState<boolean>(false);

  const handleFork = async () => {
    setForking(true);
    try {
      const res = await fetch(`/api/studies/${studyId}/fork`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setForkSuccess(true);
        setTimeout(() => {
          router.push(`/study/${data.id}`);
        }, 800);
      }
    } catch (err) {
      console.error("Fork error:", err);
    } finally {
      setForking(false);
    }
  };

  return (
    <Panel className="pointer-events-auto max-w-full flex-row items-center gap-3 px-3 py-2 text-label animate-fade-in sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <GitFork aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <span className="block truncate font-semibold text-fg" title={title}>{title}</span>
          <span className="block truncate text-caption text-fg-muted">
            {parentId ? `Fork derivado de ${parentId}` : "Estudo compartilhado original"}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="shrink-0"
        onClick={handleFork}
        disabled={forking || forkSuccess}
      >
        {forkSuccess ? (
          <>
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Fork criado!</span>
          </>
        ) : (
          <>
            <GitFork aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{forking ? "Derivando..." : "Fazer fork deste estudo"}</span>
          </>
        )}
      </Button>
    </Panel>
  );
};
