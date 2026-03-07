"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, RotateCcw } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface Version {
  id: string
  versionNumber: number
  title: string
  createdAt: string
  createdBy: string
  userName: string | null
}

interface VersionDetail {
  id: string
  versionNumber: number
  title: string
  content: Record<string, unknown>
  createdAt: string
  creator: { id: string; name: string | null; email: string }
}

interface VersionHistoryProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore?: () => void
}

export function VersionHistory({ documentId, open, onOpenChange, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedVersion, setSelectedVersion] = useState<VersionDetail | null>(null)
  const [restoring, setRestoring] = useState(false)

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions)
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err)
    }
  }, [documentId])

  useEffect(() => {
    if (open) {
      fetchVersions()
      setSelectedVersion(null)
    }
  }, [open, fetchVersions])

  const handleSelectVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSelectedVersion(data.version)
      }
    } catch (err) {
      console.error("Failed to fetch version:", err)
    }
  }

  const handleRestore = async (versionId: string) => {
    setRestoring(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        onOpenChange(false)
        onRestore?.()
      }
    } finally {
      setRestoring(false)
    }
  }

  const handleSaveVersion = async () => {
    try {
      await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        credentials: "include",
      })
      fetchVersions()
    } catch (err) {
      console.error("Failed to save version:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Version history
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleSaveVersion}>
              Save current version
            </Button>
          </div>
        </DialogHeader>

        <div className="flex gap-4 min-h-[400px]">
          {/* Version list */}
          <div className="w-64 border-r pr-4 overflow-y-auto space-y-1">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVersion(v.id)}
                className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors ${
                  selectedVersion?.id === v.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">v{v.versionNumber}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground">{v.userName || "System"}</p>
              </button>
            ))}
            {versions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No versions yet</p>
            )}
          </div>

          {/* Version preview */}
          <div className="flex-1 overflow-y-auto">
            {selectedVersion ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      Version {selectedVersion.versionNumber}: {selectedVersion.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedVersion.createdAt), "PPp")} by{" "}
                      {selectedVersion.creator.name || selectedVersion.creator.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(selectedVersion.id)}
                    disabled={restoring}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    {restoring ? "Restoring..." : "Restore"}
                  </Button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none border rounded-md p-4 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(selectedVersion.content, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
