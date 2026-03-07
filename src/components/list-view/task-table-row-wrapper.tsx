"use client"

import { TaskTableRow } from "./task-table-row"
import type { TaskResponse, TaskAssigneeResponse, LabelResponse, WorkspaceSpaceWithLists } from "@/lib/api"

interface TaskTableRowWrapperProps {
  task: TaskResponse
  isSelected: boolean
  onSelect: (taskId: string, selected: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  onClick?: (taskId: string) => void
  workspaceId?: string
  workspaceMembers?: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  onPriorityChange?: (taskId: string, priority: string) => void
  onDueDateChange?: (taskId: string, date: string | undefined) => void
  onAssigneeAdd?: (taskId: string, userId: string) => void
  onAssigneeRemove?: (taskId: string, userId: string) => void
  onRename?: (taskId: string, newTitle: string) => void
  onAddSubtask?: (parentTaskId: string) => void
  onLabelAdd?: (taskId: string, labelId: string) => void
  onLabelRemove?: (taskId: string, labelId: string) => void
  availableLabels?: { id: string; name: string; color: string }[]
  // Bulk data from parent (avoids per-row API calls)
  bulkAssignees?: Record<string, TaskAssigneeResponse[]>
  bulkLabels?: Record<string, LabelResponse[]>
  // New props for nested tasks
  depth?: number
  hasChildren?: boolean
  childCount?: number
  isExpanded?: boolean
  onToggleExpand?: (taskId: string) => void
  // Available statuses for the dropdown
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

export function TaskTableRowWrapper({ bulkAssignees, bulkLabels, ...props }: TaskTableRowWrapperProps) {
  const taskAssignees = bulkAssignees?.[props.task.id] || []
  const taskLabels = bulkLabels?.[props.task.id] || []

  // Transform TaskAssigneeResponse to the format expected by TaskTableRow's assignees prop
  const assignees = taskAssignees.map((ta) => ({
    userId: ta.userId,
    user: {
      name: ta.user.name || ta.user.email,
      avatarUrl: ta.user.avatarUrl || undefined,
    },
  }))

  // Transform labels to the format expected by TaskTableRow's tags prop
  const tags = taskLabels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
  }))

  return <TaskTableRow {...props} assignees={assignees} tags={tags} />
}
