import api from "../axios"

// Documents API Types
export interface DocumentResponse {
  id: string
  workspaceId: string
  spaceId: string
  title: string
  content: Record<string, unknown> | null
  icon: string | null
  coverUrl: string | null
  parentDocumentId: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
}

export async function fetchDocuments(spaceId: string): Promise<DocumentResponse[]> {
  const res = await api.get(`/spaces/${spaceId}/documents`)
  return res.data.documents || []
}

export async function fetchDocument(documentId: string): Promise<{ document: DocumentResponse }> {
  const res = await api.get(`/documents/${documentId}`)
  return res.data
}

export async function createDocument(
  spaceId: string,
  data: {
    title: string
    parentDocumentId?: string
    icon?: string
  }
): Promise<{ document: DocumentResponse }> {
  const res = await api.post(`/spaces/${spaceId}/documents`, data)
  return res.data
}

export async function updateDocument(
  documentId: string,
  data: Partial<{
    title: string
    content: Record<string, unknown>
    icon: string
    coverUrl: string
    parentDocumentId: string | null
  }>
): Promise<{ document: DocumentResponse }> {
  const res = await api.patch(`/documents/${documentId}`, data)
  return res.data
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`)
}
