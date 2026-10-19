import fs from "node:fs";
import path from "node:path";
import wa from "world-atlas/countries-110m.json" with { type: "json" };
import * as tc from "topojson-client";
import whichPolygon from "which-polygon";

const outputDir = path.resolve(process.cwd(), "public/data/history");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function coordsToDeltaArc(
  pts: [number, number][],
  transform: { scale: [number, number]; translate: [number, number] }
) {
  let x = 0;
  let y = 0;
  return pts.map((pt) => {
    const ix = Math.round((pt[0] - transform.translate[0]) / transform.scale[0]);
    const iy = Math.round((pt[1] - transform.translate[1]) / transform.scale[1]);
    const dx = ix - x;
    const dy = iy - y;
    x = ix;
    y = iy;
    return [dx, dy];
  });
}

// -------------------------------------------------------------
// ERA 1: 1870 (borders-1870.json)
// -------------------------------------------------------------
console.log("Generating borders-1870.json...");
const ahuIds = ["040", "348", "203", "703", "705", "191", "070"]; // Austria, Hungary, Czechia, Slovakia, Slovenia, Croatia, Bosnia
const rus1870Ids = [
  "643", "804", "112", "246", "233", "428", "440", "616",
  "398", "860", "795", "417", "762", "268", "031", "051", "498"
]; // Russia, Ukraine, Belarus, Finland, Baltics, Poland, Central Asia, Caucasus, Moldova
const turIds = ["792", "760", "368", "400", "422", "376", "196"]; // Turkey, Syria, Iraq, Jordan, Lebanon, Israel/Palestine, Cyprus
const gbrIds = ["826", "372"]; // UK + Ireland

const ahuGeom1870 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => ahuIds.includes(g.id))
);
(ahuGeom1870 as any).id = "AHU";
(ahuGeom1870 as any).properties = { id: "AHU", name: "Áustria-Hungria", iso: "AHU" };

const rusGeom1870 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => rus1870Ids.includes(g.id))
);
(rusGeom1870 as any).id = "RUS";
(rusGeom1870 as any).properties = { id: "RUS", name: "Império Russo", iso: "RUS" };

const turGeom1870 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter(
    (g) => turIds.includes(g.id) || g.properties?.name === "N. Cyprus"
  )
);
(turGeom1870 as any).id = "TUR_HIST";
(turGeom1870 as any).properties = { id: "TUR_HIST", name: "Império Otomano", iso: "TUR_HIST" };

const gbrGeom1870 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => gbrIds.includes(g.id))
);
(gbrGeom1870 as any).id = "GBR";
(gbrGeom1870 as any).properties = { id: "GBR", name: "Reino Unido da Grã-Bretanha e Irlanda", iso: "GBR" };

const pruGeom1870 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "276")!,
  id: "PRU",
  properties: { id: "PRU", name: "Reino da Prússia", iso: "PRU" }
};

const fraGeom1870 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "250")!,
  id: "FRA",
  properties: { id: "FRA", name: "Império Francês", iso: "FRA" }
};

const consumed1870 = new Set([
  ...ahuIds,
  ...rus1870Ids,
  ...turIds,
  ...gbrIds,
  "276",
  "250"
]);
const consumedNames1870 = new Set(["N. Cyprus"]);

function sanitizeRemaining(
  geometries: any[],
  consumedIds: Set<string>,
  consumedNames: Set<string> = new Set()
) {
  return geometries
    .filter((g) => {
      if (g.id && consumedIds.has(g.id)) return false;
      if (g.properties?.name && consumedNames.has(g.properties.name)) return false;
      return true;
    })
    .map((g) => {
      const fallbackId =
        g.properties?.name === "N. Cyprus" ? "CYN" :
        g.properties?.name === "Somaliland" ? "SOM" :
        g.properties?.name === "Kosovo" ? "XKX" :
        "UNKNOWN";
      const finalId = g.id || fallbackId;
      return {
        ...g,
        id: finalId,
        properties: {
          ...(g.properties || {}),
          id: finalId,
          iso: finalId,
        },
      };
    });
}

const remaining1870 = sanitizeRemaining(
  wa.objects.countries.geometries,
  consumed1870,
  consumedNames1870
);

const topo1870 = {
  type: "Topology",
  arcs: wa.arcs,
  transform: wa.transform,
  bbox: wa.bbox,
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        pruGeom1870,
        ahuGeom1870,
        rusGeom1870,
        turGeom1870,
        fraGeom1870,
        gbrGeom1870,
        ...remaining1870
      ]
    }
  }
};

fs.writeFileSync(
  path.join(outputDir, "borders-1870.json"),
  JSON.stringify(topo1870)
);

// -------------------------------------------------------------
// ERA 2: 1914 (borders-1914.json)
// -------------------------------------------------------------
console.log("Generating borders-1914.json...");
const deuGeom1914 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "276")!,
  id: "DEU",
  properties: { id: "DEU", name: "Império Alemão", iso: "DEU" }
};

const fraGeom1914 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "250")!,
  id: "FRA",
  properties: { id: "FRA", name: "República Francesa", iso: "FRA" }
};

const consumed1914 = new Set([
  ...ahuIds,
  ...rus1870Ids,
  ...turIds,
  ...gbrIds,
  "276",
  "250"
]);

const remaining1914 = sanitizeRemaining(
  wa.objects.countries.geometries,
  consumed1914,
  consumedNames1870
);

const topo1914 = {
  type: "Topology",
  arcs: wa.arcs,
  transform: wa.transform,
  bbox: wa.bbox,
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        deuGeom1914,
        ahuGeom1870,
        rusGeom1870,
        turGeom1870,
        fraGeom1914,
        gbrGeom1870,
        ...remaining1914
      ]
    }
  }
};

fs.writeFileSync(
  path.join(outputDir, "borders-1914.json"),
  JSON.stringify(topo1914)
);

// -------------------------------------------------------------
// ERA 3: 1939 (borders-1939.json)
// -------------------------------------------------------------
console.log("Generating borders-1939.json...");
// Greater German Reich 1939: Germany (276) + Austria (040) + Czechia (203)
const deu1939Ids = ["276", "040", "203"];
const deuGeom1939 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => deu1939Ids.includes(g.id))
);
(deuGeom1939 as any).id = "DEU";
(deuGeom1939 as any).properties = { id: "DEU", name: "Alemanha (Terceiro Reich)", iso: "DEU" };

// Soviet Union 1939 (prior to Molotov-Ribbentrop annexations: Russia, Ukraine, Belarus, Caucasus, Central Asia)
const sun1939Ids = [
  "643", "804", "112",
  "398", "860", "795", "417", "762",
  "268", "031", "051"
];
const sunGeom1939 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => sun1939Ids.includes(g.id))
);
(sunGeom1939 as any).id = "SUN";
(sunGeom1939 as any).properties = { id: "SUN", name: "União Soviética", iso: "SUN" };

// Empire of Japan 1939: Japan (392) + S. Korea (410) + N. Korea (408) + Taiwan (158)
const jpn1939Ids = ["392", "410", "408", "158"];
const jpnGeom1939 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => jpn1939Ids.includes(g.id))
);
(jpnGeom1939 as any).id = "JPN";
(jpnGeom1939 as any).properties = { id: "JPN", name: "Império do Japão", iso: "JPN" };

// Kingdom of Italy 1939: Italy (380) + Albania (008)
const ita1939Ids = ["380", "008"];
const itaGeom1939 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => ita1939Ids.includes(g.id))
);
(itaGeom1939 as any).id = "ITA";
(itaGeom1939 as any).properties = { id: "ITA", name: "Reino da Itália", iso: "ITA" };

// Second Polish Republic 1939
const polGeom1939 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "616")!,
  id: "POL",
  properties: { id: "POL", name: "Segunda República Polonesa", iso: "POL" }
};

// Slovak Republic 1939
const svkGeom1939 = {
  ...wa.objects.countries.geometries.find((g) => g.id === "703")!,
  id: "SVK",
  properties: { id: "SVK", name: "República Eslovaca", iso: "SVK" }
};

const consumed1939 = new Set([
  ...deu1939Ids,
  ...sun1939Ids,
  ...jpn1939Ids,
  ...ita1939Ids,
  "616",
  "703"
]);

const remaining1939 = sanitizeRemaining(
  wa.objects.countries.geometries,
  consumed1939
);

const topo1939 = {
  type: "Topology",
  arcs: wa.arcs,
  transform: wa.transform,
  bbox: wa.bbox,
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        deuGeom1939,
        sunGeom1939,
        jpnGeom1939,
        itaGeom1939,
        polGeom1939,
        svkGeom1939,
        ...remaining1939
      ]
    }
  }
};

fs.writeFileSync(
  path.join(outputDir, "borders-1939.json"),
  JSON.stringify(topo1939)
);

// -------------------------------------------------------------
// ERA 4: 1969 (borders-1969.json)
// -------------------------------------------------------------
console.log("Generating borders-1969.json...");
// USSR 1969 (All 15 Soviet Republics)
const sun1969Ids = [
  "643", "804", "112",
  "398", "860", "795", "417", "762",
  "268", "031", "051",
  "498", "233", "428", "440"
];
const sunGeom1969 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => sun1969Ids.includes(g.id))
);
(sunGeom1969 as any).id = "SUN";
(sunGeom1969 as any).properties = { id: "SUN", name: "União Soviética", iso: "SUN" };

// Yugoslavia 1969 (Serbia, Croatia, Slovenia, Bosnia, Macedonia, Montenegro, Kosovo)
const yugIds = ["688", "191", "705", "070", "807", "499"];
const yugGeom1969 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter(
    (g) => yugIds.includes(g.id) || g.properties?.name === "Kosovo"
  )
);
(yugGeom1969 as any).id = "YUG";
(yugGeom1969 as any).properties = { id: "YUG", name: "Iugoslávia", iso: "YUG" };

// Czechoslovakia 1969 (Czechia + Slovakia)
const cskIds = ["203", "703"];
const cskGeom1969 = tc.mergeArcs(
  wa as any,
  wa.objects.countries.geometries.filter((g) => cskIds.includes(g.id))
);
(cskGeom1969 as any).id = "CSK";
(cskGeom1969 as any).properties = { id: "CSK", name: "Tchecoslováquia", iso: "CSK" };

// Split Germany into GDR and FRG
const deGeom = wa.objects.countries.geometries.find((g) => g.id === "276")!;
const deFeat = tc.feature(wa as any, deGeom as any) as any;
const deCoords = deFeat.geometry.coordinates[0];

const innerBorder: [number, number][] = [
  [10.94, 54.01],
  [11.00, 53.30],
  [10.75, 52.50],
  [10.60, 51.60],
  [10.20, 51.30],
  [10.25, 50.50],
  [11.00, 50.35],
  [12.24, 50.27]
];

const gdrCoords: [number, number][] = [
  ...deCoords.slice(53, 58),
  ...deCoords.slice(1, 13),
  ...[...innerBorder].reverse()
];
gdrCoords.push(gdrCoords[0]);

const frgCoords: [number, number][] = [
  ...deCoords.slice(12, 54),
  ...innerBorder
];
frgCoords.push(frgCoords[0]);

const gdrArc = coordsToDeltaArc(gdrCoords, wa.transform);
const frgArc = coordsToDeltaArc(frgCoords, wa.transform);

const arcs1969 = [...wa.arcs, gdrArc, frgArc];
const gdrArcIndex = arcs1969.length - 2;
const frgArcIndex = arcs1969.length - 1;

const gdrGeom1969 = {
  type: "Polygon",
  arcs: [[gdrArcIndex]],
  id: "GDR",
  properties: { id: "GDR", name: "Alemanha Oriental (RDA)", iso: "GDR" }
};

const frgGeom1969 = {
  type: "Polygon",
  arcs: [[frgArcIndex]],
  id: "FRG",
  properties: { id: "FRG", name: "Alemanha Ocidental (RFA)", iso: "FRG" }
};

const consumed1969 = new Set([
  ...sun1969Ids,
  ...yugIds,
  ...cskIds,
  "276"
]);
const consumedNames1969 = new Set(["Kosovo"]);

const remaining1969 = sanitizeRemaining(
  wa.objects.countries.geometries,
  consumed1969,
  consumedNames1969
);

const topo1969 = {
  type: "Topology",
  arcs: arcs1969,
  transform: wa.transform,
  bbox: wa.bbox,
  objects: {
    countries: {
      type: "GeometryCollection",
      geometries: [
        sunGeom1969,
        gdrGeom1969,
        frgGeom1969,
        yugGeom1969,
        cskGeom1969,
        ...remaining1969
      ]
    }
  }
};

fs.writeFileSync(
  path.join(outputDir, "borders-1969.json"),
  JSON.stringify(topo1969)
);

console.log("All 4 historical TopoJSON datasets successfully generated!");

// Verification check on all 4 files
for (const file of ["borders-1870.json", "borders-1914.json", "borders-1939.json", "borders-1969.json"]) {
  const p = path.join(outputDir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  const mesh = tc.mesh(data, data.objects.countries);
  const fc = tc.feature(data, data.objects.countries) as any;
  const idx = whichPolygon(fc);
  console.log(`[VERIFIED] ${file}: size=${(fs.statSync(p).size / 1024).toFixed(1)} KB, geoms=${data.objects.countries.geometries.length}, meshCoords=${mesh.coordinates.length}, spatialIndexReady=${!!idx}`);
}
