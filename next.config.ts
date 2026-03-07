import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "y-prosemirror": path.resolve(__dirname, "node_modules/@tiptap/y-tiptap"),
    };
    return config;
  },
};

export default nextConfig;
