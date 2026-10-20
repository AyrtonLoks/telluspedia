"use client";

import React, { useState, useEffect } from "react";
import { X, Crosshair, ExternalLink, Radio, Activity, Plane, Anchor } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { calculateIssPosition, isContemporaryEpoch, IssTelemetryData } from "@/lib/observatory-data";

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

  return (
    <div
      data-testid="observatory-telemetry-hud"
      className="fixed bottom-24 left-6 z-30 w-84 max-w-[calc(100vw-3rem)] glass-panel rounded-2xl shadow-2xl border border-cyan-500/40 p-4 animate-in fade-in slide-in-from-bottom-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          {selectedEntity.type === "ISS" && (
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
          {selectedEntity.type === "EONET" && (
            <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
          )}
          {selectedEntity.type === "AIRCRAFT" && (
            <Plane className="w-4 h-4 text-sky-400" />
          )}
          {selectedEntity.type === "MARITIME" && (
            <Anchor className="w-4 h-4 text-emerald-400" />
          )}

          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            {selectedEntity.type === "ISS" && "Telemetria Orbital ISS"}
            {selectedEntity.type === "EONET" && "Evento Severo NASA"}
            {selectedEntity.type === "AIRCRAFT" && "Aeronave Comercial"}
            {selectedEntity.type === "MARITIME" && "Corredor Mercante"}
          </h3>
        </div>

        <button
          onClick={() => setSelectedEntity(null)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Fechar telemetria"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body content per entity type */}
      <div className="my-3 text-xs space-y-2">
        {selectedEntity.type === "ISS" && activeIss && (
          <>
            <div>
              <div className="font-semibold text-slate-100">
                Estação Espacial Internacional (Zvezda / Destiny)
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">
                NORAD ID: 25544 • Inclinação: {activeIss.orbitInclinationDeg}°
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Altitude:</span>
                <span className="font-mono text-cyan-300 font-medium">
                  {activeIss.altitudeKm} km
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Velocidade:</span>
                <span className="font-mono text-cyan-300 font-medium">
                  {activeIss.velocityKmh.toLocaleString("pt-BR")} km/h
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Coordenadas:</span>
                <span className="font-mono text-slate-300">
                  {activeIss.latitude.toFixed(2)}°, {activeIss.longitude.toFixed(2)}°
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Iluminação:</span>
                <span className="font-mono text-emerald-400">
                  {activeIss.visibility === "daylight" ? "Dia Orbital" : "Noite Orbital"}
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                handleFocus(activeIss.latitude, activeIss.longitude, 1.8)
              }
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Focar Câmera na ISS</span>
            </button>
          </>
        )}

        {selectedEntity.type === "EONET" && (
          <>
            <div>
              <div className="font-semibold text-slate-100">
                {selectedEntity.data.title}
              </div>
              <span className="text-[10px] text-rose-400 font-mono">
                Categoria: {selectedEntity.data.category} • {new Date(selectedEntity.data.date).toLocaleDateString("pt-BR")}
              </span>
            </div>

            {selectedEntity.data.magnitudeValue && (
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                <span className="text-slate-400 block text-[10px]">Magnitude Observada:</span>
                <span className="font-mono text-rose-300 font-medium">
                  {selectedEntity.data.magnitudeValue} {selectedEntity.data.magnitudeUnit || ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.8)
                }
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Focar Evento</span>
              </button>

              {selectedEntity.data.sources?.[0]?.url && (
                <a
                  href={selectedEntity.data.sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Abrir relatório científico primário"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </>
        )}

        {selectedEntity.type === "AIRCRAFT" && (
          <>
            <div>
              <div className="font-semibold text-slate-100 font-mono">
                {selectedEntity.data.callsign} ({selectedEntity.data.icao24})
              </div>
              <span className="text-[10px] text-sky-400">
                Origem / Registro: {selectedEntity.data.originCountry}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Altitude de Voo:</span>
                <span className="font-mono text-sky-300 font-medium">
                  {selectedEntity.data.altitudeMeters} m
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Velocidade:</span>
                <span className="font-mono text-sky-300 font-medium">
                  {Math.round(selectedEntity.data.velocityMs * 3.6)} km/h
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Rumo (Heading):</span>
                <span className="font-mono text-slate-300">
                  {selectedEntity.data.headingDeg}°
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Posição:</span>
                <span className="font-mono text-slate-300">
                  {selectedEntity.data.lat.toFixed(1)}°, {selectedEntity.data.lng.toFixed(1)}°
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.8)
              }
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Focar Câmera na Aeronave</span>
            </button>
          </>
        )}

        {selectedEntity.type === "MARITIME" && (
          <>
            <div>
              <div className="font-semibold text-slate-100">
                {selectedEntity.data.name}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">
                {selectedEntity.data.category === "CANAL" ? "Canal Interoceânico" : "Estreito Estratégico"}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
              <div>
                <span className="text-slate-400 text-[10px]">Ponto Crítico: </span>
                <span className="text-slate-200 font-medium">
                  {selectedEntity.data.chokePoint || "Corredor Mercante Principal"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Volume Diário Estimado: </span>
                <span className="font-mono text-emerald-300 font-medium">
                  ~{selectedEntity.data.dailyTonnageTeuApprox.toLocaleString("pt-BR")} TEU/dia
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const first = selectedEntity.data.coordinates[0];
                if (first) handleFocus(first[0], first[1], 1.8);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Focar Corredor Marítimo</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
