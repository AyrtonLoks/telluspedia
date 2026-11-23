import type { Metadata } from "next";
import { StudyHub } from "@/components/tellus-bridge/StudyHub";
import { getServerLocale, pickLocaleText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = "TellusLab Hub — TellusPedia";
  const description = pickLocaleText(
    locale,
    "Acompanhe domínios, trilhas, revisões espaçadas e dossiês curriculares integrados entre TellusPedia e TellusLab.",
    "Track domains, learning tracks, spaced reviews, and curricular dossiers integrated between TellusPedia and TellusLab."
  );
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: "/telluslab",
    },
  };
}

export default function TellusLabPage() {
  return <StudyHub />;
}
