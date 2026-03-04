"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTaskDependencies } from "@/hooks/useQueries"
import type { TaskResponse, WorkspaceSpaceWithLists } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar as CalendarIcon, Plus, ChevronRight, ChevronDown, Pencil, ListPlus, Link2, Lock, Check, Trash2, ArrowRightLeft, ExternalLink, Circle, Flag, List as ListIcon } from "lucide-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export interface TaskTableRowProps {
  task: TaskResponse
  isSelected: boolean
  onSelect: (taskId: string, selected: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  onClick?: (taskId: string) => void
  assignees?: { userId: string; user: { name: string; avatarUrl?: string } }[]
  listName?: string
  tags?: { id: string; name: string; color: string }[]
  workspaceId?: string
  workspaceMembers?: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  taskAssignees?: { userId: string; user: { id: string; name: string | null; email: string; avatarUrl: string | null } }[]
  onPriorityChange?: (taskId: string, priority: string) => void
  onDueDateChange?: (taskId: string, date: string | undefined) => void
  onAssigneeAdd?: (taskId: string, userId: string) => void
  onAssigneeRemove?: (taskId: string, userId: string) => void
  onRename?: (taskId: string, newTitle: string) => void
  onAddSubtask?: (parentTaskId: string) => void
  onLabelAdd?: (taskId: string, labelId: string) => void
  onLabelRemove?: (taskId: string, labelId: string) => void
  availableLabels?: { id: string; name: string; color: string }[]
  // New props for nested tasks
  depth?: number
  hasChildren?: boolean
  childCount?: number
  isExpanded?: boolean
  onToggleExpand?: (taskId: string) => void
  // Available statuses for the dropdown (custom or default)
  availableStatuses?: { value: string; label: string; color: string }[]
  // Move to list callback + data
  onMoveToList?: (taskId: string, listId: string) => void
  workspaceLists?: WorkspaceSpaceWithLists[]
  // Delete callback
  onDelete?: (taskId: string) => void
  // Resizable column widths
  columnWidths?: {
    status?: number
    priority?: number
    dueDate?: number
    assignee?: number
    list?: number
    tags?: number
    created?: number
    updated?: number
  }
}

const MAX_NESTING_DEPTH = 3

const STATUS_ORDER = ["todo", "in_progress", "review", "done"]

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

export function TaskTableRow({
  task,
  isSelected,
  onSelect,
  onStatusChange,
  onClick,
  assignees = [],
  listName,
  tags = [],
  workspaceId,
  workspaceMembers = [],
  taskAssignees = [],
  onPriorityChange,
  onDueDateChange,
  onAssigneeAdd,
  onAssigneeRemove,
  onRename,
  onAddSubtask,
  onLabelAdd,
  onLabelRemove,
  availableLabels = [],
  depth = 0,
  hasChildren = false,
  childCount = 0,
  isExpanded = false,
  onToggleExpand,
  availableStatuses,
  onMoveToList,
  workspaceLists,
  onDelete,
  columnWidths,
}: TaskTableRowProps) {
  const status = task.status || "todo"
  const priority = task.priority || "none"
  const canHaveChildren = (depth || 0) < MAX_NESTING_DEPTH
  const [assigneeSearch, setAssigneeSearch] = React.useState("")
  const [labelSearch, setLabelSearch] = React.useState("")
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(task.title)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { data: deps } = useTaskDependencies(task.id)
  const isBlocked = (deps?.blockedBy?.length ?? 0) > 0
  const hasDeps = isBlocked || (deps?.blocks?.length ?? 0) > 0
  const workspaceListsData = workspaceLists ?? []

  // Resolve the matched custom status for display (no fallback to [0] — show actual status if unmatched)
  const hasCustomStatuses = availableStatuses && availableStatuses.length > 0
  const matchedStatus = hasCustomStatuses
    ? (availableStatuses.find(s => s.value === status) ?? null)
    : null

  const cycleStatus = () => {
    if (hasCustomStatuses) {
      const values = availableStatuses.map(s => s.value)
      const currentIndex = values.indexOf(status)
      const nextStatus = values[(currentIndex + 1) % values.length]
      onStatusChange(task.id, nextStatus)
    } else {
      const currentIndex = STATUS_ORDER.indexOf(status)
      const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
      onStatusChange(task.id, nextStatus)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  // Filter workspace members based on search
  const filteredMembers = workspaceMembers.filter(
    (member) =>
      member.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  // Check if a member is assigned to this task
  const isMemberAssigned = (memberId: string) =>
    taskAssignees.some((a) => a.userId === memberId)

  // Check if a label is assigned to this task
  const isLabelAssigned = (labelId: string) =>
    tags.some((t) => t.id === labelId)

  // Filter available labels based on search
  const filteredLabels = availableLabels.filter(
    (label) => label.name.toLowerCase().includes(labelSearch.toLowerCase())
  )

  // Handle date change
  const handleDateSelect = (date: Date | undefined) => {
    if (onDueDateChange) {
      onDueDateChange(task.id, date ? date.toISOString() : undefined)
    }
  }

  const dueDate = task.dueDate ? new Date(task.dueDate) : undefined

  // Calculate indentation — spacer width (depth 0 = 8px, depth 1 = 32px, etc.)
  const indentWidth = depth * 28 + 8

  // Status/priority items for context menu
  const contextStatuses = hasCustomStatuses ? availableStatuses : [
    { value: "todo", label: "To Do", color: STATUS_COLORS.todo },
    { value: "in_progress", label: "In Progress", color: STATUS_COLORS.in_progress },
    { value: "review", label: "Review", color: STATUS_COLORS.review },
    { value: "done", label: "Done", color: STATUS_COLORS.done },
  ]

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/30 transition-colors group",
        isSelected && "bg-accent/50",
        depth > 0 && "bg-muted/20"
      )}
    >
      {/* Indentation spacer — pushes all content including columns */}
      <div style={{ width: `${indentWidth}px` }} className="flex-shrink-0" />

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(task.id, !!checked)}
        className="flex-shrink-0"
      />

      {/* Expand/collapse button for tasks with children (only if can have subtasks) */}
      {hasChildren && canHaveChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand?.(task.id)
          }}
          className="flex-shrink-0 p-0.5 hover:bg-accent rounded transition-colors"
          title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      ) : (
        <div className="w-5 flex-shrink-0" />
      )}

      {/* Status button */}
      <button
        onClick={cycleStatus}
        className="flex-shrink-0 hover:scale-110 transition-transform"
        title={`Status: ${status}`}
      >
        <div
          className="w-4 h-4 rounded-full border-2"
          style={{
            borderColor: matchedStatus?.color || STATUS_COLORS[status] || STATUS_COLORS.todo,
            backgroundColor: (status === "done" || status === "closed" || status === "completed")
              ? (matchedStatus?.color || STATUS_COLORS.done)
              : "transparent",
          }}
        />
      </button>

      {/* Name */}
      <div className="flex-1 min-w-[200px] flex items-center gap-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim() && editTitle !== task.title) {
                onRename?.(task.id, editTitle.trim())
              } else {
                setEditTitle(task.title)
              }
              setIsEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editTitle.trim() && editTitle !== task.title) {
                  onRename?.(task.id, editTitle.trim())
                }
                setIsEditing(false)
              }
              if (e.key === "Escape") {
                setEditTitle(task.title)
                setIsEditing(false)
              }
            }}
            className="h-7 text-sm px-1 py-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => onClick?.(task.id)}
            className={cn(
              "text-sm truncate block text-left hover:text-primary hover:underline transition-colors cursor-pointer",
              status === "done" && "line-through text-muted-foreground",
              isBlocked && "opacity-60"
            )}
          >
            {task.title}
          </button>
        )}
        {/* Dependency indicator */}
        {isBlocked && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="h-3 w-3 text-orange-500 flex-shrink-0 ml-1" />
              </TooltipTrigger>
              <TooltipContent><p>Blocked by {deps!.blockedBy.length} task{deps!.blockedBy.length !== 1 ? "s" : ""}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {hasDeps && !isBlocked && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link2 className="h-3 w-3 text-blue-500 flex-shrink-0 ml-1" />
              </TooltipTrigger>
              <TooltipContent><p>Has dependencies</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {/* Subtask count badge */}
        {hasChildren && !isEditing && canHaveChildren && (
          <Badge variant="secondary" className="text-[10px] ml-1 h-5 px-1.5">
            {childCount}
          </Badge>
        )}

        {/* Hover action buttons */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditTitle(task.title)
                setIsEditing(true)
              }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Rename task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onAddSubtask && canHaveChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSubtask(task.id)
                }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Add subtask"
              >
                <ListPlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0" style={{ width: `${columnWidths?.status ?? 112}px` }}>
        {onStatusChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-start cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                {matchedStatus ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border" style={{
                    backgroundColor: `${matchedStatus.color}20`,
                    borderColor: `${matchedStatus.color}30`,
                    color: matchedStatus.color,
                  }}>
                    {matchedStatus.label}
                  </span>
                ) : (
                  <StatusBadge variant="status" status={status as "todo" | "in_progress" | "review" | "done" | null} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(hasCustomStatuses ? availableStatuses : [
                { value: "todo", label: "To Do", color: STATUS_COLORS.todo },
                { value: "in_progress", label: "In Progress", color: STATUS_COLORS.in_progress },
                { value: "review", label: "Review", color: STATUS_COLORS.review },
                { value: "done", label: "Done", color: STATUS_COLORS.done },
              ]).map((s) => (
                <DropdownMenuItem key={s.value} onClick={() => onStatusChange(task.id, s.value)}>
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          matchedStatus ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border" style={{
              backgroundColor: `${matchedStatus.color}20`,
              borderColor: `${matchedStatus.color}30`,
              color: matchedStatus.color,
            }}>
              {matchedStatus.label}
            </span>
          ) : (
            <StatusBadge variant="status" status={status as "todo" | "in_progress" | "review" | "done" | null} />
          )
        )}
      </div>

      {/* Priority */}
      <div className="flex-shrink-0" style={{ width: `${columnWidths?.priority ?? 96}px` }}>
        {onPriorityChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-start cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                {priority !== "none" && (
                  <StatusBadge
                    variant="priority"
                    priority={priority as "low" | "medium" | "high" | "urgent"}
                  />
                )}
                {priority === "none" && (
                  <span className="text-xs text-muted-foreground">Set</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "urgent")}>
                🔴 Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "high")}>
                🟠 High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "medium")}>
                🔵 Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "low")}>
                ⚪ Low
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "none")}>
                None
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          priority !== "none" && (
            <StatusBadge
              variant="priority"
              priority={priority as "low" | "medium" | "high" | "urgent"}
            />
          )
        )}
      </div>

      {/* Due Date */}
      {onDueDateChange ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex-shrink-0 text-xs flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5",
                isOverdue && "text-red-500 font-medium"
              )}
              style={{ width: `${columnWidths?.dueDate ?? 96}px` }}
            >
              {task.dueDate ? (
                <>
                  <CalendarIcon className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </>
              ) : (
                <span className="text-muted-foreground">Set date</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div
          className={cn(
            "flex-shrink-0 text-xs flex items-center gap-1",
            isOverdue && "text-red-500 font-medium"
          )}
          style={{ width: `${columnWidths?.dueDate ?? 96}px` }}
        >
          {task.dueDate ? (
            <>
              <CalendarIcon className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )}

      {/* Assignee */}
      {onAssigneeAdd && onAssigneeRemove ? (
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex-shrink-0 flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5" style={{ width: `${columnWidths?.assignee ?? 96}px` }}>
              {assignees.length > 0 ? (
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((a) => (
                    <Avatar key={a.userId} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={a.user.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {a.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search members..."
                value={assigneeSearch}
                onValueChange={setAssigneeSearch}
              />
              <CommandList>
                <CommandEmpty>No members found.</CommandEmpty>
                <CommandGroup>
                  {filteredMembers.map((member) => {
                    const isAssigned = isMemberAssigned(member.id)
                    return (
                      <CommandItem
                        key={member.id}
                        value={member.name || member.email}
                        onSelect={() => {
                          if (isAssigned) {
                            onAssigneeRemove(task.id, member.id)
                          } else {
                            onAssigneeAdd(task.id, member.id)
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">
                          {member.name || member.email}
                        </span>
                        {isAssigned && (
                          <span className="text-green-500">✓</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-1" style={{ width: `${columnWidths?.assignee ?? 96}px` }}>
          {assignees.length > 0 ? (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((a) => (
                <Avatar key={a.userId} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={a.user.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {a.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-shrink-0 text-xs text-muted-foreground truncate" style={{ width: `${columnWidths?.list ?? 96}px` }} title={listName}>
        {listName || "-"}
      </div>

      {/* Tags */}
      {onLabelAdd && onLabelRemove ? (
        <Popover onOpenChange={(open) => { if (!open) setLabelSearch("") }}>
          <PopoverTrigger asChild>
            <button className="flex-shrink-0 flex flex-wrap gap-1 items-center cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5" style={{ width: `${columnWidths?.tags ?? 96}px` }}>
              {tags.length > 0 ? (
                <>
                  {tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-1.5 py-0.5 rounded text-[10px] text-white truncate"
                      style={{ backgroundColor: tag.color }}
                      title={tag.name}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
                  )}
                </>
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search labels..."
                value={labelSearch}
                onValueChange={setLabelSearch}
              />
              <CommandList>
                <CommandEmpty>No labels found.</CommandEmpty>
                <CommandGroup>
                  {filteredLabels.map((label) => {
                    const assigned = isLabelAssigned(label.id)
                    return (
                      <CommandItem
                        key={label.id}
                        value={label.name}
                        onSelect={() => {
                          if (assigned) {
                            onLabelRemove(task.id, label.id)
                          } else {
                            onLabelAdd(task.id, label.id)
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 truncate">{label.name}</span>
                        {assigned && (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex-shrink-0 flex flex-wrap gap-1" style={{ width: `${columnWidths?.tags ?? 96}px` }}>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 rounded text-[10px] text-white truncate"
              style={{ backgroundColor: tag.color }}
              title={tag.name}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Created */}
      <div className="flex-shrink-0 text-xs text-muted-foreground" style={{ width: `${columnWidths?.created ?? 80}px` }}>
        {formatDate(task.createdAt)}
      </div>

      {/* Updated */}
      <div className="flex-shrink-0 text-xs text-muted-foreground" style={{ width: `${columnWidths?.updated ?? 80}px` }}>
        {formatDate(task.updatedAt)}
      </div>
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onClick?.(task.id)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          setEditTitle(task.title)
          setIsEditing(true)
        }}>
          <Pencil className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />

        {/* Set Status submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Circle className="h-4 w-4 mr-2" />
            Set Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {contextStatuses.map((s) => (
              <ContextMenuItem key={s.value} onClick={() => onStatusChange(task.id, s.value)}>
                <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                {s.label}
                {s.value === status && <Check className="h-4 w-4 ml-auto" />}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Set Priority submenu */}
        {onPriorityChange && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Flag className="h-4 w-4 mr-2" />
              Set Priority
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {[
                { value: "urgent", label: "Urgent" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
                { value: "none", label: "None" },
              ].map((p) => (
                <ContextMenuItem key={p.value} onClick={() => onPriorityChange(task.id, p.value)}>
                  {p.label}
                  {p.value === priority && <Check className="h-4 w-4 ml-auto" />}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Move to List submenu */}
        {onMoveToList && workspaceListsData.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Move to List
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56 max-h-80 overflow-y-auto">
                {workspaceListsData.map((space) => (
                  <React.Fragment key={space.id}>
                    {space.lists.map((list) => (
                      <ContextMenuItem
                        key={list.id}
                        disabled={list.id === task.listId}
                        onClick={() => onMoveToList(task.id, list.id)}
                      >
                        <ListIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="truncate">{space.name} / {list.name}</span>
                        {list.id === task.listId && <Check className="h-4 w-4 ml-auto" />}
                      </ContextMenuItem>
                    ))}
                    {space.folders.map((folder) =>
                      folder.lists.map((list) => (
                        <ContextMenuItem
                          key={list.id}
                          disabled={list.id === task.listId}
                          onClick={() => onMoveToList(task.id, list.id)}
                        >
                          <ListIcon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                          <span className="truncate">{space.name} / {folder.name} / {list.name}</span>
                          {list.id === task.listId && <Check className="h-4 w-4 ml-auto" />}
                        </ContextMenuItem>
                      ))
                    )}
                  </React.Fragment>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Delete */}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export { STATUS_ORDER, STATUS_COLORS, PRIORITY_ORDER }
