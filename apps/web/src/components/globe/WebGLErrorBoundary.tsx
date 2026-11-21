"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Compass, GitCompareArrows, RotateCcw, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useOpenExploreSearch } from "@/components/explore/SearchProvider";
import { detectWebGLSupport, type WebGLSupportResult } from "@/lib/webgl-support";
import { selectCountry } from "@/stores/actions";
import { useComparatorStore } from "@/stores/comparatorStore";

export type WebGLFallbackReason = "unsupported" | "render-error";

export interface WebGLFallbackPanelProps {
  reason: WebGLFallbackReason;
  onRetry: () => void;
}

const FEATURED_COUNTRIES: ReadonlyArray<{ iso: string; name: string }> = [
  { iso: "BRA", name: "Brasil" },
  { iso: "DEU", name: "Alemanha" },
  { iso: "USA", name: "Estados Unidos" },
  { iso: "JPN", name: "Japão" },
];

export function WebGLFallbackPanel({ reason, onRetry }: WebGLFallbackPanelProps) {
  const openSearch = useOpenExploreSearch();
  const openComparator = useComparatorStore((s) => s.openComparator);

  const isUnsupported = reason === "unsupported";
  const badgeText = isUnsupported ? "WebGL indisponível" : "Contexto 3D interrompido";
  const heading = isUnsupported
    ? "Visualização 3D indisponível neste dispositivo"
    : "O renderizador 3D encontrou uma falha";
  const description = isUnsupported
    ? "Seu navegador ou placa gráfica não forneceu um contexto WebGL ativo. Você pode tentar inicializar novamente ou explorar normalmente a busca, o comparador, os países e os dossiês."
    : "O globo 3D precisou ser pausado após um erro de renderização, mas o restante da enciclopédia continua funcionando normalmente.";

  return (
    <div
      role="alert"
      data-testid="webgl-fallback"
      data-fallback-reason={reason}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-bg px-4 py-20"
    >
      <div className="pointer-events-auto w-full max-w-xl rounded-panel border border-line bg-surface/86 p-6 shadow-e2 backdrop-blur-md sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-card border border-warning/30 bg-warning/10 text-warning">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-caption text-warning">{badgeText}</p>
            <h2 className="mt-1 text-title font-semibold text-fg">{heading}</h2>
            <p className="mt-2 text-body text-fg-secondary">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <Button variant="primary" onClick={onRetry}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Recarregar contexto 3D
          </Button>
          <Button variant="secondary" onClick={openSearch}>
            <Search aria-hidden="true" className="size-4" />
            Busca universal
          </Button>
          <Button variant="secondary" onClick={openComparator}>
            <GitCompareArrows aria-hidden="true" className="size-4" />
            Comparador
          </Button>
          <Link
            href="/telluslab"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-line bg-surface-raised px-3.5 text-label font-medium text-fg transition-colors duration-fast ease-out hover:border-line-strong hover:bg-surface-hover"
          >
            <BookOpen aria-hidden="true" className="size-4" />
            Dossiês
          </Link>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-caption font-medium text-fg-muted">
            <Compass aria-hidden="true" className="size-3.5" />
            Abrir ficha de país diretamente
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {FEATURED_COUNTRIES.map((country) => (
              <button
                key={country.iso}
                type="button"
                onClick={() => selectCountry(country.iso)}
                className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface-raised px-3 text-caption font-medium text-fg-secondary transition-colors duration-fast ease-out hover:border-accent/40 hover:text-fg"
              >
                <span className="font-mono text-fg-muted">{country.iso}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface BoundaryState {
  hasError: boolean;
}

class GlobeCanvasErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error("[telluspedia] WebGL error boundary caught failure", {
      name: error.name,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return <WebGLFallbackPanel reason="render-error" onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

export interface WebGLErrorBoundaryProps {
  children: React.ReactNode;
  /** Permite injetar o detector de WebGL em testes determinísticos. */
  probeWebGL?: () => WebGLSupportResult;
}

export function WebGLErrorBoundary({ children, probeWebGL }: WebGLErrorBoundaryProps) {
  const [remountKey, setRemountKey] = useState(0);
  const [support, setSupport] = useState<WebGLSupportResult>(() =>
    probeWebGL ? probeWebGL() : { supported: true, version: null, reason: "ok" }
  );

  useEffect(() => {
    const result = probeWebGL ? probeWebGL() : detectWebGLSupport();
    setSupport(result);
  }, [probeWebGL, remountKey]);

  const handleReset = () => {
    const next = probeWebGL ? probeWebGL() : detectWebGLSupport();
    setSupport(next);
    setRemountKey((prev) => prev + 1);
  };

  if (!support.supported) {
    return <WebGLFallbackPanel reason="unsupported" onRetry={handleReset} />;
  }

  return (
    <GlobeCanvasErrorBoundary key={remountKey} onReset={handleReset}>
      {children}
    </GlobeCanvasErrorBoundary>
  );
}
