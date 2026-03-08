export interface ParsedInternalUrl {
  type: "task" | "doc"
  entityId: string
  workspaceId: string
}

const INTERNAL_URL_PATTERN =
  /\/dashboard\/workspaces\/([^/]+)\/(tasks|docs)\/([^/?#]+)/

/**
 * Parse an internal taskflow URL into its components.
 * Matches both full URLs (https://...) and relative paths (/dashboard/...).
 */
export function parseInternalUrl(url: string): ParsedInternalUrl | null {
  const match = url.match(INTERNAL_URL_PATTERN)
  if (!match) return null

  const [, workspaceId, section, entityId] = match
  return {
    type: section === "tasks" ? "task" : "doc",
    entityId,
    workspaceId,
  }
}

/**
 * Build an internal URL from parsed components.
 */
export function buildInternalUrl(parsed: ParsedInternalUrl): string {
  const section = parsed.type === "task" ? "tasks" : "docs"
  return `/dashboard/workspaces/${parsed.workspaceId}/${section}/${parsed.entityId}`
}
