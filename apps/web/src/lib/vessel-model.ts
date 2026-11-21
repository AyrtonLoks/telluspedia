import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import type { VesselKind } from "./ais-data";

type Point = [x: number, y: number, z: number];
type Section = [z: number, halfBeam: number, deckHeight: number];

const WHITE = "#e6eff1";
const GLASS = "#294854";
const SHADOW = "#182c3b";

const CARGO_HULL: Section[] = [
  [-1, 0.20, 0.13], [-0.83, 0.29, 0.13], [0.43, 0.29, 0.13],
  [0.76, 0.21, 0.15], [1, 0.025, 0.19],
];
const FERRY_HULL: Section[] = [
  [-1, 0.22, 0.13], [-0.88, 0.32, 0.13], [0.49, 0.32, 0.13],
  [0.82, 0.24, 0.16], [1, 0.035, 0.19],
];
const FISHING_HULL: Section[] = [
  [-0.83, 0.20, 0.12], [-0.74, 0.27, 0.12], [0.28, 0.27, 0.12],
  [0.60, 0.17, 0.15], [0.83, 0.025, 0.19],
];

const PALETTES: Record<VesselKind, [side: string, deck: string, trim: string]> = {
  cargo: ["#356b68", "#82c5b2", "#b3e8cb"],
  tanker: ["#885a43", "#db9872", "#ffcf9f"],
  container: ["#305b7d", "#7abbda", "#b0dfef"],
  passenger: ["#546b89", "#b6cbd5", "#f4ebd1"],
  fishing: ["#665783", "#b7a5d5", "#e5cee9"],
  other: ["#527181", "#a3c3ca", "#d2e6e4"],
  unknown: ["#527181", "#a3c3ca", "#d2e6e4"],
};

class ShipMesh {
  private positions: number[] = [];
  private colors: number[] = [];

  private face(a: Point, b: Point, c: Point, d: Point, color: string, shade = 1) {
    const { r, g, b: blue } = new Color(color).multiplyScalar(shade);
    for (const point of [a, b, c, a, c, d]) {
      this.positions.push(...point);
      this.colors.push(r, g, blue);
    }
  }

  box(x: number, y: number, z: number, width: number, height: number, length: number, color: string) {
    const left = x - width / 2;
    const right = x + width / 2;
    const aft = z - length / 2;
    const fore = z + length / 2;
    const top = y + height;
    this.face([left, top, aft], [left, top, fore], [right, top, fore], [right, top, aft], color);
    this.face([left, y, aft], [left, y, fore], [left, top, fore], [left, top, aft], color, 0.53);
    this.face([right, y, fore], [right, y, aft], [right, top, aft], [right, top, fore], color, 0.70);
    this.face([left, y, aft], [left, top, aft], [right, top, aft], [right, y, aft], color, 0.59);
    this.face([right, y, fore], [right, top, fore], [left, top, fore], [left, y, fore], color, 0.78);
  }

  hull(sections: Section[], side: string, deck: string, trim: string) {
    const deckEdge = ([z, beam, y]: Section, sign: number): Point => [sign * beam, y, z];
    const stripe = ([z, beam, y]: Section, sign: number): Point => [sign * beam * 0.97, y - 0.025, z];
    const keel = ([z, beam]: Section, sign: number): Point => [sign * beam * 0.75, 0.018, z];
    for (const [index, fore] of sections.slice(1).entries()) {
      const aft = sections[index];
      this.face(deckEdge(aft, -1), deckEdge(fore, -1), deckEdge(fore, 1), deckEdge(aft, 1), deck);
      this.face(stripe(aft, 1), deckEdge(aft, 1), deckEdge(fore, 1), stripe(fore, 1), trim, 0.75);
      this.face(stripe(fore, -1), deckEdge(fore, -1), deckEdge(aft, -1), stripe(aft, -1), trim, 0.64);
      this.face(keel(aft, 1), stripe(aft, 1), stripe(fore, 1), keel(fore, 1), side, 0.69);
      this.face(keel(fore, -1), stripe(fore, -1), stripe(aft, -1), keel(aft, -1), side, 0.52);
    }
    const aft = sections[0];
    const fore = sections[sections.length - 1];
    this.face(keel(aft, -1), deckEdge(aft, -1), deckEdge(aft, 1), keel(aft, 1), side, 0.65);
    this.face(keel(fore, 1), deckEdge(fore, 1), deckEdge(fore, -1), keel(fore, -1), side, 0.85);
  }

  wheelhouse(z: number, y: number, width: number) {
    this.box(0, y, z, width, 0.12, 0.26, WHITE);
    this.box(0, y + 0.12, z + 0.008, width * 0.96, 0.036, 0.24, GLASS);
    this.box(0, y + 0.156, z, width * 1.08, 0.032, 0.27, WHITE);
  }

  geometry() {
    return new BufferGeometry()
      .setAttribute("position", new Float32BufferAttribute(this.positions, 3))
      .setAttribute("color", new Float32BufferAttribute(this.colors, 3));
  }
}

/** Original low-poly vessels. Bow is +Z, the waterline is Y = 0. */
export function buildVesselGeometry(kind: VesselKind): BufferGeometry {
  const ship = new ShipMesh();
  const [side, deck, trim] = PALETTES[kind];
  const outline = kind === "fishing" ? FISHING_HULL : kind === "passenger" ? FERRY_HULL : CARGO_HULL;
  ship.hull(outline, side, deck, trim);

  if (kind === "passenger") {
    ship.box(0, 0.13, -0.10, 0.51, 0.11, 1.49, WHITE);
    ship.box(0, 0.24, -0.05, 0.49, 0.035, 1.41, GLASS);
    ship.box(0, 0.275, -0.05, 0.45, 0.085, 1.38, "#c2dae3");
    ship.box(0, 0.36, 0.38, 0.40, 0.056, 0.32, GLASS);
    ship.box(0, 0.416, 0.37, 0.44, 0.035, 0.34, WHITE);
    ship.box(0, 0.36, -0.43, 0.19, 0.12, 0.22, "#e0ac66");
    ship.box(0, 0.48, -0.43, 0.19, 0.038, 0.22, SHADOW);
  } else if (kind === "fishing") {
    ship.wheelhouse(0.29, 0.13, 0.35);
    ship.box(0, 0.13, -0.28, 0.32, 0.034, 0.56, "#677485");
    ship.box(0, 0.165, -0.16, 0.22, 0.07, 0.22, "#dcb28d");
    ship.box(-0.14, 0.15, -0.52, 0.065, 0.23, 0.09, WHITE);
    ship.box(0.14, 0.15, -0.52, 0.065, 0.23, 0.09, WHITE);
    ship.box(0, 0.36, -0.52, 0.32, 0.035, 0.10, WHITE);
  } else {
    ship.wheelhouse(-0.70, 0.13, 0.39);
    ship.box(-0.11, 0.18, -0.91, 0.16, 0.16, 0.10, "#b78472");
    if (kind === "container") {
      const freight = ["#f5ab78", "#84bfd2", "#d1d7ab", "#7fa9c9", "#d77b73", "#b8d0d8"];
      for (const [index, color] of freight.entries()) {
        const row = Math.floor(index / 2);
        const x = index % 2 === 0 ? -0.116 : 0.116;
        ship.box(x, 0.13, -0.38 + row * 0.35, 0.205, row === 1 ? 0.19 : 0.13, 0.29, color);
      }
    } else if (kind === "tanker") {
      ship.box(0, 0.13, 0.08, 0.42, 0.026, 1.13, "#a7664b");
      for (const x of [-0.11, 0.11]) ship.box(x, 0.156, 0.08, 0.055, 0.045, 1.03, trim);
      for (const z of [-0.26, 0.13, 0.51]) ship.box(0, 0.16, z, 0.35, 0.052, 0.11, "#e7b698");
    } else if (kind === "cargo") {
      for (const z of [-0.34, 0.02, 0.38]) {
        ship.box(0, 0.13, z, 0.43, 0.038, 0.31, "#376c6e");
        ship.box(0, 0.168, z, 0.35, 0.022, 0.25, "#80aaa0");
      }
    } else {
      ship.box(0, 0.13, 0.02, 0.39, 0.031, 0.94, "#557c8b");
      ship.box(0, 0.161, 0.04, 0.25, 0.043, 0.44, "#a2b9b9");
    }
  }
  return ship.geometry();
}
