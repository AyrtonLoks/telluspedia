"use client";

import React, { useEffect, useId, useRef } from "react";
import { useSolarSystemExiting } from "@/stores/cosmicExitStore";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { resolveLabelCollisions, type LabelBox } from "@/lib/label-layout";
import { cn } from "@/components/ui/cn";

/**
 * Rótulo único dos corpos do modo Cosmos (D11): tamanho fixo em px (sem `distanceFactor`),
 * ancorado acima do corpo e sujeito à anticolisão do `CelestialLabelManager`.
 */
interface Entry {
  object: React.RefObject<THREE.Object3D | null>;
  element: React.RefObject<HTMLDivElement | null>;
  priority: React.MutableRefObject<number>;
  size: { width: number; height: number };
}

const registry = new Map<string, Entry>();

/** Distância da âncora até a base do rótulo (px). */
const GAP_PX = 6;

export const CelestialLabel: React.FC<{
  /** Prioridade na anticolisão (ver `celestialLabelPriority`). */
  priority: number;
  /** Altura da âncora acima do centro do corpo (unidades de cena; em geral o raio). */
  anchorHeight: number;
  children: React.ReactNode;
}> = ({ priority, anchorHeight, children }) => {
  const id = useId();
  // Na descida de volta à Terra os rótulos ficam ocultos (o gerenciador de anticolisão não roda fora do
  // Cosmos). Ocultos, não desmontados: o <Html> tem raiz React própria, e desmontá-la no meio de uma
  // renderização (a saída começa num layout effect) gera erro no React.
  const exiting = useSolarSystemExiting();
  const object = useRef<THREE.Group>(null);
  const element = useRef<HTMLDivElement>(null);
  const priorityRef = useRef(priority);
  priorityRef.current = priority;

  useEffect(() => {
    registry.set(id, { object, element, priority: priorityRef, size: { width: 0, height: 0 } });
    return () => {
      registry.delete(id);
    };
  }, [id]);

  return (
    <group ref={object} position={[0, anchorHeight, 0]}>
      <Html zIndexRange={[30, 0]} className="pointer-events-none select-none">
        <div
          ref={element}
          data-celestial-label=""
          style={{
            transform: `translate(-50%, calc(-100% - ${GAP_PX}px))`,
            opacity: 0,
            transition: "opacity 120ms ease-out",
            visibility: exiting ? "hidden" : undefined,
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
};

const world = new THREE.Vector3();

/** Resolve a visibilidade de todos os rótulos registrados a cada quadro (montado uma vez no Canvas). */
export const CelestialLabelManager: React.FC = () => {
  const { camera, size } = useThree();

  useFrame(() => {
    if (registry.size === 0) return;
    const boxes: LabelBox[] = [];
    for (const [id, entry] of registry) {
      const obj = entry.object.current;
      const el = entry.element.current;
      if (!obj || !el) continue;
      if (!entry.size.width) {
        entry.size.width = el.offsetWidth;
        entry.size.height = el.offsetHeight;
      }
      obj.getWorldPosition(world);
      world.project(camera);
      const onScreen = world.z < 1 && Math.abs(world.x) <= 1.05 && Math.abs(world.y) <= 1.05;
      boxes.push({
        id,
        priority: entry.priority.current,
        x: ((world.x + 1) / 2) * size.width,
        y: ((1 - world.y) / 2) * size.height - GAP_PX,
        width: entry.size.width || 80,
        height: entry.size.height || 20,
        onScreen,
      });
    }
    const visible = resolveLabelCollisions(boxes);
    for (const [id, entry] of registry) {
      const el = entry.element.current;
      if (!el) continue;
      const show = visible.has(id);
      const opacity = show ? "1" : "0";
      if (el.style.opacity !== opacity) el.style.opacity = opacity;
      // Rótulo escondido não recebe clique (o do Halley é um botão).
      const events = show ? "" : "none";
      if (el.style.pointerEvents !== events) el.style.pointerEvents = events;
    }
  });

  return null;
};

/** Para testes: quantos rótulos estão registrados. */
export function registeredCelestialLabels(): number {
  return registry.size;
}

/** Conteúdo padrão dos rótulos de corpos celestes (tokens do design system D14). */
export const CelestialLabelChip: React.FC<{ name: string; detail?: string; focused?: boolean; hovered?: boolean }> = ({
  name,
  detail,
  focused,
  hovered,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border bg-surface/86 px-2 py-0.5 text-caption font-medium shadow-e1 backdrop-blur-md transition-colors duration-fast ease-out",
      focused ? "border-accent text-accent" : hovered ? "border-line-strong text-fg" : "border-line text-fg"
    )}
  >
    <span>{name}</span>
    {detail && <span className="font-mono tabular-nums text-fg-secondary">{detail}</span>}
  </span>
);
