import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { customFieldDefinitions, lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string; fieldId: string }>
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

    const { id: listId, fieldId } = await params

    const access = await checkListAccess(listId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, options, order } = body

    const validTypes = [
      "text", "textarea", "number", "date", "time", "datetime",
      "checkbox", "select", "multiSelect", "url", "email",
      "phone", "currency", "percentage", "user"
    ]
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid field type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const updateData: Partial<typeof customFieldDefinitions.$inferInsert> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (options !== undefined) updateData.options = options
    if (order !== undefined) updateData.order = order

    const [updatedField] = await db
      .update(customFieldDefinitions)
      .set(updateData)
      .where(and(
        eq(customFieldDefinitions.id, fieldId),
        eq(customFieldDefinitions.listId, listId)
      ))
      .returning()

    if (!updatedField) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ field: updatedField })
  } catch (error) {
    console.error("Error updating custom field:", error)
    return NextResponse.json(
      { error: "Failed to update custom field" },
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

    const { id: listId, fieldId } = await params

    const access = await checkListAccess(listId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const [deletedField] = await db
      .delete(customFieldDefinitions)
      .where(and(
        eq(customFieldDefinitions.id, fieldId),
        eq(customFieldDefinitions.listId, listId)
      ))
      .returning()

    if (!deletedField) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom field:", error)
    return NextResponse.json(
      { error: "Failed to delete custom field" },
      { status: 500 }
    )
  }
}
