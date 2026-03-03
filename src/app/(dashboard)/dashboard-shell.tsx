"use client"

import { Sidebar } from "@/components/sidebar"
import { Notifications } from "@/components/notifications"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"
import { useSSE } from "@/hooks/useSSE"
import { usePathname } from "next/navigation"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Extract workspaceId from URL: /dashboard/workspaces/[id]/...
  const workspaceMatch = pathname.match(/\/dashboard\/workspaces\/([^/]+)/)
  const workspaceId = workspaceMatch?.[1]

  // Initialize SSE connection for real-time updates
  useSSE(workspaceId)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar with notifications */}
          <div className="flex items-center justify-end border-b px-4 py-2 bg-background">
            <Notifications />
          </div>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <KeyboardShortcuts />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}
