import api from "../axios"

// Automations API Types
export interface AutomationResponse {
  id: string
  workspaceId: string
  name: string
  enabled: boolean
  triggerType: "status_change" | "task_created" | "due_date_approaching" | "assignment"
  triggerConfig: Record<string, unknown>
  actionType: "change_status" | "assign_user" | "add_label" | "send_notification"
  actionConfig: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export async function fetchAutomations(
  workspaceId: string
): Promise<AutomationResponse[]> {
  const res = await api.get(`/workspaces/${workspaceId}/automations`)
  return res.data.automations || []
}

export async function createAutomation(
  workspaceId: string,
  data: {
    name: string
    enabled?: boolean
    triggerType: string
    triggerConfig: Record<string, unknown>
    actionType: string
    actionConfig: Record<string, unknown>
  }
): Promise<{ automation: AutomationResponse }> {
  const res = await api.post(`/workspaces/${workspaceId}/automations`, data)
  return res.data
}

export async function updateAutomation(
  automationId: string,
  data: Partial<{
    name: string
    enabled: boolean
    triggerType: string
    triggerConfig: Record<string, unknown>
    actionType: string
    actionConfig: Record<string, unknown>
  }>
): Promise<{ automation: AutomationResponse }> {
  const res = await api.patch(`/automations/${automationId}`, data)
  return res.data
}

export async function deleteAutomation(automationId: string): Promise<void> {
  await api.delete(`/automations/${automationId}`)
}
