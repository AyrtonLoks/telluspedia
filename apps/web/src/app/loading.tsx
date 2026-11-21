import React from "react";

export default function RootLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      data-testid="app-loading"
      className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-fg"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-panel border border-line bg-surface/86 p-8 text-center shadow-e1 backdrop-blur-md">
        <div
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
        />
        <div className="space-y-1">
          <p className="text-label font-medium text-fg">
            Carregando TellusPedia
          </p>
          <p className="text-caption text-fg-secondary">
            Preparando dados cartográficos e módulos enciclopédicos…
          </p>
        </div>
      </div>
    </main>
  );
}
