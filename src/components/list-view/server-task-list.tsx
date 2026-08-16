"use client"

import { useEffect, useMemo, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useInfiniteListTasks, useTaskGroups } from "@/hooks/useQueries"
import type { ListQueryParams, TaskResponse } from "@/lib/api"

/**
 * Windowed + virtualized task list backed by the server-side query endpoints.
 *
 * The server sorts, filters, groups and paginates; this component only renders
 * the window. Rows arrive as one ordered stream where each row carries a
 * groupKey, so a header is emitted wherever the key changes — while the header
 * COUNT comes from the separate aggregate query, meaning it shows the true
 * total for the group even though only part of it is loaded.
 *
 * Row and header rendering are injected so this reuses the list view's existing
 * row components rather than duplicating that UI.
 */

export type ServerTask = TaskResponse & { groupKey?: string }

type VirtualRow =
  | { kind: "group"; id: string; groupKey: string; count: number }
  | { kind: "task"; id: string; task: ServerTask }

interface ServerTaskListProps {
  listId: string
  params: ListQueryParams
  renderRow: (task: ServerTask) => React.ReactNode
  renderGroupHeader?: (groupKey: string, count: number) => React.ReactNode
  /** Approximate row height in px; the virtualizer measures real heights after mount. */
  estimateRowHeight?: number
  estimateHeaderHeight?: number
  className?: string
  emptyState?: React.ReactNode
}

export function ServerTaskList({
  listId,
  params,
  renderRow,
  renderGroupHeader,
  estimateRowHeight = 44,
  estimateHeaderHeight = 40,
  className,
  emptyState,
}: ServerTaskListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteListTasks(listId, params)

  // True per-group totals; only queried when grouping is active.
  const { data: groupData } = useTaskGroups(listId, params)
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>()
    groupData?.groups?.forEach((g) => m.set(g.key, g.count))
    return m
  }, [groupData])

  const tasks = useMemo<ServerTask[]>(
    () => (data?.pages ?? []).flatMap((p) => p.tasks),
    [data]
  )

  // Flatten to renderable rows, inserting a header whenever the group changes.
  const rows = useMemo<VirtualRow[]>(() => {
    const out: VirtualRow[] = []
    let currentGroup: string | null = null
    for (const task of tasks) {
      if (params.groupBy) {
        const key = task.groupKey ?? "unknown"
        if (key !== currentGroup) {
          currentGroup = key
          out.push({
            kind: "group",
            id: `group:${key}`,
            groupKey: key,
            // Fall back to 0 rather than the loaded-so-far count, so a header
            // never claims a smaller number than the group really has.
            count: groupCounts.get(key) ?? 0,
          })
        }
      }
      out.push({ kind: "task", id: task.id, task })
    }
    return out
  }, [tasks, params.groupBy, groupCounts])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i]?.kind === "group" ? estimateHeaderHeight : estimateRowHeight),
    // Render a few extra rows above/below so scrolling doesn't flash blanks.
    overscan: 12,
    getItemKey: (i) => rows[i]?.id ?? i,
  })

  const virtualRows = virtualizer.getVirtualItems()

  // Load the next page once the user scrolls near the end of what's loaded.
  useEffect(() => {
    const last = virtualRows[virtualRows.length - 1]
    if (!last) return
    if (last.index >= rows.length - 10 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [virtualRows, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (!isLoading && rows.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <div ref={scrollRef} className={className} style={{ overflowY: "auto" }}>
      {/* Spacer sized to the full virtual list so the scrollbar is honest. */}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualRows.map((vr) => {
          const row = rows[vr.index]
          if (!row) return null
          return (
            <div
              key={vr.key}
              // measureElement lets rows of differing real heights settle
              // correctly instead of trusting the estimate forever.
              ref={virtualizer.measureElement}
              data-index={vr.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vr.start}px)`,
              }}
            >
              {row.kind === "group"
                ? renderGroupHeader?.(row.groupKey, row.count)
                : renderRow(row.task)}
            </div>
          )
        })}
      </div>
      {isFetchingNextPage && (
        <div className="py-3 text-center text-xs text-muted-foreground">Loading more…</div>
      )}
    </div>
  )
}
