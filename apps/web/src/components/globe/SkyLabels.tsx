"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface SkyLabel {
  name: string;
  position: THREE.Vector3;
  kind: "star" | "constellation";
}

const ignoreRaycast = () => null;
const LABEL_LIMIT = 18;
const LABEL_MARGIN = 8;

function makeLabel(label: SkyLabel) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  const font = "500 22px system-ui, sans-serif";
  context.font = font;
  canvas.width = Math.ceil(context.measureText(label.name).width) + 12;
  canvas.height = 36;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 4;
  context.strokeStyle = "#07111d";
  context.fillStyle = label.kind === "star" ? "#e1edf8" : "#8eb4cd";
  context.strokeText(label.name, canvas.width / 2, canvas.height / 2);
  context.fillText(label.name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    sizeAttenuation: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = label.name;
  sprite.center.set(0.5, label.kind === "star" ? 1.15 : 0.5);
  sprite.position.copy(label.position).multiplyScalar(0.985);
  sprite.raycast = ignoreRaycast;
  sprite.visible = false;

  return { sprite, texture, width: canvas.width / 2, height: canvas.height / 2 };
}

interface Rectangle {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function intersects(a: Rectangle, b: Rectangle) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function SkyLabels({ labels }: { labels: SkyLabel[] }) {
  const sprites = useMemo(() => labels.map(makeLabel).filter((label) => label !== null), [labels]);
  const position = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => {
    for (const { sprite, texture } of sprites) {
      sprite.material.dispose();
      texture.dispose();
    }
  }, [sprites]);

  useFrame(({ camera, size }) => {
    const parent = sprites[0]?.sprite.parent;
    if (!parent || !size.height) return;
    parent.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();

    const occupied: Rectangle[] = [];
    const pixelsPerUnit = size.height * camera.projectionMatrix.elements[5] / 2;
    for (const { sprite, width, height } of sprites) {
      sprite.visible = false;
      if (occupied.length >= LABEL_LIMIT) continue;
      position.copy(sprite.position).applyMatrix4(parent.matrixWorld).project(camera);
      if (Math.abs(position.z) > 1) continue;

      const x = (position.x + 1) * size.width / 2;
      const y = (1 - position.y) * size.height / 2;
      const bounds = {
        left: x - sprite.center.x * width - LABEL_MARGIN,
        right: x + (1 - sprite.center.x) * width + LABEL_MARGIN,
        top: y - (1 - sprite.center.y) * height - LABEL_MARGIN,
        bottom: y + sprite.center.y * height + LABEL_MARGIN,
      };
      if (
        bounds.left < 0 || bounds.right > size.width || bounds.top < 0 || bounds.bottom > size.height ||
        occupied.some((previous) => intersects(bounds, previous))
      ) continue;

      occupied.push(bounds);
      sprite.visible = true;
      sprite.scale.set(width / pixelsPerUnit, height / pixelsPerUnit, 1);
    }
  });

  return sprites.map(({ sprite }) => <primitive key={sprite.uuid} object={sprite} />);
}
