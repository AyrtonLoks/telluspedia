"use client";

import React, { useState } from "react";
import { X, Share2, Copy, Check, Globe } from "lucide-react";
import { useStudyStore } from "@/stores/studyStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useComparatorStore } from "@/stores/comparatorStore";

export const StudyShareModal: React.FC = () => {
  const isShareModalOpen = useStudyStore((s) => s.isShareModalOpen);
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

  const startYear = useTimelineStore((s) => s.startYear);
  const endYear = useTimelineStore((s) => s.endYear);
  const activeCategories = useTimelineStore((s) => s.activeCategories);

  const comparatorIsos = useComparatorStore((s) => s.selectedIsos);

  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isShareModalOpen) return null;

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

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Recorte capturado automaticamente:</div>
            <div>• Período: {startYear} — {endYear} ({endYear - startYear} anos)</div>
            <div>• Países: {[selectedIso, ...comparatorIsos].filter(Boolean).join(", ") || "Visão Global"}</div>
            <div>• Coordenadas da Câmera: ({cameraLat.toFixed(1)}°, {cameraLng.toFixed(1)}°)</div>
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
