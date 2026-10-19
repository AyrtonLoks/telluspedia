import { create } from "zustand";
import { APOLLO11_PHASES } from "../lib/apollo11";

interface Apollo11State {
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0
  playbackSpeed: number; // 0.5x, 1x, 2x, 5x
  isMinimized: boolean;

  setPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setProgress: (progress: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleMinimized: () => void;
  jumpToPhase: (phaseId: number) => void;
  resetMission: () => void;
}

export const useApollo11Store = create<Apollo11State>((set) => ({
  isPlaying: true,
  progress: 0.15, // Starts at TLI burn for immediate dramatic orbital view
  playbackSpeed: 1.0,
  isMinimized: false,

  setPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setProgress: (progress) =>
    set({ progress: Math.max(0, Math.min(1, Number(progress.toFixed(4)))) }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),

  jumpToPhase: (phaseId) => {
    const phase = APOLLO11_PHASES.find((p) => p.id === phaseId);
    if (phase) {
      set({ progress: phase.startProgress, isPlaying: true });
    }
  },

  resetMission: () => set({ progress: 0.0, isPlaying: true }),
}));
