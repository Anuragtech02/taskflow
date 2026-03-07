import { FastifyInstance } from "fastify";
import { db, schema } from "../../db/index.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticateRequest } from "../../plugins/auth.js";

const { documents, documentVersions, workspaceMembers, users } = schema;

export default async function documentVersionRoutes(fastify: FastifyInstance) {
  // GET /documents/:id/versions
  fastify.get("/documents/:id/versions", async (request, reply) => {
    const authResult = await authenticateRequest(request);
    if (!authResult) return reply.status(401).send({ error: "Unauthorized" });
    const { id: documentId } = request.params as { id: string };

    const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, doc.workspaceId), eq(workspaceMembers.userId, authResult.userId)),
    });
    if (!membership) return reply.status(403).send({ error: "Access denied" });

    const versions = await db
      .select({
        id: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        title: documentVersions.title,
        createdAt: documentVersions.createdAt,
        createdBy: documentVersions.createdBy,
        userName: users.name,
      })
      .from(documentVersions)
      .leftJoin(users, eq(documentVersions.createdBy, users.id))
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(50);

    return { versions };
  });

  // GET /documents/:id/versions/:versionId
  fastify.get("/documents/:id/versions/:versionId", async (request, reply) => {
    const authResult = await authenticateRequest(request);
    if (!authResult) return reply.status(401).send({ error: "Unauthorized" });
    const { id: documentId, versionId } = request.params as { id: string; versionId: string };

    const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, doc.workspaceId), eq(workspaceMembers.userId, authResult.userId)),
    });
    if (!membership) return reply.status(403).send({ error: "Access denied" });

    const version = await db.query.documentVersions.findFirst({
      where: and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)),
      with: { creator: true },
    });

    if (!version) return reply.status(404).send({ error: "Version not found" });

    return {
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        title: version.title,
        content: version.content,
        createdAt: version.createdAt,
        creator: {
          id: version.creator.id,
          name: version.creator.name,
          email: version.creator.email,
        },
      },
    };
  });

  // POST /documents/:id/versions (manual save)
  fastify.post("/documents/:id/versions", async (request, reply) => {
    const authResult = await authenticateRequest(request);
    if (!authResult) return reply.status(401).send({ error: "Unauthorized" });
    const { id: documentId } = request.params as { id: string };

    const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, doc.workspaceId), eq(workspaceMembers.userId, authResult.userId)),
    });
    if (!membership) return reply.status(403).send({ error: "Access denied" });

    const lastVersion = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));

    const nextVersion = (lastVersion[0]?.maxVersion || 0) + 1;

    const [version] = await db
      .insert(documentVersions)
      .values({
        documentId,
        versionNumber: nextVersion,
        title: doc.title,
        content: doc.content || {},
        ydocState: doc.ydocState as any,
        createdBy: authResult.userId,
      })
      .returning();

    await db
      .update(documents)
      .set({ lastVersionAt: new Date() })
      .where(eq(documents.id, documentId));

    return { version };
  });

  // POST /documents/:id/versions/:versionId/restore
  fastify.post("/documents/:id/versions/:versionId/restore", async (request, reply) => {
    const authResult = await authenticateRequest(request);
    if (!authResult) return reply.status(401).send({ error: "Unauthorized" });
    const { id: documentId, versionId } = request.params as { id: string; versionId: string };

    const doc = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, doc.workspaceId), eq(workspaceMembers.userId, authResult.userId)),
    });
    if (!membership) return reply.status(403).send({ error: "Access denied" });

    const version = await db.query.documentVersions.findFirst({
      where: and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)),
    });
    if (!version) return reply.status(404).send({ error: "Version not found" });

    // Save current state as a version before restoring
    const lastVersion = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));
    const nextVersion = (lastVersion[0]?.maxVersion || 0) + 1;

    await db.insert(documentVersions).values({
      documentId,
      versionNumber: nextVersion,
      title: doc.title,
      content: doc.content || {},
      ydocState: doc.ydocState as any,
      createdBy: authResult.userId,
    });

    // Restore the selected version
    await db
      .update(documents)
      .set({
        content: version.content || {},
        ydocState: version.ydocState as any,
        updatedAt: new Date(),
        lastVersionAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { success: true, restoredVersion: version.versionNumber };
  });
}
