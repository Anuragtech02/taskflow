"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Zap, Plus, Trash2, ArrowRight, Settings, Users, Tag, Bell, Pencil } from "lucide-react"
import { useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation } from "@/hooks/useAutomations"
import { useWorkspaceMembers, useLabels } from "@/hooks/useQueries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

const TRIGGER_TYPES = [
  { value: "status_change", label: "Status Change" },
  { value: "task_created", label: "Task Created" },
  { value: "due_date_approaching", label: "Due Date Approaching" },
  { value: "assignment", label: "Assignment" },
]

const ACTION_TYPES = [
  { value: "change_status", label: "Change Status", icon: Settings },
  { value: "assign_user", label: "Assign User", icon: Users },
  { value: "add_label", label: "Add Label", icon: Tag },
  { value: "send_notification", label: "Send Notification", icon: Bell },
]

interface AutomationFormData {
  name: string
  triggerType: string
  fromStatus: string
  toStatus: string
  actionType: string
  actionStatus: string
  actionUserId: string
  actionLabelId: string
  notifyUserId: string
  notifyTitle: string
  notifyMessage: string
}

const emptyForm: AutomationFormData = {
  name: "",
  triggerType: "",
  fromStatus: "",
  toStatus: "",
  actionType: "",
  actionStatus: "",
  actionUserId: "",
  actionLabelId: "",
  notifyUserId: "",
  notifyTitle: "",
  notifyMessage: "",
}

function buildTriggerConfig(form: AutomationFormData): Record<string, unknown> {
  switch (form.triggerType) {
    case "status_change":
      return { fromStatus: form.fromStatus, toStatus: form.toStatus }
    case "assignment":
      return {}
    case "due_date_approaching":
      return {}
    case "task_created":
      return {}
    default:
      return {}
  }
}

function buildActionConfig(form: AutomationFormData): Record<string, unknown> {
  switch (form.actionType) {
    case "change_status":
      return { status: form.actionStatus }
    case "assign_user":
      return { userId: form.actionUserId }
    case "add_label":
      return { labelId: form.actionLabelId }
    case "send_notification":
      return { userId: form.notifyUserId, title: form.notifyTitle, message: form.notifyMessage }
    default:
      return {}
  }
}

function formFromAutomation(automation: {
  name: string
  triggerType: string
  triggerConfig: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
}): AutomationFormData {
  const tc = automation.triggerConfig || {}
  const ac = automation.actionConfig || {}
  return {
    name: automation.name,
    triggerType: automation.triggerType,
    fromStatus: (tc.fromStatus as string) || "",
    toStatus: (tc.toStatus as string) || "",
    actionType: automation.actionType,
    actionStatus: (ac.status as string) || "",
    actionUserId: (ac.userId as string) || "",
    actionLabelId: (ac.labelId as string) || "",
    notifyUserId: (ac.userId as string) || "",
    notifyTitle: (ac.title as string) || "",
    notifyMessage: (ac.message as string) || "",
  }
}

export default function AutomationsPage() {
  const params = useParams()
  const workspaceId = params.id as string

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AutomationFormData>(emptyForm)

  const { data: automations, isLoading } = useAutomations(workspaceId)
  const { data: members } = useWorkspaceMembers(workspaceId)
  const { data: labels } = useLabels(workspaceId)
  const createMutation = useCreateAutomation()
  const updateMutation = useUpdateAutomation()
  const deleteMutation = useDeleteAutomation()

  const handleCreate = () => {
    createMutation.mutate({
      workspaceId,
      data: {
        name: formData.name,
        triggerType: formData.triggerType,
        triggerConfig: buildTriggerConfig(formData),
        actionType: formData.actionType,
        actionConfig: buildActionConfig(formData),
      },
    })
    setCreateOpen(false)
    setFormData(emptyForm)
  }

  const handleEdit = (automationId: string) => {
    const automation = automations?.find(a => a.id === automationId)
    if (!automation) return
    setEditingId(automationId)
    setFormData(formFromAutomation(automation))
    setEditOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    updateMutation.mutate({
      automationId: editingId,
      data: {
        name: formData.name,
        triggerType: formData.triggerType,
        triggerConfig: buildTriggerConfig(formData),
        actionType: formData.actionType,
        actionConfig: buildActionConfig(formData),
      },
    })
    setEditOpen(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const handleToggle = (automationId: string, enabled: boolean) => {
    updateMutation.mutate({ automationId, data: { enabled } })
  }

  const handleDelete = (automationId: string) => {
    if (confirm("Are you sure you want to delete this automation?")) {
      deleteMutation.mutate(automationId)
    }
  }

  const getTriggerLabel = (type: string) =>
    TRIGGER_TYPES.find((t) => t.value === type)?.label || type

  const getActionLabel = (type: string) =>
    ACTION_TYPES.find((a) => a.value === type)?.label || type

  const renderTriggerConfig = () => {
    if (formData.triggerType === "status_change") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">From status</Label>
            <Input
              placeholder="e.g. todo"
              value={formData.fromStatus}
              onChange={(e) => setFormData({ ...formData, fromStatus: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To status</Label>
            <Input
              placeholder="e.g. done"
              value={formData.toStatus}
              onChange={(e) => setFormData({ ...formData, toStatus: e.target.value })}
            />
          </div>
        </div>
      )
    }
    return null
  }

  const renderActionConfig = () => {
    switch (formData.actionType) {
      case "change_status":
        return (
          <div className="grid gap-2">
            <Label className="text-xs">Change status to</Label>
            <Input
              placeholder="e.g. done"
              value={formData.actionStatus}
              onChange={(e) => setFormData({ ...formData, actionStatus: e.target.value })}
            />
          </div>
        )
      case "assign_user":
        return (
          <div className="grid gap-2">
            <Label className="text-xs">Assign user</Label>
            <Select
              value={formData.actionUserId}
              onValueChange={(value) => setFormData({ ...formData, actionUserId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "add_label":
        return (
          <div className="grid gap-2">
            <Label className="text-xs">Add label</Label>
            <Select
              value={formData.actionLabelId}
              onValueChange={(value) => setFormData({ ...formData, actionLabelId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select label" />
              </SelectTrigger>
              <SelectContent>
                {labels?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case "send_notification":
        return (
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Notify user</Label>
              <Select
                value={formData.notifyUserId}
                onValueChange={(value) => setFormData({ ...formData, notifyUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="Notification title"
                value={formData.notifyTitle}
                onChange={(e) => setFormData({ ...formData, notifyTitle: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                placeholder="Notification message"
                value={formData.notifyMessage}
                onChange={(e) => setFormData({ ...formData, notifyMessage: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderFormContent = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Automation Name</Label>
        <Input
          id="name"
          placeholder="e.g., Move to Done on review approval"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid gap-2">
        <Label>When this happens (Trigger)</Label>
        <Select
          value={formData.triggerType}
          onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((trigger) => (
              <SelectItem key={trigger.value} value={trigger.value}>
                {trigger.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderTriggerConfig()}

      <div className="flex items-center justify-center py-1">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="grid gap-2">
        <Label>Do this (Action)</Label>
        <Select
          value={formData.actionType}
          onValueChange={(value) => setFormData({ ...formData, actionType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                <div className="flex items-center gap-2">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderActionConfig()}
    </div>
  )

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automations
          </h1>
          <p className="text-muted-foreground">Automate your workflow with triggers and actions</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
              <DialogDescription>
                Set up a trigger and action to automate your tasks
              </DialogDescription>
            </DialogHeader>
            {renderFormContent()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.triggerType || !formData.actionType}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Automation</DialogTitle>
            <DialogDescription>
              Update trigger and action configuration
            </DialogDescription>
          </DialogHeader>
          {renderFormContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formData.name || !formData.triggerType || !formData.actionType}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(!automations || automations.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation to streamline your workflow
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <Card key={automation.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{automation.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {getTriggerLabel(automation.triggerType)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={(checked) => handleToggle(automation.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>{getActionLabel(automation.actionType)}</span>
                  {(() => {
                    const ac = automation.actionConfig as Record<string, string> | null
                    const displayValue = ac?.status || ac?.title || ""
                    return displayValue ? (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {displayValue}
                      </Badge>
                    ) : null
                  })()}
                </div>
                <div className="flex gap-1 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => handleEdit(automation.id)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(automation.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
