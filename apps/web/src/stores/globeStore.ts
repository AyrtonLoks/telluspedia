import { create } from "zustand";

interface GlobeState {
  selectedIso: string | null;
  hoveredIso: string | null;
  cameraLat: number;
  cameraLng: number;
  cameraAltitude: number;
  flyToTrigger: number;
  isReaderOpen: boolean;
  isThrottled: boolean;

  setSelectedIso: (iso: string | null) => void;
  setHoveredIso: (iso: string | null) => void;
  flyTo: (lat: number, lng: number, altitude?: number) => void;
  setReaderOpen: (isOpen: boolean) => void;
  resetView: () => void;
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedIso: null,
  hoveredIso: null,
  cameraLat: 0,
  cameraLng: 0,
  cameraAltitude: 2.5,
  flyToTrigger: 0,
  isReaderOpen: false,
  isThrottled: false,

  setSelectedIso: (iso) => set({ selectedIso: iso }),
  setHoveredIso: (iso) => set({ hoveredIso: iso }),

  flyTo: (lat, lng, altitude = 2.0) =>
    set((state) => ({
      cameraLat: lat,
      cameraLng: lng,
      cameraAltitude: altitude,
      flyToTrigger: state.flyToTrigger + 1,
    })),

  setReaderOpen: (isOpen) =>
    set({
      isReaderOpen: isOpen,
      isThrottled: isOpen,
    }),

  resetView: () =>
    set((state) => ({
      selectedIso: null,
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: 2.5,
      flyToTrigger: state.flyToTrigger + 1,
      isReaderOpen: false,
      isThrottled: false,
    })),
}));
