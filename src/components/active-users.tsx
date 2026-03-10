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

// Distinct hues for each user — cycles through if more users than colors
const USER_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-400", ring: "ring-blue-500/50" },
  { bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-500/50" },
  { bg: "bg-violet-500/20", text: "text-violet-400", ring: "ring-violet-500/50" },
  { bg: "bg-amber-500/20", text: "text-amber-400", ring: "ring-amber-500/50" },
  { bg: "bg-rose-500/20", text: "text-rose-400", ring: "ring-rose-500/50" },
  { bg: "bg-cyan-500/20", text: "text-cyan-400", ring: "ring-cyan-500/50" },
  { bg: "bg-pink-500/20", text: "text-pink-400", ring: "ring-pink-500/50" },
  { bg: "bg-teal-500/20", text: "text-teal-400", ring: "ring-teal-500/50" },
]

function getUserColor(index: number) {
  return USER_COLORS[index % USER_COLORS.length]
}

export function ActiveUsers({ users, max = 5, className }: ActiveUsersProps) {
  if (users.length === 0) return null

  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-1.5">
        {visible.map((user, i) => {
          const color = getUserColor(i)
          return (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className={cn("h-7 w-7 border-2 border-background ring-1", color.ring)}>
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  ) : null}
                  <AvatarFallback className={cn("text-xs font-medium", color.bg, color.text)}>
                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{user.name}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
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
