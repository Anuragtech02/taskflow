"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  FileText,
  Trash2,
  Plus,
  FolderOpen,
  Share2,
  MessageSquare,
  Clock,
} from "lucide-react"
import { useDocument, useDocuments, useUpdateDocument, useDeleteDocument, useCreateDocument } from "@/hooks/useDocuments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CollaborativeEditor } from "@/components/collaborative-editor"
import { ShareDialog } from "@/components/documents/share-dialog"
import { CommentsSidebar } from "@/components/documents/comments-sidebar"
import { VersionHistory } from "@/components/documents/version-history"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { DocumentResponse } from "@/lib/api/documents"

// Build document tree from flat list
function buildDocTree(docs: DocumentResponse[]): (DocumentResponse & { children: DocumentResponse[] })[] {
  const map = new Map<string, DocumentResponse & { children: DocumentResponse[] }>()
  const roots: (DocumentResponse & { children: DocumentResponse[] })[] = []

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

// Tree item component
function DocTreeItem({
  doc,
  workspaceId,
  currentDocId,
  depth = 0,
  onDelete,
}: {
  doc: DocumentResponse & { children: DocumentResponse[] }
  workspaceId: string
  currentDocId: string
  depth?: number
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const hasChildren = doc.children && doc.children.length > 0
  const isActive = doc.id === currentDocId

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
          isActive ? "bg-accent" : "hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-0.5"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          onClick={() =>
            router.push(`/dashboard/workspaces/${workspaceId}/docs/${doc.id}`)
          }
        >
          {hasChildren ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className={cn("text-sm truncate", isActive && "font-medium")}>{doc.title}</span>
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
      {expanded && hasChildren && (
        <div>
          {doc.children.map((child: any) => (
            <DocTreeItem
              key={child.id}
              doc={child}
              workspaceId={workspaceId}
              currentDocId={currentDocId}
              depth={depth + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const workspaceId = params.id as string
  const docId = params.docId as string

  const { data, isLoading, refetch } = useDocument(docId)
  const { data: allDocuments } = useDocuments(workspaceId)
  const updateMutation = useUpdateDocument()
  const deleteMutation = useDeleteDocument()
  const createMutation = useCreateDocument()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [title, setTitle] = useState("")
  const [shareOpen, setShareOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)

  useEffect(() => {
    if (data?.document) {
      setTitle(data.document.title)
    }
  }, [data])

  // Auto-save title on change (debounced)
  useEffect(() => {
    if (!data?.document || title === data.document.title) return
    const timer = setTimeout(() => {
      updateMutation.mutate({ documentId: docId, data: { title } })
    }, 1000)
    return () => clearTimeout(timer)
  }, [title, docId, data?.document])

  const handleDelete = () => {
    if (confirm("Delete this document?")) {
      deleteMutation.mutate(docId, {
        onSuccess: () => {
          router.push(`/dashboard/workspaces/${workspaceId}/docs`)
        },
      })
    }
  }

  const handleCreateDoc = () => {
    if (!newDocTitle.trim()) return
    createMutation.mutate({
      workspaceId,
      data: {
        title: newDocTitle.trim(),
      },
    }, {
      onSuccess: (data) => {
        setCreateOpen(false)
        setNewDocTitle("")
        router.push(`/dashboard/workspaces/${workspaceId}/docs/${data.document.id}`)
      }
    })
  }

  const handleSidebarDelete = (docIdToDelete: string) => {
    if (confirm("Delete this document? This will also delete all child documents.")) {
      deleteMutation.mutate(docIdToDelete)
    }
  }

  const tree = allDocuments ? buildDocTree(allDocuments) : []

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-64 border-r bg-card p-4 space-y-4 animate-pulse">
          <div className="h-8 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!data?.document) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div
        className={cn(
          "border-r bg-card flex flex-col transition-all duration-200 ease-in-out",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <div className="p-3 border-b flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(`/dashboard/workspaces/${workspaceId}/docs`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Docs
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Document</DialogTitle>
                <DialogDescription>
                  Create a new document in your workspace
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-doc-title">Title</Label>
                  <Input
                    id="new-doc-title"
                    placeholder="Untitled Document"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateDoc()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDoc} disabled={!newDocTitle.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {tree.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 text-center">
              No documents yet
            </div>
          ) : (
            tree.map((doc) => (
              <DocTreeItem
                key={doc.id}
                doc={doc}
                workspaceId={workspaceId}
                currentDocId={docId}
                onDelete={handleSidebarDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <div className="relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-10 bg-border border rounded-r-md hover:bg-accent transition-colors z-10",
            sidebarOpen ? "-left-5" : "left-0"
          )}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {data.document.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareOpen(true)}
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommentsOpen(!commentsOpen)}
              title="Comments"
              className={cn(commentsOpen && "bg-accent")}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVersionsOpen(true)}
              title="Version history"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor + Comments */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="py-8 px-8 max-w-4xl mx-auto space-y-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Document"
                className="text-4xl font-bold border-none shadow-none p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40 bg-transparent"
              />
              <CollaborativeEditor
                documentId={docId}
                userName={session?.user?.name || "Anonymous"}
                content={data.document.content as Record<string, unknown> | null}
                placeholder="Start writing..."
                minHeight="calc(100vh - 250px)"
                showToolbar={true}
                className="border rounded-lg overflow-hidden"
              />
            </div>
          </div>

          {/* Comments Sidebar */}
          <CommentsSidebar
            documentId={docId}
            currentUserId={session?.user?.id || ""}
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
          />
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        documentId={docId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Version History */}
      <VersionHistory
        documentId={docId}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        onRestore={() => refetch()}
      />
    </div>
  )
}
