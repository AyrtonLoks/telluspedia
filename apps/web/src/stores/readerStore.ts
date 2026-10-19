import { create } from "zustand";
import { CitationParams } from "@/lib/citations";

interface ReaderState {
  activeDimension: string;
  isCitationModalOpen: boolean;
  citationFormat: "ABNT" | "APA" | "MLA" | "BIBTEX";
  customCitationParams: CitationParams | null;

  setActiveDimension: (dimension: string) => void;
  resetActiveDimension: () => void;
  setCitationModalOpen: (isOpen: boolean, params?: CitationParams | null) => void;
  setCitationFormat: (format: "ABNT" | "APA" | "MLA" | "BIBTEX") => void;
  setCustomCitationParams: (params: CitationParams | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  activeDimension: "GEOGRAPHY",
  isCitationModalOpen: false,
  citationFormat: "ABNT",
  customCitationParams: null,

  setActiveDimension: (dim) => set({ activeDimension: dim }),
  resetActiveDimension: () => set({ activeDimension: "GEOGRAPHY" }),
  setCitationModalOpen: (open, params = null) =>
    set({
      isCitationModalOpen: open,
      customCitationParams: open ? (params ?? null) : null,
    }),
  setCitationFormat: (fmt) => set({ citationFormat: fmt }),
  setCustomCitationParams: (params) => set({ customCitationParams: params }),
}));
