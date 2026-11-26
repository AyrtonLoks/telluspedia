"use client";

import React, { useState } from "react";
import { Crosshair, GitFork, LocateFixed, MapPin, Plus, Share2, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/components/ui/cn";
import { formatCoordPair } from "@/lib/geodesic-ruler";
import { useI18n } from "@/lib/i18n/useT";
import {
  MAX_ANNOTATION_NOTE_LENGTH,
  MAX_ANNOTATION_TITLE_LENGTH,
  MAX_STUDY_ANNOTATIONS,
  STUDY_ANNOTATION_TONES,
  type StudyAnnotationTone,
} from "@/lib/study-annotations";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudyStore } from "@/stores/studyStore";
import { useStudioToolsStore } from "@/stores/studioToolsStore";

export interface StudyPinsPanelProps {
  immutable?: boolean;
  onUnlockDraftFork?: () => void;
}

const TONE_DOT_CLASS: Record<StudyAnnotationTone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

export const StudyPinsPanel: React.FC<StudyPinsPanelProps> = ({
  immutable = false,
  onUnlockDraftFork,
}) => {
  const { t } = useI18n();

  const storeOpen = useStudioToolsStore((s) => s.isPinsPanelOpen);
  const storePlacement = useStudioToolsStore((s) => s.isPinPlacementActive);
  const storePending = useStudioToolsStore((s) => s.pendingPinCoords);
  const storeSelectedId = useStudioToolsStore((s) => s.selectedAnnotationId);
  const storeAnnotations = useStudyStore((s) => s.annotations);

  const isOpen =
    typeof window === "undefined" ? useStudioToolsStore.getState().isPinsPanelOpen : storeOpen;
  const isPinPlacementActive =
    typeof window === "undefined"
      ? useStudioToolsStore.getState().isPinPlacementActive
      : storePlacement;
  const pendingPinCoords =
    typeof window === "undefined" ? useStudioToolsStore.getState().pendingPinCoords : storePending;
  const selectedAnnotationId =
    typeof window === "undefined"
      ? useStudioToolsStore.getState().selectedAnnotationId
      : storeSelectedId;
  const annotations =
    typeof window === "undefined" ? useStudyStore.getState().annotations : storeAnnotations;

  const setPinsPanelOpen = useStudioToolsStore((s) => s.setPinsPanelOpen);
  const setPinPlacementActive = useStudioToolsStore((s) => s.setPinPlacementActive);
  const pickPinCoordinates = useStudioToolsStore((s) => s.pickPinCoordinates);
  const clearPendingPin = useStudioToolsStore((s) => s.clearPendingPin);
  const selectAnnotation = useStudioToolsStore((s) => s.selectAnnotation);

  const addAnnotation = useStudyStore((s) => s.addAnnotation);
  const removeAnnotation = useStudyStore((s) => s.removeAnnotation);
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);

  const [pinTitle, setPinTitle] = useState("");
  const [pinNote, setPinNote] = useState("");
  const [pinTone, setPinTone] = useState<StudyAnnotationTone>("accent");
  const [validationError, setValidationError] = useState("");

  if (!isOpen && selectedAnnotationId === null) return null;

  const atLimit = annotations.length >= MAX_STUDY_ANNOTATIONS;

  const handleClose = () => {
    setPinsPanelOpen(false);
    selectAnnotation(null);
  };

  const handleUseCameraCenter = () => {
    const { cameraLat, cameraLng } = useGlobeStore.getState();
    pickPinCoordinates(cameraLat, cameraLng);
    setValidationError("");
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPinCoords) return;
    const cleanTitle = pinTitle.trim();
    if (!cleanTitle) {
      setValidationError(t("studio.pinErrTitle", "Informe um título curto para o pino."));
      return;
    }
    const created = addAnnotation({
      lat: pendingPinCoords.lat,
      lng: pendingPinCoords.lng,
      title: cleanTitle,
      note: pinNote.trim(),
      tone: pinTone,
    });
    if (!created) {
      setValidationError(t("studio.pinErrLimit", "Limite máximo de pinos atingido."));
      return;
    }
    setPinTitle("");
    setPinNote("");
    setValidationError("");
    clearPendingPin();
    selectAnnotation(created.id);
  };

  const handleFocusPin = (id: string, lat: number, lng: number) => {
    selectAnnotation(id);
    useGlobeStore.getState().flyTo(lat, lng, 1.9);
  };

  return (
    <Panel
      role="region"
      aria-label={t("studio.pinsAria", "Pinos anotados do estudo")}
      data-testid="study-pins-panel"
      className="pointer-events-auto flex w-full flex-col gap-2.5 p-3 shadow-e2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="text-label font-semibold text-fg">
              {t("studio.pinsTitle", "Pinos do estudo")}
            </h2>
            <Badge tone={annotations.length > 0 ? "accent" : "neutral"}>
              {annotations.length}/{MAX_STUDY_ANNOTATIONS}
            </Badge>
          </div>
          <p className="text-caption text-fg-muted">
            {t("studio.pinsSubtitle", "Marcadores georreferenciados (lat, lng) salvos no link")}
          </p>
        </div>

        <IconButton
          size="sm"
          data-testid="pins-close-btn"
          label={t("studio.pinsClose", "Fechar painel de pinos")}
          icon={<X />}
          onClick={handleClose}
        />
      </div>

      {immutable ? (
        <div
          data-testid="pins-immutable-notice"
          className="flex flex-col gap-2 rounded-card border border-accent/30 bg-accent/10 p-2.5 text-caption text-fg-secondary"
        >
          <span>
            {t(
              "studio.pinsImmutableHint",
              "Snapshot imutável (RN16). Inspecione os pinos abaixo ou derive uma cópia editável para adicionar novos marcadores."
            )}
          </span>
          {onUnlockDraftFork && (
            <Button
              size="sm"
              variant="primary"
              data-testid="pins-unlock-fork-btn"
              onClick={onUnlockDraftFork}
            >
              <GitFork aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t("studio.pinsUnlockFork", "Personalizar em cópia (fork)")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={isPinPlacementActive ? "primary" : "secondary"}
            data-testid="pin-pick-globe-btn"
            aria-pressed={isPinPlacementActive}
            disabled={atLimit}
            onClick={() => {
              setValidationError("");
              setPinPlacementActive(!isPinPlacementActive);
            }}
          >
            <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
            <span>
              {isPinPlacementActive
                ? t("studio.pinClickGlobeNow", "Clique no globo…")
                : t("studio.pinPickOnGlobe", "Marcar no globo")}
            </span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            data-testid="pin-use-center-btn"
            disabled={atLimit}
            onClick={handleUseCameraCenter}
            title={t("studio.pinUseCenterTitle", "Criar pino nas coordenadas centrais atuais da câmera")}
          >
            <LocateFixed aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t("studio.pinUseCenter", "Centro atual")}</span>
          </Button>
        </div>
      )}

      {!immutable && pendingPinCoords && (
        <form
          onSubmit={handleSavePin}
          data-testid="pin-create-form"
          className="space-y-2 rounded-card border border-accent/40 bg-surface-sunken p-2.5 text-caption"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-accent">
              {t("studio.newPinAt", "Novo pino em")}
            </span>
            <span className="font-mono text-fg-secondary tabular-nums">
              {formatCoordPair(pendingPinCoords.lat, pendingPinCoords.lng)}
            </span>
          </div>

          <div>
            <label htmlFor="studio-pin-title" className="sr-only">
              {t("studio.pinTitleLabel", "Título do pino")}
            </label>
            <input
              id="studio-pin-title"
              data-testid="pin-title-input"
              type="text"
              maxLength={MAX_ANNOTATION_TITLE_LENGTH}
              value={pinTitle}
              onChange={(e) => setPinTitle(e.target.value)}
              placeholder={t("studio.pinTitlePlaceholder", "Título (ex.: Porto de Santos — corredor exportador)")}
              className="w-full rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-caption text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="studio-pin-note" className="sr-only">
              {t("studio.pinNoteLabel", "Nota curta")}
            </label>
            <textarea
              id="studio-pin-note"
              data-testid="pin-note-input"
              rows={2}
              maxLength={MAX_ANNOTATION_NOTE_LENGTH}
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              placeholder={t("studio.pinNotePlaceholder", "Nota curta opcional (até 280 caracteres)…")}
              className="w-full resize-none rounded-control border border-line-strong bg-surface px-2.5 py-1.5 text-caption text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              role="radiogroup"
              aria-label={t("studio.pinToneAria", "Cor semântica do pino")}
              className="flex items-center gap-1.5"
            >
              {STUDY_ANNOTATION_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  role="radio"
                  aria-checked={pinTone === tone}
                  aria-label={tone}
                  onClick={() => setPinTone(tone)}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-transform duration-fast ease-out",
                    pinTone === tone ? "scale-110 border-fg" : "border-line opacity-70 hover:opacity-100"
                  )}
                >
                  <span className={cn("h-3 w-3 rounded-full", TONE_DOT_CLASS[tone])} />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                data-testid="pin-cancel-btn"
                onClick={() => {
                  clearPendingPin();
                  setValidationError("");
                }}
              >
                {t("common.cancel", "Cancelar")}
              </Button>
              <Button type="submit" size="sm" variant="primary" data-testid="pin-save-btn">
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{t("studio.pinSave", "Fixar pino")}</span>
              </Button>
            </div>
          </div>

          {validationError && (
            <p role="alert" className="text-caption text-danger">
              {validationError}
            </p>
          )}
        </form>
      )}

      {annotations.length === 0 ? (
        <p className="rounded-control border border-dashed border-line bg-surface-sunken px-2.5 py-3 text-center text-caption text-fg-muted">
          {t(
            "studio.pinsEmpty",
            "Nenhum pino anotado neste estudo. Marque um ponto no globo para registrar coordenadas e observações."
          )}
        </p>
      ) : (
        <ul
          data-testid="study-pins-list"
          className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-0.5 text-caption"
        >
          {annotations.map((pin) => {
            const isSelected = selectedAnnotationId === pin.id;
            return (
              <li
                key={pin.id}
                data-testid={`study-pin-item-${pin.id}`}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-card border p-2 transition-colors duration-fast ease-out",
                  isSelected
                    ? "border-accent/50 bg-accent/10"
                    : "border-line bg-surface-raised hover:border-line-strong"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleFocusPin(pin.id, pin.lat, pin.lng)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-fg">
                    <span
                      aria-hidden="true"
                      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TONE_DOT_CLASS[pin.tone])}
                    />
                    <span className="truncate">{pin.title}</span>
                  </span>
                  <span className="mt-0.5 block font-mono text-fg-muted tabular-nums">
                    {formatCoordPair(pin.lat, pin.lng)}
                  </span>
                  {pin.note && (
                    <span className="mt-1 block whitespace-pre-line text-fg-secondary">
                      {pin.note}
                    </span>
                  )}
                </button>

                {!immutable && (
                  <IconButton
                    size="sm"
                    data-testid={`pin-remove-${pin.id}`}
                    label={`${t("comp.remove", "Remover")} ${pin.title}`}
                    icon={<Trash2 />}
                    onClick={() => {
                      removeAnnotation(pin.id);
                      if (isSelected) selectAnnotation(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!immutable && annotations.length > 0 && (
        <div className="flex items-center justify-end border-t border-line pt-2">
          <Button
            size="sm"
            variant="secondary"
            data-testid="pins-open-share-btn"
            onClick={() => setShareModalOpen(true)}
          >
            <Share2 aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <span>{t("studio.pinsShareStudy", "Compartilhar estudo com pinos")}</span>
          </Button>
        </div>
      )}
    </Panel>
  );
};
