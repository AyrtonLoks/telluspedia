"use client";

import React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "./cn";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  className?: string;
}

/** Dica ao passar o mouse/focar. O gatilho precisa ser focável (botão, link). */
export function Tooltip({ content, children, side = "top", delayDuration = 300, className }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-card border border-line-strong bg-surface-hover px-3 py-2 text-caption text-fg shadow-e2",
              "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in",
              className
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
