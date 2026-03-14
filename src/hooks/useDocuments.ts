import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchDocuments,
  fetchDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  type DocumentResponse,
} from "@/lib/api/documents"

export function useDocuments(spaceId: string | undefined) {
  return useQuery<DocumentResponse[]>({
    queryKey: ["documents", spaceId],
    queryFn: () => fetchDocuments(spaceId!),
    enabled: !!spaceId,
  })
}

export function useDocument(documentId: string | undefined) {
  return useQuery<{ document: DocumentResponse }>({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId!),
    enabled: !!documentId,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      spaceId,
      data,
    }: {
      spaceId: string
      data: {
        title: string
        parentDocumentId?: string
        icon?: string
      }
    }) => createDocument(spaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", variables.spaceId] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string
      data: Partial<{
        title: string
        content: Record<string, unknown>
        icon: string
        coverUrl: string
        parentDocumentId: string
      }>
    }) => updateDocument(documentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] })
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })
}
