"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ScrollText, Users } from "lucide-react";
import type { Scene } from "@/lib/scenes/schema";
import type { Locale } from "@/lib/i18n/types";
import { useI18n } from "@/lib/i18n/useT";
import type { EnScenesMap } from "@/lib/i18n/en-scenes-types";
import {
  getScenesLocalizer,
  registerScenesLocalizer,
  subscribeDeepI18n,
} from "@/lib/i18n/deep-i18n-registry";

export const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function primeSceneLocalizer(mod: {
  EN_SCENES_PACK: EnScenesMap;
  localizeScene: (scene: Scene, locale: Locale, pack?: EnScenesMap | null) => Scene;
}): void {
  registerScenesLocalizer({ pack: mod.EN_SCENES_PACK, localize: mod.localizeScene });
}

export function useLocalizedScene(rawScene: Scene | undefined, locale: Locale): Scene | undefined {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (locale !== "en") return;
    const unsub = subscribeDeepI18n(() => setTick((v) => v + 1));
    if (!getScenesLocalizer()) {
      void import("@/lib/i18n/en-scenes")
        .then((mod) => primeSceneLocalizer(mod))
        .catch(() => {});
    }
    return unsub;
  }, [locale]);

  return useMemo(() => {
    void tick;
    const loc = getScenesLocalizer();
    if (!rawScene || locale !== "en" || !loc) return rawScene;
    return loc.localize(rawScene, locale, loc.pack);
  }, [rawScene, locale, tick]);
}

/** Data parcial ISO ("1500", "1500-04", "1500-04-22") no formato brasileiro ou inglês. */
export function fmtPartialDate(iso: string, locale: Locale = "pt-BR"): string {
  const [y, m, d] = iso.split(/(?<=\d)-/);
  if (locale === "en") {
    const mName = m ? EN_MONTHS[Number(m) - 1] ?? m : "";
    if (d) return `${mName} ${Number(d)}, ${y}`;
    if (m) return `${mName} ${y}`;
    return y;
  }
  if (d) return `${d}/${m}/${y}`;
  if (m) return `${m}/${y}`;
  return y;
}

/** Participantes e crônica da cena (D24 / D42), recolhidos por padrão. */
export const SceneDetailsSection: React.FC<{ scene: Scene; locale: Locale }> = ({
  scene,
  locale,
}) => {
  const { t } = useI18n();
  if (scene.participants.length === 0 && scene.chronicle.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-2.5">
      {scene.participants.length > 0 && (
        <details
          className="group rounded-card border border-line bg-surface-raised"
          data-testid="scene-participants"
        >
          <summary className="flex cursor-pointer items-center gap-1.5 p-2.5 text-label font-medium text-fg">
            <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
            {t("scene.participants", "Participantes")}{" "}
            <span className="font-mono text-caption tabular-nums text-fg-muted">
              ({scene.participants.length})
            </span>
          </summary>
          <ul className="space-y-2 px-2.5 pb-2.5">
            {scene.participants.map((p) => (
              <li key={p.name} className="text-caption leading-snug">
                <span className="font-medium text-fg">{p.name}</span>{" "}
                <span className="text-fg-muted">· {p.role}</span>
                {p.description && <p className="text-fg-secondary">{p.description}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {scene.chronicle.length > 0 && (
        <details
          className="group rounded-card border border-line bg-surface-raised"
          data-testid="scene-chronicle"
        >
          <summary className="flex cursor-pointer items-center gap-1.5 p-2.5 text-label font-medium text-fg">
            <ScrollText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
            {t("scene.chronicle", "Crônica")}{" "}
            <span className="font-mono text-caption tabular-nums text-fg-muted">
              ({scene.chronicle.length})
            </span>
          </summary>
          <ol className="space-y-2.5 px-2.5 pb-2.5">
            {scene.chronicle.map((c, i) => (
              <li key={`${c.date}-${i}`} className="border-l-2 border-line pl-2 text-caption leading-snug">
                <span className="font-mono tabular-nums text-fg-muted">
                  {fmtPartialDate(c.date, locale)}
                </span>
                {c.place && <span className="text-fg-muted"> · {c.place}</span>}
                <p className="text-fg-secondary">{c.text}</p>
                {c.quote && (
                  <blockquote className="mt-1 font-serif italic text-fg">
                    &ldquo;{c.quote.text}&rdquo;{" "}
                    <span className="font-sans not-italic text-fg-muted">— {c.quote.source}</span>
                  </blockquote>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
};
