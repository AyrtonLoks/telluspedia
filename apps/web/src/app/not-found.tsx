import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-fg">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 text-center shadow-e2">
        <p className="font-mono text-caption text-accent tabular-nums">404</p>
        <h1 className="mt-2 text-display font-semibold text-fg">
          Página não encontrada
        </h1>
        <p className="mt-3 text-body text-fg-secondary">
          O estudo ou país solicitado não existe ou não está disponível no catálogo atual.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-on transition-colors duration-fast ease-out hover:bg-accent-hover"
          >
            Voltar ao globo
          </Link>
        </div>
      </div>
    </main>
  );
}
