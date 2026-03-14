"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSpaces } from "@/hooks/useQueries"

export default function WorkspaceSprintsRedirect() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  const { data: spaces } = useSpaces(workspaceId)

  useEffect(() => {
    if (spaces && spaces.length > 0) {
      router.replace(`/dashboard/workspaces/${workspaceId}/spaces/${spaces[0].id}/sprints`)
    }
  }, [spaces, workspaceId, router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
