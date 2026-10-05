"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchSubtreeCount } from "@/lib/api"

/**
 * "Also apply this to all subtasks?" — one prompt shared by every place that
 * changes a task's status or moves it to another list.
 *
 *   const askCascade = useSubtaskCascade()
 *   const choice = await askCascade({ taskIds: [id], action: "status", targetLabel: "In Progress" })
 *   if (!choice) return                       // cancelled — change nothing
 *   update({ ..., applyToSubtasks: choice.applyToSubtasks })
 *
 * No subtasks → resolves immediately without a prompt. If the count can't be
 * fetched, it resolves to "just this task" rather than blocking the change.
 */

export type CascadeAction = "status" | "move"

export interface CascadeRequest {
  taskIds: string[]
  action: CascadeAction
  /** The new status's name, or the destination list's name. */
  targetLabel?: string
  /** Title of the task being changed (single-task prompts). */
  taskTitle?: string
  /** Caller already knows none of these tasks has subtasks: skip the request. */
  knownLeaf?: boolean
}

export type CascadeChoice = { applyToSubtasks: boolean } | null

type Ask = (req: CascadeRequest) => Promise<CascadeChoice>
const CascadeContext = createContext<Ask | null>(null)

export function SubtaskCascadeProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ req: CascadeRequest; count: number } | null>(null)
  const [checked, setChecked] = useState(false)
  const resolver = useRef<((c: CascadeChoice) => void) | null>(null)

  const settle = useCallback((choice: CascadeChoice) => {
    const resolve = resolver.current
    resolver.current = null
    setPending(null)
    resolve?.(choice)
  }, [])

  const ask = useCallback<Ask>(async (req) => {
    if (req.knownLeaf || req.taskIds.length === 0) return { applyToSubtasks: false }
    let count = 0
    try {
      count = await fetchSubtreeCount(req.taskIds)
    } catch {
      return { applyToSubtasks: false }
    }
    if (count === 0) return { applyToSubtasks: false }
    // A newer prompt supersedes one still open: treat the old one as cancelled.
    resolver.current?.(null)
    return new Promise<CascadeChoice>((resolve) => {
      resolver.current = resolve
      setChecked(false) // opt-in every time
      setPending({ req, count })
    })
  }, [])

  const req = pending?.req
  const n = pending?.count ?? 0
  const subtasks = `${n} subtask${n === 1 ? "" : "s"}`
  const target = req?.targetLabel ? `“${req.targetLabel}”` : req?.action === "move" ? "the selected list" : "the new status"
  const single = req && req.taskIds.length === 1

  return (
    <CascadeContext.Provider value={ask}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) settle(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{req?.action === "move" ? `Move to ${target}?` : `Change status to ${target}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {single && req?.taskTitle
                ? <>“{req.taskTitle}” has {subtasks} inside it, including nested ones.</>
                : <>{single ? "This task has" : "The selected tasks have"} {subtasks} inside, including nested ones.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                {req?.action === "move" ? `Also move all ${subtasks}` : `Also change all ${subtasks} to ${target}`}
              </span>
              <span className="block text-xs text-muted-foreground">
                Every level inside, not just the direct subtasks.{" "}
                {req?.action === "move"
                  ? "If unchecked, the subtasks stay in their current list."
                  : single ? "If unchecked, only this task changes." : "If unchecked, only the selected tasks change."}
              </span>
            </span>
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => settle({ applyToSubtasks: checked })}>
              {req?.action === "move" ? "Move" : "Change status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CascadeContext.Provider>
  )
}

export function useSubtaskCascade(): Ask {
  const ask = useContext(CascadeContext)
  if (!ask) throw new Error("useSubtaskCascade must be used inside <SubtaskCascadeProvider>")
  return ask
}
