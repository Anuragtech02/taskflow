import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/auth";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  expiresAt: z.string().datetime().optional().refine(
    (val) => !val || new Date(val) > new Date(),
    { message: "Expiration date must be in the future" }
  ),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, session.user.id),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ apiKeys: keys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
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
    const { name, expiresAt } = createKeySchema.parse(body);

    // Generate key: tf_ + 24 random hex bytes (48 hex chars)
    const rawKey = `tf_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12) + "...";

    const [created] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        keyHash,
        keyPrefix,
        name,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      });

    return NextResponse.json(
      {
        apiKey: {
          ...created,
          // Return the plaintext key only once
          key: rawKey,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    if (!keyId) {
      return NextResponse.json(
        { error: "keyId parameter is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, session.user.id)))
      .returning({ id: apiKeys.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
