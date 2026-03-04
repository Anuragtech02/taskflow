import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { db } from "@/db";
import { spaces, folders, lists, workspaceMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    // Check membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, authResult.userId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch all spaces with their folders and lists
    const workspaceSpaces = await db.query.spaces.findMany({
      where: eq(spaces.workspaceId, workspaceId),
      orderBy: spaces.order,
      with: {
        folders: {
          orderBy: folders.order,
          with: {
            lists: {
              orderBy: lists.order,
            },
          },
        },
        lists: {
          orderBy: lists.order,
        },
      },
    });

    // Build response: spaces with their direct lists and folder > lists
    const result = workspaceSpaces.map((space) => {
      // Direct lists (not in a folder)
      const directLists = space.lists
        .filter((l) => !l.folderId)
        .map((l) => ({ id: l.id, name: l.name }));

      const spaceFolders = space.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        lists: folder.lists.map((l) => ({ id: l.id, name: l.name })),
      }));

      return {
        id: space.id,
        name: space.name,
        lists: directLists,
        folders: spaceFolders,
      };
    });

    return NextResponse.json({ spaces: result });
  } catch (error) {
    console.error("Error fetching workspace lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
