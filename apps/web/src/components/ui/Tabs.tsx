"use client";

import React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "./cn";

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof RadixTabs.List>>(
  function TabsList({ className, ...props }, ref) {
    return (
      <RadixTabs.List
        ref={ref}
        className={cn("inline-flex items-center gap-1 rounded-card border border-line bg-surface-sunken p-1", className)}
        {...props}
      />
    );
  }
);

export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>>(
  function TabsTrigger({ className, ...props }, ref) {
    return (
      <RadixTabs.Trigger
        ref={ref}
        className={cn(
          "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-control px-3 text-label font-medium text-fg-secondary transition-colors duration-base ease-out hover:text-fg",
          "data-[state=active]:bg-surface-hover data-[state=active]:text-fg",
          className
        )}
        {...props}
      />
    );
  }
);

export const TabsContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof RadixTabs.Content>>(
  function TabsContent({ className, ...props }, ref) {
    return (
      <RadixTabs.Content
        ref={ref}
        className={cn("mt-3 data-[state=inactive]:hidden", className)}
        {...props}
      />
    );
  }
);
