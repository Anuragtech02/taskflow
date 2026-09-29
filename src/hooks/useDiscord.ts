import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"

// ── Types (mirror taskflow-server/src/routes/discord/*) ─────────────────────

export type ReminderSchedule =
  | { kind: "once"; at: string; timezone: string }
  | { kind: "daily"; times: string[]; timezone: string }
  | { kind: "weekly"; days: number[]; times: string[]; timezone: string }
  | { kind: "interval"; everyDays: number; startDate: string; times: string[]; timezone: string }

export interface DiscordReminder {
  id: string
  workspaceId: string
  name: string
  channelId: string
  message: string
  taskId: string | null
  mentionUserIds: string[]
  mentionRoleIds: string[]
  mentionHere: boolean
  schedule: ReminderSchedule
  scheduleSummary: string
  enabled: boolean
  nextRunAt: string | null
  lastRunAt: string | null
  lastStatus: "sent" | "skipped" | "failed" | null
  lastError: string | null
}

export type ReminderInput = Pick<
  DiscordReminder,
  "name" | "channelId" | "message" | "taskId" | "mentionUserIds" | "mentionRoleIds" | "mentionHere" | "schedule" | "enabled"
>

export interface DiscordAccountStatus {
  configured: boolean
  account: { discordUsername: string | null; linkedAt: string } | null
}
export interface WorkspaceDiscord {
  configured: boolean
  canManageConnection: boolean
  canManageReminders: boolean
  guild: { id: string; name: string | null; timezone: string; installedAt: string } | null
}
export interface DiscordMember {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  discordLinked: boolean
  discordUsername: string | null
}

/** The server's `{ error }` message when present, else a fallback. */
export function discordErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const data = (err as { response?: { data?: { error?: string } } })?.response?.data
  return data?.error || fallback
}

// Link/install are full-page OAuth redirects through the API, which reads the
// session cookie (scoped to the parent domain) to know who's asking.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
export const discordLinkUrl = () => `${API_URL}/discord/link/start`
export const discordInstallUrl = (workspaceId: string) =>
  `${API_URL}/workspaces/${workspaceId}/discord/install/start?tz=${encodeURIComponent(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  )}`

// ── Queries ──────────────────────────────────────────────────────────────────

export function useDiscordAccount() {
  return useQuery<DiscordAccountStatus>({
    queryKey: ["discord", "account"],
    queryFn: async () => (await api.get("/discord/status")).data,
  })
}

export function useWorkspaceDiscord(workspaceId: string | null) {
  return useQuery<WorkspaceDiscord>({
    queryKey: ["discord", "workspace", workspaceId],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/discord`)).data,
    enabled: !!workspaceId,
  })
}

/** Channels/roles come live from Discord, so only fetch once a server is connected. */
export function useDiscordChannels(workspaceId: string | null, enabled: boolean) {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ["discord", "channels", workspaceId],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/discord/channels`)).data.channels,
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  })
}

export function useDiscordRoles(workspaceId: string | null, enabled: boolean) {
  return useQuery<{ id: string; name: string; color: number }[]>({
    queryKey: ["discord", "roles", workspaceId],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/discord/roles`)).data.roles,
    enabled: !!workspaceId && enabled,
    staleTime: 60_000,
  })
}

export function useDiscordMembers(workspaceId: string | null) {
  return useQuery<DiscordMember[]>({
    queryKey: ["discord", "members", workspaceId],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/discord/members`)).data.members,
    enabled: !!workspaceId,
  })
}

export function useDiscordReminders(workspaceId: string | null, enabled: boolean) {
  return useQuery<DiscordReminder[]>({
    queryKey: ["discord", "reminders", workspaceId],
    queryFn: async () => (await api.get(`/workspaces/${workspaceId}/discord/reminders`)).data.reminders,
    enabled: !!workspaceId && enabled,
    // Keep "last sent / next run" fresh while the page is open.
    refetchInterval: 30_000,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useUnlinkDiscord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.delete("/discord/link")).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discord"] }),
  })
}

export function useDisconnectDiscordServer(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.delete(`/workspaces/${workspaceId}/discord`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discord"] }),
  })
}

export function useUpdateDiscordTimezone(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (timezone: string) => (await api.patch(`/workspaces/${workspaceId}/discord`, { timezone })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discord", "workspace", workspaceId] }),
  })
}

export function useSaveDiscordReminder(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<ReminderInput> }) =>
      id
        ? (await api.patch(`/workspaces/${workspaceId}/discord/reminders/${id}`, input)).data.reminder
        : (await api.post(`/workspaces/${workspaceId}/discord/reminders`, input)).data.reminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discord", "reminders", workspaceId] }),
  })
}

export function useDeleteDiscordReminder(workspaceId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/workspaces/${workspaceId}/discord/reminders/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discord", "reminders", workspaceId] }),
  })
}

export function useTestDiscordReminder(workspaceId: string | null) {
  return useMutation<{ success: boolean; unlinkedUserIds: string[] }, unknown, string>({
    mutationFn: async (id) => (await api.post(`/workspaces/${workspaceId}/discord/reminders/${id}/test`)).data,
  })
}
