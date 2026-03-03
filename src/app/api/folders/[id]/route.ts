import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { db } from "@/db"
import { folders, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
})

// PATCH /api/folders/[id] - Update a folder
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: folderId } = await params
    const body = await request.json()
    const parsed = updateFolderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, folderId),
    })
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, folder.spaceId),
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

    const [updated] = await db.update(folders).set(parsed.data).where(eq(folders.id, folderId)).returning()
    return NextResponse.json({ folder: updated })
  } catch (error) {
    console.error("Error updating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/folders/[id] - Delete a folder
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: folderId } = await params

    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, folderId),
    })
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    const space = await db.query.spaces.findFirst({
      where: eq(spaces.id, folder.spaceId),
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

    await db.delete(folders).where(eq(folders.id, folderId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
