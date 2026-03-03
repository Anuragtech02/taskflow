"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DropAnimation,
} from "@dnd-kit/core"
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { TaskCardOverlay } from "@/components/task-card"
import { KanbanColumn } from "@/components/kanban-column"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUpdateTask, useDeleteTask, useCreateTask, useCreateStatus, useUpdateStatus, useDeleteStatus, useReorderStatuses } from "@/hooks/useQueries"
import { useTaskPanel } from "@/store/useTaskPanel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { TaskResponse, StatusResponse } from "@/lib/api"

const PRESET_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
]

export interface KanbanBoardProps {
  tasks: TaskResponse[]
  statuses: StatusResponse[]
  listId: string
  workspaceId?: string
}

/**
 * Map a status name to its normalized slug form.
 * Handles common variations: "To Do" → "todo", "In Progress" → "in_progress", etc.
 */
function normalizeStatusName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_")
  // Handle common variations
  const aliases: Record<string, string> = {
    "to_do": "todo",
    "in_review": "review",
  }
  return aliases[slug] ?? slug
}

// Smooth drop animation config
const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
}

export function KanbanBoard({ tasks, statuses, listId, workspaceId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const createTaskMutation = useCreateTask()
  const createStatusMutation = useCreateStatus()
  const updateStatusMutation = useUpdateStatus()
  const deleteStatusMutation = useDeleteStatus()
  const reorderStatusesMutation = useReorderStatuses()
  const { selectedTaskId, setSelectedTask, isOpen, close } = useTaskPanel()

  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<TaskResponse[]>(tasks)
  const [localStatuses, setLocalStatuses] = useState<StatusResponse[]>(statuses)
  const reorderPendingRef = useRef(false)
  const columnReorderPendingRef = useRef(false)

  // Sync localTasks from props when not pending
  useEffect(() => {
    if (!reorderPendingRef.current) {
      setLocalTasks(tasks)
    }
  }, [tasks])

  // Sync localStatuses from props when not pending
  useEffect(() => {
    if (!columnReorderPendingRef.current) {
      setLocalStatuses(statuses)
    }
  }, [statuses])

  // Add column state
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [newColumnColor, setNewColumnColor] = useState("#6366f1")

  const handleTaskDelete = (taskId: string) => {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task deleted")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to delete task")
      },
    })
  }

  const handleTaskAssign = (taskId: string) => {
    // Open the task detail panel for assignment
    setSelectedTask(taskId)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build a mapping from normalized status name → status object
  const statusMap = useMemo(() => {
    const map: Record<string, StatusResponse> = {}
    localStatuses.forEach((s) => {
      map[normalizeStatusName(s.name)] = s
    })
    return map
  }, [localStatuses])

  // Group tasks by their status column (using localTasks for optimistic updates)
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, TaskResponse[]> = {}
    localStatuses.forEach((status) => {
      const normalizedName = normalizeStatusName(status.name)
      grouped[status.id] = localTasks
        .filter((task) => {
          const taskStatus = task.status || "todo"
          return taskStatus === normalizedName
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    })
    return grouped
  }, [localTasks, localStatuses])

  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null)
  const [activeColumn, setActiveColumn] = useState<StatusResponse | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    // Check if dragging a column (prefixed with "column-")
    if (activeId.startsWith("column-")) {
      const statusId = activeId.replace("column-", "")
      const col = localStatuses.find((s) => s.id === statusId)
      if (col) {
        setActiveColumn(col)
        return
      }
    }

    // Otherwise dragging a task
    const task = localTasks.find((t) => t.id === activeId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Skip column-level highlights when dragging a column
    if (activeColumn) return

    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }

    const overId = over.id as string

    // Check if hovering over a column directly
    const overStatus = localStatuses.find((s) => s.id === overId)
    if (overStatus) {
      setOverColumnId(overStatus.id)
      return
    }

    // Check if hovering over a task — find which column that task belongs to
    const overTask = localTasks.find((t) => t.id === overId)
    if (overTask) {
      const taskStatus = overTask.status || "todo"
      const column = localStatuses.find((s) => normalizeStatusName(s.name) === taskStatus)
      if (column) {
        setOverColumnId(column.id)
        return
      }
    }

    setOverColumnId(null)
  }

  // Find which status column a task belongs to
  const findColumnForTask = (taskStatus: string | null): StatusResponse | undefined => {
    const normalized = taskStatus || "todo"
    return statusMap[normalized]
  }

  // Optimistically update task in local state
  const optimisticMoveTask = useCallback((
    taskId: string,
    newStatus: string,
    newOrder: number,
    overTaskId?: string
  ) => {
    setLocalTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t.id === taskId)
      if (taskIndex === -1) return prev

      const task = { ...prev[taskIndex], status: newStatus, order: newOrder }
      const newTasks = [...prev]
      newTasks[taskIndex] = task

      // If moving to a different column and we know the target position
      if (overTaskId) {
        const overColumnTasks = newTasks
          .filter((t) => t.status === newStatus)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

        const overIndex = overColumnTasks.findIndex((t) => t.id === overTaskId)
        if (overIndex !== -1) {
          // Reorder tasks in the destination column
          const otherTasks = newTasks.filter((t) => t.status !== newStatus || t.id === taskId)
          const destTasks = newTasks
            .filter((t) => t.status === newStatus && t.id !== taskId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

          destTasks.splice(overIndex, 0, task)
          destTasks.forEach((t, idx) => {
            const origIdx = newTasks.findIndex((nt) => nt.id === t.id)
            if (origIdx !== -1) {
              newTasks[origIdx] = { ...newTasks[origIdx], order: idx }
            }
          })

          return [...otherTasks, ...destTasks]
        }
      }

      return newTasks
    })
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const wasColumnDrag = !!activeColumn
    setActiveTask(null)
    setActiveColumn(null)
    setOverColumnId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle column reorder
    if (wasColumnDrag && activeId.startsWith("column-") && overId.startsWith("column-")) {
      const activeStatusId = activeId.replace("column-", "")
      const overStatusId = overId.replace("column-", "")
      if (activeStatusId === overStatusId) return

      const oldIndex = localStatuses.findIndex((s) => s.id === activeStatusId)
      const newIndex = localStatuses.findIndex((s) => s.id === overStatusId)
      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(localStatuses, oldIndex, newIndex)

      // Optimistic update
      columnReorderPendingRef.current = true
      setLocalStatuses(newOrder)

      // Only call API for real (non-default) statuses
      const realStatusIds = newOrder.filter((s) => !s.id.startsWith("default-")).map((s) => s.id)
      if (realStatusIds.length > 0) {
        reorderStatusesMutation.mutate({ listId, statusIds: realStatusIds }, {
          onSuccess: () => {
            columnReorderPendingRef.current = false
            toast.success("Columns reordered")
          },
          onError: () => {
            columnReorderPendingRef.current = false
            setLocalStatuses(statuses)
            toast.error("Failed to reorder columns")
          },
        })
      } else {
        columnReorderPendingRef.current = false
      }
      return
    }

    const draggedTask = localTasks.find((t) => t.id === activeId)
    if (!draggedTask) return

    // Check if dropped on a column (empty area)
    const overStatus = localStatuses.find((s) => s.id === overId)
    if (overStatus) {
      const currentColumn = findColumnForTask(draggedTask.status)
      if (currentColumn?.id !== overStatus.id) {
        // Moving to a new column — update the task's status to the normalized name
        const newStatusValue = normalizeStatusName(overStatus.name)
        const statusTasks = tasksByColumn[overStatus.id] || []
        const newOrder = statusTasks.length > 0
          ? Math.max(...statusTasks.map(t => t.order ?? 0)) + 1
          : 0

        // Optimistic update
        reorderPendingRef.current = true
        optimisticMoveTask(activeId, newStatusValue, newOrder)

        updateTaskMutation.mutate({
          taskId: activeId,
          status: newStatusValue,
          order: newOrder,
        }, {
          onSuccess: () => {
            reorderPendingRef.current = false
            queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
          },
          onError: () => {
            reorderPendingRef.current = false
            // Revert on error by refetching
            queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
          }
        })
      }
      return
    }

    // Check if dropped on another task
    const overTask = localTasks.find((t) => t.id === overId)
    if (overTask) {
      const activeColumn = findColumnForTask(draggedTask.status)
      const overColumn = findColumnForTask(overTask.status)

      if (!activeColumn || !overColumn) return

      if (activeColumn.id === overColumn.id) {
        // Same column reorder
        const columnTasks = [...(tasksByColumn[activeColumn.id] || [])]
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex)

          // Optimistic update
          reorderPendingRef.current = true
          setLocalTasks((prev) => {
            const newTasks = [...prev]
            reordered.forEach((task, index) => {
              const idx = newTasks.findIndex((t) => t.id === task.id)
              if (idx !== -1) {
                newTasks[idx] = { ...newTasks[idx], order: index }
              }
            })
            return newTasks
          })

          // Update order for all affected tasks
          reordered.forEach((task, index) => {
            if (task.order !== index) {
              updateTaskMutation.mutate({
                taskId: task.id,
                order: index,
              })
            }
          })

          // Clear pending after all mutations are sent
          setTimeout(() => {
            reorderPendingRef.current = false
            queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
          }, 100)
        }
      } else {
        // Moving to different column
        const newStatusValue = normalizeStatusName(overColumn.name)
        const overColumnTasks = [...(tasksByColumn[overColumn.id] || [])]
        const newIndex = overColumnTasks.findIndex((t) => t.id === overId)
        const newOrder = newIndex >= 0 ? newIndex : overColumnTasks.length

        // Optimistic update
        reorderPendingRef.current = true
        optimisticMoveTask(activeId, newStatusValue, newOrder, overId)

        updateTaskMutation.mutate({
          taskId: activeId,
          status: newStatusValue,
          order: newOrder,
        }, {
          onSuccess: () => {
            reorderPendingRef.current = false
            queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
          },
          onError: () => {
            reorderPendingRef.current = false
            queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
          }
        })
      }
    }
  }

  // Add column handlers
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return
    
    createStatusMutation.mutate({
      listId,
      name: newColumnName.trim(),
      color: newColumnColor,
    }, {
      onSuccess: () => {
        toast.success("Column added")
        setShowAddColumn(false)
        setNewColumnName("")
        setNewColumnColor("#6366f1")
      },
      onError: () => {
        toast.error("Failed to add column")
      },
    })
  }

  // Column action handlers
  const handleStatusRename = (statusId: string, newName: string) => {
    if (statusId.startsWith("default-")) {
      toast.error("Default columns cannot be renamed. Create a custom status instead.")
      return
    }
    updateStatusMutation.mutate({
      listId,
      statusId,
      name: newName,
    }, {
      onSuccess: () => {
        toast.success("Column renamed")
      },
      onError: () => {
        toast.error("Failed to rename column")
      },
    })
  }

  const handleStatusColorChange = (statusId: string, color: string) => {
    if (statusId.startsWith("default-")) {
      toast.error("Default columns cannot be customized. Create a custom status instead.")
      return
    }
    updateStatusMutation.mutate({
      listId,
      statusId,
      color,
    }, {
      onSuccess: () => {
        toast.success("Color updated")
      },
      onError: () => {
        toast.error("Failed to update color")
      },
    })
  }

  const handleStatusDelete = (statusId: string) => {
    if (statusId.startsWith("default-")) {
      toast.error("Default columns cannot be deleted. Create custom statuses to customize your workflow.")
      return
    }
    deleteStatusMutation.mutate({
      listId,
      statusId,
    }, {
      onSuccess: () => {
        toast.success("Column deleted")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to delete column")
      },
    })
  }

  const handleMoveColumn = (statusId: string, direction: "left" | "right") => {
    const currentIndex = localStatuses.findIndex(s => s.id === statusId)
    if (currentIndex === -1) return

    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= localStatuses.length) return

    const newOrder = [...localStatuses]
    const [moved] = newOrder.splice(currentIndex, 1)
    newOrder.splice(newIndex, 0, moved)

    // Optimistic update
    columnReorderPendingRef.current = true
    setLocalStatuses(newOrder)

    // Only send real (non-default) status IDs to the API
    const realStatusIds = newOrder.filter((s) => !s.id.startsWith("default-")).map((s) => s.id)
    if (realStatusIds.length > 0) {
      reorderStatusesMutation.mutate({
        listId,
        statusIds: realStatusIds,
      }, {
        onSuccess: () => {
          columnReorderPendingRef.current = false
          toast.success("Column moved")
        },
        onError: () => {
          columnReorderPendingRef.current = false
          setLocalStatuses(statuses)
          toast.error("Failed to move column")
        },
      })
    } else {
      // Only default statuses — reorder is local only
      columnReorderPendingRef.current = false
    }
  }

  // Quick add task handler
  const handleQuickAddTask = (statusId: string, title: string) => {
    if (!title.trim()) return
    
    const status = localStatuses.find(s => s.id === statusId)
    if (!status) return
    
    createTaskMutation.mutate({
      listId,
      title: title.trim(),
      status: normalizeStatusName(status.name),
    }, {
      onSuccess: () => {
        toast.success("Task created")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to create task")
      },
    })
  }

  const selectedTask = selectedTaskId ? localTasks.find((t) => t.id === selectedTaskId) : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto h-full">
          <SortableContext items={localStatuses.map((s) => `column-${s.id}`)} strategy={horizontalListSortingStrategy}>
            {localStatuses.map((status, index) => {
              const columnTasks = tasksByColumn[status.id] || []
              return (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={columnTasks}
                  onTaskClick={(taskId) => setSelectedTask(taskId)}
                  onTaskDelete={handleTaskDelete}
                  onTaskAssign={handleTaskAssign}
                  onQuickAdd={(title) => handleQuickAddTask(status.id, title)}
                  onStatusRename={handleStatusRename}
                  onStatusColorChange={handleStatusColorChange}
                  onStatusDelete={handleStatusDelete}
                  onMoveLeft={(statusId) => handleMoveColumn(statusId, "left")}
                  onMoveRight={(statusId) => handleMoveColumn(statusId, "right")}
                  canMoveLeft={index > 0}
                  canMoveRight={index < localStatuses.length - 1}
                  isDragOver={overColumnId === status.id}
                  isDragging={!!activeTask}
                />
              )
            })}
          </SortableContext>

          {/* Add Column Button */}
          <div className="flex-shrink-0">
            {showAddColumn ? (
              <div className="w-80 min-w-[320px] bg-muted/30 rounded-lg p-4 space-y-3 border">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn()
                    if (e.key === "Escape") {
                      setShowAddColumn(false)
                      setNewColumnName("")
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform hover:scale-110",
                          newColumnColor === color.value && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setNewColumnColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleAddColumn}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowAddColumn(false)
                    setNewColumnName("")
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-80 min-w-[320px] h-12 justify-start text-muted-foreground hover:text-foreground border-2 border-dashed border-border/50"
                onClick={() => setShowAddColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={activeColumn ? undefined : dropAnimation}>
          {activeTask && <TaskCardOverlay task={activeTask} />}
          {activeColumn && (
            <div className="w-80 min-w-[320px] bg-muted/50 rounded-lg border-2 border-primary/50 shadow-2xl p-4 opacity-90">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeColumn.color || "#6366f1" }} />
                <span className="text-sm font-semibold">{activeColumn.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailPanel
        task={selectedTask}
        open={isOpen}
        onClose={close}
        statuses={localStatuses}
      />
    </>
  )
}
