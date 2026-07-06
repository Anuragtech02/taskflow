import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // We don't run image optimization (no Cloudflare Images; compression is
  // done app-side on upload). unoptimized makes next/image render a direct
  // relative <img src="/logo.png">, skipping the /_next/image endpoint —
  // which otherwise resolved the source to an http:// origin on Workers and
  // got blocked as mixed content on the HTTPS page.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    resolveAlias: {
      // Alias y-prosemirror to @tiptap/y-tiptap so that
      // @tiptap/extension-collaboration (uses @tiptap/y-tiptap) and
      // @tiptap/extension-collaboration-cursor (uses y-prosemirror)
      // share the same ySyncPluginKey instance — preventing the
      // "Cannot read properties of undefined (reading 'doc')" crash.
      "y-prosemirror": "@tiptap/y-tiptap",
    },
  },
  // Note: under vinext (Vite) this webpack block is ignored — the same alias
  // lives in vite.config.ts. Kept only so a `next build` fallback still works.
  // Bare-package alias avoids __dirname (unavailable under "type": "module").
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "y-prosemirror": "@tiptap/y-tiptap",
    };
    return config;
  },
};

export default nextConfig;
