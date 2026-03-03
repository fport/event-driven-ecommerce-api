FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/
RUN bun install --frozen-lockfile 2>/dev/null || bun install

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY services/api-gateway ./services/api-gateway

WORKDIR /app/services/api-gateway
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
