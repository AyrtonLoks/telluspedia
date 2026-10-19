"use client";

import React from "react";
import {
  Compass,
  Landmark,
  TrendingUp,
  History,
  UserCheck,
  Palette,
  HeartPulse,
  Newspaper,
  BookOpen,
} from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";

interface DimensionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  estimatedMin: number;
}

const DIMENSIONS: DimensionItem[] = [
  { key: "GEOGRAPHY", label: "Geografia & Biomas", icon: <Compass className="w-4 h-4" />, estimatedMin: 6 },
  { key: "GOVERNMENT_POLITICS", label: "Governo & Política", icon: <Landmark className="w-4 h-4" />, estimatedMin: 8 },
  { key: "ECONOMY_SOCIAL", label: "Economia & Social", icon: <TrendingUp className="w-4 h-4" />, estimatedMin: 7 },
  { key: "HISTORY", label: "História & Marcos", icon: <History className="w-4 h-4" />, estimatedMin: 10 },
  { key: "BIOGRAPHIES", label: "Biografias Históricas", icon: <UserCheck className="w-4 h-4" />, estimatedMin: 5 },
  { key: "CULTURE_HUMANITIES", label: "Cultura & Humanidades", icon: <Palette className="w-4 h-4" />, estimatedMin: 6 },
  { key: "BIOLOGY_HEALTH", label: "Biologia & Saúde Pública", icon: <HeartPulse className="w-4 h-4" />, estimatedMin: 5 },
  { key: "NEWS_CURRENT_AFFAIRS", label: "Atualidades & Relações", icon: <Newspaper className="w-4 h-4" />, estimatedMin: 4 },
];

export const ReaderTableOfContents: React.FC = () => {
  const activeDimension = useReaderStore((s) => s.activeDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);

  return (
    <nav className="w-64 shrink-0 border-r border-slate-800 pr-4 space-y-1">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
        <span>Sumário Multidisciplinar</span>
      </div>

      <div className="space-y-1 mt-2">
        {DIMENSIONS.map((dim) => {
          const isActive = activeDimension === dim.key;
          return (
            <button
              key={dim.key}
              onClick={() => setActiveDimension(dim.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                isActive
                  ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? "text-cyan-400" : "text-slate-500"}>
                  {dim.icon}
                </span>
                <span className="line-clamp-1">{dim.label}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {dim.estimatedMin}m
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
