import React from "react";
import Link from "next/link";
import { Award, Compass, Globe, Layers, MapPin } from "lucide-react";
import {
  MILTON_LENS_SHORTCUTS,
  MILTON_SANTOS_TIMELINE,
} from "@/lib/milton-santos-dossier";
import type { Locale } from "@/lib/i18n/types";
import { Badge } from "@/components/ui/Badge";
import { MiltonSantosCitations } from "./MiltonSantosCitations";

export interface MiltonSantosDossierViewProps {
  locale: Locale;
}

export const MiltonSantosDossierView: React.FC<MiltonSantosDossierViewProps> = ({ locale }) => {
  const isEn = locale === "en";

  return (
    <div data-testid="milton-santos-dossier" className="space-y-8">
      {/* Banner do Centenário 1926–2026 & Prêmio Vautrin Lud */}
      <section className="rounded-panel border border-accent/40 bg-surface-raised p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            {isEn ? "Centenary 1926–2026" : "Centenário 1926–2026"}
          </Badge>
          <Badge tone="neutral">
            <Award aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-accent" />
            {isEn ? "Vautrin Lud Prize (1994)" : "Prêmio Vautrin Lud (1994)"}
          </Badge>
          <Badge tone="neutral">FFLCH · USP</Badge>
        </div>
        <p className="mt-3 font-serif text-body leading-relaxed text-fg">
          {isEn
            ? "Milton Almeida dos Santos (1926–2001) transformed modern geography by framing space as an inseparable system of objects and actions shaped by technique, science, information, and social inequality. In his centenary year (2026), TellusPedia pairs his intellectual biography with three live spatial lenses on the globe."
            : "Milton Almeida dos Santos (1926–2001) renovou a geografia contemporânea ao definir o espaço geográfico como um conjunto indissociável de sistemas de objetos e sistemas de ações atravessados pela técnica, ciência, informação e desigualdade socioespacial. Em seu centenário (2026), o TellusPedia articula sua biografia intelectual a três lentes analíticas interativas no globo."}
        </p>
      </section>

      {/* Atalhos diretos para as 3 Lentes Analíticas Espaciais no Globo */}
      <section aria-labelledby="milton-lenses-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Compass aria-hidden="true" className="h-4 w-4 text-accent" />
          <h2 id="milton-lenses-heading" className="text-title font-semibold text-fg">
            {isEn
              ? "Explore Milton Santos's Spatial Lenses on the Globe"
              : "Explorar as Lentes Espaciais no Globo Interativo"}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {MILTON_LENS_SHORTCUTS.map((item) => (
            <Link
              key={item.lensId}
              href={item.href}
              data-testid={`milton-launch-${item.lensId}`}
              className="group flex flex-col justify-between gap-3 rounded-card border border-line bg-surface-raised p-4 transition-colors duration-fast ease-out hover:border-accent/50 hover:bg-surface-hover"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-caption font-medium text-accent">
                  {item.lensId === "FOUR_BRAZILS" ? (
                    <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Globe aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{item.lensId === "MTCI" ? (isEn ? "TSI Milieu" : "Meio TCI") : item.lensId === "VERTICALITIES" ? (isEn ? "Global Flows" : "Fluxos Globais") : (isEn ? "Brazil · 2001" : "Brasil · 2001")}</span>
                </div>
                <h3 className="text-label font-semibold text-fg group-hover:text-accent">
                  {isEn ? item.titleEn : item.titlePt}
                </h3>
                <p className="text-caption leading-relaxed text-fg-secondary">
                  {isEn ? item.descEn : item.descPt}
                </p>
              </div>
              <span className="text-caption font-medium text-accent">
                {isEn ? "Launch on globe →" : "Abrir no globo →"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Linha do Tempo Intelectual (1926–2026) */}
      <section aria-labelledby="milton-timeline-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 text-accent" />
          <h2 id="milton-timeline-heading" className="text-title font-semibold text-fg">
            {isEn
              ? "Intellectual Trajectory (1926–2001 · Centenary 2026)"
              : "Trajetória Intelectual (1926–2001 · Centenário 2026)"}
          </h2>
        </div>

        <ol className="space-y-3 border-l border-line pl-5">
          {MILTON_SANTOS_TIMELINE.map((ev) => (
            <li
              key={ev.year}
              className="relative rounded-card border border-line bg-surface-raised p-4"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[25px] top-5 h-2.5 w-2.5 rounded-full border border-accent bg-bg"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-label font-semibold tabular-nums text-accent">
                  {ev.year}
                </span>
                <span className="text-caption text-fg-muted">
                  {isEn ? ev.placeEn : ev.placePt}
                </span>
              </div>
              <h3 className="mt-1 text-label font-semibold text-fg">
                {isEn ? ev.titleEn : ev.titlePt}
              </h3>
              <p className="mt-1 font-serif text-label leading-relaxed text-fg-secondary">
                {isEn ? ev.detailEn : ev.detailPt}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Obras Fundamentais e Referências Acadêmicas (ABNT/APA/MLA/BibTeX) */}
      <MiltonSantosCitations locale={locale} />
    </div>
  );
};
