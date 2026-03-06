import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { config } from "../config.js";

export interface AuthResult {
  userId: string;
  source: "api_key" | "session";
}

declare module "fastify" {
  interface FastifyRequest {
    authResult?: AuthResult | null;
  }
}

async function authenticateApiKey(token: string): Promise<AuthResult | null> {
  const hash = createHash("sha256").update(token).digest("hex");

  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.keyHash, hash),
  });

  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) {
    return null;
  }

  // Update lastUsedAt (fire-and-forget)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, key.id))
    .then(() => {})
    .catch((err: unknown) => console.error("Failed to update API key lastUsedAt:", err));

  return { userId: key.userId, source: "api_key" };
}

function verifySessionToken(token: string): { id: string } | null {
  try {
    // NextAuth JWT tokens are encoded with the NEXTAUTH_SECRET
    // They use the "A256CBC-HS512" algorithm via jose, but we need to decode them
    // NextAuth v5 uses JWE (encrypted JWT). We need to decode the session cookie.
    // For compatibility, we'll verify using jsonwebtoken with the secret.
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as { id?: string; sub?: string };

    const userId = decoded.id || decoded.sub;
    if (!userId) return null;
    return { id: userId };
  } catch {
    return null;
  }
}

export async function authenticateRequest(
  request: FastifyRequest
): Promise<AuthResult | null> {
  // Try Bearer token first
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await authenticateApiKey(token);
    if (result) return result;
    return null;
  }

  // Fall back to session cookie
  const sessionToken = (request.cookies as Record<string, string | undefined>)?.[config.sessionCookieName];
  if (sessionToken) {
    const decoded = verifySessionToken(sessionToken);
    if (decoded) {
      return { userId: decoded.id, source: "session" };
    }
  }

  return null;
}

async function authPlugin(fastify: FastifyInstance) {
  // Decorate request with authResult
  fastify.decorateRequest("authResult", null);

  // Pre-handler that can be used with route-level onRequest
  fastify.decorate("authenticate", async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const result = await authenticateRequest(request);
    if (!result) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    request.authResult = result;
  });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin, { name: "auth" });
