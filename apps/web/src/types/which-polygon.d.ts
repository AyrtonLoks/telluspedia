declare module "which-polygon" {
  export default function whichPolygon<Properties>(
    featureCollection: {
      features: { geometry: object | null; properties: Properties | null }[];
    }
  ): (point: [number, number]) => Properties | null;
}

declare module "world-atlas/countries-110m.json" {
  const content: import("@/lib/historical-topology").CountryTopology;
  export default content;
}
