/** Moldura do dock direito (D15), compartilhada pelo dock e pelo esqueleto de carregamento (D17). */
export const DOCK_FRAME_CLASSES = [
  "fixed z-30 flex flex-col overflow-hidden rounded-panel border border-line bg-surface/86 shadow-e2 backdrop-blur-md",
  // Telas estreitas: bottom sheet. lg+: coluna direita entre a navbar e o rodapé.
  "inset-x-2 bottom-2 max-h-[62vh]",
  "lg:inset-x-auto lg:bottom-4 lg:right-5 lg:top-[4.75rem] lg:max-h-none lg:w-96",
].join(" ");

/** Entrada pela direita (lg) ou por baixo (bottom sheet); saída no sentido inverso. */
export const dockMotionClasses = (closing: boolean) =>
  closing ? "animate-sheet-out lg:animate-panel-out" : "animate-sheet-in lg:animate-panel-in";
