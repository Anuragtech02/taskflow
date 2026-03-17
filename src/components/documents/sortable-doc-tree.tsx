"use client"

import React, { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DocumentResponse } from "@/lib/api/documents"

export type DocTreeNode = DocumentResponse & { children: DocTreeNode[] }

export function buildDocTree(docs: DocumentResponse[]): DocTreeNode[] {
  const map = new Map<string, DocTreeNode>()
  const roots: DocTreeNode[] = []

  docs.forEach((doc) => {
    map.set(doc.id, { ...doc, children: [] })
  })

  docs.forEach((doc) => {
    const node = map.get(doc.id)!
    if (doc.parentDocumentId && map.has(doc.parentDocumentId)) {
      map.get(doc.parentDocumentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function isDescendantOf(nodes: DocTreeNode[], parentId: string, targetId: string): boolean {
  function findAndCheck(list: DocTreeNode[]): boolean {
    for (const node of list) {
      if (node.id === parentId) return containsId(node.children, targetId)
      if (findAndCheck(node.children)) return true
    }
    return false
  }
  function containsId(list: DocTreeNode[], id: string): boolean {
    for (const node of list) {
      if (node.id === id) return true
      if (containsId(node.children, id)) return true
    }
    return false
  }
  return findAndCheck(nodes)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ── Sortable Doc Item ────────────────────────────────────────────────────────

function SortableDocItem({
  doc,
  depth,
  expandedIds,
  onToggleExpand,
  onNavigate,
  onDelete,
  activeDocId,
  showDate,
}: {
  doc: DocTreeNode
  depth: number
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onNavigate: (id: string) => void
  onDelete: (id: string) => void
  activeDocId?: string
  showDate?: boolean
}) {
  const hasChildren = doc.children.length > 0
  const isExpanded = expandedIds.has(doc.id)
  const isActive = doc.id === activeDocId

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: doc.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-1 px-3 py-2 rounded-md cursor-pointer transition-colors",
          isActive ? "bg-accent" : "hover:bg-accent/50",
          isDragging && "opacity-40",
          isOver && !isDragging && "ring-2 ring-primary/50 ring-inset bg-primary/5"
        )}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        <div
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(doc.id)
            }}
            className="p-0.5 flex-shrink-0"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          onClick={() => onNavigate(doc.id)}
        >
          {hasChildren ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("text-sm truncate", isActive && "font-medium")}>{doc.title}</span>
          {showDate && (
            <span className="text-xs text-muted-foreground ml-auto mr-2 shrink-0">
              {formatDate(doc.updatedAt)}
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(doc.id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {doc.children.map((child) => (
            <SortableDocItem
              key={child.id}
              doc={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onDelete={onDelete}
              activeDocId={activeDocId}
              showDate={showDate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SortableDocTree({
  documents,
  onNavigate,
  onDelete,
  onReparent,
  activeDocId,
  showDates = false,
}: {
  documents: DocumentResponse[]
  onNavigate: (docId: string) => void
  onDelete: (docId: string) => void
  onReparent: (docId: string, newParentId: string | null) => void
  activeDocId?: string
  showDates?: boolean
}) {
  const tree = buildDocTree(documents)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>()
    function walk(nodes: DocTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.add(node.id)
          walk(node.children)
        }
      }
    }
    walk(tree)
    return ids
  })
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveDragId(null)

      if (!over || active.id === over.id) return

      const draggedId = active.id as string
      const targetId = over.id as string

      if (isDescendantOf(tree, draggedId, targetId)) return

      const draggedDoc = documents.find((d) => d.id === draggedId)
      if (!draggedDoc) return

      if (draggedDoc.parentDocumentId === targetId) {
        // Already a child — detach to root
        onReparent(draggedId, null)
      } else {
        // Make child of target
        onReparent(draggedId, targetId)
        setExpanded((prev) => new Set([...prev, targetId]))
      }
    },
    [tree, documents, onReparent]
  )

  const draggedDoc = activeDragId ? documents.find((d) => d.id === activeDragId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        {tree.map((doc) => (
          <SortableDocItem
            key={doc.id}
            doc={doc}
            depth={0}
            expandedIds={expanded}
            onToggleExpand={toggleExpand}
            onNavigate={onNavigate}
            onDelete={onDelete}
            activeDocId={activeDocId}
            showDate={showDates}
          />
        ))}
      </div>
      <DragOverlay>
        {draggedDoc ? (
          <div className="bg-background border rounded-md shadow-lg px-3 py-2 text-sm opacity-90 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {draggedDoc.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
