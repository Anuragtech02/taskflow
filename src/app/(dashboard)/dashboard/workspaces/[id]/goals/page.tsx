"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import {
  Plus,
  Target,
  Calendar as CalendarIcon,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useKeyResults,
  useCreateKeyResult,
  useUpdateKeyResult,
  useDeleteKeyResult,
} from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { GoalResponse, KeyResultResponse } from "@/lib/api"

// ── Create / Edit Goal Dialog ─────────────────────────────────────────────

function GoalDialog({
  workspaceId,
  goal,
  open,
  onOpenChange,
}: {
  workspaceId: string
  goal?: GoalResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(goal?.name ?? "")
  const [description, setDescription] = useState(goal?.description ?? "")
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    goal?.targetDate ? new Date(goal.targetDate) : undefined
  )

  const createGoalMutation = useCreateGoal()
  const updateGoalMutation = useUpdateGoal()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (goal) {
      updateGoalMutation.mutate(
        {
          goalId: goal.id,
          name,
          description: description || undefined,
          targetDate: targetDate ? targetDate.toISOString() : null,
        },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createGoalMutation.mutate(
        {
          workspaceId,
          name,
          description: description || undefined,
          targetDate: targetDate ? targetDate.toISOString() : undefined,
        },
        {
          onSuccess: () => {
            onOpenChange(false)
            setName("")
            setDescription("")
            setTargetDate(undefined)
          },
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "Create Goal"}</DialogTitle>
          <DialogDescription>
            {goal ? "Update your goal details." : "Set a new goal for your workspace."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Increase user engagement"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              placeholder="What does this goal aim to achieve?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : "Select target date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createGoalMutation.isPending || updateGoalMutation.isPending}
            >
              {goal ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Add Key Result Dialog ─────────────────────────────────────────────────

function AddKeyResultDialog({
  goalId,
  open,
  onOpenChange,
}: {
  goalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [title, setTitle] = useState("")
  const [targetValue, setTargetValue] = useState("")

  const createKeyResultMutation = useCreateKeyResult()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !targetValue) return

    createKeyResultMutation.mutate(
      {
        goalId,
        title,
        targetValue: parseInt(targetValue, 10),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setTitle("")
          setTargetValue("")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Key Result</DialogTitle>
          <DialogDescription>
            Define a measurable key result for this goal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kr-title">Title</Label>
            <Input
              id="kr-title"
              placeholder="e.g. Achieve 1000 daily active users"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kr-target">Target Value</Label>
            <Input
              id="kr-target"
              type="number"
              min={1}
              placeholder="100"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !targetValue || createKeyResultMutation.isPending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Key Result Row ──────────────────────────────────────────────────────

function KeyResultRow({
  kr,
  goalId,
}: {
  kr: KeyResultResponse
  goalId: string
}) {
  const [editing, setEditing] = useState(false)
  const [currentValue, setCurrentValue] = useState(String(kr.currentValue ?? 0))

  const updateMutation = useUpdateKeyResult()
  const deleteMutation = useDeleteKeyResult()

  const progress = kr.targetValue > 0 ? Math.round(((kr.currentValue ?? 0) / kr.targetValue) * 100) : 0

  const handleSave = () => {
    const val = parseInt(currentValue, 10)
    if (isNaN(val) || val < 0) return
    updateMutation.mutate(
      { goalId, krId: kr.id, currentValue: val },
      { onSuccess: () => setEditing(false) }
    )
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{kr.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {editing ? (
              <span className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={kr.targetValue}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="h-6 w-16 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave()
                    if (e.key === "Escape") setEditing(false)
                  }}
                  autoFocus
                />
                <span>/ {kr.targetValue}</span>
                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={handleSave}>
                  Save
                </Button>
              </span>
            ) : (
              <button
                className="hover:underline cursor-pointer"
                onClick={() => setEditing(true)}
              >
                {kr.currentValue ?? 0} / {kr.targetValue} ({progress}%)
              </button>
            )}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={() => deleteMutation.mutate({ goalId, krId: kr.id })}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ── Goal Card ───────────────────────────────────────────────────────────

function GoalCard({
  goal,
  workspaceId,
}: {
  goal: GoalResponse
  workspaceId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [showAddKR, setShowAddKR] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: keyResultsList } = useKeyResults(expanded ? goal.id : undefined)
  const deleteGoalMutation = useDeleteGoal()
  const updateGoalMutation = useUpdateGoal()

  const progress = goal.progress ?? 0

  const statusColor = {
    active: "bg-blue-500/10 text-blue-700 border-blue-200",
    completed: "bg-green-500/10 text-green-700 border-green-200",
    archived: "bg-gray-500/10 text-gray-500 border-gray-200",
  }[goal.status] ?? "bg-blue-500/10 text-blue-700 border-blue-200"

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button onClick={() => setExpanded(!expanded)} className="mt-1">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{goal.name}</CardTitle>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant="outline" className={cn("text-xs", statusColor)}>
                {goal.status}
              </Badge>
              {goal.status === "active" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateGoalMutation.mutate({ goalId: goal.id, status: "completed" })
                  }
                  title="Mark completed"
                >
                  <Target className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowEdit(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteGoalMutation.mutate(goal.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 mb-2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-sm font-medium text-muted-foreground w-12 text-right">
              {progress}%
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {goal.targetDate && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(goal.targetDate), "MMM d, yyyy")}
              </span>
            )}
            <span>
              {goal.keyResults?.length ?? 0} key result{(goal.keyResults?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>

          {expanded && (
            <div className="mt-4 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Key Results</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAddKR(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              {keyResultsList && keyResultsList.length > 0 ? (
                <div className="space-y-1">
                  {keyResultsList.map((kr) => (
                    <KeyResultRow key={kr.id} kr={kr} goalId={goal.id} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No key results yet. Add one to track progress.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddKeyResultDialog goalId={goal.id} open={showAddKR} onOpenChange={setShowAddKR} />
      <GoalDialog
        workspaceId={workspaceId}
        goal={goal}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
    </>
  )
}

// ── Goals Page ──────────────────────────────────────────────────────────

export default function GoalsPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "archived">("all")

  const { data: goals, isLoading } = useGoals(workspaceId)

  const filteredGoals = goals?.filter((g) => {
    if (statusFilter === "all") return true
    return g.status === statusFilter
  })

  const activeCount = goals?.filter((g) => g.status === "active").length ?? 0
  const completedCount = goals?.filter((g) => g.status === "completed").length ?? 0
  const avgProgress =
    goals && goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length)
      : 0

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              Goals
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track objectives and key results for your workspace.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* Stats */}
        {goals && goals.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold mt-1">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold mt-1">{completedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Progress</p>
                <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(["all", "active", "completed", "archived"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>

        {/* Goals List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredGoals && filteredGoals.length > 0 ? (
          <div className="space-y-4">
            {filteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} workspaceId={workspaceId} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {statusFilter !== "all" ? `No ${statusFilter} goals` : "No goals yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {statusFilter !== "all"
                ? "Try a different filter or create a new goal."
                : "Create your first goal to start tracking OKRs."}
            </p>
            {statusFilter === "all" && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            )}
          </div>
        )}
      </div>

      <GoalDialog
        workspaceId={workspaceId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  )
}
