import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { sprintTasks, sprints, workspaceMembers } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { z } from "zod"

const moveTaskSchema = z.object({
  fromSprintId: z.string().uuid(),
  toSprintId: z.string().uuid(),
  taskId: z.string().uuid(),
})

async function checkSprintAccess(sprintId: string, userId: string) {
  const sprint = await db.query.sprints.findFirst({ where: eq(sprints.id, sprintId) })
  if (!sprint) return null
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, sprint.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  })
  return membership ? { sprint, membership } : null
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fromSprintId, toSprintId, taskId } = moveTaskSchema.parse(body)

    const access = await checkSprintAccess(fromSprintId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Verify access to destination sprint to prevent cross-workspace moves
    const toAccess = await checkSprintAccess(toSprintId, session.user.id)
    if (!toAccess) {
      return NextResponse.json({ error: "Access denied to destination sprint" }, { status: 403 })
    }

    // Remove from old sprint first
    await db
      .delete(sprintTasks)
      .where(
        and(
          eq(sprintTasks.sprintId, fromSprintId),
          eq(sprintTasks.taskId, taskId)
        )
      )

    // Add to new sprint (if not already there)
    await db
      .insert(sprintTasks)
      .values({
        sprintId: toSprintId,
        taskId,
      })
      .onConflictDoNothing()

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error moving task between sprints:", error)
    return NextResponse.json(
      { error: "Failed to move task" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { sprintId, taskId } = body

    if (!sprintId || !taskId) {
      return NextResponse.json(
        { error: "Sprint ID and Task ID are required" },
        { status: 400 }
      )
    }

    const access = await checkSprintAccess(sprintId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Add task to sprint
    await db
      .insert(sprintTasks)
      .values({
        sprintId,
        taskId,
      })
      .onConflictDoNothing()

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error adding task to sprint:", error)
    return NextResponse.json(
      { error: "Failed to add task to sprint" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sprintId = searchParams.get("sprintId")
    const taskId = searchParams.get("taskId")

    if (!sprintId || !taskId) {
      return NextResponse.json(
        { error: "Sprint ID and Task ID are required" },
        { status: 400 }
      )
    }

    const access = await checkSprintAccess(sprintId, session.user.id)
    if (!access) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await db
      .delete(sprintTasks)
      .where(
        and(
          eq(sprintTasks.sprintId, sprintId),
          eq(sprintTasks.taskId, taskId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing task from sprint:", error)
    return NextResponse.json(
      { error: "Failed to remove task from sprint" },
      { status: 500 }
    )
  }
}
