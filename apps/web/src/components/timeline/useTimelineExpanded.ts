"use client";

import { useSyncExternalStore } from "react";
import { useTimelineStore } from "@/stores/timelineStore";

const WIDE_TIMELINE = "(min-width: 1024px)";
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(WIDE_TIMELINE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const readDesktop = () => window.matchMedia(WIDE_TIMELINE).matches;
const readServer = () => true;

export function useTimelineExpanded() {
  const override = useTimelineStore((state) => state.isExpanded);
  const wide = useSyncExternalStore(subscribe, readDesktop, readServer);
  const preference = typeof window === "undefined" ? useTimelineStore.getState().isExpanded : override;
  return { expanded: preference ?? wide, automatic: preference === null };
}
