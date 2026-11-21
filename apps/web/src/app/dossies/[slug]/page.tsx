import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { StudyContext } from "@/components/tellus-bridge/StudyContext";
import { getPublishedDossier } from "@/lib/dossiers-catalog";
import { buildDossierArticleJsonLd } from "@/lib/seo";
import { resolveLaunch, studyUrl } from "@/lib/tellus-bridge/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dossier = getPublishedDossier(slug);
  if (!dossier) {
    return {
      title: "Dossiê não encontrado — TellusPedia",
      robots: { index: false, follow: false },
    };
  }
  const description = dossier.introduction.slice(0, 200);
  return {
    title: `${dossier.title} — TellusPedia`,
    description,
    openGraph: {
      title: dossier.title,
      description,
      type: "article",
      locale: "pt_BR",
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
  const { slug } = await params;
  const dossier = getPublishedDossier(slug);
  if (!dossier) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  const launch = resolveLaunch(query);
  const origin = launch?.link.entityId === dossier.entityId ? launch.origin : null;

  return (
    <main className="min-h-screen">
      <JsonLdScript data={buildDossierArticleJsonLd(dossier)} />
      <article className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <nav aria-label="Localização" className="flex flex-wrap gap-4 text-label text-accent">
          <Link href="/" className="hover:text-accent-hover hover:underline">Globo</Link>
          <Link href="/telluslab" className="hover:text-accent-hover hover:underline">TellusLab Hub</Link>
          {origin && (
            <a
              href={studyUrl(origin.slug, origin.nodeId, dossier.entityId)}
              className="hover:text-accent-hover hover:underline"
            >
              ← Retornar ao nó {origin.nodeId}
            </a>
          )}
        </nav>
        <h1 className="font-serif text-display font-semibold text-fg">{dossier.title}</h1>
        <p className="font-serif text-body leading-relaxed text-fg-secondary">{dossier.introduction}</p>
        <StudyContext entityId={dossier.entityId} />
      </article>
    </main>
  );
}
