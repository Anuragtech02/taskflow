import { create } from 'zustand'

/**
 * Tasks with a change in flight (status change, move, bulk action…). Rows and
 * cards read this to fade out and ignore clicks until the server answers, so
 * a slow request never looks like nothing happened — and can't be fired twice.
 *
 * Ref-counted: overlapping operations on the same task (e.g. a bulk action
 * that also opens the subtask prompt) keep it pending until the last ends.
 */
interface PendingTasksState {
  counts: Record<string, number>
  begin: (ids: string[]) => void
  end: (ids: string[]) => void
}

export const usePendingTasks = create<PendingTasksState>((set) => ({
  counts: {},
  begin: (ids) => set((s) => {
    const counts = { ...s.counts }
    for (const id of ids) counts[id] = (counts[id] ?? 0) + 1
    return { counts }
  }),
  end: (ids) => set((s) => {
    const counts = { ...s.counts }
    for (const id of ids) {
      const n = (counts[id] ?? 0) - 1
      if (n > 0) counts[id] = n
      else delete counts[id]
    }
    return { counts }
  }),
}))

/** True while a change to this task is in flight. Re-renders only that row. */
export function useIsTaskPending(taskId: string): boolean {
  return usePendingTasks((s) => (s.counts[taskId] ?? 0) > 0)
}

/** Mark `ids` pending for the lifetime of `work`. */
export async function whilePending<T>(ids: string[], work: () => Promise<T>): Promise<T> {
  const { begin, end } = usePendingTasks.getState()
  begin(ids)
  try {
    return await work()
  } finally {
    end(ids)
  }
}
