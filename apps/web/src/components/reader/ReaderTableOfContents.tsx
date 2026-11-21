"use client";

import React from "react";
import {
  BarChart2,
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
import { cn } from "@/components/ui/cn";

interface DimensionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  estimatedMin: number;
}

const DIMENSIONS: DimensionItem[] = [
  { key: "ANALYTICAL_PROFILE", label: "Perfil Analítico & Global", icon: <BarChart2 aria-hidden="true" className="h-4 w-4" />, estimatedMin: 3 },
  { key: "GEOGRAPHY", label: "Geografia & Biomas", icon: <Compass aria-hidden="true" className="h-4 w-4" />, estimatedMin: 6 },
  { key: "GOVERNMENT_POLITICS", label: "Governo & Política", icon: <Landmark aria-hidden="true" className="h-4 w-4" />, estimatedMin: 8 },
  { key: "ECONOMY_SOCIAL", label: "Economia & Social", icon: <TrendingUp aria-hidden="true" className="h-4 w-4" />, estimatedMin: 7 },
  { key: "HISTORY", label: "História & Marcos", icon: <History aria-hidden="true" className="h-4 w-4" />, estimatedMin: 10 },
  { key: "BIOGRAPHIES", label: "Biografias Históricas", icon: <UserCheck aria-hidden="true" className="h-4 w-4" />, estimatedMin: 5 },
  { key: "CULTURE_HUMANITIES", label: "Cultura & Humanidades", icon: <Palette aria-hidden="true" className="h-4 w-4" />, estimatedMin: 6 },
  { key: "BIOLOGY_HEALTH", label: "Biologia & Saúde Pública", icon: <HeartPulse aria-hidden="true" className="h-4 w-4" />, estimatedMin: 5 },
  { key: "NEWS_CURRENT_AFFAIRS", label: "Atualidades & Relações", icon: <Newspaper aria-hidden="true" className="h-4 w-4" />, estimatedMin: 4 },
];

export const ReaderTableOfContents: React.FC = () => {
  const activeDimension = useReaderStore((s) => s.activeDimension);
  const setActiveDimension = useReaderStore((s) => s.setActiveDimension);

  return (
    <nav aria-label="Sumário multidisciplinar" className="w-64 shrink-0 space-y-1 border-r border-line pr-4">
      <div className="flex items-center gap-2 px-3 py-2 text-caption font-medium text-fg-muted">
        <BookOpen aria-hidden="true" className="h-3.5 w-3.5 text-fg-muted" />
        <span>Sumário multidisciplinar</span>
      </div>

      <div className="mt-2 space-y-1">
        {DIMENSIONS.map((dim) => {
          const isActive = activeDimension === dim.key;
          return (
            <button
              key={dim.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveDimension(dim.key)}
              className={cn(
                "flex w-full items-center justify-between rounded-card border px-3 py-2 text-left text-label font-medium transition-colors duration-fast ease-out",
                isActive
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={isActive ? "text-accent" : "text-fg-muted"}>{dim.icon}</span>
                <span className="line-clamp-1">{dim.label}</span>
              </div>
              <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">
                {dim.estimatedMin}m
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
