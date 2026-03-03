"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
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

export function useSSE(workspaceId?: string) {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const [isConnected, setIsConnected] = useState(false)

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
      const url = workspaceId
        ? `/api/sse?workspaceId=${workspaceId}`
        : "/api/sse"
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE connected")
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
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

      eventSource.addEventListener("task_updated", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          toast.info("Task updated", {
            description: data.title || "A task was updated",
          })
        } catch (error) {
          console.error("Error parsing task_updated event:", error)
        }
      })

      eventSource.addEventListener("task_created", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          toast.success("Task created", {
            description: data.title || "A new task was created",
          })
        } catch (error) {
          console.error("Error parsing task_created event:", error)
        }
      })

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data)
          queryClient.invalidateQueries({ queryKey: ["notifications"] })
          toast(data.title || "Notification", {
            description: data.message,
          })
        } catch (error) {
          console.error("Error parsing notification event:", error)
        }
      })

      eventSource.onerror = () => {
        eventSource.close()
        setIsConnected(false)

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
  }, [queryClient, workspaceId])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    reconnect,
    isConnected,
  }
}
