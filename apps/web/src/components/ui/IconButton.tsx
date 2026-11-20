import React from "react";
import { cn } from "./cn";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  /** Obrigatório: vira aria-label e title (botão só com ícone precisa de nome acessível). */
  label: string;
  icon: React.ReactNode;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "ghost", size = "md", className, type = "button", title, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-base ease-out disabled:pointer-events-none disabled:opacity-50",
        // área de toque mínima de 44 px sem aumentar o desenho
        "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        variant === "secondary"
          ? "border border-line bg-surface-raised text-fg-secondary hover:bg-surface-hover hover:text-fg"
          : "bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg",
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
    </button>
  );
});
