"use client"

import { useEffect, useRef, useState } from "react"
import { LayoutGrid, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasteLinkPopoverProps {
  position: { top: number; left: number }
  onSelect: (choice: "embed" | "link") => void
  onDismiss: () => void
}

const OPTIONS = [
  { key: "embed" as const, label: "Embed card", icon: LayoutGrid },
  { key: "link" as const, label: "Paste as link", icon: LinkIcon },
]

export function PasteLinkPopover({ position, onSelect, onDismiss }: PasteLinkPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedIndexRef = useRef(0)

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Stop all keystrokes from reaching the editor while popover is open
      e.stopPropagation()
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) => (i + 1) % OPTIONS.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length)
          break
        case "Enter":
          e.preventDefault()
          onSelect(OPTIONS[selectedIndexRef.current].key)
          break
        case "Escape":
          e.preventDefault()
          onDismiss()
          break
        default:
          // Prevent any other key (typing) from reaching the editor
          e.preventDefault()
          break
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }

    // Use capture phase to intercept keystrokes before ProseMirror handles them
    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onSelect, onDismiss])

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-md border bg-popover p-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="text-xs text-muted-foreground px-2 py-1">Paste as...</div>
      {OPTIONS.map((opt, index) => (
        <button
          key={opt.key}
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
            index === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
          )}
          onClick={() => onSelect(opt.key)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <opt.icon className="h-4 w-4" />
          {opt.label}
        </button>
      ))}
    </div>
  )
}
