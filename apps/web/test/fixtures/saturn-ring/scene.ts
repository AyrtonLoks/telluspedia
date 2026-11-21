/**
 * Cena mínima de Saturno para o teste de renderização das sombras (D21). Empacotada pelo esbuild e
 * aberta no Chrome headless por test/saturn-ring-render.test.ts. Expõe `window.renderSaturn(opts)`.
 */
import * as THREE from "three";
import { applyRingShadow, createRadialRingGeometry, createRingShadowUniforms } from "../../../src/components/globe/planetShading";

declare global {
  interface Window {
    renderSaturn: (o: { shadows: boolean; view: "night" | "day"; decay: number; intensity: number }) => Promise<number[][]>;
  }
}

const W = 200, H = 200;
const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: false });
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const ringTexture = new THREE.TextureLoader().loadAsync("/ring.png").then((t) => ((t.colorSpace = THREE.SRGBColorSpace), t));

window.renderSaturn = async ({ shadows, view, decay, intensity }) => {
  const ringMap = await ringTexture;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  scene.add(new THREE.PointLight(0xfffbeb, intensity, 1500, decay)); // Sol na origem
  const C = new THREE.Vector3(-8, 0, 97); // ~9,6 UA na escala de cena
  const R = 2.5;
  const tilted = new THREE.Group();
  tilted.position.copy(C);
  tilted.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.086, 0.882, -0.463).normalize());
  scene.add(tilted);
  const uniforms = createRingShadowUniforms();
  const planet = new THREE.MeshStandardMaterial({ color: 0xd0c0a0, roughness: 0.85, metalness: 0 });
  const ring = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, roughness: 1, metalness: 0, alphaTest: 0.02, map: ringMap });
  if (shadows) {
    applyRingShadow(planet, uniforms, "planet");
    applyRingShadow(ring, uniforms, "ring");
  }
  tilted.add(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), planet));
  tilted.add(new THREE.Mesh(createRadialRingGeometry(R * 1.22, R * 2.3), ring));
  scene.updateMatrixWorld(true);
  uniforms.uBodyCenter.value.copy(C);
  uniforms.uBodyRadius.value = R;
  uniforms.uRingInner.value = R * 1.22;
  uniforms.uRingOuter.value = R * 2.3;
  uniforms.uRingMap.value = ringMap;
  uniforms.uRingNormal.value.set(0, 1, 0).applyQuaternion(tilted.quaternion);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
  const offset = view === "night" ? new THREE.Vector3(0, 13, 9.5) : C.clone().normalize().multiplyScalar(-13).add(new THREE.Vector3(3, 2, 0));
  camera.position.copy(C).add(offset);
  camera.lookAt(C);
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const rows: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) {
      const i = ((H - 1 - y) * W + x) * 4; // de cima para baixo
      row.push(px[i] + px[i + 1] + px[i + 2]);
    }
    rows.push(row);
  }
  return rows;
};
