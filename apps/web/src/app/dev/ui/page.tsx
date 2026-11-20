import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UiShowcase } from "@/components/ui/UiShowcase";

export const metadata: Metadata = {
  title: "Design system · TellusPedia (dev)",
  robots: { index: false, follow: false },
};

/** Vitrine interna dos tokens e primitivos (D14). Só existe em desenvolvimento. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiShowcase />;
}
