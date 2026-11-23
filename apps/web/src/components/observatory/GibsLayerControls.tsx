"use client";

import React, { useId } from "react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { GIBS_PRODUCTS, GIBS_PRODUCT_IDS, formatGibsMonth, latestGibsMonth } from "@/lib/gibs";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/useT";

/** Produto, mês e legenda da camada NASA GIBS (D25). A opacidade vem do controle comum das camadas. */
export const GibsLayerControls: React.FC = () => {
  const { locale, t } = useI18n();
  const monthId = useId();
  const storeProduct = useObservatoryStore((s) => s.gibsProduct);
  const storeMonth = useObservatoryStore((s) => s.gibsMonth);
  const storeGibs = useObservatoryStore((s) => s.gibs);
  const ssr = typeof window === "undefined" ? useObservatoryStore.getState() : null;
  const productId = ssr?.gibsProduct ?? storeProduct;
  const gibs = ssr ? ssr.gibs : storeGibs;
  const month = (ssr ? ssr.gibsMonth : storeMonth) ?? gibs?.month ?? latestGibsMonth();
  const setGibsRequest = useObservatoryStore((s) => s.setGibsRequest);
  const isLoading = useObservatoryStore((s) => s.isLoading.NASA_GIBS);
  const product = GIBS_PRODUCTS[productId];
  const latest = latestGibsMonth();
  const showingReference = gibs && gibs.product === productId && gibs.imageMonth !== gibs.month;

  const productName = t(`obs.gibs.${productId}.name`, product.name);
  const productDesc = t(`obs.gibs.${productId}.desc`, product.description);
  const productUnit = t(`obs.gibs.${productId}.unit`, product.scaleUnit);

  return (
    <div data-testid="gibs-controls" className="space-y-2.5">
      <div role="group" aria-label={t("obs.gibs.productAria", "Produto de satélite")} className="flex flex-wrap items-center gap-1">
        {GIBS_PRODUCT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`gibs-product-${id}`}
            aria-pressed={productId === id}
            disabled={isLoading}
            onClick={() => setGibsRequest({ product: id, month: month < GIBS_PRODUCTS[id].firstMonth ? GIBS_PRODUCTS[id].firstMonth : month })}
            className={cn(
              "h-7 rounded-control px-2.5 text-caption font-medium transition-colors duration-fast ease-out disabled:opacity-60",
              productId === id ? "bg-surface-hover text-fg" : "text-fg-secondary hover:bg-surface-hover/60 hover:text-fg"
            )}
          >
            {t(`obs.gibs.${id}.short`, GIBS_PRODUCTS[id].shortName)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor={monthId} className="w-16 shrink-0 text-caption text-fg-secondary">{t("obs.gibs.month", "Mês")}</label>
        <input
          id={monthId}
          data-testid="gibs-month"
          type="month"
          min={product.firstMonth}
          max={latest}
          value={month}
          disabled={isLoading}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d{4}-\d{2}$/.test(v) && v >= product.firstMonth && v <= latest) setGibsRequest({ month: v });
          }}
          className="h-7 min-w-0 flex-1 rounded-control border border-line bg-surface px-2 font-mono text-caption tabular-nums text-fg disabled:opacity-60"
        />
      </div>

      <div className="space-y-1" aria-label={`${t("obs.gibs.legend", "Legenda")}: ${productName}`}>
        <img src={product.scaleImage} alt="" aria-hidden="true" width={256} height={8} className="h-1.5 w-full rounded-full" />
        <div className="relative h-4 font-mono text-caption tabular-nums text-fg-muted">
          {product.scaleLabels.map((l) => (
            <span
              key={l.text}
              className="absolute top-0"
              style={{ left: `${l.at * 100}%`, transform: l.at === 0 ? "none" : l.at === 1 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {l.text}
            </span>
          ))}
        </div>
        <p className="text-caption text-fg-muted">
          {productDesc} {t("obs.gibs.scale", "Escala")}: {productUnit}.{" "}
          {showingReference ? (
            <span data-testid="gibs-reference-note" className="text-warning">
              {t("obs.gibs.noImagePrefix", "Sem imagem do GIBS para")} {formatGibsMonth(gibs.month, locale)}: {t("obs.gibs.noImageMid", "mostrando a referência local de")} {formatGibsMonth(gibs.imageMonth, locale)}.
            </span>
          ) : (
            gibs && gibs.product === productId && (
              <span>
                {t("obs.gibs.imageFrom", "Imagem de")} {formatGibsMonth(gibs.imageMonth, locale)} ({gibs.gibsLayer}).
              </span>
            )
          )}
        </p>
      </div>
    </div>
  );
};
