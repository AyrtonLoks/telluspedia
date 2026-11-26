import type {
  CableBasinId,
  SubmarineCableSystem,
  SubmarineCablesDataset,
} from "./submarine-cables-types";

export const CABLE_BASIN_COLORS_HEX: Readonly<Record<CableBasinId, string>> = {
  atlantic: "#38bdf8",
  pacific: "#a78bfa",
  "indo-eurasian": "#fbbf24",
  "afro-eurasian": "#34d399",
};

const TELEGEOGRAPHY_ALLOWED_HOST = "www.submarinecablemap.com";

export function sanitizeTeleGeographyUrl(raw: unknown): string {
  if (typeof raw === "string") {
    try {
      const u = new URL(raw.trim());
      if (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        (u.hostname === TELEGEOGRAPHY_ALLOWED_HOST || u.hostname === "submarinecablemap.com")
      ) {
        u.hash = "";
        return u.toString();
      }
    } catch {
      // fallback abaixo
    }
  }
  return "https://www.submarinecablemap.com/";
}

export function normalizeSubmarineCablesDataset(raw: unknown): SubmarineCablesDataset {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dataset TeleGeography inválido");
  }
  const obj = raw as Partial<SubmarineCablesDataset>;
  if (!Array.isArray(obj.cables) || !Array.isArray(obj.chokePoints)) {
    throw new Error("Dataset TeleGeography sem cabos ou gargalos estratégicos");
  }

  const cables: SubmarineCableSystem[] = obj.cables.map((c) => ({
    ...c,
    officialUrl: sanitizeTeleGeographyUrl(c.officialUrl),
  }));

  return {
    metadata: obj.metadata ?? {
      source: "TeleGeography Submarine Cable Map",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://www.submarinecablemap.com/",
      referenceYear: 2026,
    },
    chokePoints: obj.chokePoints,
    cables,
  };
}

let cachedDataset: SubmarineCablesDataset | null = null;
let inflightPromise: Promise<SubmarineCablesDataset | null> | null = null;

export function getSubmarineCablesSync(): SubmarineCablesDataset | null {
  return cachedDataset;
}

export async function loadSubmarineCables(): Promise<SubmarineCablesDataset | null> {
  if (cachedDataset) return cachedDataset;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      if (typeof window === "undefined") {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const filePath = path.join(
          process.cwd(),
          "public",
          "data",
          "submarine-cables-telegeography.json"
        );
        const text = await fs.readFile(filePath, "utf-8");
        cachedDataset = normalizeSubmarineCablesDataset(JSON.parse(text));
        return cachedDataset;
      }

      const res = await fetch("/data/submarine-cables-telegeography.json");
      if (!res.ok) return null;
      const json: unknown = await res.json();
      cachedDataset = normalizeSubmarineCablesDataset(json);
      return cachedDataset;
    } catch {
      return null;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}
