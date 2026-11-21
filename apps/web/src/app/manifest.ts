import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
    short_name: "TellusPedia",
    description:
      "Globo 3D interativo em tempo real com efemérides solares, linha do tempo histórica, comparador de 177 países e observatório planetário.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070B",
    theme_color: "#05070B",
    lang: "pt-BR",
    categories: ["education", "reference", "science"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
