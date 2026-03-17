"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  File,
} from "lucide-react"
import { useDocuments, useCreateDocument, useDeleteDocument, useUpdateDocument } from "@/hooks/useDocuments"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SortableDocTree } from "@/components/documents/sortable-doc-tree"

export default function SpaceDocsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const spaceId = params.spaceId as string
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [parentId, setParentId] = useState<string | undefined>()

  const { data: documents, isLoading } = useDocuments(spaceId)
  const createMutation = useCreateDocument()
  const deleteMutation = useDeleteDocument()
  const updateDocMutation = useUpdateDocument()

  const handleCreate = () => {
    if (!title.trim()) return
    createMutation.mutate({
      spaceId,
      data: {
        title: title.trim(),
        parentDocumentId: parentId,
      },
    }, {
      onSuccess: (data) => {
        setCreateOpen(false)
        setTitle("")
        setParentId(undefined)
        router.push(`/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/docs/${data.document.id}`)
      },
    })
  }

  const handleDelete = (docId: string) => {
    if (confirm("Delete this document? This will also delete all child documents.")) {
      deleteMutation.mutate(docId)
    }
  }

  const handleReparent = (docId: string, newParentId: string | null) => {
    updateDocMutation.mutate({
      documentId: docId,
      data: { parentDocumentId: newParentId },
    })
  }

  const handleNavigate = (docId: string) => {
    router.push(`/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/docs/${docId}`)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Docs
          </h1>
          <p className="text-muted-foreground">
            Create and organize your space documents
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
              <DialogDescription>
                Create a new document in this space
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  placeholder="Untitled Document"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              {documents && documents.length > 0 && (
                <div className="grid gap-2">
                  <Label>Parent Document (optional)</Label>
                  <Select
                    value={parentId || "__none__"}
                    onValueChange={(value) => setParentId(value === "__none__" ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (root document)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (root document)</SelectItem>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!documents || documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first document to get started
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2">
            <SortableDocTree
              documents={documents}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
              onReparent={handleReparent}
              showDates
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
