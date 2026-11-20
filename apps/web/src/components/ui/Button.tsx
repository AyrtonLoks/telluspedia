import React from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors duration-base ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-on font-semibold hover:bg-accent-hover",
  secondary: "border border-line-strong bg-surface-raised text-fg hover:bg-surface-hover",
  ghost: "bg-transparent text-fg-secondary hover:bg-surface-hover hover:text-fg",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-label",
  md: "h-9 px-4 text-label",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Botão de texto. Use no máximo uma variante `primary` por painel. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />;
});
