"use client"

import { TaskTableRow } from "./task-table-row"
import { useTaskAssignees, useTaskLabels } from "@/hooks/useQueries"
import type { TaskResponse } from "@/lib/api"

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
  // New props for nested tasks
  depth?: number
  hasChildren?: boolean
  childCount?: number
  isExpanded?: boolean
  onToggleExpand?: (taskId: string) => void
  // Available statuses for the dropdown
  availableStatuses?: { value: string; label: string; color: string }[]
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

export function TaskTableRowWrapper(props: TaskTableRowWrapperProps) {
  const { data: taskAssignees = [] } = useTaskAssignees(props.task.id)
  const { data: taskLabels = [] } = useTaskLabels(props.task.id)

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
