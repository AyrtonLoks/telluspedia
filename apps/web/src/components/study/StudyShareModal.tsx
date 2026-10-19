"use client";

import React, { useState } from "react";
import { X, Share2, Copy, Check } from "lucide-react";
import { useStudyStore } from "@/stores/studyStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { resolveHistoricalEra, resolveEffectiveHistoricalYear } from "@/lib/historical-entities";
import { findMilestoneById } from "@/lib/country-data";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { resolveGeologicalEra } from "@/lib/paleo-data";
import { getHistoricalRoute } from "@/lib/historical-routes";

export const StudyShareModal: React.FC = () => {
  const storeIsShareModalOpen = useStudyStore((s) => s.isShareModalOpen);
  const isShareModalOpen =
    typeof window === "undefined"
      ? (useStudyStore.getState().isShareModalOpen ?? storeIsShareModalOpen)
      : storeIsShareModalOpen;
  const setShareModalOpen = useStudyStore((s) => s.setShareModalOpen);
  const title = useStudyStore((s) => s.title);
  const setTitle = useStudyStore((s) => s.setTitle);
  const description = useStudyStore((s) => s.description);
  const setDescription = useStudyStore((s) => s.setDescription);
  const notes = useStudyStore((s) => s.notes);
  const setNotes = useStudyStore((s) => s.setNotes);

  const selectedIso = useGlobeStore((s) => s.selectedIso);
  const cameraLat = useGlobeStore((s) => s.cameraLat);
  const cameraLng = useGlobeStore((s) => s.cameraLng);
  const cameraAltitude = useGlobeStore((s) => s.cameraAltitude);

  const storeStartYear = useTimelineStore((s) => s.startYear);
  const storeEndYear = useTimelineStore((s) => s.endYear);
  const startYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().startYear ?? storeStartYear)
      : storeStartYear;
  const endYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().endYear ?? storeEndYear)
      : storeEndYear;

  const storeSelectedYear = useTimelineStore((s) => s.selectedYear);
  const storeSelectedMilestoneId = useTimelineStore((s) => s.selectedMilestoneId);
  const selectedYear =
    typeof window === "undefined"
      ? (useTimelineStore.getState().selectedYear ?? storeSelectedYear)
      : storeSelectedYear;
  const selectedMilestoneId =
    typeof window === "undefined"
      ? (useTimelineStore.getState().selectedMilestoneId ?? storeSelectedMilestoneId)
      : storeSelectedMilestoneId;
  const activeCategories = useTimelineStore((s) => s.activeCategories);

  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  const timelineMode = useTimelineStore((s) => s.timelineMode);
  const storeGeologicalMa = useTimelineStore((s) => s.selectedGeologicalMa ?? s.geologicalMa);
  const geologicalMa =
    typeof window === "undefined"
      ? (useTimelineStore.getState().timelineMode === "GEOLOGICAL"
          ? (useTimelineStore.getState().selectedGeologicalMa ?? useTimelineStore.getState().geologicalMa)
          : null)
      : (timelineMode === "GEOLOGICAL" ? storeGeologicalMa : null);

  const storeHistRouteId = useHistoricalRouteStore((s) => s.activeRouteId);
  const storeTimeRouteId = useTimelineStore((s) => s.activeRouteId);
  const activeRouteId =
    typeof window === "undefined"
      ? (useHistoricalRouteStore.getState().activeRouteId || useTimelineStore.getState().activeRouteId || null)
      : (storeHistRouteId || storeTimeRouteId || null);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isShareModalOpen) return null;

  // Compute active historical era and Apollo 11 status using canonical resolver
  let milestoneYear: number | null = null;
  if (selectedMilestoneId) {
    const milestone = findMilestoneById(selectedMilestoneId);
    if (milestone?.year) {
      milestoneYear = milestone.year;
    }
  }

  const effectiveYear = resolveEffectiveHistoricalYear({
    selectedYear,
    milestoneYear,
    startYear,
    endYear,
  });

  const eraDef = resolveHistoricalEra(effectiveYear);
  const isHistoricalEraActive = !geologicalMa && eraDef.id !== "CONTEMPORARY";
  const isApollo11Active =
    !geologicalMa &&
    (selectedMilestoneId === "glo-1969" ||
      selectedMilestoneId === "usa-1969" ||
      effectiveYear === 1969);

  const geologicalEraDef = geologicalMa ? resolveGeologicalEra(geologicalMa) : null;
  const historicalRouteDef = activeRouteId ? getHistoricalRoute(activeRouteId) : null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setErrorMsg("");
    const selectedCountries = Array.from(
      new Set([selectedIso, ...comparatorIsos].filter(Boolean) as string[])
    );

    const payload = {
      title,
      description,
      timelineStartYear: startYear,
      timelineEndYear: endYear,
      selectedCountryIsos: selectedCountries,
      activeCategories,
      cameraLat,
      cameraLng,
      cameraAltitude,
      markdownNotes: notes,
      historicalEra: isHistoricalEraActive ? eraDef.id : null,
      isApollo11Active,
      geologicalMa: geologicalMa ?? null,
      activeRouteId: activeRouteId ?? null,
    };

    try {
      const res = await fetch("/api/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const origin = window.location.origin;
        setShareUrl(`${origin}/study/${data.id}`);

        // Update local study store with the created study snapshot
        useStudyStore.getState().restoreStudy({
          id: data.id,
          parentId: data.parentId || null,
          title,
          description,
          notes,
          historicalEra: isHistoricalEraActive ? eraDef.id : null,
          isApollo11Active,
          geologicalMa: geologicalMa ?? null,
          activeRouteId: activeRouteId ?? null,
        });
      } else {
        setErrorMsg("Não foi possível registrar o snapshot do estudo no servidor.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao salvar estudo.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl border border-cyan-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">Compartilhar Estudo Imutável</h3>
          </div>
          <button
            onClick={() => setShareModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Título do Estudo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              placeholder="Ex: Análise Comparativa do Cone Sul e Europa"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Anotações & Contexto Científico
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400 resize-none"
              placeholder="Descreva as hipóteses ou conclusões deste recorte planetário..."
            />
          </div>

          {/* Historical Era Badge inside Modal */}
          {isHistoricalEraActive && (
            <div
              data-testid="modal-historical-era-badge"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-in fade-in"
            >
              <span className="text-lg select-none">🏛️</span>
              <div className="flex-1">
                <div className="font-semibold text-amber-200">
                  Cartografia Histórica Ativa Capturada
                </div>
                <div className="text-[11px] text-amber-300/80">
                  {eraDef.label}
                </div>
              </div>
            </div>
          )}

          {/* Apollo 11 Space Mission Badge */}
          {isApollo11Active && (
            <div
              data-testid="modal-apollo11-badge"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-in fade-in"
            >
              <span className="text-lg select-none">🚀</span>
              <div className="flex-1">
                <div className="font-semibold text-cyan-200">
                  Missão Espacial Apollo 11 (1969)
                </div>
                <div className="text-[11px] text-cyan-300/80">
                  Trajetória Translunar 3D e telemetria incluídas no estudo.
                </div>
              </div>
            </div>
          )}

          {/* Geological Era / Paleogeography Badge */}
          {geologicalMa && (
            <div
              data-testid="modal-geological-era-badge"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-in fade-in"
            >
              <span className="text-lg select-none">🌋</span>
              <div className="flex-1">
                <div className="font-semibold text-emerald-200">
                  Paleogeografia & Deriva Continental Ativa
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  {geologicalEraDef?.name || `Era Geológica: ${geologicalMa} Ma atrás`}
                </div>
              </div>
            </div>
          )}

          {/* Historical Route / Expedition Badge */}
          {activeRouteId && (
            <div
              data-testid="modal-historical-route-badge"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium animate-in fade-in"
            >
              <span className="text-lg select-none">⛵</span>
              <div className="flex-1">
                <div className="font-semibold text-indigo-200">
                  Rota de Expedição Histórica 3D
                </div>
                <div className="text-[11px] text-indigo-300/80">
                  {historicalRouteDef?.title || `Expedição Marítima (${activeRouteId})`}
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Recorte capturado automaticamente:</div>
            <div>• Período: {startYear} — {endYear} ({endYear - startYear} anos)</div>
            <div>• Países: {[selectedIso, ...comparatorIsos].filter(Boolean).join(", ") || "Visão Global"}</div>
            <div>• Coordenadas da Câmera: ({cameraLat.toFixed(1)}°, {cameraLng.toFixed(1)}°)</div>
            {isHistoricalEraActive && (
              <div className="text-amber-300 font-medium">• Era Histórica: {eraDef.label}</div>
            )}
            {isApollo11Active && (
              <div className="text-cyan-300 font-medium">• Missão Espacial: Apollo 11 (Trajetória Translunar Ativa)</div>
            )}
            {geologicalMa && (
              <div className="text-emerald-300 font-medium">
                • Paleogeografia: {geologicalEraDef?.name || `${geologicalMa} Ma`}
              </div>
            )}
            {activeRouteId && (
              <div className="text-indigo-300 font-medium">
                • Rota Histórica 3D: {historicalRouteDef?.title || activeRouteId}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {shareUrl && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-2">
              <span className="text-[11px] text-cyan-300 font-medium block">
                Link Permanente & Imutável Gerado:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-700/50 text-cyan-200 text-xs font-mono select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={() => setShareModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          {!shareUrl && (
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-950/40 disabled:opacity-50"
            >
              {loading ? "Criando snapshot..." : "Gerar Link de Estudo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
