FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/inventory-service/package.json ./services/inventory-service/
RUN bun install --frozen-lockfile 2>/dev/null || bun install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/services/inventory-service/node_modules ./services/inventory-service/node_modules 2>/dev/null || true
COPY packages/shared ./packages/shared
COPY services/inventory-service ./services/inventory-service

WORKDIR /app/services/inventory-service
ENV NODE_ENV=production
EXPOSE 3003

CMD ["bun", "run", "src/index.ts"]
