import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchWorkspaces, updateWorkspace, type WorkspaceResponse } from "@/lib/api"

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
      const res = await fetch("/api/users/me/api-keys")
      if (!res.ok) throw new Error("Failed to fetch API keys")
      const data = await res.json()
      return data.apiKeys
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation<CreateApiKeyResponse, Error, { name: string }>({
    mutationFn: async (data) => {
      const res = await fetch("/api/users/me/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to create API key" }))
        throw new Error(error.error || "Failed to create API key")
      }
      return res.json()
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
      const res = await fetch(`/api/users/me/api-keys?keyId=${keyId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to delete API key" }))
        throw new Error(error.error || "Failed to delete API key")
      }
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
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update profile" }))
        throw new Error(error.error || "Failed to update profile")
      }
      
      return res.json()
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
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to change password" }))
        throw new Error(error.error || "Failed to change password")
      }
      
      return res.json()
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
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update workspace" }))
        throw new Error(error.error || "Failed to update workspace")
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
