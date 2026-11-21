"use client";

import { useEffect, type RefObject } from "react";

/** Keeps the floating cards clear of fixed panels whose height depends on viewport and content. */
export function useShellObstruction(
  elementRef: RefObject<HTMLElement | null>,
  property: "--timeline-obstruction" | "--dock-obstruction" | "--annotation-obstruction",
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const element = elementRef.current;
    const shell = element?.closest<HTMLElement>("[data-map-shell]");
    if (!element || !shell) return;
    const measure = () => {
      const height = element.offsetHeight;
      const bottom = property === "--annotation-obstruction"
        ? 0
        : Number.parseFloat(getComputedStyle(element).bottom) || 0;
      shell.style.setProperty(property, `${height ? height + bottom + 12 : 0}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      shell.style.removeProperty(property);
    };
  }, [elementRef, property, enabled]);
}
