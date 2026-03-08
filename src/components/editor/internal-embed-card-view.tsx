"use client"

import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { CheckSquare, FileText, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { buildInternalUrl } from "@/lib/editor/internal-link-utils"
import api from "@/lib/axios"

const KNOWN_STATUSES = ["todo", "in_progress", "review", "done"] as const

export function InternalEmbedCardView({ node, selected, editor }: NodeViewProps) {
  const router = useRouter()
  const { entityType, entityId, workspaceId } = node.attrs as {
    entityType: "task" | "doc"
    entityId: string
    workspaceId: string
  }

  const isTask = entityType === "task"
  const endpoint = isTask ? `/tasks/${entityId}` : `/documents/${entityId}`

  const { data, isLoading, isError } = useQuery({
    queryKey: ["internal-embed", entityType, workspaceId, entityId],
    queryFn: async () => {
      const res = await api.get(endpoint)
      return res.data
    },
    staleTime: 30_000,
  })

  const entity = isTask ? data?.task : data?.document
  const title = entity?.title || entity?.name
  const status = entity?.status
  const isEditable = editor?.isEditable

  const handleClick = () => {
    // In edit mode, clicking selects the node (handled by TipTap) — don't navigate
    if (isEditable) return
    const url = buildInternalUrl({ type: entityType, entityId, workspaceId })
    router.push(url)
  }

  return (
    <NodeViewWrapper className="my-2" data-internal-embed>
      <div
        contentEditable={false}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",
          isEditable ? "cursor-default" : "cursor-pointer hover:bg-muted/50",
          selected && "ring-2 ring-primary"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isError ? (
          <>
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-muted-foreground">
              {isTask ? "Task" : "Document"} not found
            </span>
          </>
        ) : (
          <>
            {isTask ? (
              <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{title}</span>
            {isTask && status && KNOWN_STATUSES.includes(status) && (
              <StatusBadge
                variant="status"
                status={status as (typeof KNOWN_STATUSES)[number]}
                className="ml-auto shrink-0"
              />
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}
