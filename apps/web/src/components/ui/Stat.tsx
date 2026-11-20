import React from "react";
import { cn } from "./cn";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Fonte + código + ano (RN02). Opcional só quando o valor não vem de base externa. */
  source?: React.ReactNode;
  size?: "md" | "lg";
}

/** Número com rótulo e procedência. Valores em Geist Mono com algarismos tabulares. */
export function Stat({ label, value, source, size = "md", className, ...props }: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface-raised px-4 py-3", className)} {...props}>
      <span className="truncate text-caption text-fg-secondary">{label}</span>
      <span
        className={cn(
          "truncate font-mono font-medium tabular-nums tracking-tight text-fg",
          size === "lg" ? "text-display" : "text-title"
        )}
      >
        {value}
      </span>
      {source && <span className="text-caption text-fg-muted">{source}</span>}
    </div>
  );
}
