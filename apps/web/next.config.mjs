import { fileURLToPath } from "node:url";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import {
  KTX2_WORKER_PATH,
  SERVICE_WORKER_PATH,
  ktx2WorkerHeaders,
  securityHeaders,
  serviceWorkerHeaders,
} from "./security-headers.mjs";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    if (!process.env.TELLUSLAB_PROXY_URL) return [];
    const origin = new URL(process.env.TELLUSLAB_PROXY_URL).origin;
    return [
      { source: "/lab", destination: origin + "/lab" },
      { source: "/lab-assets/:path*", destination: origin + "/lab-assets/:path*" },
    ];
  },
};

const createNextConfig = (phase) => {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return withBundleAnalyzer({
    ...nextConfig,
    ...(process.env.NEXT_OUTPUT_STANDALONE === "true" ? { output: "standalone" } : {}),
    // T30: sem "X-Powered-By: Next.js" e com cabeçalhos de segurança em todas as respostas.
    poweredByHeader: false,
    async headers() {
      return [
        { source: "/:path*", headers: securityHeaders({ dev }) },
        // Vem depois: no mesmo cabeçalho, a última regra vale. Só o worker do KTX2 libera eval.
        { source: KTX2_WORKER_PATH, headers: ktx2WorkerHeaders() },
        // T46: Service Worker PWA sem cache HTTP e com CSP estrita (sem eval).
        { source: SERVICE_WORKER_PATH, headers: serviceWorkerHeaders() },
      ];
    },
    distDir: dev ? ".next-dev" : ".next",
  });
};

export default createNextConfig;
