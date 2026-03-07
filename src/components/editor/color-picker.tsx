"use client"

import { cn } from "@/lib/utils"

const COLORS = [
  "#000000", "#434343", "#666666", "#999999",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
]

interface ColorPickerProps {
  onSelect: (color: string) => void
  onClear: () => void
  activeColor?: string
}

export function ColorPicker({ onSelect, onClear, activeColor }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 p-2 w-[140px]">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Select color ${color}`}
          aria-pressed={activeColor === color}
          className={cn(
            "w-7 h-7 rounded border border-border hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background outline-none",
            activeColor === color && "ring-2 ring-primary ring-offset-1 ring-offset-background"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
      <button
        type="button"
        aria-label="Clear color selection"
        className="w-7 h-7 rounded border border-border hover:scale-110 transition-transform text-xs font-medium flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background outline-none"
        onClick={onClear}
      >
        &times;
      </button>
    </div>
  )
}
