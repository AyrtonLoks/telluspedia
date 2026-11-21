import React from "react";
import { cn } from "./cn";

/** Painel translúcido sobre o globo (cabeçalho · corpo rolável · rodapé). */
export const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "aside" | "section" | "header" | "nav" | "article" }>(
  function Panel({ as: Tag = "div", className, ...props }, ref) {
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn("flex flex-col rounded-panel border border-line bg-surface/86 shadow-e2 backdrop-blur-md", className)}
        {...props}
      />
    );
  }
);

export interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Nível do título (padrão h2). */
  headingLevel?: 2 | 3;
}

export function PanelHeader({ title, subtitle, icon, actions, headingLevel = 2, className, ...props }: PanelHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4", className)} {...props}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span aria-hidden="true" className="inline-flex text-fg-secondary [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="truncate text-body font-semibold text-fg">{title}</Heading>
          {subtitle && <span className="truncate text-caption text-fg-muted">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 items-center gap-2 border-t border-line px-4 py-3", className)} {...props} />;
}
