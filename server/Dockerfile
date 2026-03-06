FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY server/package.json server/package-lock.json* ./server/
COPY package.json package-lock.json* ./
RUN cd server && npm install --production

# Build
FROM base AS builder
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY src/db/ ./src/db/
RUN cd server && npx tsc

# Production
FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/db ./src/db
COPY server/package.json ./server/

WORKDIR /app/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
