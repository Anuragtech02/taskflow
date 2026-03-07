import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchWorkspaces, updateWorkspace, type WorkspaceResponse } from "@/lib/api"
import api from "@/lib/axios"

// ── API Key Types ──────────────────────────────────────────────────────────

interface ApiKeyResponse {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface CreateApiKeyResponse {
  apiKey: ApiKeyResponse & { key: string }
}

// ── API Key Hooks ──────────────────────────────────────────────────────────

export function useApiKeys() {
  return useQuery<ApiKeyResponse[]>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await api.get("/users/me/api-keys")
      return res.data.apiKeys
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation<CreateApiKeyResponse, Error, { name: string }>({
    mutationFn: async (data) => {
      const res = await api.post("/users/me/api-keys", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (keyId) => {
      await api.delete(`/users/me/api-keys?keyId=${keyId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
    },
  })
}

export { fetchWorkspaces }

export function useWorkspaces() {
  return useQuery<WorkspaceResponse[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  })
}

// ── User Hooks ─────────────────────────────────────────────────────────────

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string; avatarUrl?: string }) => {
      const res = await api.patch("/users/me", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

export function useUpdateUserPassword() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await api.patch("/users/me/password", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

// ── Workspace Hooks ─────────────────────────────────────────────────────────

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workspaceId, name }: { workspaceId: string; name: string }) => {
      const res = await api.patch(`/workspaces/${workspaceId}`, { name })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
