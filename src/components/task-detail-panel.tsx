"use client"

import api from "@/lib/axios"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { X, Calendar, Clock, CheckSquare, MessageSquare, Play, Pause, Square, Trash2, Plus, Check, Search, Link2, ChevronRight, Tag, Paperclip, AlertCircle, ArrowUpRight, MoreHorizontal, CircleCheckBig, Flag, Users, Timer, Gauge, ChevronDown, FolderKanban, FileText, Film, Edit3, Lock, ExternalLink, List as ListIcon, Maximize, Minimize, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Progress bar removed from subtasks section
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RichTextEditor } from "./rich-text-editor"
import { MarkdownRenderer } from "./markdown-renderer"
import { SubtaskRow } from "./subtask-row"
import { MoveToListPicker } from "./move-to-list-picker"
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
  useSubtasks,
  useCreateSubtask,
  useToggleSubtask,
  useDeleteSubtask,
  useComments,
  useCreateComment,
  useDeleteComment,
  useWorkspaceMembers,
  useCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  useSprints,
  useTaskSprint,
  useAssignTaskToSprint,
  useRemoveTaskFromAllSprints,
  useTaskAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useTaskDependencies,
  useAddTaskDependency,
  useRemoveTaskDependency,
  useSearchWorkspaceTasks,
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  useTaskLabels,
  useAddTaskLabel,
  useRemoveTaskLabel,
  useTaskReminders,
  useCreateTaskReminder,
  useDeleteTaskReminder,
  useList,
} from "@/hooks/useQueries"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import type { TaskResponse, StatusResponse, WorkspaceMemberResponse, SubtaskResponse, CommentResponse, ActivityResponse } from "@/lib/api"

interface TaskDetailPanelProps {
  task: TaskResponse | null | undefined
  taskId?: string
  open: boolean
  onClose: () => void
  onTaskSelect?: (taskId: string) => void
  statuses: StatusResponse[]
  workspaceId?: string
  labels?: { id: string; name: string; color: string }[]
}

type Priority = "none" | "low" | "medium" | "high" | "urgent"

const PRIORITIES: { value: Priority; label: string; color: string; dotColor: string }[] = [
  { value: "none", label: "None", color: "bg-muted", dotColor: "#6b7280" },
  { value: "low", label: "Low", color: "bg-green-500", dotColor: "#22c55e" },
  { value: "medium", label: "Medium", color: "bg-blue-500", dotColor: "#3b82f6" },
  { value: "high", label: "High", color: "bg-orange-500", dotColor: "#f97316" },
  { value: "urgent", label: "Urgent", color: "bg-red-500", dotColor: "#ef4444" },
]

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

function normalizeStatusName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_")
  const aliases: Record<string, string> = {
    "to_do": "todo",
    "in_review": "review",
  }
  return aliases[slug] ?? slug
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** Convert snake_case to Title Case */
function humanize(str: string | null | undefined): string {
  if (!str || str === "null" || str === "undefined") return "empty"
  // Try to parse as date if it looks like an ISO string or timestamp
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      const d = new Date(str)
      if (!isNaN(d.getTime())) {
        // If time is midnight, show date only
        if (d.getHours() === 0 && d.getMinutes() === 0) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        }
        // Otherwise show date + time
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
          " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      }
    } catch { /* not a date */ }
  }
  // Handle numeric timestamps
  if (/^\d{10,13}$/.test(str)) {
    try {
      const d = new Date(Number(str))
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    } catch { /* not a timestamp */ }
  }
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a field name for display */
function humanizeField(field: string): string {
  const fieldNames: Record<string, string> = {
    status: "status",
    priority: "priority",
    due_date: "due date",
    dueDate: "due date",
    title: "title",
    description: "description",
    order: "position",
    parent_task_id: "parent task",
    parentTaskId: "parent task",
    sprint_id: "sprint",
    sprintId: "sprint",
    list_id: "list",
    listId: "list",
    estimated_hours: "estimated hours",
    estimatedHours: "estimated hours",
  }
  return fieldNames[field] || field.replace(/_/g, " ").replace(/([A-Z])/g, " $1").toLowerCase().trim()
}

function getActivityActionText(activity: ActivityResponse): string {
  const { action, field, oldValue, newValue } = activity
  switch (action) {
    case "created":
      return "created this task"
    case "updated":
      if (field) {
        const fieldName = humanizeField(field)
        // Skip showing order/position changes — too noisy
        if (field === "order") return `reordered this task`
        const from = humanize(oldValue)
        const to = humanize(newValue)
        if (!oldValue || oldValue === "empty") {
          return `set ${fieldName} to ${to}`
        }
        return `changed ${fieldName} from "${from}" to "${to}"`
      }
      return "updated this task"
    case "added_subtask":
    case "subtask_created":
      return `added a subtask${newValue ? `: "${humanize(newValue)}"` : ""}`
    case "added_dependency":
      return "added a dependency"
    case "removed_dependency":
      return "removed a dependency"
    case "added_comment":
      return "added a comment"
    case "added_attachment":
      return `uploaded ${newValue ? `"${newValue}"` : "a file"}`
    case "removed_attachment":
      return `removed ${oldValue ? `"${oldValue}"` : "an attachment"}`
    case "added_assignee":
      return `assigned ${newValue || "someone"}`
    case "removed_assignee":
      return `unassigned ${oldValue || "someone"}`
    case "started_timer":
      return "started time tracking"
    case "stopped_timer":
      return `stopped time tracking (${newValue || "0 minutes"})`
    default:
      // Humanize unknown actions
      return humanize(action)
  }
}

function getActivityIcon(action: string): React.ReactNode {
  switch (action) {
    case "created":
      return <Plus className="h-3 w-3" />
    case "updated":
      return <Edit3 className="h-3 w-3" />
    case "added_subtask":
      return <Plus className="h-3 w-3" />
    case "added_dependency":
      return <Link2 className="h-3 w-3" />
    case "removed_dependency":
      return <Link2 className="h-3 w-3" />
    case "added_comment":
      return <MessageSquare className="h-3 w-3" />
    case "added_attachment":
      return <Paperclip className="h-3 w-3" />
    case "removed_attachment":
      return <Trash2 className="h-3 w-3" />
    case "added_assignee":
      return <Users className="h-3 w-3" />
    case "removed_assignee":
      return <Users className="h-3 w-3" />
    case "started_timer":
      return <Play className="h-3 w-3" />
    case "stopped_timer":
      return <Pause className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

export function TaskDetailPanel({ task, taskId: taskIdProp, open, onClose, onTaskSelect, statuses, workspaceId, labels: propLabels }: TaskDetailPanelProps) {
  // Always fetch the full task (includes activities, comments, etc.)
  const effectiveTaskId = taskIdProp || task?.id
  const { data: fetchedTask } = useTask(effectiveTaskId)
  // Prefer fetchedTask (richer data with activities) once loaded; use task prop for instant display while loading
  const currentTask = fetchedTask || task

  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()

  const queryClient = useQueryClient()

  // Assignees
  const { data: assignees = [], isLoading: assigneesLoading } = useTaskAssignees(currentTask?.id)
  const addAssigneeMutation = useAddTaskAssignee()
  const removeAssigneeMutation = useRemoveTaskAssignee()

  // Subtasks
  const { data: subtasks = [], isLoading: subtasksLoading } = useSubtasks(currentTask?.id)
  const createSubtaskMutation = useCreateSubtask()
  const toggleSubtaskMutation = useToggleSubtask()
  const deleteSubtaskMutation = useDeleteSubtask()

  // Comments
  const { data: comments = [], isLoading: commentsLoading } = useComments(currentTask?.id)
  const createCommentMutation = useCreateComment()
  const deleteCommentMutation = useDeleteComment()

  // Workspace members for assignee picker
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState<Priority>("none")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [timeEstimate, setTimeEstimate] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Activity tab
  const [activityTab, setActivityTab] = useState<"all" | "comments" | "history">("all")

  // Time tracking state
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  // Subtask input
  const [newSubtask, setNewSubtask] = useState("")
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("")

  // Comment input
  const [newComment, setNewComment] = useState<Record<string, unknown> | null>(null)

  // Assignee picker
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Tags (mock - would need tag API)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [collapseEmpty, setCollapseEmpty] = useState(false)
  const [newLabelColor, setNewLabelColor] = useState("#6366f1")
  const [customFieldsExpanded, setCustomFieldsExpanded] = useState(true)

  // Custom fields dialog
  const [isCustomFieldDialogOpen, setIsCustomFieldDialogOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text")
  const [newFieldOptions, setNewFieldOptions] = useState<string>("")

  // Custom fields
  const { data: customFields = [], isLoading: customFieldsLoading } = useCustomFields(currentTask?.listId)
  const createCustomFieldMutation = useCreateCustomField()
  const deleteCustomFieldMutation = useDeleteCustomField()

  // List hook (for displaying current list name)
  const { data: currentList } = useList(currentTask?.listId)

  // Sprint hooks
  const { data: sprints = [] } = useSprints(workspaceId)
  const { data: currentSprint, isLoading: sprintLoading } = useTaskSprint(currentTask?.id)
  const assignToSprintMutation = useAssignTaskToSprint()
  const removeFromSprintMutation = useRemoveTaskFromAllSprints()

  // Attachment hooks
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(currentTask?.id)
  const uploadAttachmentMutation = useUploadAttachment()
  const deleteAttachmentMutation = useDeleteAttachment()

  // Dependencies hooks
  const { data: dependencies, isLoading: dependenciesLoading } = useTaskDependencies(currentTask?.id)
  const addDependencyMutation = useAddTaskDependency()
  const removeDependencyMutation = useRemoveTaskDependency()
  const searchTasksMutation = useSearchWorkspaceTasks()

  // Dependencies state
  const [depSearchOpen, setDepSearchOpen] = useState(false)
  const [depSearchQuery, setDepSearchQuery] = useState("")
  const [depSearchResults, setDepSearchResults] = useState<TaskResponse[]>([])
  const [depSearching, setDepSearching] = useState(false)
  const depSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save: track user-initiated changes (not server-triggered)
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)

  // Attachment state
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    const effectiveId = currentTask?.id || task?.id
    if (!files || !effectiveId) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadAttachmentMutation.mutateAsync({ taskId: effectiveId, file })
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Resolve relative file URLs to absolute API URLs
  const resolveFileUrl = (url: string): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || ""
    if (!base) return url
    if (url.startsWith("/api/files/")) return `${base}${url.slice(4)}`
    if (url.startsWith("/files/")) return `${base}${url}`
    return url
  }

  // Check if file is image
  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith("image/")
  }

  // Check if file is video
  const isVideoFile = (mimeType: string): boolean => {
    return mimeType.startsWith("video/")
  }

  // Handle delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    try {
      await deleteAttachmentMutation.mutateAsync({ taskId: effectiveId, attachmentId })
    } catch (error) {
      console.error("Delete failed:", error)
    }
  }

  // Dependency search with debounce
  const handleDepSearch = useCallback((query: string) => {
    setDepSearchQuery(query)
    if (depSearchTimeout.current) clearTimeout(depSearchTimeout.current)
    if (!query.trim() || query.trim().length < 2 || !workspaceId) {
      setDepSearchResults([])
      setDepSearching(false)
      return
    }
    setDepSearching(true)
    depSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchTasksMutation.mutateAsync({ query, workspaceId })
        // Filter out current task and tasks already linked
        const blockedByIds = dependencies?.blockedBy ?? []
        const blocksIds = dependencies?.blocks ?? []
        const excludeIds = new Set([currentTask?.id || task?.id, ...blockedByIds, ...blocksIds])
        setDepSearchResults(results.filter((t) => !excludeIds.has(t.id)))
      } catch {
        setDepSearchResults([])
      } finally {
        setDepSearching(false)
      }
    }, 300)
  }, [workspaceId, currentTask?.id, task?.id, dependencies, searchTasksMutation])

  // Add dependency: current task is blocked by selectedTask
  const handleAddBlockedBy = async (blockingTaskId: string) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    try {
      await addDependencyMutation.mutateAsync({ taskId: effectiveId, blockedTaskId: blockingTaskId })
    } catch (error) {
      console.error("Add dependency failed:", error)
    }
    setDepSearchOpen(false)
    setDepSearchQuery("")
    setDepSearchResults([])
  }

  // Remove dependency
  const handleRemoveBlockedBy = async (blockingTaskId: string) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    try {
      await removeDependencyMutation.mutateAsync({ taskId: effectiveId, blockedTaskId: blockingTaskId })
    } catch (error) {
      console.error("Remove dependency failed:", error)
    }
  }

  // Snapshot of the pending save data so we can flush it even after the task changes.
  // Updated every time debouncedSave is called (i.e. user makes an edit).
  const pendingSaveDataRef = useRef<{
    taskId: string
    title: string
    description: Record<string, unknown> | undefined
    status: string
    priority: string
    dueDate: string | undefined
    startDate: string | undefined
    timeEstimate: number | undefined
  } | null>(null)

  // Flush pending save for the OLD task before switching, then populate new task data
  const prevTaskIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const newId = currentTask?.id
    const oldId = prevTaskIdRef.current

    // If switching to a different task, flush pending save for the old one first
    if (oldId && newId !== oldId && isDirtyRef.current && autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
      // Use the snapshot — it has the correct task ID and form values from before the switch
      if (pendingSaveDataRef.current) {
        updateTaskMutation.mutate(pendingSaveDataRef.current)
        pendingSaveDataRef.current = null
      }
      isDirtyRef.current = false
    }

    if (currentTask) {
      // Clear any remaining timeout without saving (already flushed above if needed)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
        autoSaveTimeoutRef.current = null
      }
      isDirtyRef.current = false
      pendingSaveDataRef.current = null
      prevTaskIdRef.current = newId

      setTitle(currentTask.title || "")
      setDescription(currentTask.description as Record<string, unknown> | null)
      setStatus(currentTask.status || "todo")
      setPriority((currentTask.priority as Priority) || "none")
      setDueDate(currentTask.dueDate ? new Date(currentTask.dueDate) : undefined)
      setStartDate(currentTask.startDate ? new Date(currentTask.startDate) : undefined)
      setTimeEstimate(currentTask.timeEstimate)
      setTimerSeconds(currentTask.timeSpent || 0)
      setIsTimerRunning(false)
      setNewComment(null)
    }
  }, [currentTask?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-populate local state when fetchedTask data arrives after a save-triggered refetch,
  // but only if the user isn't actively editing (isDirtyRef is false)
  useEffect(() => {
    if (fetchedTask && fetchedTask.id === prevTaskIdRef.current && !isDirtyRef.current) {
      setTitle(fetchedTask.title || "")
      setDescription(fetchedTask.description as Record<string, unknown> | null)
      setStatus(fetchedTask.status || "todo")
      setPriority((fetchedTask.priority as Priority) || "none")
      setDueDate(fetchedTask.dueDate ? new Date(fetchedTask.dueDate) : undefined)
      setStartDate(fetchedTask.startDate ? new Date(fetchedTask.startDate) : undefined)
      setTimeEstimate(fetchedTask.timeEstimate)
    }
  }, [fetchedTask]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval)
    }
  }, [timerInterval])

  // URL management — update URL when panel opens/closes (only from list view context)
  const prevPathRef = useRef<string>("")
  
  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return

    if (open && effectiveTaskId) {
      const taskUrl = `/dashboard/workspaces/${workspaceId}/tasks/${effectiveTaskId}`
      // Only push if we're not already on a task URL
      if (!window.location.pathname.includes("/tasks/")) {
        prevPathRef.current = window.location.pathname + window.location.search
        window.history.pushState({ taskId: effectiveTaskId }, "", taskUrl)
      }
    } else if (!open && prevPathRef.current) {
      // Restore previous URL when panel closes
      window.history.pushState({}, "", prevPathRef.current)
      prevPathRef.current = ""
    }
  }, [open, effectiveTaskId, workspaceId])

  const handleSave = useCallback(() => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    updateTaskMutation.mutate({
      taskId: effectiveId,
      title,
      description: (description ?? undefined) as string | Record<string, unknown> | undefined,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      startDate: startDate ? startDate.toISOString() : undefined,
      timeEstimate: timeEstimate ?? undefined,
    })
  }, [currentTask, task, title, description, status, priority, dueDate, startDate, timeEstimate, updateTaskMutation])

  // Keep a ref to the latest handleSave so debounce timeouts never use a stale closure
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Debounced auto-save — only fires if user actually made changes
  const debouncedSave = useCallback(() => {
    isDirtyRef.current = true
    // Snapshot current form data so flush-on-switch can use it even after task changes
    const effectiveId = currentTask?.id || task?.id
    if (effectiveId) {
      pendingSaveDataRef.current = {
        taskId: effectiveId,
        title,
        description: (description ?? undefined) as Record<string, unknown> | undefined,
        status,
        priority,
        dueDate: dueDate ? dueDate.toISOString() : undefined,
        startDate: startDate ? startDate.toISOString() : undefined,
        timeEstimate: timeEstimate ?? undefined,
      }
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        handleSaveRef.current()
        isDirtyRef.current = false
        pendingSaveDataRef.current = null
      }
    }, 1000)
  }, [currentTask, task, title, description, status, priority, dueDate, startDate, timeEstimate])

  // Keep pendingSaveDataRef in sync after each render so flush-on-switch
  // never uses a stale snapshot (setTitle is async, closure captures old value)
  useEffect(() => {
    if (isDirtyRef.current) {
      const effectiveId = currentTask?.id || task?.id
      if (effectiveId) {
        pendingSaveDataRef.current = {
          taskId: effectiveId,
          title,
          description: (description ?? undefined) as Record<string, unknown> | undefined,
          status,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          startDate: startDate ? startDate.toISOString() : undefined,
          timeEstimate: timeEstimate ?? undefined,
        }
      }
    }
  })

  // Flush pending save on panel close
  useEffect(() => {
    if (!open && isDirtyRef.current && autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
      handleSave()
      isDirtyRef.current = false
    }
  }, [open, handleSave])

  const handleDelete = useCallback(() => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    deleteTaskMutation.mutate(effectiveId)
    setIsDeleteDialogOpen(false)
    onClose()
  }, [currentTask, task, deleteTaskMutation, onClose])

  // Timer controls
  const handleStartTimer = async () => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    try {
      await api.post(`/tasks/${effectiveId}/time-entries`, { action: "start" })
    } catch (error) {
      console.error("Failed to start timer:", error)
    }
    setIsTimerRunning(true)
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    setTimerInterval(interval)
  }

  const handlePauseTimer = () => {
    setIsTimerRunning(false)
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
  }

  const handleStopTimer = async () => {
    handlePauseTimer()
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    try {
      await api.post(`/tasks/${effectiveId}/time-entries`, { action: "stop" })
      queryClient.invalidateQueries({ queryKey: ["time-entries", effectiveId] })
      queryClient.invalidateQueries({ queryKey: ["task", effectiveId] })
    } catch (error) {
      console.error("Failed to stop timer:", error)
    }
  }

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  // Subtask handlers
  const handleAddSubtask = () => {
    const effectiveId = currentTask?.id || task?.id
    if (!newSubtask.trim() || !effectiveId) return
    createSubtaskMutation.mutate({
      taskId: effectiveId,
      title: newSubtask.trim(),
    })
    setNewSubtask("")
  }

  const handleToggleSubtask = (subtask: SubtaskResponse) => {
    if (!task && !currentTask) return
    // Subtasks are full tasks - toggle between todo and done
    const newStatus = subtask.status === "done" ? "todo" : "done"
    updateTaskMutation.mutate({
      taskId: subtask?.id,
      status: newStatus,
    })
  }

  const handleDeleteSubtask = (subtaskId: string) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    deleteSubtaskMutation.mutate({
      taskId: effectiveId,
      subtaskId,
    })
  }

  const handleStartEditSubtask = (subtask: SubtaskResponse) => {
    setEditingSubtaskId(subtask?.id)
    setEditingSubtaskTitle(subtask.title)
  }

  const handleSaveEditSubtask = () => {
    if (editingSubtaskId && editingSubtaskTitle.trim()) {
      updateTaskMutation.mutate({
        taskId: editingSubtaskId,
        title: editingSubtaskTitle.trim(),
      })
    }
    setEditingSubtaskId(null)
    setEditingSubtaskTitle("")
  }

  // Comment handlers
  const handleAddComment = () => {
    const effectiveId = currentTask?.id || task?.id
    if (!newComment || !effectiveId) return
    const text = extractTextFromTiptap(newComment)
    if (!text.trim()) return
    createCommentMutation.mutate({
      taskId: effectiveId,
      content: JSON.stringify(newComment),
    })
    setNewComment(null)
  }

  // Assignee handlers
  const handleAddAssignee = (member: WorkspaceMemberResponse) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    addAssigneeMutation.mutate({
      taskId: effectiveId,
      userId: member.id,
    })
    setAssigneeSearch("")
  }

  const handleRemoveAssignee = (userId: string) => {
    const effectiveId = currentTask?.id || task?.id
    if (!effectiveId) return
    removeAssigneeMutation.mutate({
      taskId: effectiveId,
      userId,
    })
  }

  const filteredMembers = useMemo(() => {
    if (!assigneeSearch) return workspaceMembers
    const search = assigneeSearch.toLowerCase()
    return workspaceMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search)
    )
  }, [workspaceMembers, assigneeSearch])

  const completedSubtasks = subtasks.filter((s) => s.status === "done").length
  // subtask completion shown via badge (e.g. "2/5") — no progress bar needed

  // Labels hooks — must be before early return to avoid "fewer hooks" error
  const { data: fetchedLabels = [] } = useLabels(workspaceId)
  const workspaceLabels = propLabels && propLabels.length > 0 ? propLabels : fetchedLabels
  const { data: taskLabels = [] } = useTaskLabels(currentTask?.id)
  const createLabelMutation = useCreateLabel()
  const updateLabelMutation = useUpdateLabel()
  const deleteLabelMutation = useDeleteLabel()
  const addTaskLabelMutation = useAddTaskLabel()
  const removeTaskLabelMutation = useRemoveTaskLabel()

  // Reminders hooks
  const { data: taskReminders = [] } = useTaskReminders(currentTask?.id)
  const createReminderMutation = useCreateTaskReminder()
  const deleteReminderMutation = useDeleteTaskReminder()

  if (!open || (!task && !currentTask)) return null

  // Merge default statuses with any custom ones (custom overrides defaults with same normalized name)
  const DEFAULT_DISPLAY_STATUSES: StatusResponse[] = [
    { id: "default-todo", name: "To Do", color: "#94a3b8", listId: "", order: 0, isDefault: true },
    { id: "default-ip", name: "In Progress", color: "#3b82f6", listId: "", order: 1, isDefault: false },
    { id: "default-review", name: "In Review", color: "#f59e0b", listId: "", order: 2, isDefault: false },
    { id: "default-done", name: "Done", color: "#10b981", listId: "", order: 3, isDefault: false },
  ]
  const displayStatuses = (() => {
    if (statuses.length === 0) return DEFAULT_DISPLAY_STATUSES
    const customValues = new Set(statuses.map((s) => normalizeStatusName(s.name)))
    const kept = DEFAULT_DISPLAY_STATUSES.filter((d) => !customValues.has(normalizeStatusName(d.name)))
    return [...kept, ...statuses]
  })()

  const currentStatus = displayStatuses.find((s) => normalizeStatusName(s.name) === status)
  
  const priorityConfig = PRIORITIES.find((p) => p.value === priority)

  // Build breadcrumb from task's list/space data
  const taskWithRelations = currentTask as (typeof currentTask & { list?: { name: string; space?: { name: string } } }) | undefined
  const breadcrumb = [
    ...(taskWithRelations?.list?.space?.name ? [{ label: "Space", value: taskWithRelations.list.space.name }] : []),
    ...(taskWithRelations?.list?.name ? [{ label: "List", value: taskWithRelations.list.name }] : []),
    { label: "Task", value: currentTask?.title || "" },
  ]

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-background rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT SIDE - Main Content (~60%) */}
        <div className="w-[60%] flex flex-col border-r overflow-hidden">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 flex-shrink-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
              {breadcrumb.map((item, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="truncate max-w-[100px]">{item.value}</span>
                  {idx < breadcrumb.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Task Title */}
              <Textarea
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  debouncedSave();
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onBlur={() => {
                  if (isDirtyRef.current) {
                    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
                    autoSaveTimeoutRef.current = null
                    handleSave()
                    isDirtyRef.current = false
                  }
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
                rows={1}
                className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent resize-none overflow-hidden min-h-0"
                placeholder="Task title"
              />

              {/* Property Fields - Two Column Grid Layout */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                {/* Column 1: Status */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <CircleCheckBig className="h-4 w-4" />
                    Status
                  </span>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value)
                      const effectiveId = currentTask?.id || task?.id
                      if (effectiveId) {
                        updateTaskMutation.mutate({
                          taskId: effectiveId,
                          status: value,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="Select status">
                        {currentStatus && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: currentStatus.color || "#6366f1" }}
                            />
                            {currentStatus.name}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {displayStatuses.map((s) => (
                        <SelectItem key={s.id} value={normalizeStatusName(s.name)}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: s.color || "#6366f1" }}
                            />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Column 2: Priority */}
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Priority
                  </span>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      const newPriority = value as Priority
                      setPriority(newPriority)
                      const effectiveId = currentTask?.id || task?.id
                      if (effectiveId) {
                        updateTaskMutation.mutate({
                          taskId: effectiveId,
                          priority: newPriority,
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="Select priority">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: priorityConfig?.dotColor }}
                          />
                          {priorityConfig?.label}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: p.dotColor }}
                            />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates - Start & Due */}
                {(!collapseEmpty || startDate || dueDate) && <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          size="sm"
                          className={cn(
                            "h-7 px-2 text-xs justify-start font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                          {startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date)
                            const effectiveId = currentTask?.id || task?.id
                            if (effectiveId) {
                              updateTaskMutation.mutate({
                                taskId: effectiveId,
                                startDate: date ? date.toISOString() : null,
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          size="sm"
                          className={cn(
                            "h-7 px-2 text-xs justify-start font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                          {dueDate ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Due"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => {
                            setDueDate(date)
                            const effectiveId = currentTask?.id || task?.id
                            if (effectiveId) {
                              updateTaskMutation.mutate({
                                taskId: effectiveId,
                                dueDate: date ? date.toISOString() : null,
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>}

                {/* Assignees */}
                <PropertyRow label="Assignees" icon={<Users className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {assigneesLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <>
                        <TooltipProvider delayDuration={200}>
                          {assignees.map((assignee) => (
                            <Tooltip key={assignee.id}>
                              <TooltipTrigger asChild>
                                <div className="relative group cursor-pointer">
                                  <Avatar className="h-8 w-8 border-2 border-background hover:ring-2 hover:ring-primary/50 transition-all">
                                    <AvatarImage src={assignee.user.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(assignee.user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <button
                                    onClick={() => handleRemoveAssignee(assignee.userId)}
                                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{assignee.user.name || assignee.user.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </>
                    )}
                    <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[240px]" align="start">
                        <Command>
                          <div className="flex items-center border-b px-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                              className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Search members..."
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty>No members found.</CommandEmpty>
                            <CommandGroup>
                              {filteredMembers.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.id}
                                  onSelect={() => {
                                    handleAddAssignee(member)
                                    setAssigneePopoverOpen(false)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={member.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{member.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </PropertyRow>

                {/* Track time + Estimate */}
                {(!collapseEmpty || timerSeconds > 0 || timeEstimate) && (
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Track
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-mono min-w-[70px] justify-center">
                      <span className={cn("text-base", isTimerRunning && "text-green-500")}>
                        {formatTimer(timerSeconds)}
                      </span>
                    </div>
                    {isTimerRunning ? (
                      <Button variant="outline" size="icon" onClick={handlePauseTimer} className="h-8 w-8">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" onClick={handleStartTimer} className="h-8 w-8">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={handleStopTimer} className="h-8 w-8">
                      <Square className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                )}
                <PropertyRow label="Tags" icon={<Tag className="h-4 w-4" />}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Show labels assigned to this task */}
                    {taskLabels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                        style={{ backgroundColor: label.color + "20", color: label.color, borderColor: label.color }}
                      >
                        {label.name}
                        <button
                          onClick={() => {
                            const effectiveId = currentTask?.id || task?.id
                            if (effectiveId) {
                              removeTaskLabelMutation.mutate({ taskId: effectiveId, labelId: label.id })
                            }
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add label
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px]" align="start">
                        <div className="space-y-2">
                          {/* Existing workspace labels */}
                          {workspaceLabels && workspaceLabels.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">Workspace Labels</p>
                              <div className="flex flex-col gap-1">
                                {workspaceLabels.map((label) => {
                                  const isOnTask = taskLabels.some((tl) => tl.id === label.id)
                                  return (
                                    <div key={label.id} className="flex items-center gap-1 group/label">
                                      <button
                                        onClick={() => {
                                          const effectiveId = currentTask?.id || task?.id
                                          if (!effectiveId) return
                                          if (isOnTask) {
                                            removeTaskLabelMutation.mutate({ taskId: effectiveId, labelId: label.id })
                                          } else {
                                            addTaskLabelMutation.mutate({ taskId: effectiveId, labelId: label.id })
                                          }
                                        }}
                                        className="flex-1 px-2 py-1 text-xs rounded-full border transition-colors hover:opacity-80 text-left"
                                        style={{ backgroundColor: label.color + "20", color: label.color, borderColor: label.color }}
                                      >
                                        {isOnTask && <Check className="h-3 w-3 inline mr-1" />}
                                        {label.name}
                                      </button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button className="p-0.5 rounded opacity-0 group-hover/label:opacity-100 hover:bg-muted transition-opacity">
                                            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                          <DropdownMenuItem
                                            onClick={() => {
                                              const newName = window.prompt("Rename label:", label.name)
                                              if (newName && newName.trim() && newName.trim() !== label.name && workspaceId) {
                                                updateLabelMutation.mutate({ workspaceId, labelId: label.id, name: newName.trim() })
                                              }
                                            }}
                                          >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Rename
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              if (workspaceId) {
                                                deleteLabelMutation.mutate({ workspaceId, labelId: label.id })
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {/* Create new label */}
                          <div className="space-y-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground font-medium">Create New Label</p>
                            <Input
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Label name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newTag.trim() && workspaceId) {
                                  createLabelMutation.mutate(
                                    { workspaceId, name: newTag.trim(), color: newLabelColor },
                                    {
                                      onSuccess: () => {
                                        setNewTag("")
                                      },
                                    }
                                  )
                                }
                              }}
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground mr-1">Color:</span>
                              {["#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"].map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setNewLabelColor(color)}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-all",
                                    newLabelColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-110"
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            {newTag.trim() && workspaceId && (
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => {
                                  createLabelMutation.mutate(
                                    { workspaceId, name: newTag.trim(), color: newLabelColor },
                                    {
                                      onSuccess: () => {
                                        setNewTag("")
                                      },
                                    }
                                  )
                                }}
                                disabled={createLabelMutation.isPending}
                              >
                                Create "{newTag.trim()}"
                              </Button>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </PropertyRow>

                {/* List Property Row */}
                {workspaceId && (
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-28 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <ListIcon className="h-4 w-4" />
                    List
                  </span>
                  <MoveToListPicker
                    workspaceId={workspaceId}
                    currentListId={currentTask?.listId}
                    onSelect={(listId) => {
                      const effectiveId = currentTask?.id || task?.id
                      if (!effectiveId) return
                      updateTaskMutation.mutate(
                        { taskId: effectiveId, listId },
                        {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["task", effectiveId] })
                            queryClient.invalidateQueries({ queryKey: ["list"] })
                            toast.success("Task moved to another list")
                          },
                        }
                      )
                    }}
                    trigger={
                      <button className="h-8 px-3 text-sm text-left rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors flex-1 truncate">
                        {currentList?.name || "Select list"}
                      </button>
                    }
                  />
                </div>
                )}

                {/* Sprint Property Row */}
                {(!collapseEmpty || currentSprint) && (
                <div className="flex items-center py-2.5 border-b border-border/30">
                  <span className="w-24 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Sprint
                  </span>
                  <Select
                    value={currentSprint?.id || "none"}
                    onValueChange={(value) => {
                      const effectiveId = currentTask?.id || task?.id
                      if (!effectiveId) return
                      if (value === "none") {
                        removeFromSprintMutation.mutate({ taskId: effectiveId })
                      } else {
                        assignToSprintMutation.mutate({ taskId: effectiveId, sprintId: value })
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue placeholder="No sprint">
                        {currentSprint ? currentSprint.name : "No sprint"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No sprint</span>
                      </SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}

                {/* Collapse empty fields toggle (spans both columns) */}
                <button
                  onClick={() => setCollapseEmpty(!collapseEmpty)}
                  className="col-span-2 flex items-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("h-3 w-3 transition-transform", collapseEmpty && "-rotate-90")} />
                  {collapseEmpty ? "Show empty fields" : "Collapse empty fields"}
                </button>
              </div>

              {/* Custom Fields — Full-width collapsible section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setCustomFieldsExpanded(!customFieldsExpanded)}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Custom Fields
                    {customFields.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 ml-1">
                        {customFields.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    !customFieldsExpanded && "-rotate-90"
                  )} />
                </button>

                {customFieldsExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {customFieldsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : customFields.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {customFields.map((field) => {
                          // Get current value from task.customFields
                          const fieldValue = (currentTask || task)?.customFields?.[field.id]
                          
                          return (
                          <div
                            key={field.id}
                            className="group flex flex-col gap-1.5 p-2.5 rounded-md border border-border/50 bg-muted/20 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{field.name}</span>
                              <button
                                onClick={() => {
                                  const listId = (currentTask || task)?.listId
                                  if (listId) {
                                    deleteCustomFieldMutation.mutate({
                                      listId,
                                      fieldId: field.id,
                                    })
                                  }
                                }}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            
                            {/* Render appropriate input based on field type */}
                            {field.type === "text" && (
                              <Input
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="Enter value..."
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "textarea" && (
                              <Textarea
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="Enter value..."
                                className="h-16 text-sm resize-none"
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                type="number"
                                value={fieldValue as number || ""}
                                onChange={(e) => {
                                  const cEffId2 = currentTask?.id || task?.id
                                  if (cEffId2) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId2,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="0"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "checkbox" && (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={fieldValue as boolean || false}
                                  onCheckedChange={(checked) => {
                                    const cEffId3 = currentTask?.id || task?.id
                                    if (cEffId3) {
                                      const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: checked }
                                      updateTaskMutation.mutate({
                                        taskId: cEffId3,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {fieldValue ? "Yes" : "No"}
                                </span>
                              </div>
                            )}
                            {field.type === "date" && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "h-8 justify-start text-left font-normal text-sm",
                                      !fieldValue && "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {fieldValue ? new Date(fieldValue as string).toLocaleDateString() : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={fieldValue ? new Date(fieldValue as string) : undefined}
                                    onSelect={(date) => {
                                      const cEffId4 = currentTask?.id || task?.id
                                      if (cEffId4 && date) {
                                        const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: date.toISOString() }
                                        updateTaskMutation.mutate({
                                          taskId: cEffId4,
                                          customFields: newCustomFields,
                                        })
                                      }
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                            {field.type === "select" && (
                              <Select
                                value={fieldValue as string || ""}
                                onValueChange={(value) => {
                                  const cEffId5 = currentTask?.id || task?.id
                                  if (cEffId5) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId5,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options?.choices as string[] | undefined)?.map((choice: string) => (
                                    <SelectItem key={choice} value={choice}>{choice}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {field.type === "url" && (
                              <Input
                                type="url"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="https://..."
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "email" && (
                              <Input
                                type="email"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="email@example.com"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "phone" && (
                              <Input
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder="+1 234 567 8900"
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "currency" && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  value={fieldValue as number || ""}
                                  onChange={(e) => {
                                    const cEffId6 = currentTask?.id || task?.id
                                    if (cEffId6) {
                                      const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                      updateTaskMutation.mutate({
                                        taskId: cEffId6,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                  placeholder="0.00"
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                            {field.type === "percentage" && (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={fieldValue as number || ""}
                                  onChange={(e) => {
                                    const cEffId7 = currentTask?.id || task?.id
                                    if (cEffId7) {
                                      const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value ? parseFloat(e.target.value) : null }
                                      updateTaskMutation.mutate({
                                        taskId: cEffId7,
                                        customFields: newCustomFields,
                                      })
                                    }
                                  }}
                                  placeholder="0"
                                  className="h-8 text-sm"
                                />
                                <span className="text-muted-foreground text-sm">%</span>
                              </div>
                            )}
                            {field.type === "time" && (
                              <Input
                                type="time"
                                value={fieldValue as string || ""}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                            )}
                            {field.type === "datetime" && (
                              <Input
                                type="datetime-local"
                                value={fieldValue ? (fieldValue as string).slice(0, 16) : ""}
                                onChange={(e) => {
                                  const cEffId8 = currentTask?.id || task?.id
                                  if (cEffId8) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value ? new Date(e.target.value).toISOString() : null }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId8,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                className="h-8 text-sm"
                              />
                            )}
                            {/* Fallback for unsupported types */}
                            {!["text", "textarea", "number", "checkbox", "date", "select", "url", "email", "phone", "currency", "percentage", "time", "datetime", "multiSelect", "user"].includes(field.type) && (
                              <Input
                                value={String(fieldValue || "")}
                                onChange={(e) => {
                                  const cEffId = currentTask?.id || task?.id
                                  if (cEffId) {
                                    const newCustomFields = { ...(currentTask || task)?.customFields, [field.id]: e.target.value }
                                    updateTaskMutation.mutate({
                                      taskId: cEffId,
                                      customFields: newCustomFields,
                                    })
                                  }
                                }}
                                placeholder={`Enter ${field.type}...`}
                                className="h-8 text-sm"
                              />
                            )}
                          </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-1">No custom fields yet. Add one to track extra information.</p>
                    )}

                    {/* Add Custom Field Dialog */}
                    <Dialog open={isCustomFieldDialogOpen} onOpenChange={setIsCustomFieldDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add Field
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Field</DialogTitle>
                          <DialogDescription>
                            Create a new custom field for this list.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Field Name</label>
                            <Input
                              value={newFieldName}
                              onChange={(e) => setNewFieldName(e.target.value)}
                              placeholder="e.g., Story Points, Sprint, Budget"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Field Type</label>
                            <Select
                              value={newFieldType}
                              onValueChange={(value) => setNewFieldType(value as CustomFieldType)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CUSTOM_FIELD_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex flex-col">
                                      <span>{type.label}</span>
                                      <span className="text-xs text-muted-foreground">{type.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {(newFieldType === "select" || newFieldType === "multiSelect") && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Options (one per line)</label>
                              <textarea
                                value={newFieldOptions}
                                onChange={(e) => setNewFieldOptions(e.target.value)}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none"
                              />
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCustomFieldDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              const listId = (currentTask || task)?.listId
                              if (listId && newFieldName.trim()) {
                                const options: Record<string, unknown> = {}
                                if ((newFieldType === "select" || newFieldType === "multiSelect") && newFieldOptions.trim()) {
                                  options.choices = newFieldOptions.split("\n").map(o => o.trim()).filter(Boolean)
                                }
                                createCustomFieldMutation.mutate({
                                  listId,
                                  name: newFieldName.trim(),
                                  type: newFieldType,
                                  options,
                                })
                                setNewFieldName("")
                                setNewFieldType("text")
                                setNewFieldOptions("")
                                setIsCustomFieldDialogOpen(false)
                              }
                            }}
                            disabled={!newFieldName.trim()}
                          >
                            Add Field
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Description
                </label>
                <RichTextEditor
                  key={currentTask?.id || task?.id || "new"}
                  content={description}
                  onChange={(json) => { setDescription(json); debouncedSave(); }}
                  placeholder="Add a description..."
                  minHeight="120px"
                  onImageClick={setPreviewImage}
                />
              </div>

              <Separator />

              {/* Subtasks - ClickUp Style */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Subtasks</span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {completedSubtasks}/{subtasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Rich Subtask Rows */}
                {subtasksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="space-y-1 mb-3">
                    {subtasks.map((subtask) => (
                      <SubtaskRow
                        key={subtask?.id}
                        subtask={subtask}
                        onClick={() => onTaskSelect?.(subtask?.id)}
                        statuses={statuses}
                      />
                    ))}
                  </div>
                )}
                
                {/* Add subtask input */}
                <div className="flex items-center gap-2 mt-3">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        handleAddSubtask()
                      }
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Separator />

              {/* Dependencies */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Dependencies</span>
                    {!dependenciesLoading && ((dependencies?.blockedBy?.length ?? 0) + (dependencies?.blocks?.length ?? 0)) > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {(dependencies?.blockedBy?.length ?? 0) + (dependencies?.blocks?.length ?? 0)}
                      </Badge>
                    )}
                  </div>
                </div>

                {dependenciesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Blocked by */}
                    {dependencies?.blockedBy && dependencies.blockedBy.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lock className="h-3 w-3 text-orange-500" />
                          <span className="text-xs font-medium text-muted-foreground">Blocked by</span>
                        </div>
                        <div className="space-y-1">
                          {dependencies.blockedBy.map((depId) => (
                            <DependencyChip
                              key={depId}
                              taskId={depId}
                              onRemove={() => handleRemoveBlockedBy(depId)}
                              onClick={() => onTaskSelect?.(depId)}
                              variant="blockedBy"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Blocks */}
                    {dependencies?.blocks && dependencies.blocks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ExternalLink className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium text-muted-foreground">Blocking</span>
                        </div>
                        <div className="space-y-1">
                          {dependencies.blocks.map((depId) => (
                            <DependencyChip
                              key={depId}
                              taskId={depId}
                              onRemove={() => removeDependencyMutation.mutate({ taskId: depId, blockedTaskId: currentTask?.id || task?.id || "" })}
                              onClick={() => onTaskSelect?.(depId)}
                              variant="blocks"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(!dependencies?.blockedBy?.length && !dependencies?.blocks?.length) && (
                      <p className="text-xs text-muted-foreground">No dependencies set</p>
                    )}
                  </div>
                )}

                {/* Add dependency */}
                <Popover open={depSearchOpen} onOpenChange={(open) => {
                  setDepSearchOpen(open)
                  if (!open) {
                    setDepSearchQuery("")
                    setDepSearchResults([])
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs mt-3">
                      <Plus className="h-3 w-3 mr-1" />
                      Add dependency
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1"
                          placeholder="Search tasks to add as blocker..."
                          value={depSearchQuery}
                          onChange={(e) => handleDepSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {depSearching ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">Searching…</div>
                      ) : depSearchResults.length > 0 ? (
                        <div className="py-1">
                          {depSearchResults.map((r) => (
                            <button
                              key={r.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                              onClick={() => handleAddBlockedBy(r.id)}
                            >
                              <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{r.title}</span>
                            </button>
                          ))}
                        </div>
                      ) : depSearchQuery.length >= 2 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">No tasks found</div>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground">Type at least 2 characters</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Reminders */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Reminders</span>
                  {taskReminders.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {taskReminders.length}
                    </Badge>
                  )}
                </div>
                {taskReminders.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {taskReminders.map((reminder) => (
                      <div key={reminder.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                        <span>
                          {new Date(reminder.remindAt).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                          {reminder.sent && <span className="text-muted-foreground ml-1">(sent)</span>}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            const effectiveId = currentTask?.id || task?.id
                            if (effectiveId) {
                              deleteReminderMutation.mutate({ taskId: effectiveId, reminderId: reminder.id })
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Set Reminder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {dueDate && (
                      <>
                        <DropdownMenuItem onClick={() => {
                          const effectiveId = currentTask?.id || task?.id
                          if (effectiveId) {
                            const remindAt = new Date(dueDate.getTime() - 15 * 60 * 1000)
                            createReminderMutation.mutate({ taskId: effectiveId, data: { remindAt: remindAt.toISOString(), preset: "15min" } })
                          }
                        }}>
                          15 minutes before due
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const effectiveId = currentTask?.id || task?.id
                          if (effectiveId) {
                            const remindAt = new Date(dueDate.getTime() - 60 * 60 * 1000)
                            createReminderMutation.mutate({ taskId: effectiveId, data: { remindAt: remindAt.toISOString(), preset: "1hour" } })
                          }
                        }}>
                          1 hour before due
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const effectiveId = currentTask?.id || task?.id
                          if (effectiveId) {
                            const remindAt = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
                            createReminderMutation.mutate({ taskId: effectiveId, data: { remindAt: remindAt.toISOString(), preset: "1day" } })
                          }
                        }}>
                          1 day before due
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => {
                      const effectiveId = currentTask?.id || task?.id
                      if (effectiveId) {
                        const remindAt = new Date(Date.now() + 30 * 60 * 1000)
                        createReminderMutation.mutate({ taskId: effectiveId, data: { remindAt: remindAt.toISOString(), preset: "custom" } })
                      }
                    }}>
                      In 30 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const effectiveId = currentTask?.id || task?.id
                      if (effectiveId) {
                        const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
                        createReminderMutation.mutate({ taskId: effectiveId, data: { remindAt: remindAt.toISOString(), preset: "custom" } })
                      }
                    }}>
                      Tomorrow
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Separator />

              {/* Attachments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Attachments</span>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      {attachments.length}
                    </Badge>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                  />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Drop files here or click to upload
                    </div>
                  )}
                </div>

                {/* Attachment list */}
                {attachmentsLoading ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group transition-colors"
                      >
                        {/* Thumbnail or icon */}
                        {isImageFile(attachment.mimeType) ? (
                          <div
                            className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:ring-2 hover:ring-primary"
                            onClick={() => setPreviewImage(resolveFileUrl(attachment.url))}
                          >
                            <img
                              src={resolveFileUrl(attachment.url)}
                              alt={attachment.filename}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : isVideoFile(attachment.mimeType) ? (
                          <div className="h-10 w-10 rounded flex-shrink-0 bg-muted flex items-center justify-center">
                            <Film className="h-5 w-5 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded flex-shrink-0 bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              if (isImageFile(attachment.mimeType) || isVideoFile(attachment.mimeType)) {
                                setPreviewImage(resolveFileUrl(attachment.url))
                              } else {
                                window.open(resolveFileUrl(attachment.url), "_blank")
                              }
                            }}
                            className="text-sm font-medium hover:underline truncate block text-left"
                          >
                            {attachment.filename}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                          </span>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteAttachment(attachment.id)
                          }}
                          disabled={deleteAttachmentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    No attachments yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Activity Panel (~40%) */}
        <div className="w-[40%] flex flex-col bg-muted/10">
          {/* Activity Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
            <h3 className="font-semibold">Activity</h3>
            <Tabs value={activityTab} onValueChange={(v) => setActivityTab(v as any)} className="h-8">
              <TabsList className="h-7 bg-transparent">
                <TabsTrigger value="all" className="h-6 text-xs px-2">All</TabsTrigger>
                <TabsTrigger value="comments" className="h-6 text-xs px-2">Comments</TabsTrigger>
                <TabsTrigger value="history" className="h-6 text-xs px-2">History</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Activity Feed - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activityTab === "all" ? (
              (() => {
                // Merge activities and comments into a single sorted timeline
                const items: { type: "activity" | "comment"; data: any; time: number }[] = []
                if (currentTask?.activities) {
                  for (const a of currentTask.activities) {
                    items.push({ type: "activity", data: a, time: new Date(a.createdAt).getTime() })
                  }
                }
                for (const c of comments) {
                  items.push({ type: "comment", data: c, time: new Date(c.createdAt).getTime() })
                }
                items.sort((a, b) => a.time - b.time)

                if (items.length === 0) {
                  return <p className="text-xs text-muted-foreground italic text-center py-4">No activity yet</p>
                }

                return items.map((item) => {
                  if (item.type === "activity") {
                    const activity = item.data as ActivityResponse
                    const actionText = getActivityActionText(activity)
                    return (
                      <ActivityItem
                        key={`activity-${activity.id}`}
                        avatar={null}
                        name={activity.user?.name || "Unknown"}
                        action={actionText}
                        timestamp={activity.createdAt}
                        icon={getActivityIcon(activity.action)}
                      />
                    )
                  }
                  const comment = item.data as CommentResponse
                  let contentToRender: string | Record<string, unknown> = comment.content
                  try {
                    const parsed = JSON.parse(comment.content)
                    if (parsed && parsed.type === "doc") {
                      contentToRender = parsed
                    }
                  } catch {
                    // Not JSON, use as plain text
                  }
                  return (
                    <div key={`comment-${comment.id}`} className="group/comment flex gap-2">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={comment.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                          {currentUserId && comment.userId === currentUserId && (
                            <button
                              onClick={() => {
                                const effectiveId = currentTask?.id || task?.id
                                if (effectiveId) {
                                  deleteCommentMutation.mutate({ taskId: effectiveId, commentId: comment.id })
                                }
                              }}
                              className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          {typeof contentToRender === "object" ? (
                            <RichTextEditor
                              content={contentToRender as Record<string, unknown>}
                              onChange={() => {}}
                              editable={false}
                              minHeight="auto"
                              onImageClick={setPreviewImage}
                            />
                          ) : (
                            <MarkdownRenderer content={contentToRender as string} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()
            ) : activityTab === "comments" ? (
              comments.length > 0 ? (
                comments.map((comment) => {
                  let contentToRender: string | Record<string, unknown> = comment.content
                  try {
                    const parsed = JSON.parse(comment.content)
                    if (parsed && parsed.type === "doc") {
                      contentToRender = parsed
                    }
                  } catch {
                    // Not JSON, use as plain text
                  }
                  return (
                    <div key={comment.id} className="group/comment flex gap-2">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={comment.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                          {currentUserId && comment.userId === currentUserId && (
                            <button
                              onClick={() => {
                                const effectiveId = currentTask?.id || task?.id
                                if (effectiveId) {
                                  deleteCommentMutation.mutate({ taskId: effectiveId, commentId: comment.id })
                                }
                              }}
                              className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          {typeof contentToRender === "object" ? (
                            <RichTextEditor
                              content={contentToRender as Record<string, unknown>}
                              onChange={() => {}}
                              editable={false}
                              minHeight="auto"
                              onImageClick={setPreviewImage}
                            />
                          ) : (
                            <MarkdownRenderer content={contentToRender as string} />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">No comments yet</p>
              )
            ) : activityTab === "history" ? (
              currentTask?.activities && currentTask.activities.length > 0 ? (
                [...currentTask.activities].map((activity) => {
                  const actionText = getActivityActionText(activity)
                  return (
                    <ActivityItem
                      key={activity.id}
                      avatar={null}
                      name={activity.user?.name || "Unknown"}
                      action={actionText}
                      timestamp={activity.createdAt}
                      icon={getActivityIcon(activity.action)}
                    />
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4">No activity yet</p>
              )
            ) : null}
          </div>

          {/* Comment Input - Fixed at Bottom */}
          <div className="border-t p-3 bg-background flex-shrink-0">
            <div className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">You</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <RichTextEditor
                  key={`comment-${currentTask?.id || task?.id || "new"}`}
                  content={newComment}
                  onChange={(json) => setNewComment(json)}
                  placeholder="Write a comment... Use @ to mention someone"
                  minHeight="60px"
                  mentions={workspaceMembers.map(m => ({ id: m.id, name: m.name || m.email, email: m.email }))}
                />
                <div className="flex items-center justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment}
                    className="h-7"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Image Preview Dialog */}
    {previewImage && (
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm",
          isFullscreen ? "p-0" : "p-8"
        )}
        onClick={(e) => { if (e.target === e.currentTarget) { setPreviewImage(null); setIsFullscreen(false); } }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setPreviewImage(null); setIsFullscreen(false); }
          if (e.key === "f" || e.key === "F") setIsFullscreen(v => !v);
        }}
        tabIndex={0}
        ref={(el) => { if (el) el.focus(); }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70"
            asChild
          >
            <a href={previewImage} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={() => { setPreviewImage(null); setIsFullscreen(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {previewImage.match(/\.(mp4|webm|mov|avi|mkv)$/i) ? (
          <video
            src={previewImage}
            controls
            autoPlay
            className={cn(
              "rounded-lg shadow-2xl",
              isFullscreen
                ? "max-h-screen max-w-screen object-contain"
                : "max-h-[80vh] max-w-full"
            )}
          />
        ) : (
          <img
            src={previewImage}
            alt="Preview"
            className={cn(
              "rounded-lg shadow-2xl",
              isFullscreen
                ? "max-h-screen max-w-screen object-contain"
                : "max-h-[80vh] max-w-full"
            )}
          />
        )}
      </div>
    )}
    </>
  )
}

// Helper Components

/** Renders a single dependency link with task title lookup */
function DependencyChip({
  taskId,
  variant,
  onRemove,
  onClick,
}: {
  taskId: string
  variant: "blockedBy" | "blocks"
  onRemove: () => void
  onClick: () => void
}) {
  // Use the task query to get the title
  const { data: depTask } = useTask(taskId)

  return (
    <div className="group flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
      <button onClick={onClick} className="flex items-center gap-2 min-w-0 flex-1 text-left">
        {variant === "blockedBy" ? (
          <Lock className="h-3 w-3 text-orange-500 flex-shrink-0" />
        ) : (
          <ExternalLink className="h-3 w-3 text-blue-500 flex-shrink-0" />
        )}
        <span className="text-sm truncate">{depTask?.title ?? `Task ${taskId.slice(0, 8)}…`}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-destructive transition-all flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function PropertyRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-2.5 border-b border-border/30">
      <span className="w-28 text-sm text-muted-foreground flex-shrink-0 flex items-center gap-2">
        {icon}
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ActivityItem({
  avatar,
  name,
  action,
  timestamp,
  icon,
}: {
  avatar: string | null
  name: string
  action: string
  timestamp?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex gap-2">
      {avatar ? (
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarImage src={avatar} />
          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{action}</p>
      </div>
    </div>
  )
}

