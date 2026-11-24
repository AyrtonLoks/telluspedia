import * as THREE from "three";

/**
 * Generates an equirectangular DataTexture of Pangea (~250 Ma) featuring the Panthalassa
 * superocean, continental shelf gradients, Tethys Sea, and Permian terracotta landmass
 * with organic harmonic coastlines. Used as immediate fallback while the PALEOMAP raster loads.
 */
export function createProceduralPangeaTexture(width = 512, height = 256): THREE.DataTexture {
  const size = width * height * 4;
  const data = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const phi = (90 - lat) * (Math.PI / 180);

    for (let x = 0; x < width; x++) {
      const lng = (x / width) * 360 - 180;
      const theta = (lng + 180) * (Math.PI / 180);
      const idx = (y * width + x) * 4;

      // Harmonic spherical perturbation for natural organic coastlines
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);

      const harmonic =
        Math.sin(nx * 5.0 + ny * 3.0) * 0.25 +
        Math.cos(ny * 7.0 + nz * 6.0) * 0.15 +
        Math.sin(nz * 11.0 + nx * 9.0) * 0.08;

      const pLat = lat + harmonic * 12.0;
      const pLng = lng + harmonic * 15.0;

      // 1. Tethys Sea (Equatorial triangular embayment)
      const inTethys =
        pLng > 15 &&
        pLng < 90 &&
        pLat > -20 &&
        pLat < 30 &&
        pLng > 28 - Math.abs(pLat) * 0.8;

      // 2. Pangea continuous supercontinent envelope
      const inCore = pLng > -55 && pLng < 45 && pLat > -45 && pLat < 55;
      const inSouthGondwana = pLng > -65 && pLng < 100 && pLat >= -80 && pLat <= -35;
      const inNorthLaurasia = pLng > -25 && pLng < 110 && pLat >= 45 && pLat < 78;

      let elevation = -0.5;
      if ((inCore || inSouthGondwana || inNorthLaurasia) && !inTethys) {
        const dist = Math.hypot(pLng * 0.015, pLat * 0.015);
        elevation = 0.25 - dist * 0.12 + harmonic * 0.4;
      }

      if (elevation > 0.04) {
        // Terracotta / ochre Permian arid landmass with mountain orogeny shading
        const m = Math.sin(nx * 14.0 + ny * 12.0) * Math.cos(nz * 15.0);
        const isMtn = m > 0.45 && elevation > 0.15;
        if (isMtn) {
          data[idx] = Math.floor(145 + harmonic * 30);
          data[idx + 1] = Math.floor(115 + harmonic * 25);
          data[idx + 2] = Math.floor(90 + harmonic * 20);
        } else if (Math.abs(pLat) > 65) {
          // Glossopteris wetlands
          data[idx] = Math.floor(80 + harmonic * 20);
          data[idx + 1] = Math.floor(100 + harmonic * 25);
          data[idx + 2] = Math.floor(65 + harmonic * 15);
        } else {
          // Arid desert interior
          data[idx] = Math.floor(185 + harmonic * 35);
          data[idx + 1] = Math.floor(120 + harmonic * 25);
          data[idx + 2] = Math.floor(70 + harmonic * 20);
        }
        data[idx + 3] = 0; // alfa = água (0 em terra), mesma convenção dos paleomapas
      } else if (elevation > -0.12) {
        // Turquoise continental shelf / lagoon
        const shelf = (elevation + 0.12) / 0.16;
        data[idx] = Math.floor(12 + shelf * 20);
        data[idx + 1] = Math.floor(65 + shelf * 55);
        data[idx + 2] = Math.floor(110 + shelf * 50);
        data[idx + 3] = 255;
      } else {
        // Deep Panthalassa ocean
        const depth = Math.min(1.0, (-elevation - 0.12) * 1.8);
        data[idx] = Math.floor(10 * (1.0 - depth * 0.5));
        data[idx + 1] = Math.floor(32 * (1.0 - depth * 0.5));
        data[idx + 2] = Math.floor(68 * (1.0 - depth * 0.5));
        data[idx + 3] = 255;
      }
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
