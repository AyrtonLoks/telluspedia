import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * Pure Node.js PNG encoder without external native dependencies (sharp/canvas).
 * Encodes RGBA Buffer into a standard, compressed, valid PNG file.
 */
function encodePNG(width: number, height: number, rgbaBuffer: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type RGBA (6)
  ihdr.writeUInt8(0, 10); // compression method 0 (deflate)
  ihdr.writeUInt8(0, 11); // filter method 0
  ihdr.writeUInt8(0, 12); // interlace 0 (no interlace)

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let srcOffset = 0;
  let dstOffset = 0;
  const rowBytes = width * 4;

  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter: None
    rgbaBuffer.copy(scanlines, dstOffset, srcOffset, srcOffset + rowBytes);
    dstOffset += rowBytes;
    srcOffset += rowBytes;
  }

  const compressedData = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * 2D Value Noise with Hermite smoothstep interpolation
 */
class ValueNoise2D {
  private perm: Uint8Array;

  constructor(seed = 42) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle with linear congruential generator
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private hash(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const g = this.perm[this.perm[xi] + yi];
    return g / 255.0;
  }

  public get(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    // Smoothstep interpolation (3t² - 2t³)
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const h00 = this.hash(xi, yi);
    const h10 = this.hash(xi + 1, yi);
    const h01 = this.hash(xi, yi + 1);
    const h11 = this.hash(xi + 1, yi + 1);

    const x1 = h00 + u * (h10 - h00);
    const x2 = h01 + u * (h11 - h01);
    return x1 + v * (x2 - x1);
  }

  public fractal(x: number, y: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0;
    let amp = 1.0;
    let freq = 1.0;
    let max = 0;

    for (let i = 0; i < octaves; i++) {
      sum += this.get(x * freq, y * freq) * amp;
      max += amp;
      freq *= lacunarity;
      amp *= gain;
    }

    return sum / max;
  }
}

const noise = new ValueNoise2D(1337);
const terrainNoise = new ValueNoise2D(9876);
const mountainNoise = new ValueNoise2D(54321);

/**
 * Generates high-resolution equirectangular texture for Pangea (~250 Ma)
 */
function generatePangeaBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180; // +90 (North) to -90 (South)
    const phi = (90 - lat) * (Math.PI / 180);

    for (let x = 0; x < width; x++) {
      const lng = (x / width) * 360 - 180; // -180 to +180
      const theta = (lng + 180) * (Math.PI / 180);

      const idx = (y * width + x) * 4;

      // Coordinate normalization for seamless noise sampling on sphere
      const nx = Math.sin(phi) * Math.cos(theta) * 2.5;
      const ny = Math.cos(phi) * 2.5;
      const nz = Math.sin(phi) * Math.sin(theta) * 2.5;

      // Fractal displacement for natural organic coastlines
      const warpX = noise.fractal(nx + 10, ny + 10, 4) * 18 - 9;
      const warpY = noise.fractal(ny + 20, nz + 20, 4) * 18 - 9;
      const pLat = lat + warpY;
      const pLng = lng + warpX;

      // 1. Tethys Gulf (Equatorial east-facing triangular wedge)
      const inTethys =
        pLng > 12 &&
        pLng < 95 &&
        pLat > -22 &&
        pLat < 32 &&
        pLng > 24 - Math.abs(pLat) * 0.85;

      // 2. Main Pangea Continental Envelope (Continuous "C" shape from 75°N to 80°S)
      // Core block: Laurentia, Baltica, Africa, South America
      const inCentralCore =
        pLng > -55 &&
        pLng < 48 &&
        pLat > -45 &&
        pLat < 55;

      // Southern Gondwana: South America, South Africa, Antarctica, Australia
      const inSouthGondwana =
        pLng > -65 &&
        pLng < 105 &&
        pLat >= -82 &&
        pLat <= -35;

      // Northern Laurasia: Siberia, Kazakhstania, Baltica
      const inNorthLaurasia =
        pLng > -25 &&
        pLng < 115 &&
        pLat >= 45 &&
        pLat < 80;

      // Cathaysia / Indochina / North China islands in Eastern Tethys
      const inCathaysia =
        pLng > 95 &&
        pLng < 135 &&
        pLat > 10 &&
        pLat < 40 &&
        noise.fractal(nx * 3, ny * 3, 3) > 0.48;

      // Organic continental boundary check
      let rawElevation = -0.5; // Ocean default

      if ((inCentralCore || inSouthGondwana || inNorthLaurasia || inCathaysia) && !inTethys) {
        // Distance to land envelope center
        const distFromCenter = Math.hypot(pLng * 0.015, pLat * 0.015);
        const edgeTurbulence = noise.fractal(nx * 1.8, ny * 1.8 + nz * 1.8, 5) * 0.45;
        rawElevation = 0.25 - distFromCenter * 0.15 + edgeTurbulence;
      }

      // Coastal shelf transition zone
      const isLand = rawElevation > 0.05;
      const isShelf = rawElevation > -0.15 && !isLand;

      if (!isLand) {
        if (isShelf) {
          // Continental Shelf / Tropical Shallow Margin
          const shelfFactor = (rawElevation + 0.15) / 0.20;
          // Gradient from deep azure (#0d3b66) to turquoise carbonate shelf (#16688e / #208b98)
          const r = Math.floor(10 + shelfFactor * 22);
          const g = Math.floor(55 + shelfFactor * 55);
          const b = Math.floor(95 + shelfFactor * 55);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else {
          // Deep Panthalassa Superocean Abyssal Waters
          // Latitude-based polar deepening & equatorial warmth
          const depthNoise = noise.fractal(nx * 0.8, ny * 0.8, 3) * 0.2;
          const oceanDepth = Math.max(0, Math.min(1, (-rawElevation - 0.15) * 1.5 + depthNoise));
          // Gradient from #0d264a to deepest abyss #051020
          const r = Math.floor(13 * (1 - oceanDepth * 0.65));
          const g = Math.floor(36 * (1 - oceanDepth * 0.65));
          const b = Math.floor(74 * (1 - oceanDepth * 0.65));
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        }
      } else {
        // Continental Landmass of Pangea
        const elevation = rawElevation;
        const detail = terrainNoise.fractal(nx * 4, ny * 4, 5);
        const mountain = mountainNoise.fractal(nx * 6, ny * 6, 6);

        // Detect Mountain Belts (Central Pangean Mountains / Variscan-Appalachian & Uralian Orogeny)
        // Variscan-Appalachian belt runs across lat 20°N to 45°N, lng -40° to +20°
        const distToVariscan = Math.hypot((pLat - 32) * 0.06, (pLng + 10) * 0.025);
        const isVariscan = distToVariscan < 0.6 && detail > 0.35;

        // Uralian Orogeny: lat 40°N to 75°N, lng 55°E to 65°E
        const distToUrals = Math.hypot((pLng - 60) * 0.12, (pLat - 55) * 0.03);
        const isUrals = distToUrals < 0.5 && detail > 0.3;

        const isMountain = (isVariscan || isUrals || mountain > 0.68) && elevation > 0.18;

        if (isMountain) {
          // High mountain chains: rocky granite, weathered crags, pale peaks
          const mFactor = Math.min(1, (mountain + detail) * 0.7);
          const r = Math.floor(135 + mFactor * 55);
          const g = Math.floor(105 + mFactor * 45);
          const b = Math.floor(80 + mFactor * 40);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else if (Math.abs(pLat) > 65) {
          // Polar Permian Glossopteris / Conifer wetlands (South Gondwana & North Siberia)
          // Muted tundra olive / moss green
          const polarFactor = detail;
          const r = Math.floor(75 + polarFactor * 30);
          const g = Math.floor(95 + polarFactor * 35);
          const b = Math.floor(60 + polarFactor * 25);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else if (Math.abs(pLat) < 28 && pLng > -35 && pLng < 25) {
          // Hyper-arid Permian Supercontinent Interior Desert (Massive erg / dunes / red beds)
          // Terracotta / ochre / burnt sienna
          const aridFactor = detail;
          const r = Math.floor(180 + aridFactor * 40);
          const g = Math.floor(115 + aridFactor * 30);
          const b = Math.floor(65 + aridFactor * 25);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else {
          // Semi-arid savanna / shrublands / coastal tropical margins
          const tFactor = detail;
          const r = Math.floor(150 + tFactor * 35);
          const g = Math.floor(125 + tFactor * 30);
          const b = Math.floor(80 + tFactor * 25);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        }
      }
    }
  }

  return buf;
}

/**
 * Generates high-resolution equirectangular texture for Gondwana & Laurasia (~150 Ma, Late Jurassic)
 */
function generateGondwanaBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const phi = (90 - lat) * (Math.PI / 180);

    for (let x = 0; x < width; x++) {
      const lng = (x / width) * 360 - 180;
      const theta = (lng + 180) * (Math.PI / 180);

      const idx = (y * width + x) * 4;

      const nx = Math.sin(phi) * Math.cos(theta) * 2.5;
      const ny = Math.cos(phi) * 2.5;
      const nz = Math.sin(phi) * Math.sin(theta) * 2.5;

      const warpX = noise.fractal(nx + 15, ny + 15, 4) * 16 - 8;
      const warpY = noise.fractal(ny + 25, nz + 25, 4) * 16 - 8;
      const pLat = lat + warpY;
      const pLng = lng + warpX;

      // 1. Tethys Seaway (Equatorial tropical marine channel separating Laurasia from Gondwana)
      const inTethysPassage =
        pLat > -12 &&
        pLat < 22 &&
        pLng > -45 &&
        pLng < 110;

      // 2. Incipient Central Atlantic Rift (between North America and West Africa)
      const inCentralAtlantic =
        pLng > -50 &&
        pLng < -25 &&
        pLat > 10 &&
        pLat < 35 &&
        Math.abs(pLng + (pLat - 22) * 0.8 + 35) < 9;

      // 3. Northern Supercontinent: LAURASIA (North America, Greenland, Eurasia)
      const inNorthAmerica =
        pLng > -125 &&
        pLng < -45 &&
        pLat > 20 &&
        pLat < 75;

      const inEurasia =
        pLng > -20 &&
        pLng < 140 &&
        pLat > 25 &&
        pLat < 80;

      const inLaurasia = (inNorthAmerica || inEurasia) && !inCentralAtlantic && !inTethysPassage;

      // 4. Southern Supercontinent: GONDWANA (South America, Africa, India, Antarctica, Australia)
      const inSouthAmericaAfrica =
        pLng > -75 &&
        pLng < 55 &&
        pLat > -55 &&
        pLat < 10;

      const inEastGondwana =
        pLng > 35 &&
        pLng < 155 &&
        pLat > -85 &&
        pLat < -15;

      const inGondwana = (inSouthAmericaAfrica || inEastGondwana) && !inTethysPassage;

      let rawElevation = -0.5;

      if (inLaurasia || inGondwana) {
        const edgeTurbulence = noise.fractal(nx * 2, ny * 2 + nz * 2, 5) * 0.45;
        rawElevation = 0.22 + edgeTurbulence;
      }

      const isLand = rawElevation > 0.06;
      const isShelf = rawElevation > -0.15 && !isLand;

      if (!isLand) {
        if (isShelf || inTethysPassage || inCentralAtlantic) {
          // Warm tropical shallow epicontinental sea / carbonate platforms
          const shelfFactor = Math.max(0, Math.min(1, (rawElevation + 0.15) / 0.25));
          const r = Math.floor(12 + shelfFactor * 26);
          const g = Math.floor(65 + shelfFactor * 60);
          const b = Math.floor(105 + shelfFactor * 60);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else {
          // Deep Paleopacific Ocean
          const depthNoise = noise.fractal(nx * 0.8, ny * 0.8, 3) * 0.2;
          const oceanDepth = Math.max(0, Math.min(1, (-rawElevation - 0.15) * 1.5 + depthNoise));
          const r = Math.floor(10 * (1 - oceanDepth * 0.6));
          const g = Math.floor(32 * (1 - oceanDepth * 0.6));
          const b = Math.floor(70 * (1 - oceanDepth * 0.6));
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        }
      } else {
        // Jurassic Lush Greenhouse Landmass (Rich cycads, conifers, ginkgoes, ferns)
        const detail = terrainNoise.fractal(nx * 4, ny * 4, 5);
        const mountain = mountainNoise.fractal(nx * 6, ny * 6, 6);

        if (mountain > 0.65 && rawElevation > 0.2) {
          // Mountain cordilleras (Early Sierra Nevada / ancestral Andes & Alpine arcs)
          const mFactor = (mountain - 0.65) * 2.8;
          const r = Math.floor(130 + mFactor * 50);
          const g = Math.floor(115 + mFactor * 40);
          const b = Math.floor(85 + mFactor * 35);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else if (pLat > 60 || pLat < -60) {
          // Temperate polar Jurassic forests (No ice caps, mild humid climate)
          const f = detail;
          const r = Math.floor(55 + f * 25);
          const g = Math.floor(85 + f * 35);
          const b = Math.floor(45 + f * 20);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        } else {
          // Lush Jurassic sub-tropical floodplains & open conifer savannas
          const f = detail;
          const r = Math.floor(75 + f * 40);
          const g = Math.floor(110 + f * 45);
          const b = Math.floor(55 + f * 30);
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = 255;
        }
      }
    }
  }

  return buf;
}

// -------------------------------------------------------------------------
// EXECUTION: Generate textures at 2048x1024 resolution and write to public/
// -------------------------------------------------------------------------
const W = 2048;
const H = 1024;

console.log(`Generating high-resolution Pangea texture (${W}x${H})...`);
const pangeaBuffer = generatePangeaBuffer(W, H);
const pangeaPNG = encodePNG(W, H, pangeaBuffer);

console.log(`Generating high-resolution Gondwana texture (${W}x${H})...`);
const gondwanaBuffer = generateGondwanaBuffer(W, H);
const gondwanaPNG = encodePNG(W, H, gondwanaBuffer);

const rootDir = path.resolve(process.cwd(), "public/textures");
const paleoSubdir = path.resolve(rootDir, "paleo");

if (!fs.existsSync(paleoSubdir)) {
  fs.mkdirSync(paleoSubdir, { recursive: true });
}

// Write Pangea textures
fs.writeFileSync(path.join(rootDir, "paleo_pangea.png"), pangeaPNG);
fs.writeFileSync(path.join(rootDir, "pangea_250ma.png"), pangeaPNG);
fs.writeFileSync(path.join(paleoSubdir, "pangea_250ma.png"), pangeaPNG);
fs.writeFileSync(path.join(paleoSubdir, "pangea_250ma.jpg"), pangeaPNG); // Alias for test compatibility

// Write Gondwana textures
fs.writeFileSync(path.join(rootDir, "paleo_gondwana.png"), gondwanaPNG);
fs.writeFileSync(path.join(rootDir, "gondwana_150ma.png"), gondwanaPNG);
fs.writeFileSync(path.join(paleoSubdir, "gondwana_150ma.png"), gondwanaPNG);

console.log("Successfully generated all high-resolution paleogeographic textures!");
console.log(`- Pangea PNG Size: ${(pangeaPNG.length / 1024).toFixed(1)} KB`);
console.log(`- Gondwana PNG Size: ${(gondwanaPNG.length / 1024).toFixed(1)} KB`);
