"use client";

import React, { useState } from "react";
import { GitFork, Check, Share2 } from "lucide-react";
import { useStudyStore } from "@/stores/studyStore";
import { useRouter } from "next/navigation";

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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-2xl glass-panel border border-cyan-500/40 shadow-xl flex items-center gap-4 text-xs animate-in slide-in-from-top-4">
      <div className="flex items-center gap-2">
        <GitFork className="w-4 h-4 text-cyan-400" />
        <div>
          <span className="font-semibold text-slate-100">{title}</span>
          <span className="text-[10px] text-slate-400 block">
            {parentId ? `Fork derivado de ${parentId}` : "Estudo Compartilhado Original"}
          </span>
        </div>
      </div>

      <button
        onClick={handleFork}
        disabled={forking || forkSuccess}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50"
      >
        {forkSuccess ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Fork Criado!</span>
          </>
        ) : (
          <>
            <GitFork className="w-3.5 h-3.5" />
            <span>{forking ? "Derivando..." : "Fazer Fork deste Estudo"}</span>
          </>
        )}
      </button>
    </div>
  );
};
