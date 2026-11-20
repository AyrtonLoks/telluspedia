import React from "react";
import { cn } from "./cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seleção = tinta + borda do acento. */
  selected?: boolean;
  /** Cartão discreto (sem fundo) — para listas dentro de painéis. */
  quiet?: boolean;
}

/** Bloco sólido dentro de painéis. Não aninhe Card dentro de Card. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { selected = false, quiet = false, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-selected={selected || undefined}
      className={cn(
        "rounded-card border p-4 transition-colors duration-base ease-out",
        selected
          ? "border-accent/40 bg-accent/10"
          : quiet
          ? "border-transparent bg-transparent"
          : "border-line bg-surface-raised",
        className
      )}
      {...props}
    />
  );
});
