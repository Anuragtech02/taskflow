import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { statuses, lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function checkListAccess(listId: string, userId: string) {
  const list = await db.query.lists.findFirst({ where: eq(lists.id, listId) })
  if (!list) return null
  const space = await db.query.spaces.findFirst({ where: eq(spaces.id, list.spaceId) })
  if (!space) return null
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, space.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  })
  return membership ? { list, space, membership } : null
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId } = await params

    const access = await checkListAccess(listId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { statusIds } = body

    if (!statusIds || !Array.isArray(statusIds)) {
      return NextResponse.json(
        { error: "statusIds array is required" },
        { status: 400 }
      )
    }

    // Update order for each status
    for (let i = 0; i < statusIds.length; i++) {
      const statusId = statusIds[i]
      await db
        .update(statuses)
        .set({ order: i })
        .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
    }

    // Fetch and return updated statuses
    const updatedStatuses = await db
      .select()
      .from(statuses)
      .where(eq(statuses.listId, listId))
      .orderBy(statuses.order)

    return NextResponse.json({ statuses: updatedStatuses })
  } catch (error) {
    console.error("Error reordering statuses:", error)
    return NextResponse.json(
      { error: "Failed to reorder statuses" },
      { status: 500 }
    )
  }
}
