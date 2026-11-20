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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
  description:
    "Enciclopédia de alta densidade integrando globo 3D em tempo real com efemérides solares NOAA, linha do tempo semântica, comparador multidisciplinar e citações acadêmicas padronizadas.",
  openGraph: {
    title: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
    description:
      "Globo 3D em tempo real, linha do tempo histórica, comparador de países e estudos compartilháveis.",
    type: "website",
    locale: "pt_BR",
    siteName: "TellusPedia",
  },
  twitter: {
    card: "summary_large_image",
    title: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
    description:
      "Globo 3D em tempo real, linha do tempo histórica, comparador de países e estudos compartilháveis.",
  },
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
      <body className="bg-bg text-fg antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
