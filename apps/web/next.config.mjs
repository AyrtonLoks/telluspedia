/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    if (!process.env.TELLUSLAB_PROXY_URL) return [];
    const origin = new URL(process.env.TELLUSLAB_PROXY_URL).origin;
    return [
      { source: "/lab", destination: origin + "/lab" },
      { source: "/lab-assets/:path*", destination: origin + "/lab-assets/:path*" },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
