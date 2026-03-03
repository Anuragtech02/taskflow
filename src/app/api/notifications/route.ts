import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications, tasks, lists, spaces, workspaceMembers } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  message: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";

    const userId = session.user.id;

    const baseWhere = unreadOnly
      ? and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )!
      : eq(notifications.userId, userId);

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(baseWhere)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich notifications with navigation context
    const enrichedNotifications = await Promise.all(
      userNotifications.map(async (notification) => {
        const enriched = { ...notification } as Record<string, unknown>;

        if (notification.entityType === "task" && notification.entityId) {
          try {
            const taskWithContext = await db
              .select({
                id: tasks.id,
                listId: lists.id,
                spaceId: spaces.id,
                workspaceId: spaces.workspaceId,
              })
              .from(tasks)
              .innerJoin(lists, eq(tasks.listId, lists.id))
              .innerJoin(spaces, eq(lists.spaceId, spaces.id))
              .where(eq(tasks.id, notification.entityId))
              .limit(1);

            if (taskWithContext.length > 0) {
              enriched.workspaceId = taskWithContext[0].workspaceId;
              enriched.spaceId = taskWithContext[0].spaceId;
              enriched.listId = taskWithContext[0].listId;
            }
          } catch (err) {
            console.error("Error enriching notification:", err);
          }
        }

        return enriched;
      })
    );

    // Get unread count
    const unreadCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        )
      );

    return NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // Validate that the target user shares a workspace with the requesting user
    const senderWorkspaces = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, session.user.id));

    const senderWorkspaceIds = senderWorkspaces.map(w => w.workspaceId);

    if (senderWorkspaceIds.length > 0) {
      const targetMembership = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.userId, validatedData.userId),
          sql`${workspaceMembers.workspaceId} IN ${senderWorkspaceIds}`
        ),
      });

      if (!targetMembership) {
        return NextResponse.json(
          { error: "Cannot create notifications for users outside your workspaces" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const [notification] = await db.insert(notifications).values({
      userId: validatedData.userId,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message || null,
      entityType: validatedData.entityType || null,
      entityId: validatedData.entityId || null,
    }).returning();

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            eq(notifications.read, false)
          )
        );

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      const [updated] = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, session.user.id)
          )
        )
        .returning();

      if (!updated) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ notification: updated });
    }

    return NextResponse.json(
      { error: "Provide notificationId or markAllRead: true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
