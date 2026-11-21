"use client";

import React from "react";
import "@/styles/globals.css";
import {
  GlobalErrorView,
  type GlobalErrorViewProps,
} from "@/components/shell/GlobalErrorView";

export default function GlobalError({ error, reset }: GlobalErrorViewProps) {
  return <GlobalErrorView error={error} reset={reset} />;
}
