import Image from "@tiptap/extension-image"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

/**
 * Extended Image that resolves relative src paths to absolute URLs.
 * Handles both old `/api/files/...` and corrected `/files/...` paths.
 */
export const ImageWithBaseUrl = Image.configure({
  inline: false,
  allowBase64: true,
}).extend({
  renderHTML({ HTMLAttributes }) {
    let src = HTMLAttributes.src as string | undefined
    if (src && API_BASE) {
      // Old uploads stored as `/api/files/...` — strip the `/api` prefix
      if (src.startsWith("/api/files/")) {
        src = `${API_BASE}${src.slice(4)}`
      } else if (src.startsWith("/files/")) {
        src = `${API_BASE}${src}`
      }
    }
    return ["img", { ...HTMLAttributes, src }]
  },
})
