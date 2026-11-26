"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTimelineStore } from "@/stores/timelineStore";
import { MilestonePin } from "./MilestonePin";
import { MilestoneCluster } from "./MilestoneCluster";

const GeologicalTimelineAxis = dynamic(
  () => import("./GeologicalTimelineAxis").then((m) => m.GeologicalTimelineAxis),
  { ssr: false }
);
import {
  adaptiveTicks,
  clusterPins,
  DEFAULT_AXIS_WIDTH_PX,
  milestoneDecimalYear,
  panView,
  pxToYear,
  viewForCluster,
  yearToPercent,
  zoomView,
  type AxisView,
} from "@/lib/timeline/axis";
import { GLOBAL_MILESTONES, findMilestoneById, getCountryMilestones, type MilestoneItem } from "@/lib/milestones";
import { useGlobeStore } from "@/stores/globeStore";
import { useTransversalStore } from "@/stores/transversalStore";
import { cn } from "@/components/ui/cn";
import { useEpochState } from "@/lib/epoch/useEpochState";

export const TimelineAxis: React.FC = () => {
  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const storeActiveCategories = useTimelineStore((s) => s.activeCategories);
  const selectMilestone = useTimelineStore((s) => s.selectMilestone);
  const storeSelectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const storeSelectedIso = useGlobeStore((s) => s.selectedIso);
  const storeActiveTransversal = useTransversalStore((s) => s.activeEntity);

  const isServer = typeof window === "undefined";
  const activeTransversal = isServer
    ? useTransversalStore.getState().activeEntity
    : storeActiveTransversal;
  const startYear = isServer ? useTimelineStore.getState().startYear : storeStartYear;
  const endYear = isServer ? useTimelineStore.getState().endYear : storeEndYear;
  const activeCategories = isServer
    ? useTimelineStore.getState().activeCategories
    : storeActiveCategories;
  const selectedMilestoneId = isServer
    ? useTimelineStore.getState().selectedMilestoneId
    : storeSelectedMilestoneId;
  // Época ativa: fonte única (T12)
  const epoch = useEpochState();
  const geologicalMa = epoch.geologicalMa;
  const selectedIso = isServer ? useGlobeStore.getState().selectedIso : storeSelectedIso;

  const isGeological = epoch.mode === "GEOLOGICAL";

  // Aggregate Milestones (Transversal lens when active; otherwise Global + Selected Country)
  const milestones = useMemo(() => {
    const all: MilestoneItem[] = activeTransversal
      ? [...activeTransversal.milestones]
      : [...GLOBAL_MILESTONES];

    if (!activeTransversal && selectedIso) {
      for (const cm of getCountryMilestones(selectedIso)) {
        if (!all.some((m) => m.id === cm.id)) {
          all.push({
            ...cm,
            countryIso: cm.countryIso || selectedIso,
          });
        }
      }
    }

    const selected = selectedMilestoneId && findMilestoneById(selectedMilestoneId);
    if (selected && !all.some(item => item.id === selected.id)) all.push(selected);

    // Filter by year range and active categories
    const filtered = all.filter(
      (m) =>
        m.year >= startYear &&
        m.year <= endYear &&
        activeCategories.includes(m.category)
    );

    // Sort chronologically
    return filtered.sort((a, b) => a.year - b.year);
  }, [startYear, endYear, activeCategories, selectedIso, selectedMilestoneId, activeTransversal]);

  const handleAxisBackgroundClick = () => {
    selectMilestone(null);
  };

  if (isGeological) {
    return (
      <GeologicalTimelineAxis
        geologicalMa={geologicalMa}
        selectedMilestoneId={selectedMilestoneId}
        onBackgroundClick={handleAxisBackgroundClick}
      />
    );
  }

  return (
    <HistoricalAxis
      startYear={startYear}
      endYear={endYear}
      milestones={milestones}
      onBackgroundClick={handleAxisBackgroundClick}
    />
  );
};

const ZOOM_STEP = 0.8;

/**
 * Eixo histórico (D13): zoom (roda, pinça, teclado) e pan (arrastar), ticks adaptativos
 * (século → década → ano → mês), marcos próximos agrupados sem sobreposição e scrubber do ano.
 */
const HistoricalAxis: React.FC<{
  startYear: number;
  endYear: number;
  milestones: MilestoneItem[];
  onBackgroundClick: () => void;
}> = ({ startYear, endYear, milestones, onBackgroundClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_AXIS_WIDTH_PX);
  const bounds = useMemo<AxisView>(() => ({ start: startYear, end: Math.max(startYear + 1, endYear) }), [startYear, endYear]);
  const [view, setView] = useState<AxisView>(bounds);
  const viewRef = useRef(view);
  viewRef.current = view;
  // Atualiza a ref na hora: vários eventos de roda/pinça no mesmo quadro somam, em vez de
  // recalcular a partir da janela antiga.
  const applyView = useCallback((next: AxisView) => {
    viewRef.current = next;
    setView(next);
  }, []);
  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedYear = typeof window === "undefined" ? useTimelineStore.getState().selectedYear : storeSelectedYear;
  const selectYear = useTimelineStore((s) => s.selectYear);

  // Novo período (preset): volta a mostrar o período inteiro.
  useEffect(() => applyView(bounds), [bounds, applyView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const anchorAt = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? pxToYear(clientX - rect.left, rect.width, viewRef.current) : (viewRef.current.start + viewRef.current.end) / 2;
  }, []);

  // Roda/trackpad (listener nativo, não passivo, para não rolar a página). Ctrl+roda = pinça do trackpad.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) {
        applyView(panView(v, bounds, (e.deltaX / Math.max(1, el.clientWidth)) * (v.end - v.start)));
      } else {
        applyView(zoomView(v, bounds, Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), anchorAt(e.clientX)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bounds, anchorAt, applyView]);

  // Arrastar = pan; dois dedos = pinça. Um clique sem arrasto desmarca o marco selecionado.
  const pointers = useRef(new Map<number, number>());
  const gesture = useRef<{ moved: boolean; lastX: number; pinchDist: number }>({ moved: false, lastX: 0, pinchDist: 0 });
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Só o fundo do eixo inicia gesto; marcos, grupos e scrubber tratam o próprio clique.
    const target = e.target as HTMLElement;
    if (target !== e.currentTarget && !target.hasAttribute("data-axis-bg")) return;
    pointers.current.set(e.pointerId, e.clientX);
    gesture.current.lastX = e.clientX;
    gesture.current.moved = false;
    if (pointers.current.size === 2) {
      pointers.current.forEach((_, id) => e.currentTarget.setPointerCapture?.(id));
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.abs(a - b);
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e.clientX);
    const v = viewRef.current;
    const w = Math.max(1, containerRef.current?.clientWidth ?? width);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.abs(a - b);
      if (gesture.current.pinchDist > 0 && dist > 0) {
        applyView(zoomView(v, bounds, gesture.current.pinchDist / dist, anchorAt((a + b) / 2)));
        gesture.current.moved = true;
      }
      gesture.current.pinchDist = dist;
      return;
    }
    const dx = e.clientX - gesture.current.lastX;
    if (!gesture.current.moved && Math.abs(dx) < 3) return;
    if (!gesture.current.moved) e.currentTarget.setPointerCapture?.(e.pointerId);
    gesture.current.moved = true;
    gesture.current.lastX = e.clientX;
    applyView(panView(v, bounds, (-dx / w) * (v.end - v.start)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinchDist = 0;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const v = viewRef.current;
    const mid = (v.start + v.end) / 2;
    const span = v.end - v.start;
    if (e.key === "+" || e.key === "=") applyView(zoomView(v, bounds, ZOOM_STEP, mid));
    else if (e.key === "-" || e.key === "_") applyView(zoomView(v, bounds, 1 / ZOOM_STEP, mid));
    else if (e.key === "ArrowLeft") applyView(panView(v, bounds, -span * 0.1));
    else if (e.key === "ArrowRight") applyView(panView(v, bounds, span * 0.1));
    else if (e.key === "0") applyView(bounds);
    else return;
    e.preventDefault();
  };

  const ticks = useMemo(() => adaptiveTicks(view, width), [view, width]);
  const clusters = useMemo(() => {
    const visible = milestones
      .map((m) => {
        const raw = milestoneDecimalYear(m.year, m.exactDate);
        // Garante visibilidade de marcos com data após 01/jan no último ano da janela (`endYear`)
        const value = m.year === Math.floor(bounds.end) ? Math.min(bounds.end, raw) : raw;
        return { item: m, value };
      })
      .filter((p) => p.value >= view.start && p.value <= view.end);
    return clusterPins(visible, view, width, (m) => m.id);
  }, [milestones, view, width, bounds.end]);
  const pinPercents = clusters.map((c) => yearToPercent(c.value, view));
  const isZoomed = view.end - view.start < bounds.end - bounds.start - 1e-6;

  // Scrubber: ano selecionado (ou o fim do período quando nenhum foi escolhido), arrastável.
  const scrubYear = selectedYear ?? Math.floor(bounds.end);
  const scrubPercent = yearToPercent(Math.min(bounds.end, scrubYear + 0.5), view);
  const scrubVisible = scrubPercent >= 0 && scrubPercent <= 100;
  const yearFromClientX = (clientX: number) => Math.min(Math.floor(bounds.end), Math.max(Math.floor(bounds.start), Math.floor(anchorAt(clientX))));
  const onScrubPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onScrubPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
    const y = yearFromClientX(e.clientX);
    if (y !== useTimelineStore.getState().selectedYear) selectYear(y);
  };
  const onScrubKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const delta = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();
    selectYear(Math.min(Math.floor(bounds.end), Math.max(Math.floor(bounds.start), scrubYear + delta)));
  };

  return (
    <div
      ref={containerRef}
      data-testid="historical-timeline-axis"
      data-view-start={view.start.toFixed(2)}
      data-view-end={view.end.toFixed(2)}
      tabIndex={0}
      aria-label="Eixo da linha do tempo. Roda ou pinça para zoom, arrastar para mover; teclas + e − para zoom, setas para mover e 0 para o período inteiro."
      className="relative w-full h-16 my-1 select-none cursor-grab touch-none rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={() => {
        if (!gesture.current.moved) onBackgroundClick();
        gesture.current.moved = false;
      }}
    >
      {/* Central Axis Line */}
      <div data-axis-bg="" className="absolute left-0 right-0 top-1/2 h-0.5 rounded-full bg-surface-hover" />

      {/* Ticks adaptativos — pendurados abaixo do eixo para nunca colidir com os marcos */}
      {ticks.map((t) => {
        const isStartEdge = t.percent <= 2;
        const isEndEdge = t.percent >= 98;
        const hasNearbyPin = pinPercents.some((p) => Math.abs(p - t.percent) < 1.5);

        return (
          <div
            key={t.key}
            data-testid="timeline-year-tick"
            data-year={t.year}
            data-unit={t.unit}
            style={{
              left: isEndEdge ? "auto" : `${t.percent}%`,
              right: isEndEdge ? `${Math.max(0, 100 - t.percent)}%` : "auto",
            }}
            className={`absolute top-1/2 flex flex-col pointer-events-none ${
              isEndEdge
                ? "translate-x-0 items-end"
                : isStartEdge
                ? "translate-x-0 items-start"
                : "-translate-x-1/2 items-center"
            }`}
          >
            <div className={cn("h-2.5 w-px", hasNearbyPin ? "bg-line" : "bg-line-strong")} />
            <span className="mt-1 whitespace-nowrap font-mono text-caption leading-none tabular-nums text-fg-muted">
              {t.label}
            </span>
          </div>
        );
      })}

      {/* Scrubber do ano selecionado */}
      {scrubVisible && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2"
          style={{ left: `${scrubPercent}%` }}
        >
          <div className={cn("mx-auto h-full w-px", selectedYear === null ? "bg-line" : "bg-accent/70")} />
          <button
            type="button"
            role="slider"
            data-testid="timeline-scrubber"
            aria-label="Ano selecionado"
            aria-valuemin={Math.floor(bounds.start)}
            aria-valuemax={Math.floor(bounds.end)}
            aria-valuenow={scrubYear}
            title="Arraste para mudar o ano no globo (setas ← →)"
            onPointerDown={onScrubPointerDown}
            onPointerMove={onScrubPointerMove}
            onKeyDown={onScrubKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "pointer-events-auto absolute -top-1 left-1/2 -translate-x-1/2 cursor-ew-resize touch-none rounded-control border px-1.5 font-mono text-caption leading-4 tabular-nums shadow-e1 transition-colors duration-fast ease-out",
              selectedYear === null ? "border-line bg-surface text-fg-muted" : "border-accent bg-accent text-accent-on"
            )}
          >
            {scrubYear}
          </button>
        </div>
      )}

      {/* Marcos e grupos de marcos (sem sobreposição em nenhum zoom) */}
      {clusters.map((c, idx) => {
        const percent = yearToPercent(c.value, view);
        if (c.members.length > 1) {
          return (
            <MilestoneCluster
              key={c.key}
              members={c.members}
              percent={percent}
              onExpand={() => {
                const next = viewForCluster(c.first, c.last, bounds);
                const v = viewRef.current;
                if (next.end - next.start >= (v.end - v.start) * 0.98) return false;
                applyView(next);
                return true;
              }}
            />
          );
        }
        const m = c.members[0];
        return (
          <MilestonePin
            key={m.id}
            id={m.id}
            title={m.title}
            summary={m.summary}
            year={m.year}
            exactDate={m.exactDate}
            category={m.category}
            sourcePrimary={m.sourcePrimary}
            latitude={m.latitude}
            longitude={m.longitude}
            countryIso={m.countryIso}
            blocIsos={m.blocIsos}
            preferredAltitude={m.preferredAltitude}
            index={idx}
            percent={percent}
          />
        );
      })}

      {isZoomed && (
        <button
          type="button"
          data-testid="timeline-zoom-reset"
          onClick={(e) => {
            e.stopPropagation();
            applyView(bounds);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -top-1 right-0 z-30 rounded-control border border-line bg-surface/90 px-1.5 font-mono text-caption leading-4 tabular-nums text-fg-secondary shadow-e1 transition-colors duration-fast ease-out hover:text-fg"
          title="Mostrar o período inteiro (0)"
        >
          {Math.round(view.start)}–{Math.round(view.end)} · período inteiro
        </button>
      )}
    </div>
  );
};
