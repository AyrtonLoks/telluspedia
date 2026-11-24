"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { registerServiceWorker } from "@/lib/pwa/sw-policy";
import { useI18n } from "@/lib/i18n/useT";

function subscribeOnlineStatus(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getClientOnlineSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function getServerOnlineSnapshot(): boolean {
  // Mantém o mesmo valor no SSR e na hidratação inicial (sem mismatch React).
  return true;
}

export interface OfflineIndicatorProps {
  /** Override opcional para testes SSR/unitários. */
  offline?: boolean;
  onDismiss?: () => void;
}

/** Aviso discreto D14 exibido apenas quando o navegador perde conectividade (T46). */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ offline = false, onDismiss }) => {
  const { t } = useI18n();
  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
      className="pointer-events-auto fixed bottom-3 right-3 z-40 flex max-w-[min(calc(100vw-1.5rem),22rem)] items-start gap-2.5 rounded-panel border border-warning/40 bg-surface/86 px-3 py-2 shadow-e2 backdrop-blur-md xl:bottom-4 xl:right-6"
    >
      <WifiOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-caption font-semibold text-fg">
          {t("pwa.offlineTitle", "Modo offline")}
        </p>
        <p className="text-caption text-fg-secondary">
          {t(
            "pwa.offlineBody",
            "Camadas ao vivo pausadas; catálogo enciclopédico continua acessível."
          )}
        </p>
      </div>
      {onDismiss && (
        <IconButton
          size="sm"
          label={t("pwa.dismissOfflineAria", "Dispensar aviso de modo offline")}
          icon={<X />}
          onClick={onDismiss}
        />
      )}
    </div>
  );
};

/**
 * Gerencia o ciclo de vida PWA na raiz da aplicação (T46):
 * - Registra `/sw.js` em produção após `window.load` sem competir com o globo WebGL.
 * - Exibe o indicador discreto D14 quando `navigator.onLine === false`, reaparecendo em nova queda.
 */
export const PwaLifecycle: React.FC = () => {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getClientOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (isOnline) setDismissed(false);
  }, [isOnline]);

  return <OfflineIndicator offline={!isOnline && !dismissed} onDismiss={() => setDismissed(true)} />;
};
