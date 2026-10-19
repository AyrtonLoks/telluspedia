import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
  description:
    "Enciclopédia de alta densidade integrando globo 3D em tempo real com efemérides solares NOAA, linha do tempo semântica, comparador multidisciplinar e citações acadêmicas padronizadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#030712] text-slate-100 antialiased overflow-hidden min-h-screen">
        {children}
      </body>
    </html>
  );
}
