"use client"

import { useState } from "react"
import { Plus, Trash2, ArrowRight, CheckCircle2, ThumbsUp, AlertTriangle, Lightbulb, User, Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  useSprintRetro,
  useCreateRetroItem,
  useDeleteRetroItem,
  useConvertRetroItemToTask,
  useSprintAnalysis,
  useGenerateSprintAnalysis,
} from "@/hooks/useQueries"
import { MarkdownRenderer } from "./markdown-renderer"
import type { RetroItemResponse, RetroSummary } from "@/lib/api"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

const CATEGORIES = [
  {
    key: "went_well" as const,
    label: "Went Well",
    icon: ThumbsUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  {
    key: "to_improve" as const,
    label: "To Improve",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  {
    key: "action_item" as const,
    label: "Action Items",
    icon: Lightbulb,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
]

interface SprintRetroBoardProps {
  sprintId: string
}

function RetroColumn({
  category,
  items,
  sprintId,
  currentUserId,
}: {
  category: (typeof CATEGORIES)[number]
  items: RetroItemResponse[]
  sprintId: string
  currentUserId?: string
}) {
  const [newContent, setNewContent] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const createMutation = useCreateRetroItem()
  const deleteMutation = useDeleteRetroItem()
  const convertMutation = useConvertRetroItemToTask()
  const Icon = category.icon

  const handleAdd = () => {
    if (!newContent.trim()) return
    createMutation.mutate(
      { sprintId, category: category.key, content: newContent.trim() },
      {
        onSuccess: () => {
          setNewContent("")
          setIsAdding(false)
        },
      }
    )
  }

  return (
    <div className="flex-1 min-w-[280px]">
      <div className={cn("rounded-lg border p-4", category.bg, category.border)}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn("h-5 w-5", category.color)} />
          <h3 className="font-semibold text-sm">{category.label}</h3>
          <Badge variant="secondary" className={cn("ml-auto text-xs", category.badge)}>
            {items.length}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-background rounded-md border p-3 shadow-sm group"
            >
              <p className="text-sm whitespace-pre-wrap">{item.content}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={item.user.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {item.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{item.user.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {category.key === "action_item" && !item.convertedTaskId && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-600 hover:text-blue-700"
                            onClick={() =>
                              convertMutation.mutate(
                                { sprintId, itemId: item.id },
                                {
                                  onSuccess: (data) => {
                                    toast.success(
                                      data.addedToSprintId
                                        ? "Converted to task and added to next sprint"
                                        : "Converted to task"
                                    )
                                  },
                                }
                              )
                            }
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Convert to task</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {item.convertedTaskId && (
                    <Badge variant="outline" className="text-[10px] h-5 gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Task created
                    </Badge>
                  )}
                  {(item.userId === currentUserId) && !item.convertedTaskId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ sprintId, itemId: item.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAdding ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              placeholder={`Add a ${category.label.toLowerCase()} item...`}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAdd()
                }
                if (e.key === "Escape") {
                  setIsAdding(false)
                  setNewContent("")
                }
              }}
              className="min-h-[80px] text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newContent.trim() || createMutation.isPending}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewContent("") }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add item
          </Button>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ summary }: { summary: RetroSummary }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Sprint Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.carriedOverTasks}</div>
            <div className="text-xs text-muted-foreground">Carried Over</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Completion Rate</div>
          </div>
        </div>

        {summary.byAssignee.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">By Team Member</h4>
            <div className="space-y-2">
              {summary.byAssignee.map((entry) => (
                <div key={entry.user.id} className="flex items-center gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={entry.user.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {entry.user.name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{entry.user.name}</span>
                  <span className="text-sm font-medium text-green-600">{entry.completed}</span>
                  <span className="text-xs text-muted-foreground">/ {entry.total}</span>
                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${entry.total > 0 ? (entry.completed / entry.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AIAnalysisCard({ sprintId }: { sprintId: string }) {
  const { data: analysis, isLoading } = useSprintAnalysis(sprintId)
  const generateMutation = useGenerateSprintAnalysis()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Sprint Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMutation.mutate(sprintId, {
              onSuccess: () => toast.success("Analysis generated"),
              onError: () => toast.error("Failed to generate analysis"),
            })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : analysis?.summary ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Generate Analysis
              </>
            )}
          </Button>
        </div>
        {analysis?.generatedAt && (
          <p className="text-xs text-muted-foreground">
            Generated {new Date(analysis.generatedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading || generateMutation.isPending ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : generateMutation.isError ? (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-60" />
            <p className="text-sm">Failed to generate analysis. Please try again.</p>
          </div>
        ) : analysis?.summary ? (
          <div className="columns-1 md:columns-2 gap-6 prose prose-sm dark:prose-invert max-w-none
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-0 [&_h3]:mb-2
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mb-2
            [&_ul]:space-y-1.5 [&_ol]:space-y-1.5
            [&_li]:text-[13px] [&_li]:leading-relaxed [&_li]:text-muted-foreground
            [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted-foreground
            [&_strong]:text-foreground [&_strong]:font-medium
          ">
            {analysis.summary.split(/(?=^###?\s)/m).filter(Boolean).map((section, i) => (
              <div key={i} className={cn("break-inside-avoid-column", i > 0 && "pt-4 mt-4 border-t border-border")}>
                <MarkdownRenderer content={section.trim()} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Click &ldquo;Generate Analysis&rdquo; to get AI-powered insights about this sprint.</p>
            <p className="text-xs mt-1">Analyzes cycle times, rework patterns, bottlenecks, and team workload.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SprintRetroBoard({ sprintId }: SprintRetroBoardProps) {
  const { data, isLoading } = useSprintRetro(sprintId)
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.items || []
  const summary = data?.summary

  return (
    <div className="space-y-6">
      {summary && <SummaryCard summary={summary} />}

      <AIAnalysisCard sprintId={sprintId} />

      <div className="flex flex-col md:flex-row gap-4">
        {CATEGORIES.map((cat) => (
          <RetroColumn
            key={cat.key}
            category={cat}
            items={items.filter((i) => i.category === cat.key)}
            sprintId={sprintId}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
