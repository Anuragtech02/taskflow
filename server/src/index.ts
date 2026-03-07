import Fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { config } from "./config.js";
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import multipartPlugin from "./plugins/multipart.js";
import ssePlugin from "./plugins/sse.js";
import hocuspocusPlugin from "./plugins/hocuspocus.js";
import healthRoutes from "./routes/health/index.js";
import registerRoutes from "./routes/auth/register.js";
import userRoutes from "./routes/users/me.js";
import workspaceRoutes from "./routes/workspaces/index.js";
import memberRoutes from "./routes/workspaces/members.js";
import workspaceSpaceRoutes from "./routes/workspaces/spaces.js";
import labelRoutes from "./routes/workspaces/labels.js";
import workspaceSearchRoutes from "./routes/workspaces/search.js";
import dashboardRoutes from "./routes/workspaces/dashboard.js";
import statsRoutes from "./routes/workspaces/stats.js";
import spaceRoutes from "./routes/spaces/space.js";
import listRoutes from "./routes/lists/list.js";
import folderRoutes from "./routes/folders/folder.js";
import taskRoutes from "./routes/tasks/task.js";
import sprintRoutes from "./routes/sprints/sprint.js";
import goalRoutes from "./routes/goals/goal.js";
import automationRoutes from "./routes/automations/automation.js";
import workspaceAutomationRoutes from "./routes/workspaces/automations.js";
import workspaceSprintRoutes2 from "./routes/workspaces/sprints.js";
import documentRoutes from "./routes/documents/document.js";
import formRoutes from "./routes/forms/form.js";
import fileRoutes from "./routes/files/files.js";
import notificationRoutes from "./routes/notifications/notification.js";
import searchRoutes from "./routes/search/index.js";
import aiRoutes from "./routes/ai/generate-tasks.js";
import sseRoutes from "./routes/sse/index.js";
import reminderCheckRoutes from "./routes/reminders/check.js";
import workspaceListRoutes from "./routes/workspaces/lists.js";
import reportRoutes from "./routes/workspaces/reports.js";
import documentShareRoutes from "./routes/documents/shares.js";
import documentCommentRoutes from "./routes/documents/comments.js";
import documentVersionRoutes from "./routes/documents/versions.js";
import collabTokenRoutes from "./routes/documents/collab-token.js";
import sharedTokenRoutes from "./routes/shared/token.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
  bodyLimit: 10 * 1024 * 1024, // 10MB
});

// Register plugins
await fastify.register(cookie);
await fastify.register(corsPlugin);
await fastify.register(authPlugin);
await fastify.register(multipartPlugin);
await fastify.register(ssePlugin);
await fastify.register(websocket);
await fastify.register(hocuspocusPlugin);

// Register routes
await fastify.register(healthRoutes);
await fastify.register(registerRoutes);
await fastify.register(userRoutes);
await fastify.register(workspaceRoutes);
await fastify.register(memberRoutes);
await fastify.register(workspaceSpaceRoutes);
await fastify.register(labelRoutes);
await fastify.register(workspaceSearchRoutes);
await fastify.register(dashboardRoutes);
await fastify.register(statsRoutes);
await fastify.register(spaceRoutes);
await fastify.register(listRoutes);
await fastify.register(folderRoutes);
await fastify.register(taskRoutes);
await fastify.register(sprintRoutes);
await fastify.register(goalRoutes);
await fastify.register(automationRoutes);
await fastify.register(workspaceAutomationRoutes);
await fastify.register(workspaceSprintRoutes2);
await fastify.register(documentRoutes);
await fastify.register(formRoutes);
await fastify.register(fileRoutes);
await fastify.register(notificationRoutes);
await fastify.register(searchRoutes);
await fastify.register(aiRoutes);
await fastify.register(sseRoutes);
await fastify.register(reminderCheckRoutes);
await fastify.register(workspaceListRoutes);
await fastify.register(reportRoutes);
await fastify.register(documentShareRoutes);
await fastify.register(documentCommentRoutes);
await fastify.register(documentVersionRoutes);
await fastify.register(collabTokenRoutes);
await fastify.register(sharedTokenRoutes);

// Start server
try {
  await fastify.listen({ port: config.port, host: config.host });
  console.log(`Fastify server listening on ${config.host}:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

export { fastify };
