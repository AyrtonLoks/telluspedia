import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { SearchProvider } from "@/components/explore/SearchProvider";
import { PwaLifecycle } from "@/components/pwa/PwaLifecycle";
import { getServerLocale } from "@/lib/i18n/server";
import { buildRootMetadata } from "@/lib/server-loaders";

// Fontes auto-hospedadas localmente via next/font/local (T27: elimina dependência
// do CDN do Google Fonts em build time e a falha intermitente do loader com Merriweather v33).
// As variáveis CSS abaixo são consumidas pelo tailwind.config.ts e pelo globals.css.
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-geist-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-geist-mono",
  display: "swap",
  adjustFontFallback: false,
});

const merriweather = localFont({
  src: [
    { path: "./fonts/Merriweather-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Merriweather-Italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/Merriweather-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Merriweather-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-merriweather",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  // Usada só no modo leitura e nos dossiês: não precisa competir com o carregamento inicial.
  preload: false,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#05070B",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return buildRootMetadata(locale, APP_URL);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} ${merriweather.variable}`}
    >
      <body className="bg-bg text-fg antialiased min-h-screen font-sans">
        <SearchProvider>
          {children}
          <PwaLifecycle />
        </SearchProvider>
      </body>
    </html>
  );
}
