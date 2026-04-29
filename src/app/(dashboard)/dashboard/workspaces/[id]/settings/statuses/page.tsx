"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus } from "@/hooks/useQueries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb } from "@/components/breadcrumb"
import { ChevronLeft, Pencil, Palette, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STATUS_PALETTE = [
  "#6b7280",
  "#3b82f6",
  "#eab308",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
]

export default function WorkspaceStatusesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const { data: statuses = [], isLoading } = useStatuses(workspaceId)
  const createMutation = useCreateStatus()
  const updateMutation = useUpdateStatus()
  const deleteMutation = useDeleteStatus()

  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#6366f1")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [colorPickerForId, setColorPickerForId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    createMutation.mutate(
      { workspaceId, name: newName.trim(), color: newColor },
      {
        onSuccess: () => {
          toast.success("Status created")
          setNewName("")
          setNewColor("#6366f1")
          setColorPickerForId(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create status"),
      }
    )
  }

  const handleRename = (statusId: string) => {
    if (!editingName.trim()) return
    updateMutation.mutate(
      { workspaceId, statusId, name: editingName.trim() },
      {
        onSuccess: () => {
          toast.success("Status renamed")
          setEditingId(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to rename status"),
      }
    )
  }

  const handleColorChange = (statusId: string, color: string) => {
    updateMutation.mutate(
      { workspaceId, statusId, color },
      {
        onSuccess: () => {
          toast.success("Color updated")
          setColorPickerForId(null)
        },
        onError: () => toast.error("Failed to update color"),
      }
    )
  }

  const handleDelete = (statusId: string) => {
    if (statuses.length <= 1) {
      toast.error("Cannot delete the last status")
      return
    }
    deleteMutation.mutate(
      { workspaceId, statusId },
      {
        onSuccess: () => toast.success("Status deleted"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete status"),
      }
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Workspace", href: `/dashboard/workspaces/${workspaceId}` },
          { label: "Settings" },
          { label: "Statuses" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statuses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statuses are shared across every list and sprint in this workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/workspaces/${workspaceId}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to workspace
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-medium text-sm">Manage statuses</h2>
        </div>

        <div className="divide-y">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && statuses.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No statuses yet. Create one below to get started.
            </div>
          )}
          {statuses.map((s) => (
            <div key={s.id}>
              <div className="flex items-center gap-3 px-4 py-2.5 group">
                <button
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all"
                  style={{ backgroundColor: s.color || "#6366f1" }}
                  onClick={() => setColorPickerForId(colorPickerForId === s.id ? null : s.id)}
                  title="Change color"
                />
                {editingId === s.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(s.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    onBlur={() => {
                      if (editingId !== s.id) return
                      if (editingName.trim() && editingName !== s.name) handleRename(s.id)
                      else setEditingId(null)
                    }}
                  />
                ) : (
                  <span className="text-sm flex-1 truncate">{s.name}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(s.id)
                      setEditingName(s.name)
                    }}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setColorPickerForId(colorPickerForId === s.id ? null : s.id)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    title="Change color"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {colorPickerForId === s.id && (
                <div className="grid grid-cols-8 gap-2 px-4 pb-3 pl-8">
                  {STATUS_PALETTE.map((c) => (
                    <button
                      key={c}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                        s.color === c ? "border-foreground" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => handleColorChange(s.id, c)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <button
              className="w-6 h-6 rounded-full flex-shrink-0 border hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all"
              style={{ backgroundColor: newColor }}
              onClick={() => setColorPickerForId(colorPickerForId === "new" ? null : "new")}
              title="Pick color"
            />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New status name…"
              className="h-9 text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
            />
            <Button size="sm" disabled={!newName.trim() || createMutation.isPending} onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {colorPickerForId === "new" && (
            <div className="grid grid-cols-8 gap-2 mt-3 pl-8">
              {STATUS_PALETTE.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                    newColor === c ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setNewColor(c)
                    setColorPickerForId(null)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
