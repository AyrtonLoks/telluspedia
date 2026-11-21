import { fileURLToPath } from "node:url";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

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

export default (phase) =>
  withBundleAnalyzer({
    ...nextConfig,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  });
