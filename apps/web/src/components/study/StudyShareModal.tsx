"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Share2, Copy, Check, Library } from "lucide-react";
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
import { useChoroplethStore } from "@/stores/choroplethStore";
import { CHOROPLETH_INDICATORS } from "@/lib/choropleth";
import {
  MAP_PROJECTION_SHORT_LABELS,
  MAP_PROJECTION_SHORT_LABELS_EN,
} from "@/lib/map-projections-types";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/useT";
import { StudyShareBadges } from "./StudyShareBadges";

export const StudyShareModal: React.FC = () => {
  const { locale, t } = useI18n();
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
  const storeAnnotations = useStudyStore((s) => s.annotations);
  const annotations =
    typeof window === "undefined" ? useStudyStore.getState().annotations : storeAnnotations;
  const currentStudyId = useStudyStore((s) => s.currentStudyId);
  const draftParentId = useStudyStore((s) => s.parentId);

  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const cameraLat = useGlobeStore((s) => s.cameraLat);
  const cameraLng = useGlobeStore((s) => s.cameraLng);
  const cameraAltitude = useGlobeStore((s) => s.cameraAltitude);
  const mapViewMode = useGlobeStore((s) => s.viewMode);
  const mapProjection = useGlobeStore((s) => s.projectionId);

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

  const storeChoroplethIndicator = useChoroplethStore((s) => s.activeIndicator);
  const storeChoroplethYear = useChoroplethStore((s) => s.year);
  const activeChoroplethIndicator =
    typeof window === "undefined"
      ? (useChoroplethStore.getState().activeIndicator ?? null)
      : storeChoroplethIndicator;
  const activeChoroplethYear =
    typeof window === "undefined" ? useChoroplethStore.getState().year : storeChoroplethYear;

  const storeGibsProduct = useObservatoryStore((s) => s.gibsProduct);
  const storeGibsShown = useObservatoryStore((s) => s.gibs);
  const gibsProduct = typeof window === "undefined" ? useObservatoryStore.getState().gibsProduct : storeGibsProduct;
  const gibsShown = typeof window === "undefined" ? useObservatoryStore.getState().gibs : storeGibsShown;

  const [shareUrl, setShareUrl] = useState<string>("");
  const [temporaryShare, setTemporaryShare] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const eraDef = HISTORICAL_ERAS[epoch.historicalEraId];
  const isHistoricalEraActive = epoch.mode !== "GEOLOGICAL" && eraDef.id !== "CONTEMPORARY";
  const isApollo11Active = sceneHasTrajectoryKind(epoch.activeScene, "cislunar");

  const geologicalEraDef = geologicalMa ? resolveGeologicalEra(geologicalMa) : null;
  const historicalRouteDef = activeRouteId ? getHistoricalRoute(activeRouteId) : null;

  const isContemporary = epoch.isContemporary;
  const effectiveObservatoryLayers = isContemporary ? activeObservatoryLayers : [];
  const effectiveChoroplethIndicator =
    isContemporary && !isCosmicMode ? activeChoroplethIndicator : null;
  const choroplethMeta = effectiveChoroplethIndicator
    ? CHOROPLETH_INDICATORS[effectiveChoroplethIndicator]
    : null;

  const gibsOn = effectiveObservatoryLayers.includes("NASA_GIBS");
  const gibsSnapshot = gibsOn
    ? { gibsProduct, gibsMonth: gibsShown?.product === gibsProduct ? gibsShown.month : null }
    : { gibsProduct: null, gibsMonth: null };
  const is2dSnapshot = !isCosmicMode && mapViewMode === "2d";
  const map2dSnapshot = is2dSnapshot
    ? { mapViewMode: "2d" as const, mapProjection }
    : { mapViewMode: null, mapProjection: null };
  const projectionShortLabel =
    locale === "en"
      ? MAP_PROJECTION_SHORT_LABELS_EN[mapProjection]
      : MAP_PROJECTION_SHORT_LABELS[mapProjection];
  const effectiveAnnotations = isCosmicMode ? [] : annotations;

  const handleGenerateLink = async () => {
    setLoading(true);
    setErrorMsg("");
    const selectedCountries = Array.from(
      new Set([selectedIso, ...comparatorIsos].filter(Boolean) as string[])
    );
    const parentIdToPersist = currentStudyId === null && draftParentId ? draftParentId : null;

    const payload = {
      ...(parentIdToPersist ? { parentId: parentIdToPersist } : {}),
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
      choroplethIndicator: effectiveChoroplethIndicator,
      choroplethYear: effectiveChoroplethIndicator ? activeChoroplethYear : null,
      annotations: effectiveAnnotations,
      ...gibsSnapshot,
      ...map2dSnapshot,
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
          choroplethIndicator: effectiveChoroplethIndicator,
          annotations: effectiveAnnotations,
        });
      } else if (res.status === 503) {
        setErrorMsg(t("study.errDbUnavailable", "O banco de dados de estudos está indisponível. Tente gerar o link novamente em instantes."));
      } else {
        setErrorMsg(t("study.errSaveFailed", "Não foi possível registrar o snapshot do estudo no servidor."));
      }
    } catch {
      setErrorMsg(t("study.errConnection", "Erro de conexão ao salvar estudo."));
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
            <span>{t("study.shareTitle", "Compartilhar estudo imutável")}</span>
          </span>
        }
        description={t("study.shareDesc", "Salve o estado atual do globo, linha do tempo e camadas como um link permanente.")}
        footer={
          <>
            <Link
              href="/studies"
              onClick={() => setShareModalOpen(false)}
              className="mr-auto inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-caption font-medium text-accent transition-colors duration-fast ease-out hover:bg-surface-hover hover:text-accent-hover"
            >
              <Library aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("study.gallery", "Galeria de estudos")}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setShareModalOpen(false)}>
              {t("common.cancel", "Cancelar")}
            </Button>
            {!shareUrl && (
              <Button variant="primary" size="sm" onClick={handleGenerateLink} disabled={loading}>
                {loading ? t("study.creating", "Criando snapshot...") : t("study.generateLink", "Gerar link de estudo")}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 text-label">
          <div>
            <label htmlFor="study-title-input" className="mb-1 block text-caption font-medium text-fg-secondary">
              {t("study.titleLabel", "Título do estudo")}
            </label>
            <input
              id="study-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-card border border-line-strong bg-surface-sunken px-3 py-2 text-label text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              placeholder={t("study.titlePlaceholder", "Ex: Análise Comparativa do Cone Sul e Europa")}
            />
          </div>

          <div>
            <label htmlFor="study-notes-input" className="mb-1 block text-caption font-medium text-fg-secondary">
              {t("study.notesLabel", "Anotações e contexto científico")}
            </label>
            <textarea
              id="study-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-card border border-line-strong bg-surface-sunken px-3 py-2 text-label text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              placeholder={t("study.notesPlaceholder", "Descreva as hipóteses ou conclusões deste recorte planetário...")}
            />
          </div>

          <StudyShareBadges
            locale={locale}
            isHistoricalEraActive={isHistoricalEraActive}
            historicalEraLabel={eraDef.label}
            isApollo11Active={isApollo11Active}
            geologicalMa={geologicalMa}
            geologicalEraName={geologicalEraDef?.name ?? null}
            activeRouteId={activeRouteId}
            historicalRouteTitle={historicalRouteDef?.title ?? null}
            effectiveObservatoryLayers={effectiveObservatoryLayers}
            choroplethMeta={choroplethMeta}
            activeChoroplethYear={activeChoroplethYear}
            gibsOn={gibsOn}
            gibsProduct={gibsProduct}
            gibsMonth={gibsSnapshot.gibsMonth}
            is2dSnapshot={is2dSnapshot}
            projectionShortLabel={projectionShortLabel}
            isCosmicMode={Boolean(isCosmicMode)}
            focusedBodyId={focusedBodyId}
            activeCosmicLayers={activeCosmicLayers}
            annotationsCount={effectiveAnnotations.length}
          />

          <div className="space-y-1 rounded-card border border-line bg-surface-sunken p-3 text-caption text-fg-secondary">
            <div className="font-semibold text-fg">{t("study.autoCaptured", "Recorte capturado automaticamente:")}</div>
            <div className="font-mono tabular-nums">
              • {t("study.period", "Período")}: {startYear} — {endYear} ({endYear - startYear} {t("common.years", "anos")})
            </div>
            <div>
              • {t("study.countries", "Países")}: {[selectedIso, ...comparatorIsos].filter(Boolean).join(", ") || t("study.globalView", "Visão Global")}
            </div>
            <div className="font-mono tabular-nums">
              • {t("study.cameraCoords", "Coordenadas da câmera")}: ({cameraLat.toFixed(1)}°, {cameraLng.toFixed(1)}°)
            </div>
            {effectiveAnnotations.length > 0 && (
              <div className="font-medium text-accent">
                • {t("study.pinsCountLabel", "Pinos anotados")}: {effectiveAnnotations.length}
              </div>
            )}
            {isHistoricalEraActive && (
              <div className="font-medium text-warning">• {t("study.historicalEra", "Era Histórica")}: {eraDef.label}</div>
            )}
            {isApollo11Active && (
              <div className="font-medium text-accent">
                • {t("study.spaceMission", "Missão Espacial: Apollo 11 (Trajetória Translunar Ativa)")}
              </div>
            )}
            {geologicalMa && (
              <div className="font-medium text-success">
                • {t("study.paleogeography", "Paleogeografia")}: {geologicalEraDef?.name || `${geologicalMa} Ma`}
              </div>
            )}
            {activeRouteId && (
              <div className="font-medium text-cat-politics">
                • {t("study.route3d", "Rota Histórica 3D")}: {historicalRouteDef?.title || activeRouteId}
              </div>
            )}
            {effectiveObservatoryLayers.length > 0 && (
              <div className="font-medium text-accent">
                • {t("study.observatory", "Observatório")}: {effectiveObservatoryLayers.length} {t("study.activeLayersShort", "camada(s) ativa(s)")}
              </div>
            )}
            {isCosmicMode && (
              <div className="font-medium text-warning">
                • {t("study.cosmicExpansion", "Expansão Cósmica: Sistema Solar")} ({focusedBodyId || t("cosmic.overview", "Visão Geral")}, {activeCosmicLayers.length} {t("study.layersWord", "camadas")})
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
                {temporaryShare
                  ? t("study.tempLinkTitle", "Link temporário deste servidor")
                  : t("study.permLinkTitle", "Link permanente e imutável gerado:")}
              </span>
              {temporaryShare && (
                <p className="text-caption text-fg-secondary">
                  {t("study.tempLinkHint", "O link pode deixar de funcionar ao reiniciar o servidor.")}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  aria-label={t("study.linkAria", "Link do estudo compartilhável")}
                  value={shareUrl}
                  className="flex-1 select-all rounded-control border border-line-strong bg-surface-sunken px-2.5 py-1.5 font-mono text-caption text-fg"
                />
                <Button variant="primary" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? t("common.copied", "Copiado") : t("common.copy", "Copiar")}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
