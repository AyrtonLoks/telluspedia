import Link from "next/link";
import { getServerLocale, pickLocaleText } from "@/lib/i18n/server";

export default async function NotFoundPage() {
  const locale = await getServerLocale();
  const tx = (pt: string, en: string) => pickLocaleText(locale, pt, en);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-fg">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 text-center shadow-e2">
        <p className="font-mono text-caption text-accent tabular-nums">404</p>
        <h1 className="mt-2 text-display font-semibold text-fg">
          {tx("Página não encontrada", "Page not found")}
        </h1>
        <p className="mt-3 text-body text-fg-secondary">
          {tx(
            "O estudo ou país solicitado não existe ou não está disponível no catálogo atual.",
            "The requested study or country does not exist or is unavailable in the current catalog."
          )}
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
          >
            {tx("Voltar ao globo", "Back to globe")}
          </Link>
        </div>
      </div>
    </main>
  );
}
