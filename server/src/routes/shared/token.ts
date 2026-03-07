import { FastifyInstance } from "fastify";
import { db, schema } from "../../db/index.js";
import { eq } from "drizzle-orm";

const { documentShares, documents } = schema;

export default async function sharedTokenRoutes(fastify: FastifyInstance) {
  // GET /shared/:token - Public document access (no auth required)
  fastify.get("/shared/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const share = await db.query.documentShares.findFirst({
      where: eq(documentShares.shareToken, token),
    });

    if (!share) return reply.status(404).send({ error: "Share link not found or expired" });

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, share.documentId),
      with: { creator: true },
    });

    if (!doc) return reply.status(404).send({ error: "Document not found" });

    return {
      document: {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        icon: doc.icon,
        coverUrl: doc.coverUrl,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        creator: {
          id: doc.creator.id,
          name: doc.creator.name,
        },
      },
      role: share.role,
    };
  });
}
