import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { statuses, tasks, lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string; statusId: string }>
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

    const { id: listId, statusId } = await params

    const access = await checkListAccess(listId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { name, color, order } = body

    // Check if status exists
    const existingStatus = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .limit(1)

    if (existingStatus.length === 0) {
      return NextResponse.json(
        { error: "Status not found" },
        { status: 404 }
      )
    }

    // Check for unique name if name is being updated
    if (name && name !== existingStatus[0].name) {
      const duplicateStatus = await db
        .select()
        .from(statuses)
        .where(and(eq(statuses.listId, listId), eq(statuses.name, name)))
        .limit(1)

      if (duplicateStatus.length > 0) {
        return NextResponse.json(
          { error: "Status name must be unique within this list" },
          { status: 400 }
        )
      }
    }

    const [updatedStatus] = await db
      .update(statuses)
      .set({
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      })
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .returning()

    return NextResponse.json({ status: updatedStatus })
  } catch (error) {
    console.error("Error updating status:", error)
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId, statusId } = await params

    const access = await checkListAccess(listId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if status exists
    const existingStatus = await db
      .select()
      .from(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))
      .limit(1)

    if (existingStatus.length === 0) {
      return NextResponse.json(
        { error: "Status not found" },
        { status: 404 }
      )
    }

    // Only migrate tasks that have the deleted status, not all tasks in the list
    const tasksWithStatus = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(
        eq(tasks.listId, listId),
        eq(tasks.status, existingStatus[0].name.toLowerCase().replace(/\s+/g, "_"))
      ))
      .limit(1)

    if (tasksWithStatus.length > 0) {
      const remainingStatuses = await db
        .select()
        .from(statuses)
        .where(eq(statuses.listId, listId))
        .orderBy(statuses.order)

      const otherStatuses = remainingStatuses.filter(s => s.id !== statusId)

      if (otherStatuses.length > 0) {
        const firstStatus = otherStatuses[0]
        const normalizedStatus = firstStatus.name.toLowerCase().replace(/\s+/g, "_")

        await db
          .update(tasks)
          .set({ status: normalizedStatus })
          .where(and(
            eq(tasks.listId, listId),
            eq(tasks.status, existingStatus[0].name.toLowerCase().replace(/\s+/g, "_"))
          ))
      }
    }

    // Delete the status
    await db
      .delete(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.listId, listId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting status:", error)
    return NextResponse.json(
      { error: "Failed to delete status" },
      { status: 500 }
    )
  }
}
