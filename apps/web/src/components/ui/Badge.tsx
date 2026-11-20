import React from "react";
import { cn } from "./cn";
import { TONES, type Tone } from "./tones";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** solid = ponto cheio; hollow = ponto vazado (estado que não pode depender só da cor). */
  dot?: "solid" | "hollow" | "none";
  pulse?: boolean;
}

/** Rótulo curto de estado. Usa só elementos de fraseamento (pode ficar dentro de <p>). */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "neutral", dot = "solid", pulse = false, className, children, ...props },
  ref
) {
  const t = TONES[tone];
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-caption font-medium",
        t.subtle,
        t.text,
        className
      )}
      {...props}
    >
      {dot !== "none" && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dot === "solid" ? t.dot : cn("border-[1.5px] bg-transparent", t.ring),
            pulse && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  );
});
