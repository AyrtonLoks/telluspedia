import { create } from "zustand";

interface ReaderState {
  activeDimension: string;
  isCitationModalOpen: boolean;
  citationFormat: "ABNT" | "APA" | "MLA" | "BIBTEX";

  setActiveDimension: (dimension: string) => void;
  setCitationModalOpen: (isOpen: boolean) => void;
  setCitationFormat: (format: "ABNT" | "APA" | "MLA" | "BIBTEX") => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  activeDimension: "GEOGRAPHY",
  isCitationModalOpen: false,
  citationFormat: "ABNT",

  setActiveDimension: (dim) => set({ activeDimension: dim }),
  setCitationModalOpen: (open) => set({ isCitationModalOpen: open }),
  setCitationFormat: (fmt) => set({ citationFormat: fmt }),
}));
