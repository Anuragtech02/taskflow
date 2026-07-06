import { defineConfig } from "vite";
import vinext from "vinext";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";

export default defineConfig({
  // Ignore the project's postcss.config.mjs (which loads @tailwindcss/postcss
  // for a `next build` fallback). Under Vite, Tailwind v4 is handled by the
  // @tailwindcss/vite plugin below — an empty inline postcss config stops
  // Vite from also loading the file and double-processing @import "tailwindcss".
  css: { postcss: {} },
  resolve: {
    alias: {
      // Ported from next.config.ts (webpack + turbopack). Forces
      // @tiptap/extension-collaboration and -collaboration-cursor to share
      // one ySyncPluginKey instance, preventing the TipTap collab crash
      // "Cannot read properties of undefined (reading 'doc')".
      "y-prosemirror": "@tiptap/y-tiptap",
    },
  },
  plugins: [
    tailwindcss(),
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
