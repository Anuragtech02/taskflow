"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchSubtreeCount } from "@/lib/api"
import { whilePending } from "@/store/usePendingTasks"

/**
 * "Also apply this to all subtasks?" — one prompt shared by every place that
 * changes a task's status, moves it to another list, or moves it in/out of a
 * sprint. The caller hands over the work itself, so the prompt can stay open
 * with a spinner until the server has answered:
 *
 *   const cascade = useSubtaskCascade()
 *   const result = await cascade(
 *     { taskIds: [id], action: "status", targetLabel: "In Progress" },
 *     (applyToSubtasks) => update.mutateAsync({ taskId: id, status, applyToSubtasks }),
 *   )
 *   // "done" | "cancelled" | "failed" (failures are already toasted)
 *
 * While the work runs, the affected rows/cards fade and ignore clicks (see
 * usePendingTasks). No subtasks → no prompt, the work just runs. If the count
 * can't be fetched, the change applies to the selected tasks only.
 */

export type CascadeAction = "status" | "move" | "unsprint"
export type CascadeResult = "done" | "cancelled" | "failed"

export interface CascadeRequest {
  taskIds: string[]
  action: CascadeAction
  /** The new status's name, or the destination list's / sprint's name. */
  targetLabel?: string
  /** Title of the task being changed (single-task prompts). */
  taskTitle?: string
  /** Sprint moves: only subtasks in this sprint travel with the parent. */
  sprintId?: string
  /** Caller already knows none of these tasks has subtasks: skip the request. */
  knownLeaf?: boolean
  /** Toast shown if the work fails. */
  errorMessage?: string
}

type Run = (applyToSubtasks: boolean) => Promise<unknown>
type Cascade = (req: CascadeRequest, run: Run) => Promise<CascadeResult>

interface Pending {
  req: CascadeRequest
  count: number
  run: Run
  resolve: (r: CascadeResult) => void
}

const CascadeContext = createContext<Cascade | null>(null)
const DEFAULT_ERROR = "Couldn't save the change. Please try again."

export function SubtaskCascadeProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const pendingRef = useRef<Pending | null>(null)

  const execute = useCallback(async (req: CascadeRequest, run: Run, apply: boolean): Promise<CascadeResult> => {
    try {
      await whilePending(req.taskIds, () => run(apply))
      return "done"
    } catch (err) {
      console.error(err)
      toast.error(req.errorMessage ?? DEFAULT_ERROR)
      return "failed"
    }
  }, [])

  const close = useCallback((result: CascadeResult) => {
    const p = pendingRef.current
    pendingRef.current = null
    setPending(null)
    setBusy(false)
    p?.resolve(result)
  }, [])

  const cascade = useCallback<Cascade>(async (req, run) => {
    let count = 0
    if (!req.knownLeaf && req.taskIds.length > 0) {
      try {
        count = await whilePending(req.taskIds, () => fetchSubtreeCount(req.taskIds, req.sprintId))
      } catch {
        count = 0
      }
    }
    if (count === 0) return execute(req, run, false)

    // A newer prompt supersedes one still waiting for an answer.
    if (pendingRef.current) close("cancelled")
    return new Promise<CascadeResult>((resolve) => {
      const p = { req, count, run, resolve }
      pendingRef.current = p
      setChecked(false) // opt-in every time
      setPending(p)
    })
  }, [execute, close])

  const confirm = async () => {
    const p = pendingRef.current
    if (!p || busy) return
    setBusy(true)
    close(await execute(p.req, p.run, checked))
  }

  const req = pending?.req
  const n = pending?.count ?? 0
  const subtasks = `${n} subtask${n === 1 ? "" : "s"}`
  const target = req?.targetLabel ? `“${req.targetLabel}”` : req?.action === "status" ? "the new status" : "the selected list"
  const single = req?.taskIds.length === 1
  const where = req?.sprintId ? "in this sprint" : single ? "inside it" : "inside them"
  const copy = {
    status: { title: `Change status to ${target}?`, check: `Also change all ${subtasks} to ${target}`, ok: "Change status", busy: "Saving…",
      off: single ? "If unchecked, only this task changes." : "If unchecked, only the selected tasks change." },
    move: { title: `Move to ${target}?`, check: `Also move all ${subtasks}`, ok: "Move", busy: "Moving…",
      off: "If unchecked, the subtasks stay where they are." },
    unsprint: { title: "Remove from sprint?", check: `Also remove all ${subtasks} from the sprint`, ok: "Remove", busy: "Removing…",
      off: "If unchecked, the subtasks stay in the sprint." },
  }[req?.action ?? "status"]

  return (
    <CascadeContext.Provider value={cascade}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open && !busy) close("cancelled") }}>
        <AlertDialogContent onEscapeKeyDown={(e) => { if (busy) e.preventDefault() }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {single && req?.taskTitle
                ? <>“{req.taskTitle}” has {subtasks} {where}, including nested ones.</>
                : <>{single ? "This task has" : "The selected tasks have"} {subtasks} {where}, including nested ones.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className={`flex items-start gap-3 rounded-md border p-3 ${busy ? "opacity-60" : "cursor-pointer"}`}>
            <Checkbox checked={checked} disabled={busy} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <span className="space-y-1">
              <span className="block text-sm font-medium">{copy.check}</span>
              <span className="block text-xs text-muted-foreground">
                Every level inside, not just the direct subtasks. {copy.off}
              </span>
            </span>
          </label>

          <AlertDialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => close("cancelled")}>Cancel</Button>
            <Button onClick={confirm} disabled={busy} aria-busy={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {busy ? copy.busy : copy.ok}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CascadeContext.Provider>
  )
}

export function useSubtaskCascade(): Cascade {
  const cascade = useContext(CascadeContext)
  if (!cascade) throw new Error("useSubtaskCascade must be used inside <SubtaskCascadeProvider>")
  return cascade
}
