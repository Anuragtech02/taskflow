import type { TaskResponse } from "./api"

export interface TaskTreeNode extends TaskResponse {
  children: TaskTreeNode[]
  depth: number
}

export function buildTaskTree(tasks: TaskResponse[], maxDepth: number = 3): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>()
  const roots: TaskTreeNode[] = []

  // Create nodes
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, children: [], depth: 0 })
  }

  // First pass: link children to parents (depth stays 0 for now)
  for (const task of tasks) {
    const node = taskMap.get(task.id)!
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      const parent = taskMap.get(task.parentTaskId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Second pass: calculate depths recursively from roots
  function setDepths(nodes: TaskTreeNode[], depth: number) {
    for (const node of nodes) {
      node.depth = depth
      if (depth < maxDepth) {
        setDepths(node.children, depth + 1)
      } else {
        // Beyond max depth — remove children so they don't render
        node.children = []
      }
    }
  }
  setDepths(roots, 0)

  return roots
}

export function flattenTree(nodes: TaskTreeNode[], expandedIds: Set<string>): TaskTreeNode[] {
  const result: TaskTreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      result.push(...flattenTree(node.children, expandedIds))
    }
  }
  return result
}

// Get only root tasks (for grouping purposes)
export function getRootTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  return nodes.filter(node => node.depth === 0)
}

// Get subtasks for a given parent task
export function getSubtasks(node: TaskTreeNode, expandedIds: Set<string>): TaskTreeNode[] {
  if (node.children.length === 0 || !expandedIds.has(node.id)) {
    return []
  }
  return flattenTree(node.children, expandedIds)
}

/**
 * Group a task tree by assignee so a subtask shows under the person it is
 * assigned to, even when its parent belongs to someone else.
 *
 * Every group entry is a node that is drawn at the top of that group, with its
 * own subtasks nested under it as usual:
 *  - A root task is listed under EACH of its assignees (or "unassigned").
 *  - A subtask is also listed under each of its assignees for whom none of its
 *    ancestors is already listed. When an ancestor is already in that person's
 *    group, the subtask is reachable nested under it, so listing it again
 *    would only duplicate it.
 *
 * It is the same task object in every place, so edits show up everywhere.
 * Entries keep the order of `orderIndex` (the list's current sort); a
 * subtask entry has depth > 0, which is how callers tell it apart.
 */
export function groupTreeByAssignee(
  roots: TaskTreeNode[],
  assigneeIdsOf: (taskId: string) => string[],
  orderIndex?: Map<string, number>
): Record<string, TaskTreeNode[]> {
  const groups: Record<string, TaskTreeNode[]> = {}
  const add = (key: string, node: TaskTreeNode) => {
    ;(groups[key] ??= []).push(node)
  }

  const walk = (node: TaskTreeNode, shownFor: Set<string>) => {
    for (const child of node.children) {
      const ids = new Set(assigneeIdsOf(child.id))
      for (const id of ids) if (!shownFor.has(id)) add(id, child)
      walk(child, ids.size ? new Set([...shownFor, ...ids]) : shownFor)
    }
  }

  for (const root of roots) {
    const ids = new Set(assigneeIdsOf(root.id))
    if (ids.size === 0) add("unassigned", root)
    for (const id of ids) add(id, root)
    walk(root, ids)
  }

  if (orderIndex) {
    const rank = (n: TaskTreeNode) => orderIndex.get(n.id) ?? Number.MAX_SAFE_INTEGER
    for (const key of Object.keys(groups)) groups[key].sort((a, b) => rank(a) - rank(b))
  }
  return groups
}
