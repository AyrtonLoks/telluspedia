import type { ThreeElements } from "@react-three/fiber";

declare module "which-polygon" {
  export default function whichPolygon(
    featureCollection: any
  ): (point: [number, number]) => any;
}

declare module "world-atlas/countries-110m.json" {
  const content: any;
  export default content;
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
