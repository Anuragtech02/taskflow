import { FastifyInstance } from "fastify";
import { db, schema } from "../../db/index.js";
import { eq, and } from "drizzle-orm";
import { authenticateRequest } from "../../plugins/auth.js";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

const { documents, workspaceMembers } = schema;

export default async function collabTokenRoutes(fastify: FastifyInstance) {
  // POST /documents/:id/collab-token
  fastify.post("/documents/:id/collab-token", async (request, reply) => {
    const authResult = await authenticateRequest(request);
    if (!authResult) return reply.status(401).send({ error: "Unauthorized" });
    const { id: documentId } = request.params as { id: string };

    const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    // Check workspace membership
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, doc.workspaceId), eq(workspaceMembers.userId, authResult.userId)),
    });
    if (!membership) return reply.status(403).send({ error: "Access denied" });

    // Determine role based on membership
    const role = membership.role === "viewer" ? "viewer" : "editor";

    const token = jwt.sign(
      { userId: authResult.userId, documentId, role },
      config.jwtSecret,
      { expiresIn: "24h" }
    );

    return { token, role };
  });
}
