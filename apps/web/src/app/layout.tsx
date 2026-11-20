import type { Metadata } from "next";
import { Geist, Geist_Mono, Merriweather } from "next/font/google";
import "@/styles/globals.css";

// Fontes auto-hospedadas pelo next/font. As variáveis CSS abaixo são consumidas
// pelo tailwind.config.ts (font-sans / font-mono / font-serif) e pelo globals.css.
const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-merriweather",
  display: "swap",
  // Usada só no modo leitura e nos dossiês: não precisa competir com o carregamento inicial.
  preload: false,
});

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
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${merriweather.variable}`}
    >
      <body className="bg-[#030712] text-slate-100 antialiased overflow-hidden min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
