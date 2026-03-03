import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { db } from "@/db"
import { lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/lists/[id] - Get a single list by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId } = await params

    // Get the list
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    // Get the space to check workspace access
    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, list.spaceId),
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error("Error fetching list:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

const updateListSchema = z.object({
  name: z.string().min(1).max(255).optional(),
})

// PATCH /api/lists/[id] - Update a list
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId } = await params
    const body = await request.json()
    const parsed = updateListSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, list.spaceId),
    })
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const [updated] = await db.update(lists).set(parsed.data).where(eq(lists.id, listId)).returning()
    return NextResponse.json({ list: updated })
  } catch (error) {
    console.error("Error updating list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/lists/[id] - Delete a list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: listId } = await params

    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, list.spaceId),
    })
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, space.workspaceId),
        eq(workspaceMembers.userId, session.user.id)
      ),
    })
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await db.delete(lists).where(eq(lists.id, listId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting list:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
