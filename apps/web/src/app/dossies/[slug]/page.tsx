import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import { ServerLocaleToggleButton } from "@/components/nav/LocaleToggleButton";
import { getPublishedDossier, type PublishedDossier } from "@/lib/dossiers-catalog";
import { DOSSIER_INTRODUCTIONS_EN, EN_TELLUSLAB_MESSAGES } from "@/lib/i18n/en-telluslab";
import { getServerLocale, pickLocaleText } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";
import { buildDossierArticleJsonLd } from "@/lib/seo";
import { resolveLaunch, studyUrl } from "@/lib/tellus-bridge/catalog";

function localizeDossier(dossier: PublishedDossier, locale: Locale): PublishedDossier {
  if (locale !== "en") return dossier;
  const titleKey = `telluslab.link.${dossier.entityId}` as keyof typeof EN_TELLUSLAB_MESSAGES;
  return {
    ...dossier,
    title: EN_TELLUSLAB_MESSAGES[titleKey] ?? dossier.title,
    introduction: DOSSIER_INTRODUCTIONS_EN[dossier.slug] ?? dossier.introduction,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getServerLocale()]);
  const rawDossier = getPublishedDossier(slug);
  if (!rawDossier) {
    return {
      title: pickLocaleText(locale, "Dossiê não encontrado — TellusPedia", "Dossier not found — TellusPedia"),
      robots: { index: false, follow: false },
    };
  }
  const dossier = localizeDossier(rawDossier, locale);
  const description = dossier.introduction.slice(0, 200);
  return {
    title: `${dossier.title} — TellusPedia`,
    description,
    openGraph: {
      title: dossier.title,
      description,
      type: "article",
      locale: locale === "en" ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: `/dossies/${encodeURIComponent(dossier.slug)}`,
    },
    twitter: {
      card: "summary_large_image",
      title: dossier.title,
      description,
    },
  };
}

export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getServerLocale(),
  ]);
  const rawDossier = getPublishedDossier(slug);
  if (!rawDossier) notFound();
  const dossier = localizeDossier(rawDossier, locale);
  const tx = (pt: string, en: string) => pickLocaleText(locale, pt, en);

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  const launch = resolveLaunch(query);
  const origin = launch?.link.entityId === dossier.entityId ? launch.origin : null;

  return (
    <main className="min-h-screen">
      <JsonLdScript data={buildDossierArticleJsonLd(dossier)} />
      <article className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label={tx("Localização", "Breadcrumb")} className="flex flex-wrap gap-4 text-label text-accent">
            <Link href="/" className="hover:text-accent-hover hover:underline">
              {tx("Globo", "Globe")}
            </Link>
            <Link href="/telluslab" className="hover:text-accent-hover hover:underline">
              TellusLab Hub
            </Link>
            {origin && (
              <a
                href={studyUrl(origin.slug, origin.nodeId, dossier.entityId)}
                className="hover:text-accent-hover hover:underline"
              >
                {tx("← Retornar ao nó", "← Return to node")} {origin.nodeId}
              </a>
            )}
          </nav>
          <ServerLocaleToggleButton />
        </div>
        <h1 className="font-serif text-display font-semibold text-fg">{dossier.title}</h1>
        <p className="font-serif text-body leading-relaxed text-fg-secondary">{dossier.introduction}</p>
        <StudyContext entityId={dossier.entityId} />
      </article>
    </main>
  );
}
