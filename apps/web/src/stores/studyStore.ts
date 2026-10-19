import { create } from "zustand";

interface StudyState {
  currentStudyId: string | null;
  parentId: string | null;
  title: string;
  description: string;
  notes: string;
  isShareModalOpen: boolean;

  setStudy: (study: {
    id: string;
    parentId?: string | null;
    title: string;
    description?: string | null;
    notes?: string | null;
  }) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setNotes: (notes: string) => void;
  setShareModalOpen: (isOpen: boolean) => void;
  resetStudy: () => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  currentStudyId: null,
  parentId: null,
  title: "Novo Estudo Planetário",
  description: "Recorte cronológico e geopolítico comparado.",
  notes: "",
  isShareModalOpen: false,

  setStudy: (study) =>
    set({
      currentStudyId: study.id,
      parentId: study.parentId || null,
      title: study.title,
      description: study.description || "",
      notes: study.notes || "",
    }),

  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setNotes: (notes) => set({ notes }),
  setShareModalOpen: (isOpen) => set({ isShareModalOpen: isOpen }),
  resetStudy: () =>
    set({
      currentStudyId: null,
      parentId: null,
      title: "Novo Estudo Planetário",
      description: "Recorte cronológico e geopolítico comparado.",
      notes: "",
      isShareModalOpen: false,
    }),
}));
