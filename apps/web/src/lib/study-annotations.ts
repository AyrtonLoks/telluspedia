export const MAX_STUDY_ANNOTATIONS = 20;
export const MAX_ANNOTATION_ID_LENGTH = 48;
export const MAX_ANNOTATION_TITLE_LENGTH = 80;
export const MAX_ANNOTATION_NOTE_LENGTH = 280;

export const STUDY_ANNOTATION_TONES = ["accent", "warning", "success", "danger"] as const;
export type StudyAnnotationTone = (typeof STUDY_ANNOTATION_TONES)[number];

export interface StudyAnnotation {
  id: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  tone: StudyAnnotationTone;
}

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SAFE_PIN_ID_RE = /^[A-Za-z0-9_-]+$/;
const VALID_TONES = new Set<string>(STUDY_ANNOTATION_TONES);

export function stripAnnotationControlChars(value: string): string {
  return value.replace(CONTROL_CHARS_RE, "").trim();
}

export function isStudyAnnotationTone(value: unknown): value is StudyAnnotationTone {
  return typeof value === "string" && VALID_TONES.has(value);
}

/**
 * Sanitiza um array arbitrário de pinos sem importar `zod` no bundle cliente de `/` (T25).
 * O schema Zod rigoroso correspondente vive em `study-schema.ts` para validação HTTP 400 na API.
 */
export function sanitizeStudyAnnotations(input: unknown): StudyAnnotation[] {
  if (!Array.isArray(input)) return [];
  const result: StudyAnnotation[] = [];
  const seenIds = new Set<string>();

  for (const raw of input) {
    if (result.length >= MAX_STUDY_ANNOTATIONS) break;
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;

    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id || id.length > MAX_ANNOTATION_ID_LENGTH || !SAFE_PIN_ID_RE.test(id)) continue;
    if (seenIds.has(id)) continue;

    const lat = typeof rec.lat === "number" ? rec.lat : Number.NaN;
    const lng = typeof rec.lng === "number" ? rec.lng : Number.NaN;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) continue;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) continue;

    const title =
      typeof rec.title === "string" ? stripAnnotationControlChars(rec.title) : "";
    if (!title || title.length > MAX_ANNOTATION_TITLE_LENGTH) continue;

    const rawNote =
      typeof rec.note === "string" ? stripAnnotationControlChars(rec.note) : "";
    if (rawNote.length > MAX_ANNOTATION_NOTE_LENGTH) continue;

    const tone: StudyAnnotationTone = isStudyAnnotationTone(rec.tone) ? rec.tone : "accent";
    seenIds.add(id);
    result.push({
      id,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      title,
      note: rawNote,
      tone,
    });
  }

  return result;
}

export function createAnnotationId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `pin-${rand}`;
}
