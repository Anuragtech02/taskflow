"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  discordErrorMessage,
  useSaveDiscordReminder,
  type DiscordMember,
  type DiscordReminder,
  type ReminderSchedule,
} from "@/hooks/useDiscord"

type Repeat = ReminderSchedule["kind"]

const DAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" }, { n: 4, label: "Thu" },
  { n: 5, label: "Fri" }, { n: 6, label: "Sat" }, { n: 7, label: "Sun" },
]
const MESSAGE_MAX = 1800
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

/** Same rule as the bot's /task: …/tasks/<id>, ?task=<id>, or a bare id. */
function parseTaskRef(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const m =
    s.match(new RegExp(`/tasks/(${UUID})`, "i")) ??
    s.match(new RegExp(`[?&]task(?:Id)?=(${UUID})`, "i")) ??
    s.match(new RegExp(`^(${UUID})$`, "i"))
  return m ? m[1].toLowerCase() : null
}

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
function allZones(): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
  const zones = fn ? fn("timeZone") : []
  return zones.includes("UTC") ? zones : ["UTC", ...zones]
}
const today = () => new Date().toLocaleDateString("en-CA") // YYYY-MM-DD, local

function describe(s: ReminderSchedule): string {
  const at = "times" in s ? s.times.join(", ") : ""
  switch (s.kind) {
    case "once": return `Once on ${s.at.replace("T", " at ")}`
    case "daily": return `Every day at ${at}`
    case "weekly": return s.days.length ? `Every ${s.days.map((d) => DAYS[d - 1].label).join(", ")} at ${at}` : "Pick at least one day"
    case "interval": return `Every ${s.everyDays} day${s.everyDays === 1 ? "" : "s"} from ${s.startDate} at ${at}`
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  appUrl: string
  reminder: DiscordReminder | null // null → create
  channels: { id: string; name: string }[]
  channelsError: boolean
  roles: { id: string; name: string }[]
  members: DiscordMember[]
}

export function DiscordReminderDialog({ open, onOpenChange, workspaceId, appUrl, reminder, channels, channelsError, roles, members }: Props) {
  const save = useSaveDiscordReminder(workspaceId)
  const zones = useMemo(() => {
    const z = allZones()
    const own = reminder?.schedule.timezone
    return own && !z.includes(own) ? [own, ...z] : z
  }, [reminder])

  const [name, setName] = useState("")
  const [channelId, setChannelId] = useState("")
  const [message, setMessage] = useState("")
  const [taskLink, setTaskLink] = useState("")
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([])
  const [mentionRoleIds, setMentionRoleIds] = useState<string[]>([])
  const [mentionHere, setMentionHere] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [repeat, setRepeat] = useState<Repeat>("weekly")
  const [times, setTimes] = useState<string[]>(["09:00"])
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [everyDays, setEveryDays] = useState(2)
  const [startDate, setStartDate] = useState(today())
  const [onceDate, setOnceDate] = useState(today())
  const [onceTime, setOnceTime] = useState("09:00")
  const [timezone, setTimezone] = useState(browserZone())
  const [error, setError] = useState<string | null>(null)

  // (Re)initialise whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    const s = reminder?.schedule
    setName(reminder?.name ?? "")
    setChannelId(reminder?.channelId ?? "")
    setMessage(reminder?.message ?? "")
    setTaskLink(reminder?.taskId ? `${appUrl}/dashboard/workspaces/${workspaceId}/tasks/${reminder.taskId}` : "")
    setMentionUserIds(reminder?.mentionUserIds ?? [])
    setMentionRoleIds(reminder?.mentionRoleIds ?? [])
    setMentionHere(reminder?.mentionHere ?? false)
    setEnabled(reminder?.enabled ?? true)
    setRepeat(s?.kind ?? "weekly")
    setTimes(s && "times" in s ? s.times : ["09:00"])
    setDays(s?.kind === "weekly" ? s.days : [1, 2, 3, 4, 5])
    setEveryDays(s?.kind === "interval" ? s.everyDays : 2)
    setStartDate(s?.kind === "interval" ? s.startDate : today())
    setOnceDate(s?.kind === "once" ? s.at.slice(0, 10) : today())
    setOnceTime(s?.kind === "once" ? s.at.slice(11, 16) : "09:00")
    setTimezone(s?.timezone ?? browserZone())
  }, [open, reminder, appUrl, workspaceId])

  const schedule: ReminderSchedule = useMemo(() => {
    const t = [...new Set(times.filter(Boolean))].sort()
    switch (repeat) {
      case "once": return { kind: "once", at: `${onceDate}T${onceTime}`, timezone }
      case "daily": return { kind: "daily", times: t, timezone }
      case "weekly": return { kind: "weekly", days: [...days].sort(), times: t, timezone }
      case "interval": return { kind: "interval", everyDays, startDate, times: t, timezone }
    }
  }, [repeat, onceDate, onceTime, times, days, everyDays, startDate, timezone])

  const taskId = parseTaskRef(taskLink)
  const taskLinkInvalid = taskLink.trim() !== "" && !taskId
  const unlinkedTagged = members.filter((m) => mentionUserIds.includes(m.userId) && !m.discordLinked)

  async function submit() {
    setError(null)
    if (!name.trim()) return setError("Give the reminder a name")
    if (!channelId) return setError("Pick a channel")
    if (!message.trim()) return setError("Write a message")
    if (taskLinkInvalid) return setError("That task link isn't a TaskFlow task link")
    if (repeat !== "once" && schedule.kind !== "once" && schedule.times.length === 0) return setError("Add at least one time")
    if (repeat === "weekly" && days.length === 0) return setError("Pick at least one day")
    try {
      await save.mutateAsync({
        id: reminder?.id,
        input: { name: name.trim(), channelId, message: message.trim(), taskId, mentionUserIds, mentionRoleIds, mentionHere, schedule, enabled },
      })
      toast.success(reminder ? "Reminder updated" : "Reminder created")
      onOpenChange(false)
    } catch (e) {
      setError(discordErrorMessage(e, "Couldn't save the reminder"))
    }
  }

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reminder ? "Edit reminder" : "New Discord reminder"}</DialogTitle>
          <DialogDescription>The bot posts this message to a channel on your schedule, tagging who you choose.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-name">Name</Label>
              <Input id="reminder-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily standup" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger><SelectValue placeholder={channelsError ? "Couldn't load channels" : "Pick a channel"} /></SelectTrigger>
                <SelectContent>
                  {channels.map((c) => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder-message">Message</Label>
              <span className={cn("text-xs text-muted-foreground", message.length > MESSAGE_MAX && "text-destructive")}>
                {message.length}/{MESSAGE_MAX}
              </span>
            </div>
            <Textarea id="reminder-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder="Standup in 5 minutes — post your updates in the thread." maxLength={MESSAGE_MAX} />
          </div>

          {/* Who to tag */}
          <div className="space-y-2">
            <Label>Tag</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-between">
                    People {mentionUserIds.length > 0 && `(${mentionUserIds.length})`}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search members…" />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {members.map((m) => (
                          <CommandItem key={m.userId} value={`${m.name} ${m.email}`} onSelect={() => toggle(mentionUserIds, setMentionUserIds, m.userId)}>
                            <Checkbox checked={mentionUserIds.includes(m.userId)} className="mr-2" />
                            <span className="truncate">{m.name}</span>
                            {!m.discordLinked && <span className="ml-auto text-xs text-muted-foreground">not linked</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={roles.length === 0}>
                    Roles {mentionRoleIds.length > 0 && `(${mentionRoleIds.length})`}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search roles…" />
                    <CommandList>
                      <CommandEmpty>No roles found.</CommandEmpty>
                      <CommandGroup>
                        {roles.map((r) => (
                          <CommandItem key={r.id} value={r.name} onSelect={() => toggle(mentionRoleIds, setMentionRoleIds, r.id)}>
                            <Checkbox checked={mentionRoleIds.includes(r.id)} className="mr-2" />@{r.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={mentionHere} onCheckedChange={setMentionHere} />@here
              </label>
            </div>
            {(mentionUserIds.length > 0 || mentionRoleIds.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {members.filter((m) => mentionUserIds.includes(m.userId)).map((m) => (
                  <span key={m.userId} className={cn("inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs", !m.discordLinked && "opacity-60")}>
                    {m.name}
                    <button type="button" aria-label={`Remove ${m.name}`} onClick={() => toggle(mentionUserIds, setMentionUserIds, m.userId)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {roles.filter((r) => mentionRoleIds.includes(r.id)).map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
                    @{r.name}
                    <button type="button" aria-label={`Remove @${r.name}`} onClick={() => toggle(mentionRoleIds, setMentionRoleIds, r.id)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {unlinkedTagged.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {unlinkedTagged.map((m) => m.name).join(", ")} {unlinkedTagged.length === 1 ? "hasn't" : "haven't"} linked Discord yet, so they won&apos;t be pinged until they do.
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={repeat} onValueChange={(v) => setRepeat(v as Repeat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">On chosen days of the week</SelectItem>
                    <SelectItem value="interval">Every few days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">{timezone}</span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search timezones…" />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {zones.map((z) => (
                            <CommandItem key={z} value={z} onSelect={() => setTimezone(z)}>
                              <Check className={cn("mr-2 h-3.5 w-3.5", z === timezone ? "opacity-100" : "opacity-0")} />{z}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {repeat === "weekly" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Days</Label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setDays([1, 2, 3, 4, 5])}>Weekdays</button>
                    <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setDays([1, 2, 3, 4, 5, 6, 7])}>Every day</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = days.includes(d.n)
                    return (
                      <button key={d.n} type="button" aria-pressed={on}
                        onClick={() => setDays(on ? days.filter((x) => x !== d.n) : [...days, d.n])}
                        className={cn("h-8 w-11 rounded-md border text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {repeat === "interval" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="every-days">Every</Label>
                  <div className="flex items-center gap-2">
                    <Input id="every-days" type="number" min={1} max={365} value={everyDays}
                      onChange={(e) => setEveryDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} className="w-24" />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Starting</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
            )}

            {repeat === "once" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="once-date">Date</Label>
                  <Input id="once-date" type="date" value={onceDate} min={today()} onChange={(e) => setOnceDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="once-time">Time</Label>
                  <Input id="once-time" type="time" value={onceTime} onChange={(e) => setOnceTime(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{times.length > 1 ? "Times" : "Time"}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input type="time" value={t} className="w-32"
                        onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
                      {times.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove time"
                          onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {times.length < 24 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setTimes([...times, "13:00"])}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Add time
                    </Button>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{describe(schedule)} ({timezone})</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-link">Link a task <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="task-link" value={taskLink} onChange={(e) => setTaskLink(e.target.value)} placeholder="Paste a TaskFlow task link"
              className={cn(taskLinkInvalid && "border-destructive")} />
            {taskLinkInvalid && <p className="text-xs text-destructive">That doesn&apos;t look like a TaskFlow task link.</p>}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} />Active
          </label>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {reminder ? "Save changes" : "Create reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
