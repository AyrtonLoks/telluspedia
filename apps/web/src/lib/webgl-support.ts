export interface WebGLSupportResult {
  supported: boolean;
  version: "webgl2" | "webgl" | null;
  reason: "ok" | "no-canvas" | "no-context" | "exception";
}

interface ProbeContext {
  getExtension?: (name: string) => { loseContext?: () => void } | null;
}

interface ProbeCanvas {
  getContext?: (
    contextId: string,
    attributes?: Record<string, unknown>
  ) => ProbeContext | null;
}

export interface CanvasCreator {
  createElement: (tagName: "canvas") => ProbeCanvas | null;
}

/**
 * Detecta disponibilidade real de WebGL2/WebGL1 no navegador sem exigir GPU dedicada
 * (`failIfMajorPerformanceCaveat: false` preserva ambientes com SwiftShader/GPU integrada)
 * e libera imediatamente o contexto de sondagem para não consumir slots do navegador.
 */
export function detectWebGLSupport(doc?: CanvasCreator | null): WebGLSupportResult {
  const targetDoc =
    doc !== undefined
      ? doc
      : typeof document !== "undefined"
        ? (document as unknown as CanvasCreator)
        : null;

  if (!targetDoc || typeof targetDoc.createElement !== "function") {
    return { supported: false, version: null, reason: "no-canvas" };
  }

  try {
    const canvas = targetDoc.createElement("canvas");
    if (!canvas || typeof canvas.getContext !== "function") {
      return { supported: false, version: null, reason: "no-canvas" };
    }

    const attrs = { failIfMajorPerformanceCaveat: false };
    const gl2 = canvas.getContext("webgl2", attrs);
    if (gl2) {
      gl2.getExtension?.("WEBGL_lose_context")?.loseContext?.();
      return { supported: true, version: "webgl2", reason: "ok" };
    }

    const gl1 =
      canvas.getContext("webgl", attrs) ??
      canvas.getContext("experimental-webgl", attrs);
    if (gl1) {
      gl1.getExtension?.("WEBGL_lose_context")?.loseContext?.();
      return { supported: true, version: "webgl", reason: "ok" };
    }

    return { supported: false, version: null, reason: "no-context" };
  } catch {
    return { supported: false, version: null, reason: "exception" };
  }
}

export interface WebGLContextLifecycleCallbacks {
  onLost: () => void;
  onRestored: () => void;
}

/**
 * Registra listeners de `webglcontextlost` e `webglcontextrestored` em `gl.domElement`.
 * Chama `event.preventDefault()` na perda de contexto para permitir restauração limpa pelo navegador.
 */
export function attachWebGLContextListeners(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  callbacks: WebGLContextLifecycleCallbacks
): () => void {
  const handleLost = (event: Event) => {
    event.preventDefault();
    callbacks.onLost();
  };

  const handleRestored = () => {
    callbacks.onRestored();
  };

  target.addEventListener("webglcontextlost", handleLost, false);
  target.addEventListener("webglcontextrestored", handleRestored, false);

  return () => {
    target.removeEventListener("webglcontextlost", handleLost, false);
    target.removeEventListener("webglcontextrestored", handleRestored, false);
  };
}
