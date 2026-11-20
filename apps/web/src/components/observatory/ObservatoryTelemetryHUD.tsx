"use client";

import React, { useState, useEffect } from "react";
import { X, Crosshair, ExternalLink, Radio, Activity, Plane, Anchor } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { calculateIssPosition, isContemporaryEpoch, IssTelemetryData } from "@/lib/observatory-data";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { TONES, type Tone } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";

const ENTITY_META: Record<"ISS" | "EONET" | "AIRCRAFT" | "MARITIME", { title: string; tone: Tone; icon: React.ReactNode }> = {
  ISS: { title: "Telemetria Orbital ISS", tone: "layer-satellites", icon: <Radio /> },
  EONET: { title: "Evento Severo NASA", tone: "layer-events", icon: <Activity /> },
  AIRCRAFT: { title: "Aeronave Comercial", tone: "layer-aircraft", icon: <Plane /> },
  MARITIME: { title: "Corredor Mercante", tone: "layer-maritime", icon: <Anchor /> },
};

/** Par rótulo/valor da telemetria; valores numéricos em mono tabular. */
function Field({ label, children, mono = true }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-caption text-fg-muted">{label}</span>
      <span className={cn("truncate text-label text-fg", mono && "font-mono tabular-nums")}>{children}</span>
    </div>
  );
}

const FIELD_GRID = "grid grid-cols-2 gap-3 rounded-card border border-line bg-surface-raised p-3";

export const ObservatoryTelemetryHUD: React.FC = () => {
  const storeSelectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const selectedEntity =
    typeof window === "undefined"
      ? useObservatoryStore.getState().selectedEntity
      : storeSelectedEntity;
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const flyTo = useGlobeStore((s) => s.flyTo);

  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const selectedYear =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedYear
      : storeSelectedYear;

  const storeGeologicalMa = useTimelineStore((s: any) => s.selectedGeologicalMa);
  const selectedGeologicalMa =
    typeof window === "undefined"
      ? useTimelineStore.getState().selectedGeologicalMa
      : storeGeologicalMa;

  const storeStudyMa = useStudyStore((s: any) => s.geologicalMa);
  const studyGeologicalMa =
    typeof window === "undefined"
      ? useStudyStore.getState().geologicalMa
      : storeStudyMa;

  const effectiveMa = selectedGeologicalMa ?? studyGeologicalMa;
  const isContemporary = isContemporaryEpoch(selectedYear, effectiveMa);

  // Telemetria dinâmica ao vivo da ISS a cada 1 segundo enquanto o HUD estiver aberto
  const [liveIss, setLiveIss] = useState<IssTelemetryData | null>(null);

  useEffect(() => {
    if (selectedEntity?.type !== "ISS") {
      setLiveIss(null);
      return;
    }
    setLiveIss(calculateIssPosition(Date.now()));
    const interval = setInterval(() => {
      setLiveIss(calculateIssPosition(Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedEntity]);

  if (!selectedEntity || !isContemporary) return null;

  const handleFocus = (lat: number, lng: number, altitude: number = 1.8) => {
    flyTo(lat, lng, altitude);
  };

  const activeIss = liveIss || (selectedEntity.type === "ISS" ? selectedEntity.data : null);

  const meta = ENTITY_META[selectedEntity.type];

  return (
    <Panel
      data-testid="observatory-telemetry-hud"
      className="fixed bottom-24 left-6 z-30 w-80 max-w-[calc(100vw-3rem)]"
    >
      <PanelHeader
        headingLevel={3}
        title={meta.title}
        icon={<span className={TONES[meta.tone].text}>{meta.icon}</span>}
        className="px-4 py-3"
        actions={<IconButton label="Fechar telemetria" icon={<X />} size="sm" onClick={() => setSelectedEntity(null)} />}
      />

      <div className="space-y-3 p-4">
        {selectedEntity.type === "ISS" && activeIss && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">Estação Espacial Internacional (Zvezda / Destiny)</div>
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                NORAD ID: 25544 · Inclinação: {activeIss.orbitInclinationDeg}°
              </span>
            </div>

            <div className={FIELD_GRID}>
              <Field label="Altitude">{activeIss.altitudeKm} km</Field>
              <Field label="Velocidade">{activeIss.velocityKmh.toLocaleString("pt-BR")} km/h</Field>
              <Field label="Coordenadas">
                {activeIss.latitude.toFixed(2)}°, {activeIss.longitude.toFixed(2)}°
              </Field>
              <Field label="Iluminação" mono={false}>
                {activeIss.visibility === "daylight" ? "Dia Orbital" : "Noite Orbital"}
              </Field>
            </div>

            <Button variant="primary" size="sm" className="w-full" onClick={() => handleFocus(activeIss.latitude, activeIss.longitude, 1.8)}>
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Focar Câmera na ISS
            </Button>
          </>
        )}

        {selectedEntity.type === "EONET" && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">{selectedEntity.data.title}</div>
              <span className="text-caption text-fg-muted">
                Categoria: {selectedEntity.data.category} · {new Date(selectedEntity.data.date).toLocaleDateString("pt-BR")}
              </span>
            </div>

            {selectedEntity.data.magnitudeValue && (
              <div className={cn(FIELD_GRID, "grid-cols-1")}>
                <Field label="Magnitude observada">
                  {selectedEntity.data.magnitudeValue} {selectedEntity.data.magnitudeUnit || ""}
                </Field>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" className="flex-1" onClick={() => handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.8)}>
                <Crosshair aria-hidden="true" className="h-4 w-4" />
                Focar Evento
              </Button>

              {selectedEntity.data.sources?.[0]?.url && (
                <a
                  href={selectedEntity.data.sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir relatório científico primário"
                  title="Abrir relatório científico primário"
                  className={buttonClasses("secondary", "sm", "w-8 px-0")}
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
            </div>
          </>
        )}

        {selectedEntity.type === "AIRCRAFT" && (
          <>
            <div className="space-y-0.5">
              <div className="font-mono text-label font-medium text-fg">
                {selectedEntity.data.callsign} ({selectedEntity.data.icao24})
              </div>
              <span className="text-caption text-fg-muted">Origem / Registro: {selectedEntity.data.originCountry}</span>
            </div>

            <div className={FIELD_GRID}>
              <Field label="Altitude de voo">{selectedEntity.data.altitudeMeters} m</Field>
              <Field label="Velocidade">{Math.round(selectedEntity.data.velocityMs * 3.6)} km/h</Field>
              <Field label="Rumo">{selectedEntity.data.headingDeg}°</Field>
              <Field label="Posição">
                {selectedEntity.data.lat.toFixed(1)}°, {selectedEntity.data.lng.toFixed(1)}°
              </Field>
            </div>

            <Button variant="primary" size="sm" className="w-full" onClick={() => handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.8)}>
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Focar Câmera na Aeronave
            </Button>
          </>
        )}

        {selectedEntity.type === "MARITIME" && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">{selectedEntity.data.name}</div>
              <span className="text-caption text-fg-muted">
                {selectedEntity.data.category === "CANAL" ? "Canal Interoceânico" : "Estreito Estratégico"}
              </span>
            </div>

            <div className={cn(FIELD_GRID, "grid-cols-1")}>
              <Field label="Ponto crítico" mono={false}>
                {selectedEntity.data.chokePoint || "Corredor Mercante Principal"}
              </Field>
              <Field label="Volume diário estimado">
                ~{selectedEntity.data.dailyTonnageTeuApprox.toLocaleString("pt-BR")} TEU/dia
              </Field>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => {
                const first = selectedEntity.data.coordinates[0];
                if (first) handleFocus(first[0], first[1], 1.8);
              }}
            >
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Focar Corredor Marítimo
            </Button>
          </>
        )}
      </div>
    </Panel>
  );
};
