import { z } from "zod";
import { MIN_CAMERA_ALTITUDE, MAX_CAMERA_ALTITUDE } from "../../stores/globeStore";
import { HISTORICAL_ERAS } from "../historical-entities";

/**
 * Modelo de dados das cenas históricas (D12a). Uma cena é qualquer evento da linha do tempo — de
 * um marco simples (um ponto e uma fonte) a uma expedição com trajetórias, pontos de interesse e
 * dossiê. Cenas vivem como JSON versionado em `src/data/scenes/` e são validadas por este schema
 * (teste `test/scenes.test.ts`): adicionar um evento é adicionar dados, não código.
 */

/** Data parcial ISO 8601: "1969", "1969-07" ou "1969-07-20" (anos negativos para a.C.). */
const PartialDate = z.string().regex(/^-?\d{1,4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/, "data parcial ISO (AAAA, AAAA-MM ou AAAA-MM-DD)");
/** Instante ISO completo com fuso (para trajetórias). */
const Instant = z.string().refine((s) => /^-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !Number.isNaN(Date.parse(s)), "instante ISO 8601 com fuso");

const Lat = z.number().min(-90).max(90);
const Lng = z.number().min(-180).max(180);
const Iso3 = z.string().regex(/^[A-Z]{3}$/, "ISO 3166-1 alfa-3");
const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id em kebab-case");

export const SCENE_CATEGORIES = ["POLITICS_REGIMES", "ECONOMY", "WAR_MILITARY", "SCIENCE_CULTURE", "HEALTH_PANDEMICS"] as const;

/** Fonte citável (RN02): pelo menos um rótulo; URL e dados bibliográficos quando houver. */
export const SceneSourceSchema = z.object({
  label: z.string().min(2),
  url: z.url().optional(),
  authors: z.string().optional(),
  title: z.string().optional(),
  publication: z.string().optional(),
  year: z.number().int().optional(),
  doi: z.string().optional(),
});

export const SceneDateSchema = z
  .object({
    start: PartialDate,
    end: PartialDate.optional(),
    precision: z.enum(["day", "month", "year", "decade", "century"]),
  })
  .refine((d) => !d.end || d.end >= d.start || d.start.startsWith("-"), { message: "fim antes do início", path: ["end"] });

export const SceneCameraSchema = z.object({
  lat: Lat,
  lng: Lng,
  altitude: z.number().min(MIN_CAMERA_ALTITUDE).max(MAX_CAMERA_ALTITUDE),
});

export const VEHICLE_KINDS = ["ship", "spacecraft", "aircraft", "army", "generic"] as const;

/** Ponto de uma trajetória na superfície (navio, avião, exército): segue geodésicas no globo. */
export const SurfacePointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lat: Lat,
  lng: Lng,
  time: Instant,
  description: z.string().optional(),
  /** Campos específicos do evento (dia de viagem, léguas, comandante…) exibidos como estão. */
  facts: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  quote: z.object({ text: z.string().min(1), source: z.string().min(1) }).optional(),
});

export const SurfaceTrajectorySchema = z
  .object({
    kind: z.literal("surface"),
    id: z.string().min(1),
    label: z.string().min(1),
    vehicle: z.enum(VEHICLE_KINDS),
    points: z.array(SurfacePointSchema).min(2),
  })
  .refine((t) => t.points.every((p, i) => i === 0 || Date.parse(p.time) >= Date.parse(t.points[i - 1].time)), {
    message: "pontos fora de ordem cronológica",
    path: ["points"],
  });

export const CISLUNAR_PHASES = ["launch", "parking-orbit", "translunar-injection", "coast", "lunar-orbit-insertion", "lunar-orbit", "descent", "landing", "ascent", "transearth-injection", "reentry", "splashdown"] as const;

/** Trajetória Terra–Lua: fases com instantes; a geometria é calculada pelo player (efeméride real da Lua). */
export const CislunarTrajectorySchema = z
  .object({
    kind: z.literal("cislunar"),
    id: z.string().min(1),
    label: z.string().min(1),
    vehicle: z.literal("spacecraft"),
    launchSite: z.object({ name: z.string(), lat: Lat, lng: Lng }),
    /** Local de pouso em coordenadas selenográficas. */
    landingSite: z.object({ name: z.string(), lat: Lat, lng: Lng }).optional(),
    phases: z.array(z.object({ id: z.enum(CISLUNAR_PHASES), label: z.string().min(1), time: Instant, description: z.string().optional() })).min(2),
  })
  .refine((t) => t.phases.every((p, i) => i === 0 || Date.parse(p.time) >= Date.parse(t.phases[i - 1].time)), {
    message: "fases fora de ordem cronológica",
    path: ["phases"],
  });

export const SceneTrajectorySchema = z.union([SurfaceTrajectorySchema, CislunarTrajectorySchema]);

export const PointOfInterestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  lat: Lat,
  lng: Lng,
  date: PartialDate.optional(),
  description: z.string().optional(),
});

export const SceneMediaSchema = z.object({
  type: z.enum(["image", "video", "audio"]),
  url: z.url(),
  caption: z.string().min(1),
  credit: z.string().min(1),
  license: z.string().min(1),
});

const ERA_IDS = Object.keys(HISTORICAL_ERAS) as [string, ...string[]];

export const SceneSchema = z
  .object({
    id: Slug,
    title: z.string().min(3),
    summary: z.string().min(10),
    category: z.enum(SCENE_CATEGORIES),
    date: SceneDateSchema,
    /** Países envolvidos (o primeiro é o principal) e bloco, quando houver. */
    countries: z.array(Iso3).default([]),
    bloc: z.string().optional(),
    location: z.object({ lat: Lat, lng: Lng }).optional(),
    camera: SceneCameraSchema.optional(),
    /** Toda cena precisa de ao menos uma fonte citável (RN02). */
    sources: z.array(SceneSourceSchema).min(1),
    /** Camadas a ativar ao abrir a cena (ids do Observatório/Cosmos). */
    layers: z.array(z.string().min(1)).default([]),
    /** Era de fronteiras a mostrar; sem valor, a era vem do ano. */
    borderEra: z.enum(ERA_IDS).optional(),
    trajectories: z.array(SceneTrajectorySchema).default([]),
    pointsOfInterest: z.array(PointOfInterestSchema).default([]),
    media: z.array(SceneMediaSchema).default([]),
    /** Texto longo opcional (Markdown) para o modo leitura. */
    dossierMarkdown: z.string().optional(),
    /** Rascunhos (ingestão do Wikidata) ficam fora da UI até a revisão humana. */
    published: z.boolean().default(true),
    wikidata: z.string().regex(/^Q\d+$/).optional(),
  })
  .refine((s) => s.trajectories.length === 0 || s.camera !== undefined, { message: "cena com trajetória precisa de câmera inicial", path: ["camera"] });

export type Scene = z.infer<typeof SceneSchema>;
export type SceneInput = z.input<typeof SceneSchema>;
export type SceneSource = z.infer<typeof SceneSourceSchema>;
export type SceneTrajectory = z.infer<typeof SceneTrajectorySchema>;

/** Ano inteiro do início da cena. */
export function sceneStartYear(scene: Pick<Scene, "date">): number {
  return parseInt(scene.date.start, 10);
}

/** Valida uma coleção: ids únicos e cada cena pelo schema. Lança com o caminho do erro. */
export function parseSceneCollection(input: unknown[], origin: string): Scene[] {
  const seen = new Set<string>();
  return input.map((raw, i) => {
    const res = SceneSchema.safeParse(raw);
    if (!res.success) {
      const issue = res.error.issues[0];
      throw new Error(`${origin}[${i}] ${(raw as { id?: string })?.id ?? ""}: ${issue.path.join(".")} — ${issue.message}`);
    }
    if (seen.has(res.data.id)) throw new Error(`${origin}: id duplicado ${res.data.id}`);
    seen.add(res.data.id);
    return res.data;
  });
}
