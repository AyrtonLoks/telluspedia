declare module "which-polygon" {
  export default function whichPolygon(
    featureCollection: any
  ): (point: [number, number]) => any;
}
