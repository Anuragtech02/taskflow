import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  rewrites: async () => ({
    // Fallback rewrites apply only when no filesystem route matches.
    // /api/auth/* is kept in Next.js for NextAuth; all other /api/* routes
    // proxy to the Fastify backend (which doesn't use an /api prefix).
    fallback: [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ],
  }),
};

export default nextConfig;
