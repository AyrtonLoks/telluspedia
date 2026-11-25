#!/usr/bin/env python3
"""
Converte os shapefiles oficiais do IBGE (Biomas do Brasil 2019, 1:250.000) e do
WWF / RESOLVE Ecoregions 2017 (14 biomas terrestres, CC BY 4.0) em TopoJSON quantizado
otimizado sob demanda em `apps/web/public/data/biomes/`.

Fontes oficiais:
- IBGE: https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_250mil.zip
- WWF / RESOLVE 2017: https://storage.googleapis.com/teow2016/Ecoregions2017.zip
"""

import json
import os
import struct
import subprocess
import sys
from pathlib import Path

IBGE_CODE_MAP = {
    "1": ("BR_AMAZONIA", "IBGE-01"),
    "2": ("BR_CAATINGA", "IBGE-04"),
    "3": ("BR_CERRADO", "IBGE-02"),
    "4": ("BR_MATA_ATLANTICA", "IBGE-03"),
    "5": ("BR_PAMPA", "IBGE-05"),
    "6": ("BR_PANTANAL", "IBGE-06"),
}


def read_dbf(path: str):
    with open(path, "rb") as f:
        hdr = f.read(32)
        num_rec, hdr_len, rec_len = struct.unpack("<IHH", hdr[4:12])
        fields = []
        while True:
            b = f.read(1)
            if not b or b == b"\r":
                break
            desc = b + f.read(31)
            name = desc[:11].split(b"\x00")[0].decode("latin1")
            ftype = chr(desc[11])
            flen = desc[16]
            fields.append((name, ftype, flen))
        f.seek(hdr_len)
        rows = []
        for _ in range(num_rec):
            rec = f.read(rec_len)
            if len(rec) < rec_len:
                break
            off = 1
            row = {}
            for name, _ftype, flen in fields:
                row[name] = rec[off : off + flen].decode("utf-8", errors="replace").strip()
                off += flen
            rows.append(row)
        return rows


def iter_shp_polygons(path: str):
    with open(path, "rb") as f:
        f.seek(100)
        while True:
            rec_hdr = f.read(8)
            if len(rec_hdr) < 8:
                break
            _rec_num, content_words = struct.unpack(">II", rec_hdr)
            content = f.read(content_words * 2)
            if len(content) < 4:
                break
            shape_type = struct.unpack("<I", content[:4])[0]
            if shape_type not in (5, 15, 25):
                yield []
                continue
            num_parts, num_points = struct.unpack("<II", content[36:44])
            parts = list(struct.unpack(f"<{num_parts}I", content[44 : 44 + 4 * num_parts]))
            pts_off = 44 + 4 * num_parts
            raw_pts = struct.unpack(f"<{num_points * 2}d", content[pts_off : pts_off + num_points * 16])
            rings = []
            for p_idx in range(num_parts):
                start = parts[p_idx]
                end = parts[p_idx + 1] if p_idx + 1 < num_parts else num_points
                ring = [(raw_pts[i * 2], raw_pts[i * 2 + 1]) for i in range(start, end)]
                if len(ring) >= 4:
                    rings.append(ring)
            yield rings


def signed_area(ring):
    area = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        area += x1 * y2 - x2 * y1
    return 0.5 * area


def _perp_dist_sq(p, a, b):
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    if dx == 0.0 and dy == 0.0:
        return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    proj_x = a[0] + t * dx
    proj_y = a[1] + t * dy
    return (p[0] - proj_x) ** 2 + (p[1] - proj_y) ** 2


def simplify_ring(ring, tol):
    if len(ring) <= 5:
        return ring
    pts = ring[:-1]
    n = len(pts)
    if n <= 4:
        return ring
    max_d = -1.0
    split_idx = n // 2
    p0 = pts[0]
    for i in range(1, n):
        d = (pts[i][0] - p0[0]) ** 2 + (pts[i][1] - p0[1]) ** 2
        if d > max_d:
            max_d = d
            split_idx = i

    def dp_chain(chain):
        m = len(chain)
        if m <= 2:
            return chain
        tol_sq = tol * tol
        keep = [False] * m
        keep[0] = True
        keep[m - 1] = True
        stack = [(0, m - 1)]
        while stack:
            s, e = stack.pop()
            if e - s <= 1:
                continue
            best_d = -1.0
            best_i = -1
            a, b = chain[s], chain[e]
            for i in range(s + 1, e):
                d = _perp_dist_sq(chain[i], a, b)
                if d > best_d:
                    best_d = d
                    best_i = i
            if best_d > tol_sq and best_i != -1:
                keep[best_i] = True
                stack.append((s, best_i))
                stack.append((best_i, e))
        return [chain[i] for i in range(m) if keep[i]]

    part1 = dp_chain(pts[: split_idx + 1])
    part2 = dp_chain(pts[split_idx:] + [pts[0]])
    merged = part1[:-1] + part2
    if len(merged) < 4:
        return ring[:4] + [ring[0]]
    if merged[0] != merged[-1]:
        merged.append(merged[0])
    return merged


def clamp_and_round(ring, decimals=3):
    out = []
    for lon, lat in ring:
        clamped_lon = round(max(-179.9, min(179.9, lon)), decimals)
        clamped_lat = round(max(-84.5, min(84.5, lat)), decimals)
        if not out or out[-1] != [clamped_lon, clamped_lat]:
            out.append([clamped_lon, clamped_lat])
    if len(out) >= 3 and out[0] != out[-1]:
        out.append(out[0])
    return out


def rings_to_polygons(rings, tol, min_ext_area, min_hole_area, decimals=3):
    polygons = []
    current_poly = None
    for ring in rings:
        area = signed_area(ring)
        abs_area = abs(area)
        is_exterior = area < 0  # ESRI shapefile: clockwise = exterior
        if is_exterior:
            if abs_area < min_ext_area:
                current_poly = None
                continue
            simp = clamp_and_round(simplify_ring(ring, tol), decimals)
            if len(simp) >= 4 and abs(signed_area(simp)) >= min_ext_area * 0.2:
                if signed_area(simp) > 0:
                    simp.reverse()
                current_poly = [simp]
                polygons.append(current_poly)
            else:
                current_poly = None
        else:
            if current_poly is None or abs_area < min_hole_area:
                continue
            simp = clamp_and_round(simplify_ring(ring, tol), decimals)
            if len(simp) >= 4 and abs(signed_area(simp)) >= min_hole_area * 0.2:
                if signed_area(simp) < 0:
                    simp.reverse()
                current_poly.append(simp)
    return polygons


def build_ibge_geojson(src_dir: str):
    dbf_rows = read_dbf(os.path.join(src_dir, "lm_bioma_250.dbf"))
    shp_polys = list(iter_shp_polygons(os.path.join(src_dir, "lm_bioma_250.shp")))
    features = []
    for row, rings in zip(dbf_rows, shp_polys):
        cd = row.get("CD_Bioma", "")
        if cd not in IBGE_CODE_MAP:
            continue
        biome_id, code = IBGE_CODE_MAP[cd]
        polys = rings_to_polygons(
            rings,
            tol=0.035,
            min_ext_area=0.008,
            min_hole_area=0.015,
            decimals=3,
        )
        features.append(
            {
                "type": "Feature",
                "id": biome_id,
                "properties": {"id": biome_id, "code": code, "scope": "brazil"},
                "geometry": {"type": "MultiPolygon", "coordinates": polys},
            }
        )
    order = ["BR_AMAZONIA", "BR_CERRADO", "BR_MATA_ATLANTICA", "BR_CAATINGA", "BR_PAMPA", "BR_PANTANAL"]
    features.sort(key=lambda f: order.index(f["id"]))
    return {"type": "FeatureCollection", "features": features}


def build_wwf_geojson(src_dir: str):
    dbf_rows = read_dbf(os.path.join(src_dir, "Ecoregions2017.dbf"))
    shp_polys = list(iter_shp_polygons(os.path.join(src_dir, "Ecoregions2017.shp")))
    by_biome = {i: [] for i in range(1, 15)}
    for row, rings in zip(dbf_rows, shp_polys):
        raw_num = row.get("BIOME_NUM", "")
        try:
            num = int(round(float(raw_num)))
        except ValueError:
            continue
        if num < 1 or num > 14:
            continue
        tol = 0.12 if num == 14 else 0.24
        min_ext = 0.04 if num == 14 else 0.12 if num in (3, 9, 12) else 0.25
        min_hole = 0.6
        polys = rings_to_polygons(
            rings,
            tol=tol,
            min_ext_area=min_ext,
            min_hole_area=min_hole,
            decimals=2,
        )
        by_biome[num].extend(polys)

    features = []
    for num in range(1, 15):
        code = f"{num:02d}"
        biome_id = f"WWF_{code}"
        features.append(
            {
                "type": "Feature",
                "id": biome_id,
                "properties": {"id": biome_id, "code": code, "scope": "global"},
                "geometry": {"type": "MultiPolygon", "coordinates": by_biome[num]},
            }
        )
    return {"type": "FeatureCollection", "features": features}


def main():
    src_root = sys.argv[1] if len(sys.argv) > 1 else "/tmp/biomes-src"
    web_dir = Path(__file__).resolve().parent.parent
    out_dir = web_dir / "public" / "data" / "biomes"
    out_dir.mkdir(parents=True, exist_ok=True)

    ibge_fc = build_ibge_geojson(os.path.join(src_root, "ibge"))
    wwf_fc = build_wwf_geojson(os.path.join(src_root, "wwf"))

    tmp_ibge = "/tmp/biomes-src/ibge-simplified.geojson"
    tmp_wwf = "/tmp/biomes-src/wwf-simplified.geojson"
    with open(tmp_ibge, "w", encoding="utf-8") as f:
        json.dump(ibge_fc, f, separators=(",", ":"))
    with open(tmp_wwf, "w", encoding="utf-8") as f:
        json.dump(wwf_fc, f, separators=(",", ":"))

    node_script = r"""
import fs from "node:fs";
import * as topojson from "topojson-client";
import { geoArea } from "d3-geo";
import whichPolygon from "which-polygon";

function encodeQuantizedTopoJson(fc, quantization = 1e4) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const feat of fc.features) {
    for (const poly of feat.geometry.coordinates) {
      for (const ring of poly) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  const scaleX = (maxX - minX) / (quantization - 1) || 1;
  const scaleY = (maxY - minY) / (quantization - 1) || 1;
  const qx = (x) => Math.round((x - minX) / scaleX);
  const qy = (y) => Math.round((y - minY) / scaleY);
  const dxCoord = (ix) => minX + ix * scaleX;
  const dyCoord = (iy) => minY + iy * scaleY;

  const arcs = [];
  const geometries = [];

  for (const feat of fc.features) {
    const multiArcs = [];
    for (const poly of feat.geometry.coordinates) {
      const polyArcs = [];
      let validPoly = true;
      for (let rIdx = 0; rIdx < poly.length; rIdx++) {
        const ring = poly[rIdx];
        const qPts = [];
        for (const pt of ring) {
          const x = qx(pt[0]);
          const y = qy(pt[1]);
          if (qPts.length === 0 || qPts[qPts.length - 1][0] !== x || qPts[qPts.length - 1][1] !== y) {
            qPts.push([x, y]);
          }
        }
        if (qPts.length >= 3 && (qPts[0][0] !== qPts[qPts.length - 1][0] || qPts[0][1] !== qPts[qPts.length - 1][1])) {
          qPts.push([qPts[0][0], qPts[0][1]]);
        }
        if (qPts.length < 4) {
          if (rIdx === 0) validPoly = false;
          continue;
        }
        // Verifica winding esférico pós-quantização (evita inversão de área > 2*PI!)
        let decoded = qPts.map(([ix, iy]) => [dxCoord(ix), dyCoord(iy)]);
        const area = geoArea({ type: "Feature", geometry: { type: "Polygon", coordinates: [decoded] }, properties: {} });
        if (rIdx === 0) {
          if (!Number.isFinite(area) || area < 1e-7) {
            validPoly = false;
            break;
          }
          if (area > 2 * Math.PI) {
            qPts.reverse();
            decoded = qPts.map(([ix, iy]) => [dxCoord(ix), dyCoord(iy)]);
            const flippedArea = geoArea({ type: "Feature", geometry: { type: "Polygon", coordinates: [decoded] }, properties: {} });
            if (!Number.isFinite(flippedArea) || flippedArea < 1e-7 || flippedArea > 2 * Math.PI) {
              validPoly = false;
              break;
            }
          }
        } else {
          // Buraco: precisa ser anti-horário (área esférica > 2*PI) e válido
          if (!Number.isFinite(area)) continue;
          if (area < 2 * Math.PI) {
            qPts.reverse();
          }
        }

        const arc = [qPts[0]];
        for (let i = 1; i < qPts.length; i++) {
          arc.push([qPts[i][0] - qPts[i - 1][0], qPts[i][1] - qPts[i - 1][1]]);
        }
        polyArcs.push([arcs.length]);
        arcs.push(arc);
      }
      if (validPoly && polyArcs.length > 0) multiArcs.push(polyArcs);
    }
    geometries.push({
      type: "MultiPolygon",
      id: feat.id,
      properties: feat.properties,
      arcs: multiArcs,
    });
  }

  return {
    type: "Topology",
    transform: { scale: [scaleX, scaleY], translate: [minX, minY] },
    objects: {
      biomes: { type: "GeometryCollection", geometries },
    },
    arcs,
  };
}

function processFile(inPath, outPath, quantization) {
  const fc = JSON.parse(fs.readFileSync(inPath, "utf-8"));
  const topo = encodeQuantizedTopoJson(fc, quantization);
  const json = JSON.stringify(topo);
  fs.writeFileSync(outPath, json, "utf-8");

  const back = topojson.feature(topo, topo.objects.biomes);
  const bad = back.features.filter((f) => geoArea(f) > 2 * Math.PI).map((f) => f.properties.id);
  console.log(outPath, (Buffer.byteLength(json) / 1024).toFixed(1) + " KiB", "arcs:", topo.arcs.length, "badWinding:", bad);
  if (bad.length > 0) throw new Error("Invalid spherical winding: " + bad.join(", "));
  return whichPolygon(back);
}

const qBr = processFile("/tmp/biomes-src/ibge-simplified.geojson", process.argv[1], 1e4);
const qWwf = processFile("/tmp/biomes-src/wwf-simplified.geojson", process.argv[2], 1e4);

for (const [name, pt, expected] of [
  ["Manaus", [-60.0, -3.1], "BR_AMAZONIA"],
  ["Brasilia", [-47.9, -15.8], "BR_CERRADO"],
  ["SaoPaulo", [-46.63, -23.55], "BR_MATA_ATLANTICA"],
  ["Petrolina", [-40.5, -9.4], "BR_CAATINGA"],
  ["Corumba", [-56.8, -17.8], "BR_PANTANAL"],
  ["Bage", [-54.1, -31.3], "BR_PAMPA"],
]) {
  const got = qBr(pt)?.id ?? null;
  console.log("  BR", name, "=>", got, got === expected ? "OK" : "MISMATCH " + expected);
  if (got !== expected) throw new Error("BR mismatch: " + name);
}
for (const [name, pt, expected] of [
  ["Manaus", [-60.0, -3.1], "WWF_01"],
  ["Brasilia", [-47.9, -15.8], "WWF_07"],
  ["Sahara", [12.0, 23.0], "WWF_13"],
  ["Siberia", [95.0, 62.0], "WWF_06"],
  ["AlaskaTundra", [-152.0, 69.5], "WWF_11"],
  ["Paris", [2.35, 48.85], "WWF_04"],
  ["Rome", [12.5, 41.9], "WWF_12"],
  ["Tibet", [89.0, 33.0], "WWF_10"],
  ["Kansas", [-98.5, 38.5], "WWF_08"],
  ["Sundarbans", [89.2, 22.0], "WWF_14"],
  ["Pantanal", [-56.8, -17.8], "WWF_09"],
  ["Pacific", [-150.0, 0.0], null],
]) {
  const got = qWwf(pt)?.id ?? null;
  console.log("  WWF", name, "=>", got, got === expected ? "OK" : "MISMATCH " + expected);
  if (got !== expected) throw new Error("WWF mismatch: " + name);
}
"""
    subprocess.run(
        [
            "node",
            "--input-type=module",
            "-e",
            node_script,
            str(out_dir / "brazil-biomes-ibge.json"),
            str(out_dir / "global-biomes-wwf.json"),
        ],
        cwd=str(web_dir),
        check=True,
    )


if __name__ == "__main__":
    main()
