import { useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/axios"
import {
  fetchWorkspaces,
  createWorkspace,
  fetchSpaces,
  fetchSpace,
  createSpace,
  updateSpace,
  deleteSpace,
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  fetchFolderLists,
  fetchSpaceLists,
  fetchList,
  createList,
  updateList,
  deleteList,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses,
  fetchSprints,
  fetchSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  moveTaskBetweenSprints,
  fetchSprintRetro,
  createRetroItem,
  deleteRetroItem,
  convertRetroItemToTask,
  fetchSprintAnalysis,
  generateSprintAnalysis,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchDashboardStats,
  fetchWorkspaceMembers,
  fetchTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
  fetchSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  fetchComments,
  createComment,
  deleteComment,
  fetchTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
  searchWorkspaceTasks,
  fetchCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  fetchTaskSprint,
  assignTaskToSprint,
  removeTaskFromAllSprints,
  fetchLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  fetchTaskLabels,
  addTaskLabel,
  removeTaskLabel,
  fetchTaskReminders,
  createTaskReminder,
  deleteTaskReminder,
  fetchWorkspaceLists,
  type WorkspaceSpaceWithLists,
  type WorkspaceResponse,
  type SpaceResponse,
  type FolderResponse,
  type ListResponse,
  type TaskResponse,
  type StatusResponse,
  type SprintResponse,
  type SprintDetailResponse,
  type DashboardStats,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  type WorkspaceMemberResponse,
  type TaskAssigneeResponse,
  type SubtaskResponse,
  type CommentResponse,
  type CustomFieldDefinitionResponse,
  type TaskSprintResponse,
  type LabelResponse,
  type ReminderResponse,
  fetchGoals,
  fetchGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchKeyResults,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  type GoalResponse,
  type KeyResultResponse,
} from "@/lib/api"

// ── Workspace Hooks ─────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery<WorkspaceResponse[]>({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; slug: string; logoUrl?: string }) =>
      createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

// ── Space Hooks ─────────────────────────────────────────────────────────────

export function useSpaces(workspaceId: string | undefined) {
  return useQuery<SpaceResponse[]>({
    queryKey: ["spaces", workspaceId],
    queryFn: () => fetchSpaces(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSpace(spaceId: string | undefined) {
  return useQuery<SpaceResponse>({
    queryKey: ["space", spaceId],
    queryFn: () => fetchSpace(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      ...data
    }: {
      workspaceId: string
      name: string
      color?: string
      icon?: string
      description?: string
    }) => createSpace(workspaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.workspaceId] })
    },
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      spaceId,
      ...data
    }: {
      spaceId: string
      name?: string
      color?: string
      icon?: string
    }) => updateSpace(spaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      queryClient.invalidateQueries({ queryKey: ["space", variables.spaceId] })
    },
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (spaceId: string) => deleteSpace(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
      queryClient.invalidateQueries({ queryKey: ["space"] })
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      queryClient.invalidateQueries({ queryKey: ["list"] })
    },
  })
}

// ── Folder Hooks ────────────────────────────────────────────────────────────

export function useFolders(spaceId: string | undefined) {
  return useQuery<FolderResponse[]>({
    queryKey: ["folders", spaceId],
    queryFn: () => fetchFolders(spaceId!),
    enabled: !!spaceId,
  })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      spaceId,
      ...data
    }: {
      spaceId: string
      name: string
    }) => createFolder(spaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["folders", variables.spaceId] })
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      folderId,
      ...data
    }: {
      folderId: string
      name?: string
    }) => updateFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] })
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      queryClient.invalidateQueries({ queryKey: ["list"] })
    },
  })
}

// ── List Hooks ──────────────────────────────────────────────────────────────

export function useFolderLists(folderId: string | undefined) {
  return useQuery<ListResponse[]>({
    queryKey: ["lists", "folder", folderId],
    queryFn: () => fetchFolderLists(folderId!),
    enabled: !!folderId,
  })
}

export function useSpaceLists(spaceId: string | undefined) {
  return useQuery<ListResponse[]>({
    queryKey: ["lists", "space", spaceId],
    queryFn: () => fetchSpaceLists(spaceId!),
    enabled: !!spaceId,
  })
}

export function useList(listId: string | undefined) {
  return useQuery<ListResponse>({
    queryKey: ["list", listId],
    queryFn: () => fetchList(listId!),
    enabled: !!listId,
  })
}

export function useCreateList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      folderId,
      ...data
    }: {
      folderId: string
      name: string
      spaceId: string
    }) => createList(folderId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists", "folder", variables.folderId] })
      queryClient.invalidateQueries({ queryKey: ["lists", "space", variables.spaceId] })
    },
  })
}

export function useUpdateList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      name?: string
    }) => updateList(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      queryClient.invalidateQueries({ queryKey: ["list", variables.listId] })
    },
  })
}

export function useDeleteList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (listId: string) => deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] })
      queryClient.invalidateQueries({ queryKey: ["list"] })
    },
  })
}

// ── Workspace Lists Hook ────────────────────────────────────────────────────

export function useWorkspaceLists(workspaceId: string | undefined) {
  return useQuery<WorkspaceSpaceWithLists[]>({
    queryKey: ["workspace-lists", workspaceId],
    queryFn: () => fetchWorkspaceLists(workspaceId!),
    enabled: !!workspaceId,
  })
}

// ── Task Hooks ──────────────────────────────────────────────────────────────

export function useTasks(listId: string | undefined, includeClosed = false) {
  return useQuery<{ tasks: TaskResponse[]; closedCount: number }>({
    queryKey: ["tasks", listId, { includeClosed }],
    queryFn: () => fetchTasks(listId!, includeClosed),
    enabled: !!listId,
  })
}

export function useTask(taskId: string | undefined) {
  return useQuery<TaskResponse>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`)
      const data = res.data
      return data.task || data
    },
    enabled: !!taskId,
    staleTime: 0,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      title: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
      parentTaskId?: string
    }) => createTask(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.listId] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string
      title?: string
      description?: string | Record<string, unknown>
      status?: string
      priority?: string
      dueDate?: string | null
      startDate?: string | null
      timeEstimate?: number
      order?: number
      customFields?: Record<string, unknown>
      listId?: string
      parentTaskId?: string | null
    }) => updateTask(taskId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

// ── Status Hooks ───────────────────────────────────────────────────────────

export function useStatuses(listId: string | undefined) {
  return useQuery<StatusResponse[]>({
    queryKey: ["statuses", listId],
    queryFn: () => fetchStatuses(listId!),
    enabled: !!listId,
  })
}

export function useCreateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      name: string
      color?: string
      order?: number
    }) => createStatus(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
  })
}

export function useUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      statusId,
      ...data
    }: {
      listId: string
      statusId: string
      name?: string
      color?: string
      order?: number
    }) => updateStatus(listId, statusId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
  })
}

export function useDeleteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, statusId }: { listId: string; statusId: string }) =>
      deleteStatus(listId, statusId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.listId] })
    },
  })
}

export function useReorderStatuses() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, statusIds }: { listId: string; statusIds: string[] }) =>
      reorderStatuses(listId, statusIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["statuses", variables.listId] })
    },
  })
}

// ── Sprint Hooks ──────────────────────────────────────────────────────────

export function useSprints(spaceId: string | undefined) {
  return useQuery<SprintResponse[]>({
    queryKey: ["sprints", spaceId],
    queryFn: () => fetchSprints(spaceId!),
    enabled: !!spaceId,
  })
}

export function useSprint(sprintId: string | undefined) {
  return useQuery<SprintDetailResponse>({
    queryKey: ["sprint", sprintId],
    queryFn: () => fetchSprint(sprintId!),
    enabled: !!sprintId,
  })
}

export function useCreateSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      spaceId,
      ...data
    }: {
      spaceId: string
      name: string
      startDate: string
      endDate: string
      goal?: string
    }) => createSprint(spaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", variables.spaceId] })
    },
  })
}

export function useUpdateSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sprintId,
      ...data
    }: {
      sprintId: string
      name?: string
      startDate?: string
      endDate?: string
      status?: string
      goal?: string
    }) => updateSprint(sprintId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useDeleteSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => deleteSprint(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useAddTaskToSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      addTaskToSprint(sprintId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useRemoveTaskFromSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      removeTaskFromSprint(sprintId, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useMoveTaskBetweenSprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ fromSprintId, toSprintId, taskId }: { fromSprintId: string; toSprintId: string; taskId: string }) =>
      moveTaskBetweenSprints(fromSprintId, toSprintId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

// ── Sprint Retro Hooks ──────────────────────────────────────────────────

export function useSprintRetro(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint-retro", sprintId],
    queryFn: () => fetchSprintRetro(sprintId!),
    enabled: !!sprintId,
  })
}

export function useCreateRetroItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, category, content }: { sprintId: string; category: string; content: string }) =>
      createRetroItem(sprintId, { category, content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint-retro", variables.sprintId] })
    },
  })
}

export function useDeleteRetroItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, itemId }: { sprintId: string; itemId: string }) =>
      deleteRetroItem(sprintId, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint-retro", variables.sprintId] })
    },
  })
}

export function useConvertRetroItemToTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, itemId, listId }: { sprintId: string; itemId: string; listId?: string }) =>
      convertRetroItemToTask(sprintId, itemId, listId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sprint-retro", variables.sprintId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

// ── Sprint AI Analysis Hooks ─────────────────────────────────────────────

export function useSprintAnalysis(sprintId: string | undefined) {
  return useQuery({
    queryKey: ["sprint-analysis", sprintId],
    queryFn: () => fetchSprintAnalysis(sprintId!),
    enabled: !!sprintId,
  })
}

export function useGenerateSprintAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sprintId: string) => generateSprintAnalysis(sprintId),
    onSuccess: (_data, sprintId) => {
      queryClient.invalidateQueries({ queryKey: ["sprint-analysis", sprintId] })
    },
  })
}

// ── Notification Hooks ───────────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

// ── Dashboard Stats Hook ────────────────────────────────────────────────

export function useDashboardStats(workspaceId: string | undefined) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: () => fetchDashboardStats(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refetch every 30s
  })
}

// ── Workspace Members Hooks ────────────────────────────────────────────────

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<WorkspaceMemberResponse[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSearchWorkspaceMembers(workspaceId: string | undefined, query: string) {
  return useQuery<WorkspaceMemberResponse[]>({
    queryKey: ["workspace-members", workspaceId, query],
    queryFn: () => fetchWorkspaceMembers(workspaceId!, query),
    enabled: !!workspaceId && query.length > 0,
  })
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, email, role }: { workspaceId: string; email: string; role: "admin" | "member" | "viewer" }) =>
      addWorkspaceMember(workspaceId, email, role),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] })
    },
  })
}

export function useUpdateWorkspaceMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: "admin" | "member" | "viewer" }) =>
      updateWorkspaceMemberRole(workspaceId, userId, role),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] })
    },
  })
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      removeWorkspaceMember(workspaceId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", variables.workspaceId] })
    },
  })
}

// ── Task Assignees Hooks ─────────────────────────────────────────────────

export function useTaskAssignees(taskId: string | undefined) {
  return useQuery<TaskAssigneeResponse[]>({
    queryKey: ["task-assignees", taskId],
    queryFn: () => fetchTaskAssignees(taskId!),
    enabled: !!taskId,
  })
}

// Bulk-fetch assignees + labels + subtasks + comments for all tasks in one request
interface BulkTaskMetaResponse {
  assignees: Record<string, TaskAssigneeResponse[]>
  labels: Record<string, LabelResponse[]>
  subtasks: Record<string, { id: string; status: string | null }[]>
  comments: Record<string, number>
}

export function useBulkTaskMeta(taskIds: string[], workspaceId?: string) {
  const sortedKey = useMemo(() => [...taskIds].sort().join(","), [taskIds])
  return useQuery<BulkTaskMetaResponse>({
    queryKey: ["bulk-task-meta", sortedKey],
    queryFn: async () => {
      const res = await api.post("/tasks/bulk-meta", { taskIds, workspaceId })
      return res.data
    },
    enabled: taskIds.length > 0 && !!workspaceId,
    staleTime: 30000,
  })
}

// Fetch all task assignees for a set of tasks (for list-level filtering/grouping)
export function useAllTaskAssignees(taskIds: string[], workspaceId?: string) {
  const { data } = useBulkTaskMeta(taskIds, workspaceId)
  return { data: data?.assignees }
}

// Fetch all task labels for a set of tasks (for list-level filtering/grouping)
export function useAllTaskLabels(taskIds: string[], workspaceId?: string) {
  const { data } = useBulkTaskMeta(taskIds, workspaceId)
  return { data: data?.labels }
}

export function useAddTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      addTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useRemoveTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      removeTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

// ── Subtasks Hooks ────────────────────────────────────────────────────────

export function useSubtasks(taskId: string | undefined) {
  return useQuery<SubtaskResponse[]>({
    queryKey: ["subtasks", taskId],
    queryFn: () => fetchSubtasks(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string
      title: string
      description?: Record<string, unknown>
      status?: string
      priority?: string
      dueDate?: string
      timeEstimate?: number
    }) => createSubtask(taskId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useToggleSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId, completed }: { taskId: string; subtaskId: string; completed: boolean }) =>
      toggleSubtask(taskId, subtaskId, completed),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      deleteSubtask(taskId, subtaskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subtasks", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

// ── Comments Hooks ─────────────────────────────────────────────────────────

export function useComments(taskId: string | undefined) {
  return useQuery<CommentResponse[]>({
    queryKey: ["comments", taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      createComment(taskId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, commentId }: { taskId: string; commentId: string }) =>
      deleteComment(taskId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

// ── Task Dependencies Hooks ───────────────────────────────────────────────

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: () => fetchTaskDependencies(taskId!),
    enabled: !!taskId,
  })
}

export function useAddTaskDependency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, blockedTaskId }: { taskId: string; blockedTaskId: string }) =>
      addTaskDependency(taskId, blockedTaskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", variables.blockedTaskId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useRemoveTaskDependency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, blockedTaskId }: { taskId: string; blockedTaskId: string }) =>
      removeTaskDependency(taskId, blockedTaskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", variables.blockedTaskId] })
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useSearchWorkspaceTasks() {
  return useMutation({
    mutationFn: ({ query, workspaceId }: { query: string; workspaceId: string }) =>
      searchWorkspaceTasks(query, workspaceId),
  })
}

// ── Custom Fields Hooks ─────────────────────────────────────────────────

export function useCustomFields(listId: string | undefined) {
  return useQuery<CustomFieldDefinitionResponse[]>({
    queryKey: ["custom-fields", listId],
    queryFn: () => fetchCustomFields(listId!),
    enabled: !!listId,
  })
}

export function useCreateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      ...data
    }: {
      listId: string
      name: string
      type: string
      options?: Record<string, unknown>
    }) => createCustomField(listId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      listId,
      fieldId,
      ...data
    }: {
      listId: string
      fieldId: string
      name?: string
      type?: string
      options?: Record<string, unknown>
      order?: number
    }) => updateCustomField(listId, fieldId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, fieldId }: { listId: string; fieldId: string }) =>
      deleteCustomField(listId, fieldId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields", variables.listId] })
    },
  })
}

// ── Task Sprint Hooks ───────────────────────────────────────────────────

export function useTaskSprint(taskId: string | undefined) {
  return useQuery<TaskSprintResponse | null>({
    queryKey: ["task-sprint", taskId],
    queryFn: () => fetchTaskSprint(taskId!),
    enabled: !!taskId,
  })
}

export function useAssignTaskToSprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, sprintId }: { taskId: string; sprintId: string }) =>
      assignTaskToSprint(taskId, sprintId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-sprint", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

export function useRemoveTaskFromAllSprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      removeTaskFromAllSprints(taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-sprint", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })
}

// ── Task Attachments Hooks ─────────────────────────────────────────────────

export interface TaskAttachmentResponse {
  id: string;
  taskId: string;
  filename: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  url: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery<TaskAttachmentResponse[]>({
    queryKey: ["task-attachments", taskId],
    queryFn: () => api.get(`/tasks/${taskId}/attachments`).then(r => r.data),
    enabled: !!taskId,
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post(`/tasks/${taskId}/attachments`, formData)
      return res.data
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) => {
      const res = await api.delete(`/tasks/${taskId}/attachments?attachmentId=${attachmentId}`)
      return res.data
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] })
    },
  })
}

// ── Labels Hooks ───────────────────────────────────────────────────────────

export function useLabels(workspaceId: string | undefined) {
  return useQuery<LabelResponse[]>({
    queryKey: ["labels", workspaceId],
    queryFn: () => fetchLabels(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, ...data }: { workspaceId: string; name: string; color?: string }) =>
      createLabel(workspaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["labels", variables.workspaceId] })
    },
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, labelId, ...data }: { workspaceId: string; labelId: string; name?: string; color?: string }) =>
      updateLabel(workspaceId, labelId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["labels", variables.workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["task-labels"] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, labelId }: { workspaceId: string; labelId: string }) =>
      deleteLabel(workspaceId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["labels", variables.workspaceId] })
    },
  })
}

export function useTaskLabels(taskId: string | undefined) {
  return useQuery<LabelResponse[]>({
    queryKey: ["task-labels", taskId],
    queryFn: () => fetchTaskLabels(taskId!),
    enabled: !!taskId,
  })
}

export function useAddTaskLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      addTaskLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-labels", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

export function useRemoveTaskLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      removeTaskLabel(taskId, labelId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-labels", variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ["bulk-task-meta"] })
    },
  })
}

// ── Reminders Hooks ───────────────────────────────────────────────────────

export function useTaskReminders(taskId: string | undefined) {
  return useQuery<ReminderResponse[]>({
    queryKey: ["reminders", taskId],
    queryFn: () => fetchTaskReminders(taskId!),
    enabled: !!taskId,
  })
}

export function useCreateTaskReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { remindAt: string; type?: string; preset?: string } }) =>
      createTaskReminder(taskId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reminders", variables.taskId] })
    },
  })
}

export function useDeleteTaskReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, reminderId }: { taskId: string; reminderId: string }) =>
      deleteTaskReminder(taskId, reminderId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reminders", variables.taskId] })
    },
  })
}

// ── Goals / OKR Hooks ──────────────────────────────────────────────────────

export function useGoals(workspaceId: string | undefined) {
  return useQuery<GoalResponse[]>({
    queryKey: ["goals", workspaceId],
    queryFn: () => fetchGoals(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useGoal(goalId: string | undefined) {
  return useQuery<GoalResponse>({
    queryKey: ["goal", goalId],
    queryFn: () => fetchGoal(goalId!),
    enabled: !!goalId,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { workspaceId: string; name: string; description?: string; targetDate?: string }) =>
      createGoal(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals", variables.workspaceId] })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, ...data }: { goalId: string; name?: string; description?: string; targetDate?: string | null; status?: string }) =>
      updateGoal(goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
      queryClient.invalidateQueries({ queryKey: ["goal"] })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })
}

export function useKeyResults(goalId: string | undefined) {
  return useQuery<KeyResultResponse[]>({
    queryKey: ["key-results", goalId],
    queryFn: () => fetchKeyResults(goalId!),
    enabled: !!goalId,
  })
}

export function useCreateKeyResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, ...data }: { goalId: string; title: string; targetValue: number; linkedTaskId?: string }) =>
      createKeyResult(goalId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["key-results", variables.goalId] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, krId, ...data }: { goalId: string; krId: string; title?: string; targetValue?: number; currentValue?: number; linkedTaskId?: string | null }) =>
      updateKeyResult(goalId, krId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["key-results", variables.goalId] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, krId }: { goalId: string; krId: string }) =>
      deleteKeyResult(goalId, krId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["key-results", variables.goalId] })
      queryClient.invalidateQueries({ queryKey: ["goals"] })
    },
  })
}
