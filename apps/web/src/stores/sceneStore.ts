import { create } from "zustand";
import { getScene, isPlayableScene, isSceneLoaded, loadScene, sceneOpenedBy, sceneStartYear, sceneStepIndex, sceneStepStarts, sceneStepYear } from "../lib/scenes/catalog";
import { useTimelineStore } from "./timelineStore";
import { useGlobeStore } from "./globeStore";

/**
 * Store único das cenas (D12d): qual cena está aberta, a reprodução dela e o estado anterior para
 * restaurar ao sair. Substitui `historicalRouteStore` e `apollo11Store` — nenhum nome de evento aqui;
 * passos, duração e progresso inicial vêm dos dados da cena (`src/data/scenes/`).
 *
 * Uma cena abre só por seleção explícita: `openScene` (rota/preset, busca, link `?cena=`) ou a
 * seleção de um marco que abre cena (pin/timeline). O ano da timeline nunca abre cena.
 */
export interface SceneSnapshot {
  selectedYear: number | null;
  selectedMilestoneId: string | null;
  startYear: number;
  endYear: number;
  geologicalMa: number | null;
  selectedIso: string | null;
  camera: { lat: number; lng: number; altitude: number };
}

export interface SceneState {
  activeSceneId: string | null;
  /** Estado anterior à abertura (restaurado em `closeScene`). */
  previous: SceneSnapshot | null;
  isPlaying: boolean;
  progress: number;
  stepIndex: number;
  playbackSpeed: number;
  isMinimized: boolean;

  /**
   * Abre a cena. `applyTimeline` leva a timeline ao ano de início da cena (saindo do modo
   * geológico) — usado pela seleção explícita da rota e pelo link; o marco já define o ano.
   */
  openScene: (id: string, options?: { snapshot?: SceneSnapshot | null; autoplay?: boolean; applyTimeline?: boolean }) => boolean;
  closeScene: (options?: { restore?: boolean }) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (progress: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  jumpToStep: (index: number) => void;
  reset: () => void;
  tick: (deltaSeconds: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleMinimized: () => void;
}

const clamp01 = (p: number) => Math.max(0, Math.min(1, Number(p.toFixed(4))));

export function captureSceneSnapshot(): SceneSnapshot {
  const t = useTimelineStore.getState();
  const g = useGlobeStore.getState();
  return {
    selectedYear: t.selectedYear,
    selectedMilestoneId: t.selectedMilestoneId,
    startYear: t.startYear,
    endYear: t.endYear,
    geologicalMa: t.geologicalMa,
    selectedIso: g.selectedIso,
    camera: { lat: g.cameraLat, lng: g.cameraLng, altitude: g.cameraAltitude },
  };
}

function restoreSnapshot(s: SceneSnapshot) {
  useTimelineStore.setState({
    selectedYear: s.selectedYear,
    selectedMilestoneId: s.selectedMilestoneId,
    startYear: s.startYear,
    endYear: s.endYear,
    geologicalMa: s.geologicalMa,
  });
  const globe = useGlobeStore.getState();
  globe.setSelectedIso(s.selectedIso);
  globe.flyTo(s.camera.lat, s.camera.lng, s.camera.altitude);
}

const activeScene = (id: string | null) => (id ? getScene(id) : undefined);

export const useSceneStore = create<SceneState>((set, get) => {
  // O ano da timeline acompanha o passo (data do ponto/fase), dentro do período da cena.
  const syncYear = (idx: number) => {
    const scene = activeScene(get().activeSceneId);
    const year = sceneStepYear(scene, idx);
    const timeline = useTimelineStore.getState();
    if (year !== null && timeline.geologicalMa === null && timeline.selectedYear !== year) timeline.selectYear(year);
  };
  const setProgress = (p: number) => {
    const progress = clamp01(p);
    const prevIdx = get().stepIndex;
    const stepIndex = sceneStepIndex(activeScene(get().activeSceneId), progress);
    set({ progress, stepIndex });
    if (stepIndex !== prevIdx) syncYear(stepIndex);
  };
  const goToStep = (i: number) => {
    const starts = sceneStepStarts(activeScene(get().activeSceneId));
    if (starts.length === 0) return;
    const idx = Math.max(0, Math.min(starts.length - 1, i));
    set({ progress: starts[idx], stepIndex: idx });
    syncYear(idx);
  };

  return {
    activeSceneId: null,
    previous: null,
    isPlaying: false,
    progress: 0,
    stepIndex: 0,
    playbackSpeed: 1,
    isMinimized: false,

    openScene: (id, options = {}) => {
      const scene = getScene(id);
      if (!isPlayableScene(scene)) return false;
      const state = get();
      if (state.activeSceneId === id) return true;
      // Trocar de cena mantém o estado de antes da primeira (sair volta ao ponto de partida).
      const previous = state.activeSceneId ? state.previous : options.snapshot ?? captureSceneSnapshot();
      const start = scene.hud?.startProgress ?? 0;
      set({
        activeSceneId: id,
        previous,
        isPlaying: options.autoplay ?? true,
        progress: start,
        stepIndex: sceneStepIndex(scene, start),
      });
      if (options.applyTimeline) useTimelineStore.setState({ geologicalMa: null, selectedYear: sceneStartYear(scene) });
      // Cena sob demanda (D24): quando a parte pesada chega, recalcula o passo e o ano da timeline.
      if (!isSceneLoaded(id)) {
        void loadScene(id).then(() => {
          if (get().activeSceneId !== id) return;
          const full = getScene(id);
          // O HUD também chega agora: aplica o progresso inicial se ninguém mexeu ainda.
          const begin = full?.hud?.startProgress ?? 0;
          if (get().progress === 0 && begin > 0) set({ progress: begin });
          const stepIndex = sceneStepIndex(full, get().progress);
          set({ stepIndex });
          syncYear(stepIndex);
        });
      }
      return true;
    },

    closeScene: ({ restore = true } = {}) => {
      const { previous, activeSceneId } = get();
      if (!activeSceneId) return;
      set({ activeSceneId: null, previous: null, isPlaying: false });
      if (restore && previous) restoreSnapshot(previous);
      else if (sceneOpenedBy(useTimelineStore.getState().selectedMilestoneId)?.id === activeSceneId) {
        useTimelineStore.getState().selectMilestone(null);
      }
    },

    play: () => {
      if (get().progress >= 1) setProgress(0);
      set({ isPlaying: true });
    },
    pause: () => set({ isPlaying: false }),
    togglePlay: () => (get().isPlaying ? get().pause() : get().play()),
    seek: setProgress,
    nextStep: () => goToStep(get().stepIndex + 1),
    prevStep: () => goToStep(get().stepIndex - 1),
    jumpToStep: goToStep,
    reset: () => {
      setProgress(0);
      set({ isPlaying: false });
    },
    tick: (dt) => {
      const s = get();
      if (!s.isPlaying) return;
      const duration = activeScene(s.activeSceneId)?.hud?.durationSeconds ?? 90;
      const next = s.progress + (dt * s.playbackSpeed) / duration;
      if (next >= 1) {
        setProgress(1);
        set({ isPlaying: false });
      } else setProgress(next);
    },
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    toggleMinimized: () => set((s) => ({ isMinimized: !s.isMinimized })),
  };
});

/**
 * Selecionar um marco que abre cena (pin, timeline, busca) abre a cena e guarda o estado de antes do
 * clique. A cena só fecha pelo botão de fechar ou ao abrir outra cena (D24): desmarcar o marco,
 * clicar no globo, num país ou num marco simples não interrompe a cena.
 */
useTimelineStore.subscribe((state, prev) => {
  if (state.selectedMilestoneId === prev.selectedMilestoneId) return;
  const scenes = useSceneStore.getState();
  const target = sceneOpenedBy(state.selectedMilestoneId);
  if (target) {
    if (scenes.activeSceneId === target.id) return;
    const snapshot: SceneSnapshot = {
      selectedYear: prev.selectedYear,
      selectedMilestoneId: prev.selectedMilestoneId,
      startYear: prev.startYear,
      endYear: prev.endYear,
      geologicalMa: prev.geologicalMa,
      ...(({ selectedIso, cameraLat, cameraLng, cameraAltitude }) => ({
        selectedIso,
        camera: { lat: cameraLat, lng: cameraLng, altitude: cameraAltitude },
      }))(useGlobeStore.getState()),
    };
    scenes.openScene(target.id, { snapshot });
  }
});

export const sceneActions = {
  open: (id: string) => useSceneStore.getState().openScene(id, { applyTimeline: true }),
  close: (restore = true) => useSceneStore.getState().closeScene({ restore }),
};
