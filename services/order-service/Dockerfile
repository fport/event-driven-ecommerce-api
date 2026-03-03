FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/order-service/package.json ./services/order-service/
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Build stage
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service
ENV NODE_ENV=production
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
