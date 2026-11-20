import React from "react";
import { cn } from "./cn";
import { TONES, type Tone } from "./tones";

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  pressed: boolean;
  tone?: Tone;
  /** Mostra o ponto colorido do tom (padrão: sim). */
  dot?: boolean;
}

/**
 * Filtro liga/desliga em forma de pílula. Desligado fica neutro (ponto + texto secundário);
 * ligado ganha o fundo tingido do tom.
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, tone = "accent", dot = true, className, children, type = "button", ...props },
  ref
) {
  const t = TONES[tone];
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-caption font-medium transition-colors duration-base ease-out",
        pressed ? cn(t.subtle, t.border, "text-fg") : "border-line-strong bg-transparent text-fg-secondary hover:text-fg",
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", t.dot, !pressed && "opacity-60")} />}
      {children}
    </button>
  );
});
