import Heading from "@tiptap/extension-heading"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

/**
 * Extended Heading that adds an `id` attribute derived from the heading text,
 * enabling anchor-link scrolling (e.g. Table of Contents links).
 */
export const HeadingWithAnchor = Heading.configure({ levels: [1, 2, 3] }).extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as 1 | 2 | 3
    const text = node.textContent
    const id = text ? slugify(text) : undefined
    return [`h${level}`, { ...HTMLAttributes, ...(id ? { id } : {}) }, 0]
  },
})
