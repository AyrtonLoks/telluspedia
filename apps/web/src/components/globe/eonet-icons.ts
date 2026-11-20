import { CanvasTexture, SRGBColorSpace } from "three";
import type { EonetCategory } from "@/lib/observatory-data";

const icons: Partial<Record<EonetCategory, { color: string; path: string }>> = {
  severeStorms: { color: "#90ddff", path: "M3 13c0-7 8-11 14-7 4 3 4 10-1 13-4 2-9-1-8-5 0-3 5-4 6-1" },
  volcanoes: { color: "#ffac9b", path: "M2 20l6-9 2 2 3-2 2 4 3 1 4 4H2m7-14 2 2m4-5-2 3m5 1-2 2" },
  floods: { color: "#83beff", path: "M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M4 8l4-4 4 4" },
  seaLakeIce: { color: "#93f0e9", path: "M12 2v20M3 7l18 10M3 17L21 7M9 4l3 3 3-3M9 20l3-3 3 3" },
  drought: { color: "#ffe39c", path: "M2 11h20M5 11l5 4-3 5m3-5 6 1 3 5m-3-5 3-5M9 7a3 3 0 0 1 6 0m-3-5v1" },
  dustHaze: { color: "#ead5a9", path: "M3 7h13m-1-3h4m-17 8h17M4 17h9m4 1h4" },
  earthquakes: { color: "#fbe0a2", path: "M2 13h4l2-4 3 9 3-15 3 10h5" },
  landslides: { color: "#dcb59a", path: "M2 20h20L6 5m4 6 2-2 2 2-2 2m2 2 2-2 2 2-2 2" },
  manmade: { color: "#d8b4fe", path: "M12 3v10m0 4v1m-1-16h2l8 17H3Z" },
  snow: { color: "#dceaff", path: "M6 10a4 4 0 0 1 7-4 4 4 0 0 1 4 4h2a2 2 0 1 1 0 4H5a2 2 0 1 1 0-4h1m1 8v2m5-2v2m5-2v2" },
  tempExtremes: { color: "#f8b2bb", path: "M10 15V5a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0Zm2-3v6" },
  waterColor: { color: "#bde7ae", path: "M12 3c-2 4-6 8-6 12a6 6 0 0 0 12 0c0-4-4-8-6-12ZM7 15h10" },
  wildfires: { color: "#ffc18b", path: "M12 2c0 5 5 7 5 11 1-1 2-3 2-4 4 8 0 13-7 13-6 0-9-4-8-9 1-3 3-5 4-6-1 3 0 5 1 6 0-5 3-6 3-11Z" },
};

export function createEonetIcon(kind: EonetCategory | "track" | number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(4, 4);

  const count = typeof kind === "number" ? kind : null;
  const icon = typeof kind === "string" && kind !== "track" ? icons[kind] : undefined;
  const color = icon?.color ?? "#c4dff3";
  ctx.fillStyle = "#151f30";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(12, 12, kind === "track" ? 9 : 10.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (icon) {
    ctx.translate(4, 4);
    ctx.scale(2 / 3, 2 / 3);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(icon.path));
  } else {
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${count && count > 99 ? 8 : 11}px system-ui`;
    ctx.fillText(count ? String(count) : "•", 12, 12);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
