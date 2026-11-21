"use client";

import React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export interface DialogContentProps extends Omit<React.ComponentPropsWithoutRef<typeof RadixDialog.Content>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}

/** Modal com título e descrição acessíveis, foco preso e Esc para fechar (Radix). */
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { title, description, footer, className, children, ...props },
  ref
) {
  const overlay = (
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
  );
  const content = (
      <RadixDialog.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border border-line bg-surface shadow-e2",
          "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex flex-col gap-1">
            <RadixDialog.Title className="text-title font-semibold text-fg">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="text-label text-fg-secondary">{description}</RadixDialog.Description>
            ) : (
              <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close asChild>
            <IconButton label="Fechar" icon={<X />} size="sm" />
          </RadixDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-body text-fg-secondary">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </RadixDialog.Content>
  );

  // Em SSR (ex.: renderToStaticMarkup em testes), renderiza inline para manter o markup acessível.
  // No navegador, overlay e conteúdo vão como filhos SEPARADOS do Portal: o Radix envolve cada filho
  // num controle de presença que precisa de um nó para esperar a animação de saída — num fragmento
  // ele não acha nó e desmonta na hora (D17).
  if (typeof document === "undefined") {
    return (
      <>
        {overlay}
        {content}
      </>
    );
  }
  return (
    <RadixDialog.Portal>
      {overlay}
      {content}
    </RadixDialog.Portal>
  );
});
