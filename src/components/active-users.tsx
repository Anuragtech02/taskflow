"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ActiveUser {
  id: string
  name: string
  avatarUrl?: string | null
}

interface ActiveUsersProps {
  users: ActiveUser[]
  max?: number
  className?: string
}

export function ActiveUsers({ users, max = 5, className }: ActiveUsersProps) {
  if (users.length === 0) return null

  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-green-500/40">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="text-xs font-medium bg-primary/10">
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarFallback className="text-xs font-medium bg-muted">
                  +{overflow}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{overflow} more online</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
