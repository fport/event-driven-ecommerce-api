FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification-service/package.json ./services/notification-service/
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Build stage
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/services/notification-service/node_modules ./services/notification-service/node_modules 2>/dev/null || true
COPY packages/shared ./packages/shared
COPY services/notification-service ./services/notification-service

WORKDIR /app/services/notification-service
ENV NODE_ENV=production
EXPOSE 3002

CMD ["bun", "run", "src/index.ts"]
