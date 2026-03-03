import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { customFieldDefinitions, lists, spaces, workspaceMembers } from "@/db/schema"
import { eq, and, asc } from "drizzle-orm"

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

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const fields = await db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.listId, listId))
      .orderBy(asc(customFieldDefinitions.order))

    return NextResponse.json({ fields })
  } catch (error) {
    console.error("Error fetching custom fields:", error)
    return NextResponse.json(
      { error: "Failed to fetch custom fields" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { name, type, options } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Field name is required" },
        { status: 400 }
      )
    }

    const validTypes = [
      "text", "textarea", "number", "date", "time", "datetime",
      "checkbox", "select", "multiSelect", "url", "email",
      "phone", "currency", "percentage", "user"
    ]
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid field type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Get max order if not provided
    const maxOrderField = await db
      .select({ order: customFieldDefinitions.order })
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.listId, listId))
      .orderBy(customFieldDefinitions.order)
      .limit(1)

    const newOrder = maxOrderField.length > 0 ? (maxOrderField[0].order ?? 0) + 1 : 0

    const [newField] = await db
      .insert(customFieldDefinitions)
      .values({
        listId,
        name,
        type,
        options: options || {},
        order: newOrder,
      })
      .returning()

    return NextResponse.json({ field: newField }, { status: 201 })
  } catch (error) {
    console.error("Error creating custom field:", error)
    return NextResponse.json(
      { error: "Failed to create custom field" },
      { status: 500 }
    )
  }
}
