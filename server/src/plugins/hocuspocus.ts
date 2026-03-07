import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server } from "@hocuspocus/server";
import jwt from "jsonwebtoken";
import { db, schema } from "../db/index.js";
import { eq, and, sql } from "drizzle-orm";
import { config } from "../config.js";
import * as Y from "yjs";

const { documents, documentVersions, documentShares } = schema;

interface CollabToken {
  userId: string;
  documentId: string;
  role: "editor" | "viewer" | "commenter";
}

async function hocuspocusPlugin(fastify: FastifyInstance) {
  const server = Server.configure({
    async onAuthenticate({ token, documentName }) {
      // Token is a JWT with userId, documentId, role
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as CollabToken;
        if (decoded.documentId !== documentName) {
          throw new Error("Token document mismatch");
        }
        return {
          user: {
            id: decoded.userId,
            role: decoded.role,
          },
        };
      } catch {
        // Try share token
        const share = await db.query.documentShares.findFirst({
          where: and(
            eq(documentShares.shareToken, token),
            eq(documentShares.documentId, documentName)
          ),
        });
        if (share) {
          return {
            user: {
              id: share.userId || "anonymous",
              role: share.role as string,
            },
          };
        }
        throw new Error("Unauthorized");
      }
    },

    async onLoadDocument({ document, documentName }) {
      // Load Yjs state from database
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentName),
      });

      if (doc?.ydocState) {
        const state = doc.ydocState as Buffer;
        Y.applyUpdate(document, new Uint8Array(state));
      }

      return document;
    },

    async onStoreDocument({ document, documentName }) {
      const state = Y.encodeStateAsUpdate(document);
      const content = document.getXmlFragment("default").toJSON();

      await db
        .update(documents)
        .set({
          ydocState: Buffer.from(state) as any,
          content: content || {},
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentName));

      // Auto-version every 5 minutes
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, documentName),
        columns: { lastVersionAt: true, title: true },
      });

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!doc?.lastVersionAt || doc.lastVersionAt < fiveMinAgo) {
        const lastVersion = await db
          .select({ maxVersion: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, documentName));

        const nextVersion = (lastVersion[0]?.maxVersion || 0) + 1;

        await db.insert(documentVersions).values({
          documentId: documentName,
          versionNumber: nextVersion,
          title: doc?.title || "Untitled",
          content: content || {},
          ydocState: Buffer.from(state) as any,
          createdBy: "00000000-0000-0000-0000-000000000000", // system user
        });

        await db
          .update(documents)
          .set({ lastVersionAt: new Date() })
          .where(eq(documents.id, documentName));
      }
    },
  });

  // Handle WebSocket upgrade for /collab path
  fastify.get("/collab", { websocket: true }, (socket, request) => {
    server.handleConnection(socket, request.raw);
  });

  fastify.decorate("hocuspocus", server);

  fastify.addHook("onClose", async () => {
    await server.destroy();
  });
}

declare module "fastify" {
  interface FastifyInstance {
    hocuspocus: Server;
  }
}

export default fp(hocuspocusPlugin, {
  name: "hocuspocus",
  dependencies: ["auth"],
});
