import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { config } from "./config.js";
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import multipartPlugin from "./plugins/multipart.js";
import ssePlugin from "./plugins/sse.js";
import healthRoutes from "./routes/health/index.js";
import registerRoutes from "./routes/auth/register.js";
import userRoutes from "./routes/users/me.js";

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

// Register routes
await fastify.register(healthRoutes);
await fastify.register(registerRoutes);
await fastify.register(userRoutes);

// Start server
try {
  await fastify.listen({ port: config.port, host: config.host });
  console.log(`Fastify server listening on ${config.host}:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

export { fastify };
