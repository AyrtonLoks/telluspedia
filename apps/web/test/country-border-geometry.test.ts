import assert from "node:assert/strict";
import { test } from "node:test";
import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { getCountryFill, getCountryOutline } from "../src/lib/country-border-geometry";
import { latLngToVector3 } from "../src/lib/geo-spatial";
import { contemporaryTopology, loadHistoricalTopology } from "../src/lib/historical-topology";

function assertCoverage(positions: Float32Array | undefined, points: [number, number, boolean][]) {
  assert.ok(positions?.length);
  const geometry = new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material);
  try {
    for (const [lat, lng, inside] of points) {
      const radial = latLngToVector3(lat, lng);
      const ray = new Raycaster(radial.clone().multiplyScalar(2), radial.negate(), 0, 1);
      assert.equal(ray.intersectObject(mesh).length > 0, inside, `${lat}, ${lng}`);
    }

    // A chord or face below radius 1 would flicker or disappear into the Earth.
    for (let offset = 0; offset < positions.length; offset += 9) {
      const a = new Vector3().fromArray(positions, offset);
      const b = new Vector3().fromArray(positions, offset + 3);
      const c = new Vector3().fromArray(positions, offset + 6);
      assert.ok(a.distanceToSquared(b) < 0.003 && b.distanceToSquared(c) < 0.003 && c.distanceToSquared(a) < 0.003);
      assert.ok(a.add(b).add(c).divideScalar(3).length() > 1);
    }
  } finally {
    geometry.dispose();
    material.dispose();
  }
}

test("spherical fill covers multipart countries and preserves enclaves", () => {
  assertCoverage(getCountryFill(contemporaryTopology, "FRA"), [
    [47, 2, true], [4, -53, true], [25, -23, false],
  ]);
  assertCoverage(getCountryFill(contemporaryTopology, "ZAF"), [
    [-29, 26, true], [-29.5, 28.3, false],
  ]);
  assertCoverage(getCountryFill(contemporaryTopology, "ATA"), [
    [-87, 0, true], [-87, 179, true], [-50, 0, false],
  ]);
});

test("outlines and fills are reused within an atlas and keyed by historical entity", async () => {
  const outline = getCountryOutline(contemporaryTopology, "BRA");
  assert.ok(outline?.length);
  assert.strictEqual(getCountryOutline(contemporaryTopology, "BRA"), outline);

  const topology = await loadHistoricalTopology("/data/history/borders-1870.json");
  assert.ok(topology);
  const prussia = getCountryFill(topology, "PRU");
  assertCoverage(prussia, [[52.52, 13.4, true], [48.2, 16.37, false]]);
  assert.strictEqual(getCountryFill(topology, "PRU"), prussia);
  assert.equal(getCountryFill(contemporaryTopology, "PRU"), undefined);
});
