"use client"

import { useMemo, useState } from "react"
import { Loader2, MessageSquare, Pencil, Plus, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  discordErrorMessage, discordInstallUrl, discordLinkUrl,
  useDeleteDiscordReminder, useDisconnectDiscordServer, useDiscordAccount, useDiscordChannels,
  useDiscordMembers, useDiscordReminders, useDiscordRoles, useSaveDiscordReminder,
  useTestDiscordReminder, useUnlinkDiscord, useUpdateDiscordTimezone, useWorkspaceDiscord,
  type DiscordReminder,
} from "@/hooks/useDiscord"
import { DiscordReminderDialog } from "./discord-reminder-dialog"

const APP_URL = typeof window !== "undefined" ? window.location.origin : ""

function formatWhen(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function LastRun({ r }: { r: DiscordReminder }) {
  if (!r.lastStatus) return <span className="text-sm text-muted-foreground">Not run yet</span>
  const badge =
    r.lastStatus === "sent" ? <Badge variant="secondary">Sent</Badge>
    : r.lastStatus === "skipped" ? <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">Skipped</Badge>
    : <Badge variant="destructive">Failed</Badge>
  return (
    <div className="flex items-center gap-2">
      {r.lastError ? (
        <Tooltip>
          <TooltipTrigger asChild><span className="cursor-help">{badge}</span></TooltipTrigger>
          <TooltipContent className="max-w-xs">{r.lastError}</TooltipContent>
        </Tooltip>
      ) : badge}
      <span className="text-xs text-muted-foreground">{formatWhen(r.lastRunAt)}</span>
    </div>
  )
}

function NextRun({ r }: { r: DiscordReminder }) {
  if (!r.enabled && r.schedule.kind === "once" && r.lastStatus === "sent") return <span className="text-sm text-muted-foreground">Done</span>
  if (!r.enabled) return <span className="text-sm text-muted-foreground">Paused</span>
  return <span className="text-sm">{formatWhen(r.nextRunAt)}</span>
}

interface Props {
  workspaces: { id: string; name: string }[]
  workspaceId: string | null
  onWorkspaceChange: (id: string) => void
}

export function DiscordIntegration({ workspaces, workspaceId, onWorkspaceChange }: Props) {
  const account = useDiscordAccount()
  const unlink = useUnlinkDiscord()
  const ws = useWorkspaceDiscord(workspaceId)
  const connected = !!ws.data?.guild
  const channels = useDiscordChannels(workspaceId, connected)
  const roles = useDiscordRoles(workspaceId, connected)
  const members = useDiscordMembers(workspaceId)
  const reminders = useDiscordReminders(workspaceId, connected)
  const disconnect = useDisconnectDiscordServer(workspaceId)
  const setZone = useUpdateDiscordTimezone(workspaceId)
  const save = useSaveDiscordReminder(workspaceId)
  const del = useDeleteDiscordReminder(workspaceId)
  const test = useTestDiscordReminder(workspaceId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DiscordReminder | null>(null)
  const channelName = useMemo(() => new Map((channels.data ?? []).map((c) => [c.id, c.name])), [channels.data])
  const memberName = useMemo(() => new Map((members.data ?? []).map((m) => [m.userId, m.name])), [members.data])
  // The browser's zone list can omit "UTC" and uses its own canonical names
  // (e.g. Asia/Calcutta for Asia/Kolkata). A Select whose value isn't among
  // its items renders blank, so always include the stored value and UTC.
  const currentZone = ws.data?.guild?.timezone
  const zones = useMemo(() => {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    return [...new Set([...(currentZone ? [currentZone] : []), "UTC", ...(fn ? fn("timeZone") : [])])]
  }, [currentZone])

  const configured = account.data?.configured ?? ws.data?.configured
  const canManage = ws.data?.canManageReminders ?? false

  async function runTest(r: DiscordReminder) {
    try {
      const res = await test.mutateAsync(r.id)
      const unlinked = res.unlinkedUserIds.map((id) => memberName.get(id) ?? "someone")
      toast.success(`Test sent to #${channelName.get(r.channelId) ?? "channel"}`, {
        description: unlinked.length ? `Not pinged (Discord not linked): ${unlinked.join(", ")}` : undefined,
      })
    } catch (e) {
      toast.error(discordErrorMessage(e, "Couldn't send the test"))
    }
  }

  async function toggle(r: DiscordReminder, enabled: boolean) {
    try {
      await save.mutateAsync({ id: r.id, input: { enabled } })
    } catch (e) {
      toast.error(discordErrorMessage(e, "Couldn't update the reminder"))
    }
  }

  if (account.isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  if (configured === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>The Discord integration isn&apos;t set up on this TaskFlow server yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Your account */}
        <Card>
          <CardHeader>
            <CardTitle>Your Discord account</CardTitle>
            <CardDescription>Link it so the bot knows who you are for /tasks, and so reminders can tag you.</CardDescription>
          </CardHeader>
          <CardContent>
            {account.data?.account ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm">Linked as <span className="font-medium">{account.data.account.discordUsername ?? "your Discord account"}</span></p>
                <Button variant="outline" size="sm" disabled={unlink.isPending}
                  onClick={() => unlink.mutate(undefined, {
                    onSuccess: () => toast.success("Discord account unlinked"),
                    onError: (e) => toast.error(discordErrorMessage(e)),
                  })}>
                  Unlink
                </Button>
              </div>
            ) : (
              <Button onClick={() => (window.location.href = discordLinkUrl())}>Link Discord account</Button>
            )}
          </CardContent>
        </Card>

        {/* Workspace server */}
        <Card>
          <CardHeader>
            <CardTitle>Discord server</CardTitle>
            <CardDescription>Connect a Discord server to a workspace to use slash commands and reminders there.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspaces.length > 1 && (
              <div className="space-y-2">
                <Label>Workspace</Label>
                <Select value={workspaceId ?? ""} onValueChange={onWorkspaceChange}>
                  <SelectTrigger className="sm:w-72"><SelectValue placeholder="Pick a workspace" /></SelectTrigger>
                  <SelectContent>{workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {ws.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : connected ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm">Connected to <span className="font-medium">{ws.data!.guild!.name ?? "a Discord server"}</span></p>
                  {ws.data!.canManageConnection && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">Disconnect</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect this Discord server?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The bot leaves the server and slash commands stop working there. Your reminders are kept but paused — reconnect to use them again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => disconnect.mutate(undefined, {
                            onSuccess: () => toast.success("Discord server disconnected"),
                            onError: (e) => toast.error(discordErrorMessage(e)),
                          })}>Disconnect</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Timezone for “due today” and “overdue” in /tasks</Label>
                  <Select value={ws.data!.guild!.timezone} disabled={!ws.data!.canManageConnection || setZone.isPending}
                    onValueChange={(tz) => setZone.mutate(tz, { onError: (e) => toast.error(discordErrorMessage(e)) })}>
                    <SelectTrigger className="sm:w-72"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">{zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ) : ws.data?.canManageConnection ? (
              <Button onClick={() => workspaceId && (window.location.href = discordInstallUrl(workspaceId))}>
                Add TaskFlow to a Discord server
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No server connected. Ask a workspace owner or admin to connect one.</p>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        {connected && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Reminders</CardTitle>
                <CardDescription>Messages the bot posts to a channel on a schedule, tagging who you choose.</CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }}>
                  <Plus className="mr-1 h-4 w-4" />New reminder
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {channels.isError && (
                <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {discordErrorMessage(channels.error, "Couldn't load channels from Discord")}
                </p>
              )}
              {reminders.isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (reminders.data ?? []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No reminders yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reminder</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Next run</TableHead>
                        <TableHead>Last run</TableHead>
                        <TableHead className="w-16">Active</TableHead>
                        <TableHead className="w-28 text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.data!.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-muted-foreground">{r.scheduleSummary}</div>
                          </TableCell>
                          <TableCell className="text-sm">#{channelName.get(r.channelId) ?? "unknown"}</TableCell>
                          <TableCell><NextRun r={r} /></TableCell>
                          <TableCell><LastRun r={r} /></TableCell>
                          <TableCell>
                            <Switch checked={r.enabled} disabled={!canManage || save.isPending}
                              aria-label={r.enabled ? `Pause ${r.name}` : `Activate ${r.name}`}
                              onCheckedChange={(v) => toggle(r, v)} />
                          </TableCell>
                          <TableCell>
                            {canManage && (
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Send a test now"
                                      disabled={test.isPending} onClick={() => runTest(r)}>
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Send a test now</TooltipContent>
                                </Tooltip>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${r.name}`}
                                  onClick={() => { setEditing(r); setDialogOpen(true) }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${r.name}`}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete “{r.name}”?</AlertDialogTitle>
                                      <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => del.mutate(r.id, {
                                        onSuccess: () => toast.success("Reminder deleted"),
                                        onError: (e) => toast.error(discordErrorMessage(e)),
                                      })}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* How to use the bot */}
        {connected && (
          <Card>
            <CardHeader>
              <CardTitle>Slash commands</CardTitle>
              <CardDescription>Available in the connected server once your account is linked. Replies are only visible to you unless you set share.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><code className="rounded bg-muted px-1.5 py-0.5">/tasks</code> — your open tasks, with optional <em>due</em> and <em>status</em> filters</p>
              <p><code className="rounded bg-muted px-1.5 py-0.5">/task link:</code> — paste a task link to see its details</p>
            </CardContent>
          </Card>
        )}

        {workspaceId && (
          <DiscordReminderDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            workspaceId={workspaceId}
            appUrl={APP_URL}
            reminder={editing}
            channels={channels.data ?? []}
            channelsError={channels.isError}
            roles={roles.data ?? []}
            members={members.data ?? []}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
