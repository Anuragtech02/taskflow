import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

type SSEController = ReadableStreamDefaultController;

// Store active connections per workspace
const workspaceConnections = new Map<string, Set<SSEController>>();

export function addConnection(workspaceId: string, controller: SSEController) {
  if (!workspaceConnections.has(workspaceId)) {
    workspaceConnections.set(workspaceId, new Set());
  }
  workspaceConnections.get(workspaceId)!.add(controller);
}

export function removeConnection(workspaceId: string, controller: SSEController) {
  const connections = workspaceConnections.get(workspaceId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      workspaceConnections.delete(workspaceId);
    }
  }
}

export function getConnectionCount(workspaceId: string): number {
  return workspaceConnections.get(workspaceId)?.size ?? 0;
}

export type SSEEventType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "comment_added"
  | "sprint_updated"
  | "notification";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

export function broadcastToWorkspace(workspaceId: string, event: SSEEvent) {
  const connections = workspaceConnections.get(workspaceId);
  if (!connections || connections.size === 0) return;

  const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch {
      connections.delete(controller);
    }
  }

  if (connections.size === 0) {
    workspaceConnections.delete(workspaceId);
  }
}

async function ssePlugin(fastify: FastifyInstance) {
  fastify.decorate("sse", {
    addConnection,
    removeConnection,
    getConnectionCount,
    broadcastToWorkspace,
  });
}

declare module "fastify" {
  interface FastifyInstance {
    sse: {
      addConnection: typeof addConnection;
      removeConnection: typeof removeConnection;
      getConnectionCount: typeof getConnectionCount;
      broadcastToWorkspace: typeof broadcastToWorkspace;
    };
  }
}

export default fp(ssePlugin, { name: "sse" });
