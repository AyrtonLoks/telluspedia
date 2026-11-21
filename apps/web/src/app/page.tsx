import React from "react";
import { GlobeExperienceShell } from "@/components/shell/GlobeExperienceShell";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { buildWebApplicationJsonLd } from "@/lib/seo";

export default function HomePage() {
  return (
    <>
      <JsonLdScript data={buildWebApplicationJsonLd()} />
      <GlobeExperienceShell initialState={{ kind: "default" }} />
    </>
  );
}
