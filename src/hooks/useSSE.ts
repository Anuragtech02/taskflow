"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Debounce to prevent error spam
let errorToastShown = false
const showErrorOnce = () => {
  if (!errorToastShown) {
    errorToastShown = true
    toast.error("Connection issue", {
      description: "Real-time updates disconnected. Reconnecting...",
      duration: 3000,
    })
    setTimeout(() => {
      errorToastShown = false
    }, 10000)
  }
}

export function useSSE(workspaceId?: string, currentUserId?: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const stableTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<{ id: string; name: string; avatarUrl?: string | null }[]>([])

  const MAX_RECONNECT_ATTEMPTS = 5

  const connect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log("SSE: Max reconnection attempts reached")
      return
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const url = workspaceId
        ? `${baseUrl}/sse?workspaceId=${workspaceId}`
        : `${baseUrl}/sse`
      const eventSource = new EventSource(url, { withCredentials: true })
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE connected")
        setIsConnected(true)
        // Only reset reconnect attempts after connection is stable for 5s
        // (prevents infinite reconnect loops from QUIC/HTTP3 transport errors)
        stableTimerRef.current = setTimeout(() => {
          reconnectAttemptsRef.current = 0
        }, 5000)
      }

      eventSource.onmessage = (event) => {
        try {
          JSON.parse(event.data)
        } catch {
          // Keepalive or non-JSON message
        }
      }

      eventSource.addEventListener("connected", () => {
        setIsConnected(true)
      })

      eventSource.addEventListener("presence_update", (event) => {
        try {
          const data = JSON.parse(event.data)
          setActiveUsers(data.activeUsers || [])
        } catch (error) {
          console.error("Error parsing presence_update event:", error)
        }
      })

      eventSource.addEventListener("task_updated", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          queryClient.invalidateQueries({ queryKey: ["task"] })
          // Only show toast for changes made by OTHER users
          if (!currentUserId || data.userId !== currentUserId) {
            const canNavigate = workspaceId && data.spaceId && data.listId
            toast.info("Task updated", {
              description: data.task?.title || "A task was updated",
              ...(canNavigate && {
                action: {
                  label: "View",
                  onClick: () => routerRef.current.push(`/dashboard/workspaces/${workspaceId}/spaces/${data.spaceId}/lists/${data.listId}`),
                },
              }),
            })
          }
        } catch (error) {
          console.error("Error parsing task_updated event:", error)
        }
      })

      eventSource.addEventListener("task_created", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          if (!currentUserId || data.userId !== currentUserId) {
            const canNavigate = workspaceId && data.spaceId && data.listId
            toast.success("Task created", {
              description: data.task?.title || "A new task was created",
              ...(canNavigate && {
                action: {
                  label: "View",
                  onClick: () => routerRef.current.push(`/dashboard/workspaces/${workspaceId}/spaces/${data.spaceId}/lists/${data.listId}`),
                },
              }),
            })
          }
        } catch (error) {
          console.error("Error parsing task_created event:", error)
        }
      })

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["notifications"] })
          const canNavigate = workspaceId && data.entityType === "task" && data.spaceId && data.listId
          toast(data.title || "Notification", {
            description: data.message,
            ...(canNavigate && {
              action: {
                label: "View",
                onClick: () => routerRef.current.push(`/dashboard/workspaces/${workspaceId}/spaces/${data.spaceId}/lists/${data.listId}`),
              },
            }),
          })
        } catch (error) {
          console.error("Error parsing notification event:", error)
        }
      })

      eventSource.onerror = () => {
        eventSource.close()
        setIsConnected(false)
        if (stableTimerRef.current) {
          clearTimeout(stableTimerRef.current)
          stableTimerRef.current = null
        }

        if (!reconnectTimeoutRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectAttemptsRef.current++
          showErrorOnce()

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error("SSE: Failed to create EventSource:", error)
    }
  }, [queryClient, workspaceId, currentUserId])

  useEffect(() => {
    // Don't connect until we have a workspace to subscribe to
    if (!workspaceId) return

    // Reset state for new workspace
    setActiveUsers([])
    reconnectAttemptsRef.current = 0

    let cancelled = false
    connect()

    // Fetch initial presence
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || ""
    fetch(`${baseUrl}/sse/presence?workspaceId=${workspaceId}`, { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.activeUsers) setActiveUsers(data.activeUsers)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current)
        stableTimerRef.current = null
      }
    }
  }, [connect, workspaceId])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    reconnect,
    isConnected,
    activeUsers,
  }
}
