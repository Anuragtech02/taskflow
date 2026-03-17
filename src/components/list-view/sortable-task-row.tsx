"use client"

import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableTaskRowProps {
  id: string
  children: React.ReactNode
}

export function SortableTaskRow({ id, children }: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/drag",
        isDragging && "opacity-40 z-50",
        isOver && !isDragging && "ring-2 ring-primary/50 ring-inset bg-primary/5"
      )}
    >
      <div
        className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/drag:opacity-100 cursor-grab active:cursor-grabbing p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      {children}
    </div>
  )
}
