import React from "react";
import { cn } from "./cn";

type SwitchName = { label: string; "aria-labelledby"?: never } | { label?: never; "aria-labelledby": string };

export type SwitchProps = SwitchName &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "aria-checked" | "aria-label"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };

/** Interruptor liga/desliga (role="switch"). Precisa de `label` ou `aria-labelledby`. */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, label, className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-base ease-out disabled:opacity-50",
        checked ? "bg-accent" : "bg-control",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0.5 h-4 w-4 rounded-full transition-[left,background-color] duration-base ease-out",
          checked ? "left-[18px] bg-accent-on" : "left-0.5 bg-fg-secondary"
        )}
      />
    </button>
  );
});
