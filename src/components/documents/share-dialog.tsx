"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Link2, Trash2, UserPlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Share {
  id: string
  documentId: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  userAvatarUrl: string | null
  role: string
  shareToken: string | null
  shareType: string
  createdAt: string
}

interface ShareDialogProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ documentId, open, onOpenChange }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares)
      }
    } catch (err) {
      console.error("Failed to fetch shares:", err)
    }
  }, [documentId])

  useEffect(() => {
    if (open) fetchShares()
  }, [open, fetchShares])

  const handleInvite = async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, shareType: "user" }),
      })
      if (res.ok) {
        setEmail("")
        fetchShares()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareType: "link", role: "viewer" }),
      })
      if (res.ok) fetchShares()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (shareId: string, newRole: string) => {
    await fetch(`/api/documents/${documentId}/shares/${shareId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    fetchShares()
  }

  const handleRemoveShare = async (shareId: string) => {
    await fetch(`/api/documents/${documentId}/shares/${shareId}`, {
      method: "DELETE",
      credentials: "include",
    })
    fetchShares()
  }

  const copyShareLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const linkShares = shares.filter((s) => s.shareType === "link")
  const userShares = shares.filter((s) => s.shareType === "user")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
        </DialogHeader>

        {/* Invite by email */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="flex-1"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="commenter">Commenter</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={loading || !email.trim()} size="icon">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {/* User shares */}
        {userShares.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">People with access</p>
            {userShares.map((share) => (
              <div key={share.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {(share.userName || share.userEmail || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{share.userName || share.userEmail}</p>
                    {share.userName && share.userEmail && (
                      <p className="text-xs text-muted-foreground truncate">{share.userEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Select value={share.role} onValueChange={(v) => handleUpdateRole(share.id, v)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="commenter">Commenter</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveShare(share.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link sharing */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Share via link</p>
            {linkShares.length === 0 && (
              <Button variant="outline" size="sm" onClick={handleCreateLink} disabled={loading}>
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                Create link
              </Button>
            )}
          </div>
          {linkShares.map((share) => (
            <div key={share.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">Anyone with the link can {share.role === "editor" ? "edit" : "view"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Select value={share.role} onValueChange={(v) => handleUpdateRole(share.id, v)}>
                  <SelectTrigger className="w-[90px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => share.shareToken && copyShareLink(share.shareToken)}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveShare(share.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
