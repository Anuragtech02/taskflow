"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { RichTextEditor } from "@/components/rich-text-editor"
import { FileText, Loader2 } from "lucide-react"

interface SharedDoc {
  id: string
  title: string
  content: Record<string, unknown>
  icon: string | null
  coverUrl: string | null
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string | null }
}

export default function SharedDocumentPage() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<SharedDoc | null>(null)
  const [role, setRole] = useState<string>("viewer")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSharedDoc() {
      try {
        const res = await fetch(`/api/shared/${token}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Not found" }))
          setError(data.error || "Document not found")
          return
        }
        const data = await res.json()
        setDoc(data.document)
        setRole(data.role)
      } catch {
        setError("Failed to load document")
      } finally {
        setLoading(false)
      }
    }
    fetchSharedDoc()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Document not found</h1>
        <p className="text-sm text-muted-foreground">{error || "This share link may have expired or been removed."}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{doc.icon || "📄"}</span>
            <h1 className="text-lg font-semibold">{doc.title}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Shared by {doc.creator.name || "Unknown"}</span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium capitalize">{role}</span>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <RichTextEditor
          content={doc.content}
          onChange={() => {}}
          editable={role === "editor"}
          showToolbar={role === "editor"}
          minHeight="400px"
          className="border-none"
        />
      </div>
    </div>
  )
}
