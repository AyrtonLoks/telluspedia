"use client";

import React, { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { useStudyStore } from "@/stores/studyStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { HISTORICAL_ERAS } from "@/lib/historical-entities";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { useSceneStore } from "@/stores/sceneStore";
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { getHistoricalRoute } from "@/lib/historical-routes";
import { sceneHasTrajectoryKind } from "@/lib/scenes/catalog";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useCosmicStore } from "@/stores/cosmicStore";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export const StudyShareModal: React.FC = () => {
  const storeIsShareModalOpen = useStudyStore((s) => s.isShareModalOpen);
  const isShareModalOpen =
    typeof window === "undefined"
      ? (useStudyStore.getState().isShareModalOpen ?? storeIsShareModalOpen)
      : storeIsShareModalOpen;
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);
  const title = useStudyStore((s) => s.title);
  const setTitle = useStudyStore((s) => s.setTitle);
  const description = useStudyStore((s) => s.description);
  const notes = useStudyStore((s) => s.notes);
  const setNotes = useStudyStore((s) => s.setNotes);

  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const cameraLat = useGlobeStore((s) => s.cameraLat);
  const cameraLng = useGlobeStore((s) => s.cameraLng);
  const cameraAltitude = useGlobeStore((s) => s.cameraAltitude);

  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const startYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().startYear ?? storeStartYear)
      : storeStartYear;
  const endYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().endYear ?? storeEndYear)
      : storeEndYear;

  const activeCategories = useTimelineStore((s) => s.activeCategories);
  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  // Época ativa: fonte única (T12)
  const epoch = useEpochState();
  const geologicalMa = epoch.geologicalMa;

  // Só rotas de superfície vão para o estudo como rota; a missão Terra–Lua volta pelo marco.
  const storeSceneId = useSceneStore((s) => s.activeSceneId);
  const openSceneId = typeof window === "undefined" ? useSceneStore.getState().activeSceneId : storeSceneId;
  const activeRouteId = sceneHasTrajectoryKind(openSceneId, "surface") ? openSceneId : null;

  const storeObservatoryLayers = useObservatoryStore((s) => s.activeLayers);
  const activeObservatoryLayers =
    typeof window === "undefined"
      ? (useObservatoryStore.getState().activeLayers || [])
      : (storeObservatoryLayers || []);

  const storeCosmicMode = useCosmicStore((s) => s.isCosmicMode);
  const isCosmicMode =
    typeof window === "undefined"
      ? (useCosmicStore.getState().isCosmicMode ?? storeCosmicMode)
      : storeCosmicMode;
  const storeFocusedBody = useCosmicStore((s) => s.focusedBodyId);
  const focusedBodyId =
    typeof window === "undefined"
      ? (useCosmicStore.getState().focusedBodyId ?? storeFocusedBody)
      : storeFocusedBody;
  const storeCosmicLayers = useCosmicStore((s) => s.activeCosmicLayers);
  const activeCosmicLayers =
    typeof window === "undefined"
      ? (useCosmicStore.getState().activeCosmicLayers || [])
      : (storeCosmicLayers || []);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [temporaryShare, setTemporaryShare] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Sem retorno antecipado: com `open` falso o Dialog não renderiza nada e anima a saída (D17).
  // Era histórica, cena Apollo 11 e contemporaneidade vêm do seletor único (T12):
  // a Apollo só conta quando o marco/estudo a ativou explicitamente, não pelo ano.
  const eraDef = HISTORICAL_ERAS[epoch.historicalEraId];
  const isHistoricalEraActive = epoch.mode !== "GEOLOGICAL" && eraDef.id !== "CONTEMPORARY";
  const isApollo11Active = sceneHasTrajectoryKind(epoch.activeScene, "cislunar");

  const geologicalEraDef = geologicalMa ? resolveGeologicalEra(geologicalMa) : null;
  const historicalRouteDef = activeRouteId ? getHistoricalRoute(activeRouteId) : null;

  const isContemporary = epoch.isContemporary;
  const effectiveObservatoryLayers = isContemporary ? activeObservatoryLayers : [];

  const handleGenerateLink = async () => {
    setLoading(true);
    setErrorMsg("");
    const selectedCountries = Array.from(
      new Set([selectedIso, ...comparatorIsos].filter(Boolean) as string[])
    );

    const payload = {
      title,
      description,
      timelineStartYear: startYear,
      timelineEndYear: endYear,
      selectedCountryIsos: selectedCountries,
      activeCategories,
      cameraLat,
      cameraLng,
      cameraAltitude,
      markdownNotes: notes,
      historicalEra: isHistoricalEraActive ? eraDef.id : null,
      isApollo11Active,
      geologicalMa: geologicalMa ?? null,
      activeRouteId: activeRouteId ?? null,
      activeObservatoryLayers: effectiveObservatoryLayers,
      isCosmicMode: Boolean(isCosmicMode),
      focusedCelestialBody: focusedBodyId,
      activeCosmicLayers: isCosmicMode ? activeCosmicLayers : [],
    };

    try {
      const res = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        setTemporaryShare(res.headers.get("x-study-persistence") === "memory");
        setShareUrl(`${origin}/study/${data.id}`);

        useStudyStore.getState().restoreStudy({
          id: data.id,
          parentId: data.parentId || null,
          title,
          description,
          notes,
          historicalEra: isHistoricalEraActive ? eraDef.id : null,
          isApollo11Active,
          geologicalMa: geologicalMa ?? null,
          activeRouteId: activeRouteId ?? null,
          activeObservatoryLayers: effectiveObservatoryLayers,
          isCosmicMode: Boolean(isCosmicMode),
          focusedCelestialBody: focusedBodyId,
          activeCosmicLayers: isCosmicMode ? activeCosmicLayers : [],
        });
      } else if (res.status === 503) {
        setErrorMsg("O banco de dados de estudos está indisponível. Tente gerar o link novamente em instantes.");
      } else {
        setErrorMsg("Não foi possível registrar o snapshot do estudo no servidor.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao salvar estudo.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isShareModalOpen} onOpenChange={(open) => setShareModalOpen(open)}>
      <DialogContent
        className="w-[min(92vw,34rem)]"
        title={
          <span className="flex items-center gap-2">
            <Share2 aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <span>Compartilhar estudo imutável</span>
          </span>
        }
        description="Salve o estado atual do globo, linha do tempo e camadas como um link permanente."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShareModalOpen(false)}>
              Cancelar
            </Button>
            {!shareUrl && (
              <Button variant="primary" size="sm" onClick={handleGenerateLink} disabled={loading}>
                {loading ? "Criando snapshot..." : "Gerar link de estudo"}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 text-label">
          <div>
            <label htmlFor="study-title-input" className="mb-1 block text-caption font-medium text-fg-secondary">
              Título do estudo
            </label>
            <input
              id="study-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-card border border-line-strong bg-surface-sunken px-3 py-2 text-label text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              placeholder="Ex: Análise Comparativa do Cone Sul e Europa"
            />
          </div>

          <div>
            <label htmlFor="study-notes-input" className="mb-1 block text-caption font-medium text-fg-secondary">
              Anotações e contexto científico
            </label>
            <textarea
              id="study-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-card border border-line-strong bg-surface-sunken px-3 py-2 text-label text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              placeholder="Descreva as hipóteses ou conclusões deste recorte planetário..."
            />
          </div>

          {/* Historical Era Badge inside Modal */}
          {isHistoricalEraActive && (
            <div
              data-testid="modal-historical-era-badge"
              className="flex items-center gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">🏛️</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Cartografia Histórica Ativa Capturada</div>
                <div className="text-caption text-warning">{eraDef.label}</div>
              </div>
            </div>
          )}

          {/* Apollo 11 Space Mission Badge */}
          {isApollo11Active && (
            <div
              data-testid="modal-apollo11-badge"
              className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">🚀</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Missão Espacial Apollo 11 (1969)</div>
                <div className="text-caption text-accent">
                  Trajetória Translunar 3D e telemetria incluídas no estudo.
                </div>
              </div>
            </div>
          )}

          {/* Geological Era / Paleogeography Badge */}
          {geologicalMa && (
            <div
              data-testid="modal-geological-era-badge"
              className="flex items-center gap-2.5 rounded-card border border-success/40 bg-success/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">🌋</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Paleogeografia &amp; Deriva Continental Ativa</div>
                <div className="text-caption text-success">
                  {geologicalEraDef?.name || `Era Geológica: ${geologicalMa} Ma atrás`}
                </div>
              </div>
            </div>
          )}

          {/* Historical Route / Expedition Badge */}
          {activeRouteId && (
            <div
              data-testid="modal-historical-route-badge"
              className="flex items-center gap-2.5 rounded-card border border-cat-politics/40 bg-cat-politics/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">⛵</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Rota de Expedição Histórica 3D</div>
                <div className="text-caption text-cat-politics">
                  {historicalRouteDef?.title || `Expedição Marítima (${activeRouteId})`}
                </div>
              </div>
            </div>
          )}

          {/* Planetary Observatory Badge */}
          {effectiveObservatoryLayers.length > 0 && (
            <div
              data-testid="modal-observatory-badge"
              className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">📡</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Observatório Planetário Ativo</div>
                <div className="text-caption text-accent">
                  {effectiveObservatoryLayers.length} camada(s) científica(s) capturada(s) ({effectiveObservatoryLayers.join(", ")}).
                </div>
              </div>
            </div>
          )}

          {/* Cosmic / Solar System Mode Badge */}
          {isCosmicMode && (
            <div
              data-testid="modal-cosmic-badge"
              className="flex items-center gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3 text-label"
            >
              <span aria-hidden="true" className="select-none text-title">🪐</span>
              <div className="flex-1">
                <div className="font-semibold text-fg">Estudo Cósmico / Sistema Solar Ativo</div>
                <div className="text-caption text-warning">
                  {focusedBodyId ? `Foco Orbital: ${focusedBodyId}` : "Visão Panorâmica Heliocêntrica"} · {activeCosmicLayers.length} camadas cósmicas capturadas.
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1 rounded-card border border-line bg-surface-sunken p-3 text-caption text-fg-secondary">
            <div className="font-semibold text-fg">Recorte capturado automaticamente:</div>
            <div className="font-mono tabular-nums">
              • Período: {startYear} — {endYear} ({endYear - startYear} anos)
            </div>
            <div>
              • Países: {[selectedIso, ...comparatorIsos].filter(Boolean).join(", ") || "Visão Global"}
            </div>
            <div className="font-mono tabular-nums">
              • Coordenadas da câmera: ({cameraLat.toFixed(1)}°, {cameraLng.toFixed(1)}°)
            </div>
            {isHistoricalEraActive && (
              <div className="font-medium text-warning">• Era Histórica: {eraDef.label}</div>
            )}
            {isApollo11Active && (
              <div className="font-medium text-accent">
                • Missão Espacial: Apollo 11 (Trajetória Translunar Ativa)
              </div>
            )}
            {geologicalMa && (
              <div className="font-medium text-success">
                • Paleogeografia: {geologicalEraDef?.name || `${geologicalMa} Ma`}
              </div>
            )}
            {activeRouteId && (
              <div className="font-medium text-cat-politics">
                • Rota Histórica 3D: {historicalRouteDef?.title || activeRouteId}
              </div>
            )}
            {effectiveObservatoryLayers.length > 0 && (
              <div className="font-medium text-accent">
                • Observatório: {effectiveObservatoryLayers.length} camada(s) ativa(s)
              </div>
            )}
            {isCosmicMode && (
              <div className="font-medium text-warning">
                • Expansão Cósmica: Sistema Solar ({focusedBodyId || "Visão Geral"}, {activeCosmicLayers.length} camadas)
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-card border border-danger/40 bg-danger/10 p-3 text-caption text-danger"
            >
              {errorMsg}
            </div>
          )}

          {shareUrl && (
            <div className="space-y-2 rounded-card border border-accent/40 bg-accent/10 p-3">
              <span className="block text-caption font-medium text-accent">
                {temporaryShare ? "Link temporário deste servidor" : "Link permanente e imutável gerado:"}
              </span>
              {temporaryShare && (
                <p className="text-caption text-fg-secondary">
                  O link pode deixar de funcionar ao reiniciar o servidor.
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  aria-label="Link do estudo compartilhável"
                  value={shareUrl}
                  className="flex-1 select-all rounded-control border border-line-strong bg-surface-sunken px-2.5 py-1.5 font-mono text-caption text-fg"
                />
                <Button variant="primary" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
