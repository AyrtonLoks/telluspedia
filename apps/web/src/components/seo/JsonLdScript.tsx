import React from "react";
import { serializeJsonLd } from "@/lib/seo";

export interface JsonLdScriptProps {
  data: Record<string, unknown>;
}

/**
 * Emite dados estruturados JSON-LD como Server Component sem enviar JS ao cliente.
 * `serializeJsonLd` escapa `<`, `>`, `&`, U+2028 e U+2029 para impedir script breakout XSS.
 */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
