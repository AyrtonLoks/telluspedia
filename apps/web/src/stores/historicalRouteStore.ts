import { create } from "zustand";
import { MAGELLAN_ROUTE } from "../lib/historical-routes";
import { useTimelineStore } from "./timelineStore";

export interface HistoricalRouteState {
  activeRouteId: string | null;
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0
  currentWaypointIndex: number;
  playbackSpeed: number; // 0.5x, 1x, 2x, 5x
  isMinimized: boolean;

  setActiveRouteId: (id: string | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (progress: number) => void;
  setProgress: (progress: number) => void;
  nextWaypoint: () => void;
  prevWaypoint: () => void;
  jumpToWaypoint: (index: number) => void;
  reset: () => void;
  tick: (deltaSeconds: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleMinimized: () => void;
}

export const useHistoricalRouteStore = create<HistoricalRouteState>((set, get) => {
  const waypointsCount = MAGELLAN_ROUTE.waypoints.length;

  const syncTimelineYearForWaypoint = (index: number) => {
    try {
      if (useTimelineStore.getState().geologicalMa !== null) return;
      const wp = MAGELLAN_ROUTE.waypoints[index];
      if (wp?.calendarDate) {
        const yr = parseInt(wp.calendarDate.slice(0, 4), 10);
        if (Number.isFinite(yr) && yr >= 1519 && yr <= 1522) {
          useTimelineStore.getState().selectYear(yr);
        }
      }
    } catch {
      // Safe fallback in isolated environments
    }
  };

  return {
    activeRouteId: null,
    isPlaying: false,
    progress: 0.0,
    currentWaypointIndex: 0,
    playbackSpeed: 1.0,
    isMinimized: false,

    setActiveRouteId: (id) => {
      if (!id) {
        set({ activeRouteId: null, isPlaying: false });
        try {
          if (useTimelineStore.getState().activeRouteId !== null) {
            useTimelineStore.getState().setActiveRouteId(null);
          }
        } catch {
          // safe
        }
        return;
      }
      set({
        activeRouteId: id,
        isPlaying: true,
        progress: 0.0,
        currentWaypointIndex: 0,
      });
      try {
        if (useTimelineStore.getState().activeRouteId !== id) {
          useTimelineStore.getState().setActiveRouteId(id);
        }
        if (useTimelineStore.getState().geologicalMa === null) {
          useTimelineStore.getState().selectYear(1519);
        }
      } catch {
        // safe
      }
    },

    play: () => {
      const state = get();
      if (state.progress >= 1.0) {
        set({ progress: 0.0, currentWaypointIndex: 0, isPlaying: true });
        syncTimelineYearForWaypoint(0);
      } else {
        set({ isPlaying: true });
      }
    },

    pause: () => set({ isPlaying: false }),

    togglePlay: () => {
      const state = get();
      if (!state.isPlaying) {
        if (state.progress >= 1.0) {
          set({ progress: 0.0, currentWaypointIndex: 0, isPlaying: true });
          syncTimelineYearForWaypoint(0);
        } else {
          set({ isPlaying: true });
        }
      } else {
        set({ isPlaying: false });
      }
    },

    seek: (prog) => {
      const clamped = Math.max(0, Math.min(1, Number(prog.toFixed(4))));
      const waypointIdx = Math.min(
        waypointsCount - 1,
        Math.floor(clamped * (waypointsCount - 1) + 0.5)
      );
      set({ progress: clamped, currentWaypointIndex: waypointIdx });
      syncTimelineYearForWaypoint(waypointIdx);
    },

    setProgress: (prog) => {
      get().seek(prog);
    },

    nextWaypoint: () => {
      const state = get();
      if (state.currentWaypointIndex < waypointsCount - 1) {
        const nextIdx = state.currentWaypointIndex + 1;
        const newProg = Number((nextIdx / (waypointsCount - 1)).toFixed(4));
        set({ currentWaypointIndex: nextIdx, progress: newProg });
        syncTimelineYearForWaypoint(nextIdx);
      }
    },

    prevWaypoint: () => {
      const state = get();
      if (state.currentWaypointIndex > 0) {
        const prevIdx = state.currentWaypointIndex - 1;
        const newProg = Number((prevIdx / (waypointsCount - 1)).toFixed(4));
        set({ currentWaypointIndex: prevIdx, progress: newProg });
        syncTimelineYearForWaypoint(prevIdx);
      }
    },

    jumpToWaypoint: (index) => {
      const clampedIndex = Math.max(0, Math.min(waypointsCount - 1, index));
      const newProg = Number((clampedIndex / (waypointsCount - 1)).toFixed(4));
      set({ currentWaypointIndex: clampedIndex, progress: newProg });
      syncTimelineYearForWaypoint(clampedIndex);
    },

    reset: () => {
      set({ progress: 0.0, currentWaypointIndex: 0, isPlaying: false });
      syncTimelineYearForWaypoint(0);
    },

    tick: (deltaSeconds: number) => {
      const state = get();
      if (!state.isPlaying) return;
      const now = Date.now();
      if ((state as any)._lastTickTime && now - (state as any)._lastTickTime < 5) {
        return;
      }
      (state as any)._lastTickTime = now;

      // 90 seconds for complete circumnavigation at 1x speed
      const baseDurationSeconds = 90.0;
      const deltaProgress = (deltaSeconds * state.playbackSpeed) / baseDurationSeconds;
      const nextProgress = state.progress + deltaProgress;
      if (nextProgress >= 1.0) {
        state.seek(1.0);
        set({ isPlaying: false });
      } else {
        state.seek(nextProgress);
      }
    },

    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),
  };
});
