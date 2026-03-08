import MarkdownIt from "markdown-it"

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const MARKDOWN_PATTERNS = [
  /^#{1,6} /m,               // headings
  /\*\*[^*]+\*\*/,           // bold (**)
  /__[^_]+__/,               // bold (__)
  /(?<!\*)\*[^*\n]+\*(?!\*)/,// italic (*)
  /(?<!_)_[^_\n]+_(?!_)/,    // italic (_)
  /^[-*] /m,                 // unordered list
  /^\d+\. /m,                // ordered list
  /^> /m,                    // blockquote
  /```/,                     // fenced code block
  /\[.+?\]\(.+?\)/,          // links
  /^(-{3,}|\*{3,})$/m,       // horizontal rules
]

/** Returns true if text looks like markdown (2+ distinct patterns matched). */
export function looksLikeMarkdown(text: string): boolean {
  let matches = 0
  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(text)) {
      matches++
      if (matches >= 2) return true
    }
  }
  return false
}

/** Converts markdown text to HTML via markdown-it. */
export function markdownToHtml(text: string): string {
  return md.render(text)
}
