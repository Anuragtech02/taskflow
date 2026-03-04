import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export interface AuthResult {
  userId: string;
  source: "api_key" | "session";
}

/**
 * Authenticate a request via Bearer API key or session cookie.
 * Returns null if neither method succeeds.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult | null> {
  // Try Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await authenticateApiKey(token);
    if (result) return result;
    // If Bearer token provided but invalid, don't fall back to session
    return null;
  }

  // Fall back to session auth
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, source: "session" };
  }

  return null;
}

/**
 * Require Bearer API key auth only. Throws on failure.
 * Used by api-v1.ts middleware.
 */
export async function requireApiKeyAuth(
  request: NextRequest
): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing API key"), { statusCode: 401 });
  }

  const token = authHeader.slice(7);
  const result = await authenticateApiKey(token);
  if (!result) {
    throw Object.assign(new Error("Invalid or expired API key"), {
      statusCode: 401,
    });
  }

  return result;
}

async function authenticateApiKey(
  token: string
): Promise<AuthResult | null> {
  const hash = createHash("sha256").update(token).digest("hex");

  const key = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hash),
  });

  if (!key) return null;

  // Check expiration
  if (key.expiresAt && key.expiresAt < new Date()) {
    return null;
  }

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch((err) => console.error("Failed to update API key lastUsedAt:", err));

  return { userId: key.userId, source: "api_key" };
}
